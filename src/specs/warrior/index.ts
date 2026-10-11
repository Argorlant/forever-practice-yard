// Warrior for WoW Forever: stances, normalized rage, abilities, procs and one
// priority list per build (Fury, Arms, Protection). Numbers live in
// ./data.ts, builds in ./talents.ts; sources in research/warrior_forever.md.
import type { Combat, Incoming } from '../../engine/combat';
import type { Ability, Hand, Hit, Outcome, Spec, Unit, Weapon } from '../../engine/types';
import { UI } from '../../strings';
import { BOSS_RULES } from '../common';
import { ARMS_STATS, DATA, FURY_STATS, NORMALIZED_SPEED, PROT_STATS } from './data';
import { BUILDS, buildById, buildLabel, summary, talentsFor, type Stance, type Talents } from './talents';

const D = DATA;
const T = (c: Combat): Talents => talentsFor(c.options.build);
const build = (c: Combat) => buildById(c.options.build);
const landed = (o: Outcome) => o === 'hit' || o === 'crit' || o === 'glance' || o === 'block';
const roll = (c: Combat, pct: number) => c.random() * 100 < pct;

interface WarriorState { lastWeaponmaster: number }
const states = new WeakMap<Combat, WarriorState>();

// ---------------------------------------------------------------- stances
const STANCES: Record<Stance, { aura: string; name: string }> = {
  battle: { aura: 'battleStance', name: 'Battle Stance' },
  defensive: { aura: 'defensiveStance', name: 'Defensive Stance' },
  berserker: { aura: 'berserkerStance', name: 'Berserker Stance' },
};
const stanceOf = (c: Combat): Stance =>
  c.aura(c.player, 'battleStance') ? 'battle' : c.aura(c.player, 'defensiveStance') ? 'defensive' : 'berserker';
function needsStance(c: Combat, ...allowed: Stance[]): string | null {
  return allowed.includes(stanceOf(c)) ? null : `Must be in ${allowed.map((s) => STANCES[s].name).join(' or ')}`;
}
const hasShield = (c: Combat) => !!c.stats.shield;
const needsShield = (c: Combat) => (hasShield(c) ? null : 'Requires a shield');

/** Changes stance; rage above Tactical Mastery's limit is lost. */
function enterStance(c: Combat, s: Stance, keepRage = true): void {
  for (const st of Object.values(STANCES)) c.removeAura(c.player, st.aura);
  const t = T(c);
  const defiance = hasShield(c) ? 1 + 0.05 * t.defiance : 1;
  const mods = s === 'battle' ? { threat: 0.8 }
    : s === 'defensive' ? { damageTaken: 0.9, damageDone: 0.9, threat: 1.3 * defiance }
      : { crit: 3, damageTaken: 1.1, threat: 0.8 };
  c.applyAura(c.player, { id: STANCES[s].aura, name: STANCES[s].name, icon: STANCES[s].aura, duration: Infinity, ...mods });
  if (keepRage) c.player.resource = Math.min(c.player.resource, D.rage.tacticalMastery + 3 * t.improvedTacticalMastery);
}

// ------------------------------------------------------------------- rage
/** Rage from talents and abilities also makes threat (5 per rage, not modified by stance). */
function gainRage(c: Combat, n: number, threat = true): void {
  c.addResource(n);
  if (threat) c.addThreat(n * D.threatPerRage, { ignoreStance: true });
}

/** Forever's normalized rage: a fixed amount per landed white swing, from the listed weapon speed. */
function swingRage(c: Combat, hand: Hand, crit: boolean): number {
  const w = hand === 'main' ? c.stats.mainHand : c.stats.offHand;
  if (!w) return 0;
  const r = D.rage;
  const rate = hand === 'off'
    ? r.offHandPerSpeed * (1 + 0.1 * T(c).dualWieldSpecialization)
    : w.twoHand ? r.twoHandPerSpeed : r.oneHandPerSpeed;
  return rate * w.speed * (crit ? r.critFactor : 1);
}

/** Rage from damage taken: raw damage (armor and blocks ignored) scaled to an expected creature's health. */
function incomingRage(c: Combat, raw: number): number {
  const r = D.rage;
  return (raw * (1 - r.referenceArmor) * Number(c.options.incomingRage ?? r.incomingCoefficient)) / r.expectedHealth;
}

// --------------------------------------------------------------- helpers
function normalized(c: Combat, hand: Hand = 'main'): number {
  const w = hand === 'main' ? c.stats.mainHand : c.stats.offHand;
  const speed = w?.twoHand ? NORMALIZED_SPEED.twoHand : w?.type === 'dagger' ? NORMALIZED_SPEED.dagger : NORMALIZED_SPEED.oneHand;
  return c.weaponDamage(hand, { normalizedSpeed: speed });
}

/** A weapon attack with the main hand: avoided attacks refund 80 % of the cost. */
function strike(c: Combat, t: Unit, id: string, base: number, opts: { noDodge?: boolean; refund?: boolean; hand?: Hand; noCrit?: boolean } = {}): Outcome {
  let outcome = c.rollSpecial(t, id, { noDodge: opts.noDodge });
  if (opts.noCrit && outcome === 'crit') outcome = 'hit';
  const hand = opts.hand ?? 'main';
  if (!landed(outcome)) {
    if (opts.refund !== false) c.refund(D.refund);
    c.deal({ target: t, source: id, outcome, school: 'physical', amount: 0, white: false, hand });
    return outcome;
  }
  const amount = c.physicalDamage(t, id, base, outcome);
  c.deal({ target: t, source: id, outcome, school: 'physical', amount, white: false, hand, weaponStrike: true });
  return outcome;
}

/** Other dummies near the player, for cleaves and shouts. */
const others = (c: Combat, t: Unit, yards = 8) => c.targets.filter((u) => u !== t && u.health > 0 && c.inRange(u, yards));
const executePhase = (c: Combat) => !!c.target && c.target.health / c.target.maxHealth <= D.execute.threshold;
const focused = (c: Combat) => T(c).focusedRage;
const shoutCost = (c: Combat, base: number) => Math.round(base * (1 - 0.05 * T(c).boomingVoice));
const talent = (key: keyof Talents, name: string) => ({
  requirements: (c: Combat) => (T(c)[key] ? null : `Requires the ${name} talent`),
  usable: (c: Combat) => T(c)[key] > 0,
});
const note = (c: Combat, text: string, kind: 'proc' | 'resource' = 'proc') => c.emit('note', { text, kind });

/** Charge and Intercept: between 8 and 25 yards. */
function dashRange(c: Combat, t: Unit | null, min: number): string | null {
  if (!t) return UI.noTarget;
  return c.distance(t) < min * 0.9144 ? 'Target too close' : null;
}

// ------------------------------------------------------------- abilities
const abilities: Ability[] = [
  {
    id: 'attack', name: 'Attack', icon: 'melee', gcd: 0, target: 'enemy', range: 'melee',
    highlight: (c) => c.player.autoAttacking,
    description: () => 'Starts your auto attack. A warrior begins with no rage: auto attacks, Charge and Bloodrage are how a fight starts.',
    // Starting the auto attack is what the engine does after any attack.
    use: () => {},
  },
  // Stances: no GCD, a shared 1 s cooldown, rage above Tactical Mastery is lost.
  ...(['battle', 'defensive', 'berserker'] as Stance[]).map((s): Ability => ({
    id: STANCES[s].aura, name: STANCES[s].name, icon: STANCES[s].aura, gcd: 0, target: 'self',
    cooldown: D.stanceCooldown, cooldownGroup: 'stance',
    requirements: (c) => (stanceOf(c) === s ? 'You are already in that stance' : null),
    usable: (c) => stanceOf(c) !== s,
    highlight: (c) => stanceOf(c) === s,
    description: (c) => `${s === 'battle' ? 'Threat x0.8.' : s === 'defensive' ? 'Take 10% less damage, deal 10% less, threat x1.3.' : '+3% crit, take 10% more damage, threat x0.8.'} Changing stance keeps up to ${D.rage.tacticalMastery + 3 * T(c).improvedTacticalMastery} rage.`,
    use: (c) => enterStance(c, s),
  })),
  {
    id: 'heroicStrike', name: 'Heroic Strike', icon: 'heroicStrike', gcd: 0, target: 'enemy', range: 'melee', onNextSwing: true,
    animation: 'slash',
    cost: (c) => D.heroicStrike.cost - T(c).improvedHeroicStrike - focused(c),
    description: () => `Your next main-hand swing deals weapon damage plus ${D.heroicStrike.bonus}. Press again to cancel. The rage is spent when it lands, and that swing gives no rage.`,
    use: (c, t) => {
      if (landed(strike(c, t!, 'heroicStrike', c.weaponDamage('main') + D.heroicStrike.bonus))) c.addThreat(D.heroicStrike.threat);
    },
  },
  {
    id: 'cleave', name: 'Cleave', icon: 'cleave', gcd: 0, target: 'enemy', range: 'melee', onNextSwing: true,
    animation: 'slash',
    cost: (c) => D.cleave.cost - 3 * T(c).ragingBlows - focused(c),
    description: () => `Your next main-hand swing hits your target and one more nearby enemy for weapon damage plus ${D.cleave.bonus}.`,
    use: (c, t) => {
      for (const u of [t!, ...others(c, t!).slice(0, D.cleave.targets - 1)]) {
        if (landed(strike(c, u, 'cleave', c.weaponDamage('main') + D.cleave.bonus, { refund: false }))) c.addThreat(D.cleave.threat);
      }
    },
  },
  {
    id: 'bloodthirst', name: 'Bloodthirst', icon: 'bloodthirst', gcd: D.gcd, target: 'enemy', range: 'melee',
    animation: 'strike1',
    cost: () => D.bloodthirst.cost, cooldown: D.bloodthirst.cooldown, cooldownGroup: 'strike6',
    ...talent('bloodthirst', 'Bloodthirst'),
    description: (c) => `Deals ${D.bloodthirst.apRatio * 100}% of your attack power plus ${D.bloodthirst.bonus} (${Math.round(c.attackPower() * D.bloodthirst.apRatio + D.bloodthirst.bonus)}) and raises your attack speed by 10% for ${D.bloodthirst.duration} sec.`,
    use: (c, t) => {
      const b = D.bloodthirst;
      if (landed(strike(c, t!, 'bloodthirst', c.attackPower() * b.apRatio + b.bonus))) {
        c.applyAura(c.player, { id: 'bloodthirstHaste', name: 'Bloodthirst', icon: 'bloodthirst', duration: b.duration, haste: b.haste });
      }
    },
  },
  {
    id: 'mortalStrike', name: 'Mortal Strike', icon: 'mortalStrike', gcd: D.gcd, target: 'enemy', range: 'melee',
    animation: 'slash',
    cost: () => D.mortalStrike.cost, cooldown: D.mortalStrike.cooldown, cooldownGroup: 'strike6',
    ...talent('mortalStrike', 'Mortal Strike'),
    description: () => `Normalized weapon damage plus ${D.mortalStrike.bonus}; reduces healing on the target by 50%.`,
    use: (c, t) => { strike(c, t!, 'mortalStrike', normalized(c) + D.mortalStrike.bonus); },
  },
  {
    id: 'whirlwind', name: 'Whirlwind', icon: 'whirlwind', gcd: D.gcd, target: 'enemy', range: 'melee', needsFacing: false,
    animation: 'slash',
    cost: (c) => D.whirlwind.cost - 3 * T(c).ragingBlows, cooldown: D.whirlwind.cooldown,
    requirements: (c) => needsStance(c, 'berserker'),
    usable: (c) => stanceOf(c) === 'berserker',
    description: () => `Strikes up to ${D.whirlwind.targets} nearby enemies with normalized weapon damage, with both weapons when dual wielding.`,
    use: (c, t) => {
      for (const u of [t!, ...others(c, t!).slice(0, D.whirlwind.targets - 1)]) {
        strike(c, u, 'whirlwind', normalized(c), { refund: false });
        if (c.stats.offHand) strike(c, u, 'whirlwindOH', normalized(c, 'off'), { refund: false, hand: 'off' });
      }
    },
  },
  {
    id: 'slam', name: 'Slam', icon: 'slam', gcd: D.gcd, target: 'enemy', range: 'melee',
    animation: 'slash',
    cost: () => D.slam.cost,
    cooldown: (c) => D.slam.cooldown - (T(c).improvedSlam ? 3 : 0),
    castTime: (c) => D.slam.cast - 0.25 * T(c).improvedSlam,
    // Base Slam interrupts the swing timer (Blizzard); Improved Slam removes that.
    resetsSwing: true,
    description: (c) => `A ${(D.slam.cast - 0.25 * T(c).improvedSlam).toFixed(1)} sec cast: weapon damage plus ${D.slam.bonus}. Restarts your main-hand swing. Moving interrupts it.`,
    use: (c, t) => {
      if (landed(strike(c, t!, 'slam', c.weaponDamage('main') + D.slam.bonus))) c.addThreat(D.slam.threat);
    },
  },
  {
    id: 'execute', name: 'Execute', icon: 'execute', gcd: D.gcd, target: 'enemy', range: 'melee',
    animation: 'slash',
    cost: (c) => D.execute.cost - [0, 3, 5][T(c).improvedExecute],
    requirements: (c) => needsStance(c, 'battle', 'berserker') ?? (executePhase(c) ? null : 'The target must be below 20% health'),
    usable: (c) => executePhase(c) && stanceOf(c) !== 'defensive',
    highlight: executePhase,
    description: () => `Deals ${D.execute.base} damage plus ${D.execute.perRage} per extra rage; uses all your rage. Only below 20% health.`,
    use: (c, t) => {
      const extra = c.player.resource;
      c.player.resource = 0;
      strike(c, t!, 'execute', D.execute.base + D.execute.perRage * extra);
    },
  },
  {
    id: 'overpower', name: 'Overpower', icon: 'overpower', gcd: D.gcd, target: 'enemy', range: 'melee',
    animation: 'stab',
    cost: () => D.overpower.cost, cooldown: D.overpower.cooldown, cooldownGroup: 'overpowerRevenge',
    requirements: (c) => needsStance(c, 'battle') ?? (c.aura(c.player, 'overpowerReady') ? null : 'Only after the target dodges'),
    usable: (c) => stanceOf(c) === 'battle' && !!c.aura(c.player, 'overpowerReady'),
    highlight: (c) => !!c.aura(c.player, 'overpowerReady'),
    description: () => `Usable for ${D.overpower.window} sec after the target dodges. Normalized weapon damage plus ${D.overpower.bonus}; cannot be dodged, parried or blocked.`,
    use: (c, t) => {
      c.removeAura(c.player, 'overpowerReady');
      c.count('overpowerUsed');
      strike(c, t!, 'overpower', normalized(c) + D.overpower.bonus, { noDodge: true });
    },
  },
  {
    id: 'revenge', name: 'Revenge', icon: 'revenge', gcd: D.gcd, target: 'enemy', range: 'melee',
    animation: 'strike2',
    cost: (c) => D.revenge.cost - focused(c), cooldown: D.revenge.cooldown, cooldownGroup: 'overpowerRevenge',
    requirements: (c) => needsStance(c, 'defensive') ?? (c.aura(c.player, 'revengeReady') ? null : 'Only after you block, dodge or parry'),
    usable: (c) => stanceOf(c) === 'defensive' && !!c.aura(c.player, 'revengeReady'),
    highlight: (c) => !!c.aura(c.player, 'revengeReady'),
    description: (c) => `Usable for ${D.revenge.window} sec after you block, dodge or parry. Deals ${Math.round(D.revenge.min * (1 + 0.2 * T(c).improvedRevenge))}-${Math.round(D.revenge.max * (1 + 0.2 * T(c).improvedRevenge))} damage and a lot of threat.`,
    use: (c, t) => {
      c.removeAura(c.player, 'revengeReady');
      c.count('revengeUsed');
      const r = D.revenge;
      const base = (r.min + c.random() * (r.max - r.min)) * (1 + 0.2 * T(c).improvedRevenge);
      if (landed(strike(c, t!, 'revenge', base))) c.addThreat(270);
    },
  },
  {
    id: 'shieldSlam', name: 'Shield Slam', icon: 'shieldSlam', gcd: D.gcd, target: 'enemy', range: 'melee',
    animation: 'hook',
    cost: (c) => D.shieldSlam.cost - focused(c), cooldown: D.shieldSlam.cooldown, cooldownGroup: 'strike6',
    requirements: (c) => talent('shieldSlam', 'Shield Slam').requirements(c) ?? needsShield(c),
    usable: (c) => T(c).shieldSlam > 0 && hasShield(c),
    description: (c) => `Slams the target with your shield for ${D.shieldSlam.min}-${D.shieldSlam.max} plus your block value (${c.stats.tank?.blockValue ?? 0}).`,
    use: (c, t) => {
      const s = D.shieldSlam;
      const base = s.min + c.random() * (s.max - s.min) + (c.stats.tank?.blockValue ?? 0);
      if (landed(strike(c, t!, 'shieldSlam', base))) c.addThreat(s.threat);
    },
  },
  {
    id: 'shieldBlock', name: 'Shield Block', icon: 'shieldBlock', gcd: 0, target: 'self',
    cost: () => D.shieldBlock.cost, cooldown: D.shieldBlock.cooldown,
    requirements: (c) => needsStance(c, 'defensive') ?? needsShield(c),
    usable: (c) => stanceOf(c) === 'defensive' && hasShield(c),
    description: () => `+${D.shieldBlock.block}% block chance for ${D.shieldBlock.duration} sec or ${D.shieldBlock.charges} blocks. Each block opens Revenge.`,
    use: (c) => {
      const sb = D.shieldBlock;
      c.mod.block = sb.block;
      c.applyAura(c.player, {
        id: 'shieldBlock', name: 'Shield Block', icon: 'shieldBlock', duration: sb.duration, stacks: sb.charges,
        onRemove: (cc) => { cc.mod.block = 0; },
      });
    },
  },
  {
    id: 'sunderArmor', name: 'Sunder Armor', icon: 'sunderArmor', gcd: D.gcd, target: 'enemy', range: 'melee',
    animation: 'strike2',
    cost: (c) => D.sunderArmor.cost - T(c).improvedSunderArmor - focused(c),
    description: () => `Reduces the target's armor by ${D.sunderArmor.armor} per stack, up to ${D.sunderArmor.stacks}, for ${D.sunderArmor.duration} sec. Cannot crit. Does not stack with Expose Armor: the stronger one applies.`,
    use: (c, t) => {
      const u = t!;
      const outcome = c.rollSpecial(u, 'sunderArmor');
      if (!landed(outcome)) {
        c.refund(D.refund);
        c.deal({ target: u, source: 'sunderArmor', outcome, school: 'physical', amount: 0, white: false });
        return;
      }
      const s = D.sunderArmor;
      const stacks = Math.min(s.stacks, (c.aura(u, 'sunderArmor')?.stacks ?? 0) + 1);
      c.applyAura(u, { id: 'sunderArmor', name: 'Sunder Armor', icon: 'sunderArmor', duration: s.duration, stacks, armor: s.armor * stacks, armorSlot: 'major' });
      c.addThreat(s.threat);
    },
  },
  {
    id: 'thunderClap', name: 'Thunder Clap', icon: 'thunderClap', gcd: D.gcd, target: 'enemy', range: 8, needsFacing: false,
    animation: 'block',
    cost: (c) => D.thunderClap.cost - 2 * T(c).improvedThunderClap - focused(c), cooldown: D.thunderClap.cooldown,
    requirements: (c) => needsStance(c, 'battle', 'defensive'),
    usable: (c) => stanceOf(c) !== 'berserker',
    description: () => `Deals ${D.thunderClap.damage} damage to up to ${D.thunderClap.targets} nearby enemies and slows their attacks by ${D.thunderClap.slow * 100}% for ${D.thunderClap.duration} sec.`,
    use: (c, t) => {
      const tc = D.thunderClap;
      for (const u of [t!, ...others(c, t!).slice(0, tc.targets - 1)]) {
        const outcome = c.rollSpell(c.critChance('thunderClap'));
        const amount = outcome === 'resist' ? 0 : Math.round(tc.damage * c.auraProduct('damageDone') * (outcome === 'crit' ? c.rules.spellCritMultiplier : 1));
        c.deal({ target: u, source: 'thunderClap', outcome, school: 'physical', amount, white: false });
        if (outcome !== 'resist') c.applyAura(u, { id: 'thunderClap', name: 'Thunder Clap', icon: 'thunderClap', duration: tc.duration, attackSlow: tc.slow });
      }
    },
  },
  {
    id: 'demoralizingShout', name: 'Demoralizing Shout', icon: 'demoralizingShout', gcd: D.gcd, target: 'self',
    animation: 'cast',
    cost: (c) => shoutCost(c, D.demoralizingShout.cost),
    description: () => `Lowers the attack power of nearby enemies by ${D.demoralizingShout.apReduction} for ${D.demoralizingShout.duration} sec: the dummy hits you softer.`,
    use: (c) => {
      const d = D.demoralizingShout;
      for (const u of c.targets.filter((x) => x.health > 0 && c.inRange(x, 10))) {
        c.applyAura(u, { id: 'demoralizingShout', name: 'Demoralizing Shout', icon: 'demoralizingShout', duration: d.duration, apReduction: d.apReduction });
        c.addThreat(d.threat);
      }
    },
  },
  {
    id: 'battleShout', name: 'Battle Shout', icon: 'battleShout', gcd: D.gcd, target: 'self',
    animation: 'cast',
    cost: (c) => shoutCost(c, D.battleShout.cost),
    description: () => `+${D.battleShout.ap} attack power for ${D.battleShout.duration / 60} min.`,
    use: (c) => {
      c.applyAura(c.player, { id: 'battleShout', name: 'Battle Shout', icon: 'battleShout', duration: D.battleShout.duration, attackPower: D.battleShout.ap });
      c.addThreat(D.battleShout.threat);
    },
  },
  {
    id: 'bloodrage', name: 'Bloodrage', icon: 'bloodrage', gcd: 0, target: 'self',
    cooldown: D.bloodrage.cooldown,
    description: (c) => `Gain ${Math.round(D.bloodrage.now * (1 + 0.25 * T(c).improvedBloodrage))} rage now and ${Math.round(D.bloodrage.overTime * (1 + 0.25 * T(c).improvedBloodrage))} over ${D.bloodrage.duration} sec, at the cost of some health.`,
    use: (c) => {
      const mult = 1 + 0.25 * T(c).improvedBloodrage;
      gainRage(c, D.bloodrage.now * mult);
      c.count('bloodrageRage', D.bloodrage.now * mult);
      if (!c.playerHealthLocked) c.player.health = Math.max(1, c.player.health - 338);
      c.applyAura(c.player, {
        id: 'bloodrage', name: 'Bloodrage', icon: 'bloodrage', duration: D.bloodrage.duration, period: 1,
        onTick: (cc) => { gainRage(cc, (D.bloodrage.overTime / D.bloodrage.duration) * mult); },
      });
    },
  },
  {
    id: 'berserkerRage', name: 'Berserker Rage', icon: 'berserkerRage', gcd: D.gcd, target: 'self',
    cooldown: D.berserkerRage.cooldown,
    requirements: (c) => needsStance(c, 'berserker'),
    usable: (c) => stanceOf(c) === 'berserker',
    description: (c) => `Immune to fear for ${D.berserkerRage.duration} sec and gain extra rage when hit.${T(c).improvedBerserkerRage ? ` Gain ${5 * T(c).improvedBerserkerRage} rage now.` : ''}`,
    use: (c) => {
      if (T(c).improvedBerserkerRage) gainRage(c, 5 * T(c).improvedBerserkerRage);
      c.applyAura(c.player, { id: 'berserkerRage', name: 'Berserker Rage', icon: 'berserkerRage', duration: D.berserkerRage.duration });
    },
  },
  {
    id: 'recklessness', name: 'Recklessness', icon: 'recklessness', gcd: D.gcd, target: 'self',
    cooldown: D.recklessness.cooldown,
    requirements: (c) => needsStance(c, 'berserker'),
    usable: (c) => stanceOf(c) === 'berserker',
    description: () => `+${D.recklessness.crit}% crit for ${D.recklessness.duration} sec; you take 20% more damage.`,
    use: (c) => {
      const r = D.recklessness;
      c.applyAura(c.player, { id: 'recklessness', name: 'Recklessness', icon: 'recklessness', duration: r.duration, crit: r.crit, damageTaken: r.damageTaken });
    },
  },
  {
    id: 'deathWish', name: 'Death Wish', icon: 'deathWish', gcd: D.gcd, target: 'self',
    cost: () => D.deathWish.cost, cooldown: D.deathWish.cooldown,
    ...talent('deathWish', 'Death Wish'),
    description: () => `+20% physical damage for ${D.deathWish.duration} sec; you take 5% more damage.`,
    use: (c) => {
      const d = D.deathWish;
      c.applyAura(c.player, { id: 'deathWish', name: 'Death Wish', icon: 'deathWish', duration: d.duration, damageDone: d.damage, damageTaken: d.damageTaken });
    },
  },
  {
    id: 'sweepingStrikes', name: 'Sweeping Strikes', icon: 'sweepingStrikes', gcd: 0, target: 'self',
    cost: () => D.sweepingStrikes.cost, cooldown: D.sweepingStrikes.cooldown,
    requirements: (c) => talent('sweepingStrikes', 'Sweeping Strikes').requirements(c) ?? needsStance(c, 'battle'),
    usable: (c) => T(c).sweepingStrikes > 0 && stanceOf(c) === 'battle',
    description: () => `Your next ${D.sweepingStrikes.charges} melee attacks also hit a second nearby enemy.`,
    use: (c) => {
      const s = D.sweepingStrikes;
      c.applyAura(c.player, { id: 'sweepingStrikes', name: 'Sweeping Strikes', icon: 'sweepingStrikes', duration: s.duration, stacks: s.charges });
    },
  },
  {
    id: 'rend', name: 'Rend', icon: 'rend', gcd: D.gcd, target: 'enemy', range: 'melee',
    animation: 'strike2',
    cost: () => D.rend.cost,
    requirements: (c) => needsStance(c, 'battle', 'defensive'),
    usable: (c) => stanceOf(c) !== 'berserker',
    description: (c) => `Wounds the target: ${D.rend.ticks} ticks of ${Math.round(D.rend.tick * (1 + [0, 0.12, 0.23, 0.35][T(c).improvedRend]))} every ${D.rend.period} sec. Ticks can crit; ignores armor.`,
    use: (c, t) => {
      const u = t!;
      const outcome = c.rollSpecial(u, 'rend');
      if (!landed(outcome)) {
        c.refund(D.refund);
        c.deal({ target: u, source: 'rend', outcome, school: 'physical', amount: 0, white: false });
        return;
      }
      const tick = D.rend.tick * (1 + [0, 0.12, 0.23, 0.35][T(c).improvedRend]);
      c.applyAura(u, {
        id: 'rend', name: 'Rend', icon: 'rend', duration: D.rend.ticks * D.rend.period, period: D.rend.period,
        onTick: (cc) => {
          const crit = cc.rollTickCrit(cc.critChance('rend'));
          const amount = Math.round(tick * cc.auraProduct('damageDone') * (crit ? cc.rules.critMultiplier : 1));
          cc.deal({ target: u, source: 'rend', outcome: crit ? 'crit' : 'hit', school: 'physical', amount, white: false, periodic: true });
        },
      });
    },
  },
  {
    id: 'hamstring', name: 'Hamstring', icon: 'hamstring', gcd: D.gcd, target: 'enemy', range: 'melee',
    animation: 'strike2',
    cost: () => D.hamstring.cost,
    requirements: (c) => needsStance(c, 'battle', 'berserker'),
    usable: (c) => stanceOf(c) !== 'defensive',
    description: () => `Deals ${D.hamstring.damage} damage and slows the target's movement.`,
    use: (c, t) => { strike(c, t!, 'hamstring', D.hamstring.damage); },
  },
  {
    id: 'pummel', name: 'Pummel', icon: 'pummel', gcd: D.gcd, target: 'enemy', range: 'melee',
    animation: 'jab',
    cost: () => D.pummel.cost, cooldown: D.pummel.cooldown, cooldownGroup: 'interrupt',
    requirements: (c) => needsStance(c, 'berserker'),
    usable: (c) => stanceOf(c) === 'berserker',
    description: () => `Deals ${D.pummel.damage} damage and interrupts spellcasting.`,
    use: (c, t) => { strike(c, t!, 'pummel', D.pummel.damage); },
  },
  {
    id: 'shieldBash', name: 'Shield Bash', icon: 'shieldBash', gcd: D.gcd, target: 'enemy', range: 'melee',
    animation: 'hook',
    cost: () => D.shieldBash.cost, cooldown: D.shieldBash.cooldown, cooldownGroup: 'interrupt',
    requirements: (c) => needsStance(c, 'battle', 'defensive') ?? needsShield(c),
    usable: (c) => stanceOf(c) !== 'berserker' && hasShield(c),
    description: () => `Deals ${D.shieldBash.damage} damage and interrupts spellcasting.`,
    use: (c, t) => { strike(c, t!, 'shieldBash', D.shieldBash.damage); },
  },
  {
    id: 'shieldWall', name: 'Shield Wall', icon: 'shieldWall', gcd: D.gcd, target: 'self',
    cooldown: (c) => D.shieldWall.cooldown - 330 * T(c).improvedShieldWall,
    requirements: (c) => needsStance(c, 'defensive') ?? needsShield(c),
    usable: (c) => stanceOf(c) === 'defensive' && hasShield(c),
    description: () => `Take 60% less damage for ${D.shieldWall.duration} sec.`,
    use: (c) => { c.applyAura(c.player, { id: 'shieldWall', name: 'Shield Wall', icon: 'shieldWall', duration: D.shieldWall.duration, damageTaken: D.shieldWall.damageTaken }); },
  },
  {
    id: 'lastStand', name: 'Last Stand', icon: 'lastStand', gcd: 0, target: 'self',
    cooldown: D.lastStand.cooldown,
    ...talent('lastStand', 'Last Stand'),
    description: () => `+30% maximum health for ${D.lastStand.duration} sec; it is lost when the effect ends.`,
    use: (c) => {
      const p = c.player;
      const extra = Math.round(p.maxHealth * D.lastStand.health);
      p.maxHealth += extra;
      p.health += extra;
      c.applyAura(p, {
        id: 'lastStand', name: 'Last Stand', icon: 'lastStand', duration: D.lastStand.duration,
        onRemove: (cc) => { cc.player.maxHealth -= extra; cc.player.health = Math.min(cc.player.health, cc.player.maxHealth); },
      });
    },
  },
  {
    id: 'concussionBlow', name: 'Concussion Blow', icon: 'concussionBlow', gcd: D.gcd, target: 'enemy', range: 'melee',
    animation: 'cross',
    cost: () => D.concussionBlow.cost, cooldown: D.concussionBlow.cooldown,
    ...talent('concussionBlow', 'Concussion Blow'),
    description: () => `Stuns the target for ${D.concussionBlow.duration} sec. Most bosses are immune.`,
    use: (c, t) => { c.applyAura(t!, { id: 'concussionBlow', name: 'Concussion Blow', icon: 'concussionBlow', duration: D.concussionBlow.duration }); },
  },
  {
    id: 'charge', name: 'Charge', icon: 'charge', gcd: 0, target: 'enemy', range: D.charge.maxRange, needsFacing: false,
    cooldown: D.charge.cooldown,
    requirements: (c, t) => (c.player.inCombat ? UI.cantInCombat : null)
      ?? (T(c).vanguard ? needsStance(c, 'battle', 'defensive') : needsStance(c, 'battle')) ?? dashRange(c, t, D.charge.minRange),
    usable: (c) => !c.player.inCombat,
    description: (c) => `Charge an enemy from ${D.charge.minRange} to ${D.charge.maxRange} yards away, stunning it briefly. Generates ${D.charge.rage + 3 * T(c).improvedCharge} rage. Out of combat only.`,
    use: (c, t) => {
      gainRage(c, D.charge.rage + 3 * T(c).improvedCharge);
      c.emit('dash', t!);
      c.applyAura(t!, { id: 'charge', name: 'Charge', icon: 'charge', duration: 1 });
    },
  },
  {
    id: 'intercept', name: 'Intercept', icon: 'intercept', gcd: 0, target: 'enemy', range: D.intercept.maxRange, needsFacing: false,
    cost: () => D.intercept.cost, cooldown: (c) => D.intercept.cooldown - 5 * T(c).improvedIntercept,
    requirements: (c, t) => needsStance(c, 'berserker') ?? dashRange(c, t, D.intercept.minRange),
    usable: (c) => stanceOf(c) === 'berserker',
    description: () => `Charge an enemy from ${D.intercept.minRange} to ${D.intercept.maxRange} yards away for ${D.intercept.damage} damage, stunning it for 3 sec.`,
    use: (c, t) => {
      c.emit('dash', t!);
      strike(c, t!, 'intercept', D.intercept.damage);
    },
  },
  {
    id: 'spearingStrike', name: 'Spearing Strike', icon: 'spearingStrike', gcd: D.gcd, target: 'enemy', range: 'melee',
    animation: 'stab',
    cost: () => D.spearingStrike.cost, cooldown: D.spearingStrike.cooldown,
    requirements: (c) => talent('spearingStrike', 'Spearing Strike').requirements(c) ?? needsStance(c, 'battle'),
    usable: (c) => T(c).spearingStrike > 0 && stanceOf(c) === 'battle',
    description: () => `${D.spearingStrike.percent * 100}% normalized weapon damage; more against Giants, Dragonkin and mounted enemies.`,
    use: (c, t) => { strike(c, t!, 'spearingStrike', normalized(c) * D.spearingStrike.percent); },
  },
];

// ----------------------------------------------------------------- setup
const weaponOf = (c: Combat, hand: Hand): Weapon | null => (hand === 'main' ? c.stats.mainHand : c.stats.offHand);
const ABILITY_SOURCES = ['heroicStrike', 'cleave', 'bloodthirst', 'mortalStrike', 'whirlwind', 'whirlwindOH', 'slam', 'execute',
  'overpower', 'revenge', 'shieldSlam', 'hamstring', 'pummel', 'shieldBash', 'intercept', 'spearingStrike'];

function prepare(c: Combat): void {
  const t = T(c);
  const p = c.player;
  states.set(c, { lastWeaponmaster: -Infinity });
  p.maxResource = D.maxRage;
  p.regenPerSecond = 0;
  p.decayPerSecond = D.decayOutOfCombat * (t.angerManagement ? 0.7 : 1);

  c.mod.crit = t.cruelty;
  c.mod.hitOff = [0, 4, 7, 10][t.furiousPrecision];
  c.mod.offHand = 1 + 0.05 * t.dualWieldSpecialization;
  const impale = c.rules.critMultiplier + 0.1 * t.impale;
  for (const id of ABILITY_SOURCES) c.mod.critMultiplierFor[id] = impale;
  c.mod.critFor.overpower = 25 * t.improvedOverpower;
  if (c.stats.mainHand.twoHand) c.mod.physicalDamage *= 1 + 0.01 * t.twoHandedWeaponSpecialization;
  if (hasShield(c)) c.mod.physicalDamage *= 1 + 0.02 * t.bastion;
  c.mod.threatFor = { execute: 1.25, whirlwind: 1.25, whirlwindOH: 1.25, hamstring: 1.25, overpower: 0.75, revenge: 2.25, thunderClap: 2.5 };

  // Weaponmaster, per weapon in each hand.
  const wm = t.weaponmaster;
  for (const hand of ['main', 'off'] as Hand[]) {
    const w = weaponOf(c, hand);
    if (!w || !wm) continue;
    const sources = hand === 'main' ? ['melee_mh', ...ABILITY_SOURCES] : ['melee_oh', 'whirlwindOH'];
    for (const s of sources) {
      if (w.type === 'axe' || w.type === 'polearm') c.mod.critFor[s] = (c.mod.critFor[s] ?? 0) + wm;
      if (w.type === 'mace') c.mod.armorIgnoreFor[s] = 0.03 * wm;
    }
  }

  enterStance(c, build(c).stance, false);
  c.trackedAuras.push('flurry', 'shieldBlock', 'battleShout');
  c.trackedTargetAuras.push('sunderArmor', 'rend', 'thunderClap', 'demoralizingShout');
  c.registerSource('deepWounds', 'Deep Wounds', 'deepWounds');
  c.registerSource('whirlwindOH', 'Whirlwind (off hand)', 'whirlwind');
  c.registerSource('sweepingStrikesCopy', 'Sweeping Strikes', 'sweepingStrikes');

  // Anger Management: 1 rage every 3 sec in combat.
  if (t.angerManagement) {
    c.applyAura(p, {
      id: 'angerManagement', name: 'Anger Management', icon: 'angerManagement', duration: Infinity, period: 3, hidden: true,
      onTick: (cc) => { if (cc.player.inCombat) gainRage(cc, 1); },
    });
  }

  // Landed white swings: normalized rage, Unbridled Wrath, Weaponmaster swords, Bloodthrill.
  let extra = false;
  c.onHit.push((hit: Hit) => {
    const hand = hit.hand ?? 'main';
    if (hit.white) {
      c.addResource(swingRage(c, hand, hit.outcome === 'crit'));
      if (t.unbridledWrath && roll(c, 12 * t.unbridledWrath)) {
        c.addResource(1);
        c.count('unbridledWrath');
      }
    }
    const w = weaponOf(c, hand);
    const s = states.get(c)!;
    if (!extra && wm && w?.type === 'sword' && c.t - s.lastWeaponmaster >= D.weaponmasterIcd && roll(c, wm)) {
      extra = true;
      s.lastWeaponmaster = c.t;
      c.count('weaponmaster');
      note(c, 'Weaponmaster!');
      c.extraAttack(hit.target);
      extra = false;
    }
    if (t.bloodthrill && hand === 'main' && c.aura(hit.target, 'rend') && roll(c, 4 * t.bloodthrill)) {
      c.applyAura(c.player, { id: 'overpowerReady', name: 'Overpower', icon: 'overpower', duration: 6 });
      c.count('overpowerWindows');
      note(c, 'Bloodthrill: Overpower');
    }
  });

  c.afterDamage.push((hit: Hit) => {
    if (hit.periodic || hit.school !== 'physical' || hit.source === 'deepWounds' || hit.source === 'sweepingStrikesCopy') return;
    // Overpower opens for 5 sec after the target dodges.
    if (hit.outcome === 'dodge') {
      c.applyAura(c.player, { id: 'overpowerReady', name: 'Overpower', icon: 'overpower', duration: D.overpower.window });
      c.count('overpowerWindows');
    }
    // Flurry: each white swing (and Heroic Strike/Cleave) spends a charge; a crit refreshes it.
    const fl = c.aura(c.player, 'flurry');
    if (fl && (hit.white || hit.source === 'heroicStrike' || hit.source === 'cleave')) {
      fl.stacks = (fl.stacks ?? 1) - 1;
      if (fl.stacks <= 0) c.removeAura(c.player, 'flurry');
    }
    if (hit.outcome === 'crit' && t.flurry) {
      c.applyAura(c.player, { id: 'flurry', name: 'Flurry', icon: 'flurry', duration: 15, stacks: D.flurryCharges, haste: 0.05 * t.flurry });
    }
    // Deep Wounds: any physical crit bleeds for a share of average weapon damage (no AP, cannot crit).
    if (hit.outcome === 'crit' && t.deepWounds) {
      const w = c.stats.mainHand;
      const old = c.aura(hit.target, 'deepWounds');
      const unpaid = old ? (old.value ?? 0) * ((old.end - c.t) / old.duration) : 0;
      const total = 0.2 * t.deepWounds * ((w.min + w.max) / 2) + unpaid;
      const dw = D.deepWounds;
      const target = hit.target;
      c.applyAura(target, {
        id: 'deepWounds', name: 'Deep Wounds', icon: 'deepWounds', duration: dw.ticks * dw.period, period: dw.period, value: total,
        onTick: (cc) => cc.deal({ target, source: 'deepWounds', outcome: 'hit', school: 'physical', amount: Math.round(total / dw.ticks), white: false, periodic: true }),
      });
    }
    // Sweeping Strikes copies landed hits to a second nearby dummy.
    const ss = c.aura(c.player, 'sweepingStrikes');
    if (ss && hit.amount > 0 && hit.target === c.target) {
      const other = others(c, hit.target)[0];
      if (other) {
        c.deal({ target: other, source: 'sweepingStrikesCopy', outcome: hit.outcome, school: 'physical', amount: hit.amount, white: false });
        ss.stacks = (ss.stacks ?? 1) - 1;
        if (ss.stacks <= 0) c.removeAura(c.player, 'sweepingStrikes');
      }
    }
  });

  // The attacking dummy: rage from damage taken, Revenge, Shield Block charges, procs.
  c.onIncoming.push((i: Incoming) => {
    // Unmitigated damage: crits and crushing blows give more, blocks and armor do not lower it; avoided hits give none.
    if (i.raw > 0) {
      const rage = incomingRage(c, i.raw);
      c.addResource(rage);
      c.count('incomingRage', rage);
      if (c.aura(c.player, 'berserkerRage')) c.addResource(D.berserkerRage.ragePerHit);
      if (t.enrage && roll(c, D.enrage.chance)) {
        c.applyAura(c.player, { id: 'enrage', name: 'Enrage', icon: 'enrage', duration: D.enrage.duration, damageDone: 1 + 0.02 * t.enrage });
      }
    }
    if (i.outcome === 'block' || i.outcome === 'dodge' || i.outcome === 'parry') {
      c.applyAura(c.player, { id: 'revengeReady', name: 'Revenge', icon: 'revenge', duration: D.revenge.window });
      c.count('revengeWindows');
    }
    if (i.outcome === 'block') {
      const sb = c.aura(c.player, 'shieldBlock');
      if (sb) {
        sb.stacks = (sb.stacks ?? 1) - 1;
        if (sb.stacks <= 0) c.removeAura(c.player, 'shieldBlock');
      }
      if (t.shieldSpecialization && roll(c, 20 * t.shieldSpecialization)) {
        gainRage(c, 5);
        note(c, '+5 Rage', 'resource');
      }
    }
    if ((i.outcome === 'dodge' || i.outcome === 'parry') && hasShield(c) && t.masterOfDefense && roll(c, 50 * t.masterOfDefense)) {
      gainRage(c, 5);
      note(c, '+5 Rage', 'resource');
    }
  });
}

// ------------------------------------------------------------- rotations
/**
 * The sims' priority lists (research/warrior_forever.md → Suggested ability).
 * Fight-length checks are dropped: the dummy never dies.
 */
function suggest(c: Combat): string | null {
  const t = c.target;
  if (!t || t.health <= 0) return null;
  const p = c.player;
  const tl = T(c);
  const b = build(c);
  const rage = p.resource;
  const ready = (id: string) => c.cooldownLeft(id).left === 0 && (c.ability(id)?.usable?.(c) ?? true);
  const exec = executePhase(c);
  const stance = stanceOf(c);
  const hsQueued = !!c.queuedSwing;
  const sunder = c.aura(t, 'sunderArmor');
  const sunderSafe = !!sunder && (sunder.stacks ?? 0) >= 5 && sunder.end - c.t > 8;
  const cost = (id: string) => c.cost(c.ability(id)!);

  if (!p.inCombat && c.cooldownLeft('charge').left === 0 && c.distance(t) > 8 * 0.9144 && c.distance(t) < 25 * 0.9144 && stance === 'battle') return 'charge';
  // A fight starts with the auto attack: rage comes from landed swings.
  if (!p.autoAttacking && c.inRange(t)) return 'attack';

  if (b.rotation === 'protection') {
    if (stance !== 'defensive') return 'defensiveStance';
    const bs = c.aura(p, 'battleShout');
    if ((!bs || bs.end - c.t < 3) && rage >= 10) return 'battleShout';
    if (!c.playerHealthLocked && p.health / p.maxHealth < 0.35 && ready('shieldWall')) return 'shieldWall';
    if (!c.playerHealthLocked && p.health / p.maxHealth < 0.3 && tl.lastStand && ready('lastStand')) return 'lastStand';
    const sb = c.aura(p, 'shieldBlock');
    if (c.enemyAttacks.on && rage >= 15 && (!sb || sb.end - c.t < 1) && ready('shieldBlock')) return 'shieldBlock';
    if (rage < 35 && ready('bloodrage')) return 'bloodrage';
    if (sunder && (sunder.stacks ?? 0) >= 5 && sunder.end - c.t <= 8 && rage >= cost('sunderArmor')) return 'sunderArmor';
    const tc = c.aura(t, 'thunderClap');
    if ((!tc || tc.end - c.t <= 3) && ready('thunderClap') && rage >= cost('thunderClap')) return 'thunderClap';
    const demo = c.aura(t, 'demoralizingShout');
    if ((!demo || demo.end - c.t <= 4) && rage >= cost('demoralizingShout')) return 'demoralizingShout';
    if ((!sunder || (sunder.stacks ?? 0) < 5) && rage >= cost('sunderArmor')) return 'sunderArmor';
    const reserve = (id: string) => sunderSafe || rage >= cost(id) + cost('sunderArmor') + cost('shieldBlock');
    if (ready('revenge') && reserve('revenge')) return 'revenge';
    if (ready('shieldSlam') && reserve('shieldSlam')) return 'shieldSlam';
    if (!hsQueued && rage >= 20 && reserve('heroicStrike')) return 'heroicStrike';
    if (rage >= 45) return 'sunderArmor';
    return null;
  }

  if (b.rotation === 'arms') {
    if (stance !== 'battle') return 'battleStance';
    const bs = c.aura(p, 'battleShout');
    if (!bs && rage >= 10) return 'battleShout';
    if (c.options.sunderDuty && (!sunder || (sunder.stacks ?? 0) < 5 || sunder.end - c.t < 8) && rage >= cost('sunderArmor')) return 'sunderArmor';
    if (ready('bloodrage') && rage < 50) return 'bloodrage';
    if (c.targets.length > 1 && tl.sweepingStrikes && ready('sweepingStrikes') && rage >= cost('sweepingStrikes')) return 'sweepingStrikes';
    if (ready('overpower')) return 'overpower';
    if (!c.aura(t, 'rend') && rage >= cost('rend')) return 'rend';
    if (exec && ready('execute')) return 'execute';
    if (ready('mortalStrike')) return rage >= cost('mortalStrike') ? 'mortalStrike' : null;
    if (ready('slam') && rage >= 15) return 'slam';
    if (!hsQueued && !exec && rage >= 70) return 'heroicStrike';
    if (tl.spearingStrike && ready('spearingStrike') && rage >= 15) return 'spearingStrike';
    return null;
  }

  // Fury and two-hand Bloodthirst.
  const hsAt = b.rotation === 'twoHandBloodthirst' ? 50 : 30;
  const bs = c.aura(p, 'battleShout');
  if (!bs && rage >= 10) return 'battleShout';
  if (c.options.sunderDuty && (!sunder || (sunder.stacks ?? 0) < 5 || sunder.end - c.t < 8)) {
    return rage >= cost('sunderArmor') ? 'sunderArmor' : null;
  }
  if (p.inCombat && stance === 'berserker' && ready('recklessness')) return 'recklessness';
  if (p.inCombat && tl.deathWish && ready('deathWish') && rage >= 10) return 'deathWish';
  if (ready('bloodrage')) return 'bloodrage';
  if (p.inCombat && stance === 'berserker' && ready('berserkerRage')) return 'berserkerRage';
  const opWindow = !!c.aura(p, 'overpowerReady');
  if (stance === 'berserker' && opWindow && rage <= 25 && !exec && !c.aura(p, 'recklessness') && c.cooldownLeft('overpower').left === 0) return 'battleStance';
  if (stance === 'battle' && opWindow && ready('overpower')) return 'overpower';
  if (stance !== 'berserker') return 'berserkerStance';
  if (exec && ready('execute')) return 'execute';
  if (ready('bloodthirst')) return rage >= cost('bloodthirst') ? 'bloodthirst' : null;
  if (ready('whirlwind')) return rage >= cost('whirlwind') ? 'whirlwind' : null;
  if (ready('slam') && rage >= 30) return 'slam';
  if (!hsQueued && !exec && rage >= hsAt) return 'heroicStrike';
  return null;
}

// ------------------------------------------------------- practice helpers
function chances(c: Combat): { title: string; rows: [string, string][] }[] {
  const tl = T(c);
  const pct = (n: number) => `${Math.max(0, n).toFixed(1)}%`;
  const r = c.rules;
  const hit = c.totalHit();
  const dual = !!c.stats.offHand;
  const mh = c.stats.mainHand, oh = c.stats.offHand;
  const procs: [string, string][] = [];
  if (tl.flurry) procs.push(['Flurry: faster attacks for 3 swings after a crit', `+${5 * tl.flurry}% speed`]);
  if (tl.unbridledWrath) procs.push(['Unbridled Wrath: +1 rage per landed white swing', `${12 * tl.unbridledWrath}%`]);
  if (tl.deepWounds) procs.push(['Deep Wounds: bleed after any crit', `${20 * tl.deepWounds}% of weapon damage over 12 s`]);
  if (tl.weaponmaster && [mh, oh].some((w) => w?.type === 'sword')) procs.push(['Weaponmaster: extra attack per sword hit', `${tl.weaponmaster}%`]);
  if (tl.bloodthrill) procs.push(['Bloodthrill: Overpower from main-hand hits on your Rend target', `${4 * tl.bloodthrill}%`]);
  if (tl.enrage) procs.push(['Enrage when the dummy hits you', `${D.enrage.chance}%: +${2 * tl.enrage}% damage`]);
  if (tl.shieldSpecialization) procs.push(['Shield Specialization: +5 rage on a block', `${20 * tl.shieldSpecialization}%`]);
  if (tl.masterOfDefense) procs.push(['Master of Defense: +5 rage on a dodge or parry', `${Math.min(100, 50 * tl.masterOfDefense)}%`]);
  const rage: [string, string][] = [
    ['Main hand per landed swing (crit x2)', `${swingRage(c, 'main', false).toFixed(1)} rage`],
  ];
  if (oh) rage.push(['Off hand per landed swing', `${swingRage(c, 'off', false).toFixed(1)} rage`]);
  rage.push(
    ['Misses, dodges, parries, Heroic Strike swings', '0 rage'],
    ['Per hit taken: normal / crit / crushing blow (unmitigated damage)', [1, 2, 1.5].map((m) => incomingRage(c, m * c.enemyAttacks.damage * (1 + 1 / 6 + c.enemyAttacks.ap / 2478)).toFixed(1)).join(' / ') + ' rage'],
    ['Hits you dodge, parry or that miss you', '0 rage'],
    ['Kept when changing stance', `${D.rage.tacticalMastery + 3 * tl.improvedTacticalMastery} rage`],
  );
  const groups = [
    {
      title: 'Your attacks',
      rows: [
        [`Crit chance in ${STANCES[stanceOf(c)].name}`, pct(c.critChance('melee_mh'))],
        [`Auto attack: miss${dual ? ' (main / off hand)' : ''} / dodge / glancing`,
          `${dual ? `${pct(r.dualWieldMiss - hit)} / ${pct(r.dualWieldMiss - hit - c.mod.hitOff)}` : pct(r.specialMiss - hit)} / ${pct(c.dodgeChance())} / ${pct(r.glanceChance)}`],
        ['Abilities: miss / dodge', `${pct(r.specialMiss - hit)} / ${pct(c.dodgeChance())}`],
        ['Parry and block if you stand in front', `${pct(r.parryFromFront)} / 5.0%`],
      ] as [string, string][],
    },
    { title: 'Rage (WoW Forever, normalized)', rows: rage },
    { title: 'Procs', rows: procs },
  ];
  if (c.stats.tank) {
    const tbl = c.enemyTable(c.target ?? c.targets[0]);
    groups.push({
      title: 'The attacking dummy against you',
      rows: [
        ['Miss / dodge / parry / block', `${pct(tbl.miss)} / ${pct(tbl.dodge)} / ${pct(tbl.parry)} / ${pct(tbl.block)}`],
        ['Block with Shield Block', pct(Math.max(0, (c.stats.tank.block + D.shieldBlock.block) - 0.6))],
        ['Crit / crushing blow', `${pct(tbl.crit)} / ${pct(tbl.crush)}`],
        ['Your armor reduces its damage by', pct(c.playerArmorReduction() * 100)],
      ],
    });
  }
  return groups;
}

function review(c: Combat): { label: string; value: string; good?: boolean }[] {
  const k = c.counters;
  const time = k.combatTime ?? 0;
  if (time < 1) return [];
  const b = build(c);
  const pctOf = (n: number) => `${Math.round(n * 100)}%`;
  const uptime = (key: string) => (k[key] ?? 0) / time;
  const casts = (id: string) => c.meter.rows.get(id) ? c.meter.rows.get(id)!.hits + c.meter.rows.get(id)!.misses : 0;
  const onCooldown = (id: string, cd: number) => Math.min(1, (casts(id) * cd) / time);
  const wasted = k.resourceWasted ?? 0;
  const rows: { label: string; value: string; good?: boolean }[] = [
    { label: 'Rage wasted at 100', value: `${Math.round(wasted)}`, good: wasted / (time / 60) < 20 },
  ];
  if (b.rotation === 'protection') {
    rows.push(
      { label: 'Shield Block uptime', value: pctOf(uptime('uptime:shieldBlock')), good: uptime('uptime:shieldBlock') >= 0.6 },
      { label: 'Revenge on cooldown', value: pctOf(onCooldown('revenge', D.revenge.cooldown)), good: onCooldown('revenge', D.revenge.cooldown) >= 0.8 },
      { label: 'Shield Slam on cooldown', value: pctOf(onCooldown('shieldSlam', D.shieldSlam.cooldown)), good: onCooldown('shieldSlam', D.shieldSlam.cooldown) >= 0.8 },
      { label: 'Sunder Armor uptime', value: pctOf(uptime('uptime:target:sunderArmor')), good: uptime('uptime:target:sunderArmor') >= 0.9 },
      { label: 'Thunder Clap uptime', value: pctOf(uptime('uptime:target:thunderClap')), good: uptime('uptime:target:thunderClap') >= 0.8 },
      { label: 'Rage from hits taken', value: `+${Math.round(k.incomingRage ?? 0)}` },
    );
    return rows;
  }
  if (b.rotation === 'arms') {
    rows.push(
      { label: 'Mortal Strike on cooldown', value: pctOf(onCooldown('mortalStrike', D.mortalStrike.cooldown)), good: onCooldown('mortalStrike', D.mortalStrike.cooldown) >= 0.85 },
      { label: 'Rend uptime', value: pctOf(uptime('uptime:target:rend')), good: uptime('uptime:target:rend') >= 0.9 },
    );
  } else {
    rows.push(
      { label: 'Bloodthirst on cooldown', value: pctOf(onCooldown('bloodthirst', D.bloodthirst.cooldown)), good: onCooldown('bloodthirst', D.bloodthirst.cooldown) >= 0.85 },
      { label: 'Whirlwind on cooldown', value: pctOf(onCooldown('whirlwind', D.whirlwind.cooldown)), good: onCooldown('whirlwind', D.whirlwind.cooldown) >= 0.8 },
      { label: 'Flurry uptime', value: pctOf(uptime('uptime:flurry')) },
    );
  }
  rows.push({ label: 'Overpower used / chances', value: `${k.overpowerUsed ?? 0} of ${k.overpowerWindows ?? 0}` });
  if (c.options.sunderDuty) rows.push({ label: 'Sunder Armor uptime', value: pctOf(uptime('uptime:target:sunderArmor')), good: uptime('uptime:target:sunderArmor') >= 0.9 });
  if (T(c).weaponmaster && c.stats.mainHand.type === 'sword') rows.push({ label: 'Weaponmaster extra attacks', value: String(k.weaponmaster ?? 0) });
  return rows;
}

export const warrior: Spec = {
  id: 'warrior',
  className: 'Warrior',
  specName: 'WoW Forever',
  resource: 'rage',
  showThreat: true,
  tankDamage: 3000,
  abilities,
  stats: FURY_STATS,
  rules: BOSS_RULES,
  presets: [
    { name: 'Fury: sword and mace', stats: FURY_STATS },
    { name: 'Arms: two-handed polearm', stats: ARMS_STATS },
    { name: 'Protection: sword and shield', stats: PROT_STATS },
  ],
  builds: BUILDS.map((b) => ({ id: b.id, label: buildLabel(b), stats: b.stats, bar: b.bar, options: b.options, tank: b.tank, trees: summary(talentsFor(b.id)) })),
  defaultOptions: { build: BUILDS[0].id, sunderDuty: false, incomingRage: D.rage.incomingCoefficient },
  options: [
    { key: 'sunderDuty', name: 'You keep 5 Sunder Armors up', kind: 'toggle' },
    { key: 'incomingRage', name: 'Rage from damage taken: coefficient (10 to 20, unconfirmed)', kind: 'number', step: 1 },
  ],
  bar: BUILDS[0].bar,
  welcome: 'Welcome to the warrior practice yard. Pick a Fury, Arms or Protection build from the WoW Forever sims in Settings. For Protection the dummy hits back, so blocks, Revenge and rage from damage taken work as in the game.',
  help: `You start behind the dummy. W and S move along your facing, A and D turn, Q and E strafe; all six can be rebound below. Space jumps.
    Hold the left mouse button to orbit the camera; hold the right button to steer; hold both to run forward. Scroll to zoom.
    Rage in WoW Forever is normalized: each landed white swing gives a fixed amount from your weapon's speed (3.46 per second of speed with a one-hander, 4.5 with a two-hander, half for the off hand), doubled on a crit. Misses, dodges, parries and Heroic Strike swings give none. Abilities do not give rage.
    Heroic Strike and Cleave replace your next main-hand swing: press once to queue, again to cancel. Slam has a cast and restarts your swing. Changing stance keeps up to 10 rage (25 with Improved Tactical Mastery).
    Overpower opens for 5 sec after the dummy dodges; Revenge for 5 sec after you block, dodge or parry. Execute only works below 20% health: in Settings, start the dummy at 15% and lock its health to practice it.
    For Protection the dummy attacks you: its hits give you rage from their unmitigated damage, before armor, blocks and stances (about 6 per hit, 12 on a crit, 9 on a crushing blow; nothing when it misses or you dodge or parry), blocks open Revenge and Shield Block gives 2 sure blocks. Your health is locked by default; unlock it to practice Shield Wall and Last Stand. The meter shows threat per second.
    This is a practice tool: crit, proc and rage numbers follow WoW Forever; damage is an approximation.`,
  look: { clothColor: 0x7a1f1f, leatherColor: 0x4a4f57, hood: false, plate: true },
  sources: [
    { label: 'wow-forever-sim', url: 'https://github.com/gunba/wow-forever-sim' },
    { label: 'foreversim', url: 'https://github.com/laurencestokes/foreversim' },
    { label: 'magey/forever-warrior', url: 'https://github.com/magey/forever-warrior' },
  ],
  prepare,
  suggest,
  chances,
  review,
};
