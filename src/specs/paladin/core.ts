// What every paladin spec shares: seals and Judgement (which no longer uses
// the seal up), Twist of Light's Echoes, Holy damage on the melee or spell
// table, the abilities, procs and the mana model. Numbers in ./data.ts;
// sources in research/paladin_forever.md.
import type { Combat, Incoming } from '../../engine/combat';
import type { Ability, Hit, Outcome, Unit } from '../../engine/types';
import { DATA } from './data';
import { talentsFor, type PaladinSpec, type Talents } from './talents';

export const D = DATA;
export const roll = (c: Combat, pct: number) => c.random() * 100 < pct;
export const landed = (o: Outcome) => o === 'hit' || o === 'crit' || o === 'glance' || o === 'block';
const note = (c: Combat, text: string, kind: 'proc' | 'resource' = 'proc') => c.emit('note', { text, kind });

/** The spec ('ret', 'prot', 'shock') from the spec id 'paladin-ret'… */
const specOf = (c: Combat) => c.spec.id.replace('paladin-', '') as PaladinSpec;
/** Talent ranks of the build chosen in Settings. */
export const T = (c: Combat): Talents => talentsFor(c.options.build, specOf(c), c.options.talents);

interface PaladinState { lastCommand: number; lastReckoning: number; lastShieldSpec: number; releasing: boolean }
const states = new WeakMap<Combat, PaladinState>();
const state = (c: Combat): PaladinState => {
  let s = states.get(c);
  if (!s) states.set(c, (s = { lastCommand: -Infinity, lastReckoning: -Infinity, lastShieldSpec: -Infinity, releasing: false }));
  return s;
};

// ------------------------------------------------------------------- mana
/** Benediction: -2 % mana per point on every instant. */
const benediction = (c: Combat) => 1 - 0.02 * T(c).benediction;
const instant = (base: number) => (c: Combat) => Math.round(base * benediction(c));
/** Seals: Benediction and Twist of Light add up (gs: 70 % with both). */
const sealCost = (base: number) => (c: Combat) => Math.round(base * (1 - 0.02 * T(c).benediction - 0.2 * T(c).twistOfLight));
/** Holy Conduit: -20/40 % on Consecration, Exorcism and Hammer of Wrath, on top of Benediction (gs multiplies). */
const conduit = (base: number) => (c: Combat) => Math.round(base * benediction(c) * (1 - 0.2 * T(c).holyConduit));

/** Mana per second: Spirit regen outside the five-second rule (Reverence keeps 10 % per point while casting), MP5 always. */
export function regen(c: Combat): number {
  const spirit = 6.25 + Number(c.options.spirit ?? D.spirit) / 8;
  const mp5 = Number(c.options.mp5 ?? 0) / 5;
  const casting = c.t - c.lastSpend < 5;
  return spirit * (casting ? 0.1 * T(c).reverence : 1) + mp5;
}

// ------------------------------------------------------------ Holy damage
const spellPower = (c: Combat) => c.stats.spellPower ?? 0;

/**
 * Holy damage: base plus spell power at `coeff`, Vengeance and talents
 * (mod.damageFor), crit x2 on the melee table or x1.5 on the spell table.
 * Holy damage ignores armor, and a boss without resistances resists none of it (Oct 21).
 */
export function holyDamage(c: Combat, t: Unit, id: string, base: number, coeff: number, outcome: Outcome,
  opts: { spellTable?: boolean } = {}): number {
  if (!landed(outcome)) return 0;
  const crit = outcome === 'crit' ? (opts.spellTable ? c.rules.spellCritMultiplier : c.rules.critMultiplier) : 1;
  const d = (base + coeff * (spellPower(c) + c.bonusTaken(t, 'holy'))) * c.auraProduct('damageDone') * (c.mod.damageFor[id] ?? 1)
    * crit;
  return Math.max(1, Math.round(d));
}

/** Spell table: 17 % miss minus hit (1 % floor), then spell crit. */
function spellRoll(c: Combat, opts: { extraHit?: number; extraCrit?: number; forceCrit?: boolean } = {}): Outcome {
  if (roll(c, Math.max(0, c.rules.spellMiss - c.totalHit() - (opts.extraHit ?? 0)))) return 'resist';
  if (opts.forceCrit) return 'crit';
  return roll(c, c.spellCritChance(opts.extraCrit)) ? 'crit' : 'hit';
}
const between = (c: Combat, min: number, max: number) => min + c.random() * (max - min);
const twoHanded = (c: Combat) => !!c.stats.mainHand.twoHand;

// ------------------------------------------------------------------ seals
export const SEALS = ['sealOfRighteousness', 'sealOfCommand', 'sealOfFury'] as const;
export type SealId = (typeof SEALS)[number];
const SEAL_NAMES: Record<SealId, string> = { sealOfRighteousness: 'Righteousness', sealOfCommand: 'Command', sealOfFury: 'Fury' };
export const ECHO: Record<SealId, string> = { sealOfRighteousness: 'echoOfRighteousness', sealOfCommand: 'echoOfCommand', sealOfFury: 'echoOfFury' };

export function currentSeal(c: Combat): SealId | null {
  for (const s of SEALS) if (c.aura(c.player, s)) return s;
  return null;
}
export const sealLeft = (c: Combat) => {
  const s = currentSeal(c);
  return s ? c.aura(c.player, s)!.end - c.t : 0;
};

/** One seal at a time. With Twist of Light, replacing a seal banks a one-charge Echo of it. */
function castSeal(c: Combat, id: SealId): void {
  const old = currentSeal(c);
  for (const s of SEALS) c.removeAura(c.player, s);
  if (old && old !== id && T(c).twistOfLight) {
    c.applyAura(c.player, { id: ECHO[old], name: `Echo of ${SEAL_NAMES[old]}`, icon: old, duration: Infinity });
  }
  c.applyAura(c.player, { id, name: `Seal of ${SEAL_NAMES[id]}`, icon: id, duration: D.sealDuration });
}

/** What a seal does on a landed white swing. */
function sealProc(c: Combat, t: Unit, seal: SealId): void {
  const w = c.stats.mainHand;
  if (seal === 'sealOfRighteousness') {
    // 18.8 per second of weapon speed, x1.2 two-handed or x0.85 one-handed; it only rolls for a crit.
    const r = D.sealOfRighteousness;
    const base = r.perSpeed * w.speed * (w.twoHand ? r.twoHand : r.oneHand);
    const outcome: Outcome = roll(c, c.critChance('sealOfRighteousness')) ? 'crit' : 'hit';
    const amount = holyDamage(c, t, 'sealOfRighteousness', base, w.twoHand ? r.coeff2h : r.coeff1h, outcome);
    c.deal({ target: t, source: 'sealOfRighteousness', outcome, school: 'holy', amount, white: false });
  } else if (seal === 'sealOfCommand') {
    // 7 procs per minute (44 % at 3.8 s), 1 s internal cooldown, its own melee roll.
    const s = state(c);
    const k = D.sealOfCommand;
    if (c.t - s.lastCommand < k.icd || !roll(c, ((k.ppm * w.speed) / 60) * 100)) return;
    s.lastCommand = c.t;
    c.count('sealOfCommandProcs');
    const outcome = c.rollSpecial(t, 'sealOfCommand');
    const amount = holyDamage(c, t, 'sealOfCommand', c.weaponDamage('main') * k.weapon, k.coeff, outcome);
    c.deal({ target: t, source: 'sealOfCommand', outcome, school: 'holy', amount, white: false });
  } else {
    // Seal of Fury: a little Holy damage; with a shield, half of it becomes an absorb.
    const f = D.sealOfFury;
    const outcome: Outcome = roll(c, c.critChance('sealOfFury')) ? 'crit' : 'hit';
    const amount = holyDamage(c, t, 'sealOfFury', f.damage, f.coeff, outcome);
    c.deal({ target: t, source: 'sealOfFury', outcome, school: 'holy', amount, white: false });
    if (c.stats.shield) {
      const pool = (c.aura(c.player, 'sealOfFuryAbsorb')?.absorb ?? 0) + Math.round(amount * f.absorb);
      const improved = T(c).improvedSealOfFury;
      c.applyAura(c.player, {
        id: 'sealOfFuryAbsorb', name: 'Seal of Fury', icon: 'sealOfFury', duration: f.absorbDuration, absorb: pool,
        // Improved Seal of Fury: mana when the shield is used up (no threat).
        onRemove: (cc, a) => {
          if (improved && (a.absorb ?? 0) <= 0) { cc.gainMana(D.improvedSealOfFuryMana); cc.count('sealOfFuryMana', D.improvedSealOfFuryMana); }
        },
      });
    }
  }
}

// --------------------------------------------------------------- abilities
const talent = (key: keyof Talents, name: string) => ({
  requirements: (c: Combat) => (T(c)[key] ? null : `Requires the ${name} talent`),
  usable: (c: Combat) => T(c)[key] > 0,
});
export const executePhase = (c: Combat) => !!c.target && c.target.health / c.target.maxHealth <= D.hammerOfWrath.threshold;
export const undeadDummy = (c: Combat) => !!c.options.undeadDummy;
const needsUndead = (c: Combat) => (undeadDummy(c) ? null : 'Only against Undead or Demons (Settings → Options: dummy type)');
const needsShield = (c: Combat) => (c.stats.shield ? null : 'Requires a shield');

function seal(id: SealId, base: number, description: string, extra: Partial<Ability> = {}): Ability {
  return {
    id, name: `Seal of ${SEAL_NAMES[id]}`, icon: id, gcd: D.gcd, target: 'self', animation: 'cast',
    cost: sealCost(base),
    highlight: (c) => currentSeal(c) === id,
    description: (c) => `${description} Lasts ${D.sealDuration} sec; one seal at a time.${T(c).twistOfLight ? ' Twist of Light: replacing it leaves an Echo that your next landed swing also applies.' : ''}`,
    use: (c) => castSeal(c, id),
    ...extra,
  };
}

const JUDGEMENTS: Record<SealId, { id: string; name: string }> = {
  sealOfRighteousness: { id: 'judgementOfRighteousness', name: 'Judgement of Righteousness' },
  sealOfCommand: { id: 'judgementOfCommand', name: 'Judgement of Command' },
  sealOfFury: { id: 'judgementOfFury', name: 'Judgement of Fury' },
};

export const ABILITIES: Ability[] = [
  {
    id: 'attack', name: 'Attack', icon: 'melee', gcd: 0, target: 'enemy', range: 'melee',
    highlight: (c) => c.player.autoAttacking,
    description: () => 'Starts your auto attack. Your seals work on your white swings.',
    use: () => {},
  },
  seal('sealOfRighteousness', D.sealOfRighteousness.mana,
    `Every landed white swing deals extra Holy damage: ${D.sealOfRighteousness.perSpeed} per second of weapon speed (x1.2 with a two-hander, x0.85 one-handed) plus spell power. It cannot miss.`),
  seal('sealOfCommand', D.sealOfCommand.mana,
    `Your white swings can deal ${D.sealOfCommand.weapon * 100}% of weapon damage as Holy damage: ${D.sealOfCommand.ppm} procs per minute (slow weapons proc more per swing), 1 sec internal cooldown.`,
    talent('sealOfCommand', 'Seal of Command')),
  seal('sealOfFury', D.sealOfFury.mana,
    `Every landed white swing deals ${D.sealOfFury.damage} Holy damage plus spell power; with a shield, half of it becomes an absorb shield. Judgement of Fury taunts.`),
  {
    id: 'judgement', name: 'Judgement', icon: 'judgement', gcd: 0, target: 'enemy', range: D.judgement.range,
    animation: 'cast',
    cost: (c) => (c.aura(c.player, 'swiftJudgement') ? 0 : instant(D.judgement.mana)(c)),
    cooldown: (c) => D.judgement.cooldown - T(c).improvedJudgement,
    requirements: (c) => (currentSeal(c) ? null : 'You have no seal to judge'),
    usable: (c) => !!currentSeal(c),
    description: (c) => `Unleashes your seal on the target; in WoW Forever the seal stays up. Off the global cooldown. Righteousness and Command deal Holy damage on the melee table (it can miss and crit for double, never dodged or parried); Fury also taunts.${T(c).sanctifiedJudgement ? ` Sanctified Judgement gives back ${20 * T(c).sanctifiedJudgement}% of your seal's cost.` : ''}`,
    use: (c, t) => {
      const u = t!;
      c.removeAura(c.player, 'swiftJudgement');
      const seal = currentSeal(c)!;
      const sj = T(c).sanctifiedJudgement;
      if (sj && roll(c, [0, 33, 66, 100][sj])) {
        const back = c.cost(c.ability(seal)!) * 0.2 * sj;
        c.addResource(back);
        c.count('sanctifiedMana', back);
      }
      const j = JUDGEMENTS[seal];
      const outcome = c.rollSpecial(u, j.id, { noDodge: true });
      let amount = 0;
      if (seal === 'sealOfRighteousness') {
        const r = D.judgementOfRighteousness;
        amount = holyDamage(c, u, j.id, between(c, r.min, r.max), r.coeff, outcome);
      } else if (seal === 'sealOfCommand') {
        const k = D.judgementOfCommand;
        amount = holyDamage(c, u, j.id, between(c, k.min, k.max), k.coeff, outcome);
      } else {
        const f = D.judgementOfFury;
        amount = holyDamage(c, u, j.id, between(c, f.min, f.max), f.coeff, outcome);
        if (landed(outcome)) c.applyAura(u, { id: 'judgementOfFury', name: 'Judgement of Fury', icon: 'sealOfFury', duration: f.taunt });
      }
      c.deal({ target: u, source: j.id, outcome, school: 'holy', amount, white: false });
      c.count('judgements');
    },
  },
  {
    id: 'holyStrike', name: 'Holy Strike', icon: 'holyStrike', gcd: D.gcd, target: 'enemy', range: 'melee',
    animation: 'strike1',
    cost: instant(D.holyStrike.mana), cooldown: D.holyStrike.cooldown,
    description: (c) => `A strike for ${D.holyStrike.percent * 100}% of normalized weapon damage plus ${D.holyStrike.min}-${D.holyStrike.max}, as Holy damage. Melee table: it can be dodged or parried. New and baseline in WoW Forever.${T(c).ironCreed ? ' With Righteous Fury, Iron Creed makes you take less damage for 6 sec.' : ''}`,
    use: (c, t) => {
      const u = t!;
      const outcome = c.rollSpecial(u, 'holyStrike');
      if (!landed(outcome)) {
        c.refund(D.refund);
        c.deal({ target: u, source: 'holyStrike', outcome, school: 'holy', amount: 0, white: false, hand: 'main' });
        return;
      }
      const h = D.holyStrike;
      const norm = c.weaponDamage('main', { normalizedSpeed: twoHanded(c) ? D.normalizedSpeed.twoHand : D.normalizedSpeed.oneHand });
      const amount = holyDamage(c, u, 'holyStrike', (norm + between(c, h.min, h.max)) * h.percent, h.coeff, outcome);
      c.deal({ target: u, source: 'holyStrike', outcome, school: 'holy', amount, white: false, hand: 'main', weaponStrike: true });
      const ic = T(c).ironCreed;
      if (ic && c.aura(c.player, 'righteousFury')) {
        c.applyAura(c.player, { id: 'ironCreed', name: 'Iron Creed', icon: 'ironCreed', duration: D.ironCreed.duration, damageTaken: 1 - 0.02 * ic });
      }
    },
  },
  {
    id: 'consecration', name: 'Consecration', icon: 'consecration', gcd: D.gcd, target: 'self',
    animation: 'cast',
    cost: conduit(D.consecration.mana), cooldown: D.consecration.cooldown,
    description: (c) => `Consecrates the ground for ${D.consecration.ticks} sec: each second, ${D.consecration.all} Holy damage to every enemy in it and ${D.consecration.first4} plus spell power more to the first 4. About ${Math.round((D.consecration.all + D.consecration.first4 + D.consecration.coeff * spellPower(c)) * D.consecration.ticks)} on one target. Each tick can miss but never crits.`,
    use: (c) => {
      const k = D.consecration;
      c.targets.filter((u) => u.health > 0 && c.inRange(u, 8)).forEach((u, i) => {
        c.applyAura(u, {
          id: 'consecration', name: 'Consecration', icon: 'consecration', duration: k.ticks, period: 1,
          onTick: (cc) => {
            const outcome: Outcome = roll(cc, Math.max(0, cc.rules.spellMiss - cc.totalHit())) ? 'resist' : 'hit';
            const amount = holyDamage(cc, u, 'consecration', k.all + (i < 4 ? k.first4 : 0), i < 4 ? k.coeff : 0, outcome);
            cc.deal({ target: u, source: 'consecration', outcome, school: 'holy', amount, white: false, periodic: true });
          },
        });
      });
    },
  },
  {
    id: 'exorcism', name: 'Exorcism', icon: 'exorcism', gcd: D.gcd, target: 'enemy', range: D.exorcism.range, noAutoAttack: true,
    animation: 'cast',
    cost: conduit(D.exorcism.mana),
    cooldown: (c) => D.exorcism.cooldown * (1 - [0, 0.17, 0.33][T(c).purifyingPower]),
    requirements: needsUndead,
    usable: undeadDummy,
    description: () => `${D.exorcism.min}-${D.exorcism.max} Holy damage plus spell power to an Undead or Demon. Turn on "The dummy is Undead or a Demon" in Settings to use it.`,
    use: (c, t) => {
      const e = D.exorcism;
      const outcome = spellRoll(c, { extraHit: 6 * T(c).divinePrecision });
      const amount = holyDamage(c, t!, 'exorcism', between(c, e.min, e.max), e.coeff, outcome, { spellTable: true });
      c.deal({ target: t!, source: 'exorcism', outcome, school: 'holy', amount, white: false, spell: true });
    },
  },
  {
    id: 'hammerOfWrath', name: 'Hammer of Wrath', icon: 'hammerOfWrath', gcd: D.hammerOfWrath.gcd, target: 'enemy', range: D.hammerOfWrath.range,
    animation: 'throw',
    cost: conduit(D.hammerOfWrath.mana), cooldown: D.hammerOfWrath.cooldown,
    castTime: (c) => D.hammerOfWrath.cast - 0.5 * T(c).instrumentOfLaw,
    requirements: (c) => (executePhase(c) ? null : 'The target must be below 20% health'),
    usable: executePhase,
    highlight: executePhase,
    description: () => `A ${D.hammerOfWrath.cast} sec cast: hurls a hammer for ${D.hammerOfWrath.min}-${D.hammerOfWrath.max} Holy damage plus spell power. Only below 20% health; in Settings, start the dummy at 15% to practice it.`,
    use: (c, t) => {
      const h = D.hammerOfWrath;
      const outcome = c.rollSpecial(t!, 'hammerOfWrath', { noDodge: true });
      const amount = holyDamage(c, t!, 'hammerOfWrath', between(c, h.min, h.max), h.coeff, outcome);
      c.deal({ target: t!, source: 'hammerOfWrath', outcome, school: 'holy', amount, white: false });
    },
  },
  {
    id: 'holyShield', name: 'Holy Shield', icon: 'holyShield', gcd: D.gcd, target: 'self',
    animation: 'block',
    cost: instant(D.holyShield.mana), cooldown: D.holyShield.cooldown,
    requirements: (c) => talent('holyShield', 'Holy Shield').requirements(c) ?? needsShield(c),
    usable: (c) => T(c).holyShield > 0 && !!c.stats.shield,
    description: (c) => `+${D.holyShield.block}% block for ${D.holyShield.duration} sec or ${D.holyShield.charges} blocks; each block deals ${Math.round(D.holyShield.damage + D.holyShield.coeff * spellPower(c))} Holy damage with extra threat. Needs a shield.`,
    use: (c) => {
      const h = D.holyShield;
      // Re-casting: take the old one off first so its block bonus is removed once.
      c.removeAura(c.player, 'holyShield');
      c.mod.block += h.block;
      c.applyAura(c.player, {
        id: 'holyShield', name: 'Holy Shield', icon: 'holyShield', duration: h.duration, stacks: h.charges,
        onRemove: (cc) => { cc.mod.block -= h.block; },
      });
    },
  },
  {
    id: 'righteousFury', name: 'Righteous Fury', icon: 'righteousFury', gcd: D.gcd, target: 'self',
    animation: 'cast',
    cost: (c) => (c.aura(c.player, 'righteousFury') ? 0 : instant(D.righteousFury.mana)(c)),
    highlight: (c) => !!c.aura(c.player, 'righteousFury'),
    description: (c) => `Your Holy damage causes ${Math.round((D.righteousFury.holyThreat - 1) * 100)}% more threat for 30 min.${T(c).improvedRighteousFury ? ` Improved Righteous Fury: you take ${2 * T(c).improvedRighteousFury}% less damage while it is up.` : ''} Press again to turn it off.`,
    use: (c) => {
      if (c.aura(c.player, 'righteousFury')) { c.removeAura(c.player, 'righteousFury'); return; }
      righteousFury(c);
    },
  },
  {
    id: 'templarsBulwark', name: "Templar's Bulwark", icon: 'templarsBulwark', gcd: 0, target: 'self',
    cost: instant(D.templarsBulwark.mana),
    cooldown: (c) => D.templarsBulwark.cooldown - 30 * T(c).sacredDuty,
    requirements: (c) => talent('templarsBulwark', "Templar's Bulwark").requirements(c) ?? (c.aura(c.player, 'forbearance') ? 'You have Forbearance' : null),
    usable: (c) => T(c).templarsBulwark > 0,
    description: () => `A shield that absorbs damage equal to your maximum health for ${D.templarsBulwark.duration} sec. Off the global cooldown. Gives Forbearance for 1 min. Unlock your health in Settings to see it work.`,
    use: (c) => {
      const b = D.templarsBulwark;
      c.applyAura(c.player, { id: 'templarsBulwark', name: "Templar's Bulwark", icon: 'templarsBulwark', duration: b.duration, absorb: c.player.maxHealth * b.absorb });
      c.applyAura(c.player, { id: 'forbearance', name: 'Forbearance', icon: 'forbearance', duration: b.forbearance });
    },
  },
  {
    id: 'swiftJudgement', name: 'Swift Judgement', icon: 'swiftJudgement', gcd: 0, target: 'self',
    cooldown: D.swiftJudgement.cooldown,
    ...talent('swiftJudgement', 'Swift Judgement'),
    description: () => 'Finishes the cooldown of Judgement; your next Judgement costs no mana. Off the global cooldown.',
    use: (c) => {
      c.clearCooldown('judgement');
      c.applyAura(c.player, { id: 'swiftJudgement', name: 'Swift Judgement', icon: 'swiftJudgement', duration: Infinity });
    },
  },
  {
    id: 'holyShock', name: 'Holy Shock', icon: 'holyShock', gcd: D.gcd, target: 'enemy', range: D.holyShock.range, noAutoAttack: true,
    animation: 'cast',
    projectile: { color: 0xffe680, speed: 40, style: 'holy' },
    cost: instant(D.holyShock.mana), cooldown: D.holyShock.cooldown,
    ...talent('holyShock', 'Holy Shock'),
    highlight: (c) => !!c.aura(c.player, 'divineFavor') || !!c.aura(c.target, 'lightsVigil'),
    description: (c) => `Blasts the enemy for ${D.holyShock.min}-${D.holyShock.max} Holy damage plus spell power. Spell table${T(c).divinePrecision ? ` (Divine Precision +${6 * T(c).divinePrecision}% hit)` : ''}; crits for 1.5x. ${D.holyShock.cooldown} sec cooldown in WoW Forever (30 in Classic).`,
    use: (c, t) => {
      const h = D.holyShock;
      const favor = !!c.aura(c.player, 'divineFavor');
      if (favor) { c.removeAura(c.player, 'divineFavor'); c.count('divineFavorShocks'); }
      const outcome = spellRoll(c, { extraHit: 6 * T(c).divinePrecision, extraCrit: 2 * T(c).holyPower, forceCrit: favor });
      const amount = holyDamage(c, t!, 'holyShock', between(c, h.min, h.max), h.coeff, outcome, { spellTable: true });
      c.deal({ target: t!, source: 'holyShock', outcome, school: 'holy', amount, white: false, spell: true });
      // Light's Vigil: a marked Holy Shock that lands triggers no cooldown, strikes again and refunds most of the Vigil's mana.
      if (outcome !== 'resist' && c.aura(t!, 'lightsVigil')) {
        const v = D.lightsVigil;
        c.removeAura(t!, 'lightsVigil');
        c.clearCooldown('holyShock');
        const extra = holyDamage(c, t!, 'lightsVigil', between(c, v.min, v.max), v.coeff, outcome, { spellTable: true });
        c.deal({ target: t!, source: 'lightsVigil', outcome, school: 'holy', amount: extra, white: false, spell: true });
        c.gainMana(Math.round(v.mana * v.refund));
        c.count('vigilShocks');
      }
    },
  },
  {
    id: 'lightsVigil', name: "Light's Vigil", icon: 'lightsVigil', gcd: D.gcd, target: 'enemy', range: D.lightsVigil.range, noAutoAttack: true,
    animation: 'cast',
    cost: () => D.lightsVigil.mana, cooldown: D.lightsVigil.cooldown,
    castTime: (c) => D.lightsVigil.cast / c.castHaste(),
    ...talent('lightsVigil', "Light's Vigil"),
    description: () => {
      const v = D.lightsVigil;
      return `A ${v.cast} sec cast that marks the enemy for ${v.mark} sec. Your next Holy Shock on it triggers no cooldown, deals ${v.min}-${v.max} more Holy damage plus spell power and refunds ${v.refund * 100}% of this spell's mana. Values are provisional.`;
    },
    use: (c, t) => {
      c.applyAura(t!, { id: 'lightsVigil', name: "Light's Vigil", icon: 'lightsVigil', duration: D.lightsVigil.mark });
      c.count('vigils');
    },
  },
  {
    id: 'divineFavor', name: 'Divine Favor', icon: 'divineFavor', gcd: 0, target: 'self',
    cost: () => D.divineFavor.mana, cooldown: D.divineFavor.cooldown,
    ...talent('divineFavor', 'Divine Favor'),
    highlight: (c) => !!c.aura(c.player, 'divineFavor'),
    description: () => 'Your next Holy Shock is a critical hit. Off the global cooldown.',
    use: (c) => { c.applyAura(c.player, { id: 'divineFavor', name: 'Divine Favor', icon: 'divineFavor', duration: Infinity }); },
  },
  {
    id: 'layOnHands', name: 'Lay on Hands', icon: 'layOnHands', gcd: D.gcd, target: 'self',
    animation: 'cast',
    cost: (c) => c.player.resource, cooldown: D.layOnHands.cooldown,
    description: () => 'Heals you for your maximum health and drains all your mana. 20 min cooldown in WoW Forever.',
    use: (c) => { c.player.health = c.player.maxHealth; },
  },
  {
    id: 'manaPotion', name: 'Major Mana Potion', icon: 'manaPotion', gcd: 0, target: 'self',
    cooldown: D.manaPotion.cooldown, cooldownGroup: 'potion',
    animation: 'drink',
    description: () => `Restores ${D.manaPotion.min} to ${D.manaPotion.max} mana.`,
    use: (c) => {
      const n = Math.round(between(c, D.manaPotion.min, D.manaPotion.max));
      c.gainMana(n);
      c.count('potionMana', n);
      note(c, `+${n} Mana`, 'resource');
    },
  },
];

function righteousFury(c: Combat): void {
  const r = D.righteousFury;
  const irf = T(c).improvedRighteousFury;
  c.applyAura(c.player, {
    id: 'righteousFury', name: 'Righteous Fury', icon: 'righteousFury', duration: r.duration,
    schoolThreat: { holy: r.holyThreat }, damageTaken: irf ? 1 - 0.02 * irf : undefined,
  });
}

// ----------------------------------------------------------------- setup
const SEAL_SOURCES = ['sealOfRighteousness', 'sealOfCommand', 'sealOfFury'];
const JUDGEMENT_SOURCES = ['judgementOfRighteousness', 'judgementOfCommand', 'judgementOfFury'];

export function prepare(c: Combat): void {
  const t = T(c);
  const p = c.player;
  states.set(c, { lastCommand: -Infinity, lastReckoning: -Infinity, lastShieldSpec: -Infinity, releasing: false });
  p.maxResource = Math.max(1, Number(c.options.mana ?? 4000));
  p.regenPerSecond = 0;
  c.manaLocked = !!c.options.lockMana;

  c.mod.crit = t.conviction;
  c.mod.hit = t.precision;
  // Holy Power: Holy Shock and Holy Strike +3 % crit per point, every other spell +1 %.
  c.mod.spellCrit = t.holyPower;
  c.mod.critFor.holyStrike = 3 * t.holyPower;
  // Weapon specializations: physical damage, and (gs) seal procs, Judgement of Command, Holy Strike and Hammer of Wrath.
  const weapon = twoHanded(c) ? 1 + 0.02 * t.twoHandedWeaponSpecialization : 1 + [0, 0.03, 0.07, 0.1][t.oneHandedWeaponSpecialization];
  c.mod.physicalDamage = weapon;
  const seals = 1 + 0.05 * t.improvedSeals;
  const mult = (id: string, n: number) => { c.mod.damageFor[id] = (c.mod.damageFor[id] ?? 1) * n; };
  for (const id of [...SEAL_SOURCES, ...JUDGEMENT_SOURCES]) mult(id, seals);
  for (const id of [...SEAL_SOURCES, 'judgementOfCommand', 'holyStrike', 'hammerOfWrath']) mult(id, weapon);
  mult('holyStrike', 1 + 0.2 * t.sacredArbiter);
  mult('consecration', 1 + 0.05 * t.consecratedGround);
  c.mod.threatFor = { holyShield: D.holyShield.threat, holyStrike: 1 + 0.05 * t.ironCreed };

  c.registerSource('judgementOfRighteousness', 'Judgement of Righteousness', 'sealOfRighteousness');
  c.registerSource('judgementOfCommand', 'Judgement of Command', 'sealOfCommand');
  c.registerSource('judgementOfFury', 'Judgement of Fury', 'sealOfFury');
  c.trackedAuras.push('holyShield', 'righteousFury', 'vengeance');
  c.trackedTargetAuras.push('consecration');
  if (c.spec.tank) righteousFury(c); // on before the pull

  // Landed weapon strikes: Vindication; white swings carry the seal and any banked Echoes.
  c.onHit.push((hit: Hit) => {
    if (t.vindication) {
      const v = D.vindication;
      c.applyAura(hit.target, { id: 'vindication', name: 'Vindication', icon: 'vindication', duration: v.duration, apReduction: v.apPerRank * t.vindication });
      c.applyAura(c.player, { id: 'vindicationAp', name: 'Vindication', icon: 'vindication', duration: v.duration, attackPower: Math.round(c.stats.attackPower * 0.01 * t.vindication) });
    }
    if (!hit.white) return;
    c.count('whiteLanded');
    const now = currentSeal(c);
    const applied = new Set<SealId>();
    if (now) { sealProc(c, hit.target, now); applied.add(now); }
    // Echoes are spent by the swing; an Echo of the seal you have up adds nothing.
    for (const s of SEALS) {
      if (!c.aura(c.player, ECHO[s])) continue;
      c.removeAura(c.player, ECHO[s]);
      if (applied.has(s)) continue;
      sealProc(c, hit.target, s);
      applied.add(s);
    }
    if (applied.size >= 2) c.count('twistedSwings');
  });

  // Vengeance: any non-periodic crit stacks up to 3 times (+1/2/3 % Physical and Holy per stack).
  c.afterDamage.push((hit: Hit) => {
    if (hit.outcome !== 'crit' || hit.periodic || !t.vengeance) return;
    const stacks = Math.min(D.vengeance.stacks, (c.aura(c.player, 'vengeance')?.stacks ?? 0) + 1);
    c.applyAura(c.player, { id: 'vengeance', name: 'Vengeance', icon: 'vengeance', duration: D.vengeance.duration, stacks, damageDone: 1 + 0.01 * t.vengeance * stacks });
  });

  // The attacking dummy: Holy Shield, Redoubt, Reckoning and Shield Specialization.
  c.onIncoming.push((i: Incoming) => {
    const s = state(c);
    if (i.raw > 0 && t.redoubt && roll(c, D.redoubt.chance * t.redoubt)) {
      const r = D.redoubt;
      c.removeAura(p, 'redoubt');
      c.mod.block += r.block * t.redoubt;
      c.applyAura(p, { id: 'redoubt', name: 'Redoubt', icon: 'redoubt', duration: r.duration, stacks: r.blocks, onRemove: (cc) => { cc.mod.block -= r.block * t.redoubt; } });
      c.count('redoubt');
    }
    if (i.outcome === 'block') {
      const hs = c.aura(p, 'holyShield');
      if (hs) {
        const h = D.holyShield;
        const outcome: Outcome = roll(c, c.spellCritChance()) ? 'crit' : 'hit';
        const amount = holyDamage(c, i.attacker, 'holyShield', h.damage, h.coeff, outcome, { spellTable: true });
        c.deal({ target: i.attacker, source: 'holyShield', outcome, school: 'holy', amount, white: false });
        hs.stacks = (hs.stacks ?? 1) - 1;
        if (hs.stacks <= 0) c.removeAura(p, 'holyShield');
      }
      const rd = c.aura(p, 'redoubt');
      if (rd) {
        rd.stacks = (rd.stacks ?? 1) - 1;
        if (rd.stacks <= 0) c.removeAura(p, 'redoubt');
      }
      const ss = t.shieldSpecialization;
      if (ss && c.t - s.lastShieldSpec >= D.shieldSpecialization.icd && roll(c, [0, 33, 66, 100][ss])) {
        s.lastShieldSpec = c.t;
        const n = Math.round(p.maxResource * D.shieldSpecialization.manaPct);
        c.addResource(n);
        c.count('shieldSpecMana', n);
      }
    }
    // Reckoning (Oct 15, Classic again): a block (8 % per point, at most once per 1.5 s) or a crit taken
    // (20 % per point) stores a charge, up to 4. Your next swing fires them all.
    const block = i.outcome === 'block';
    const chance = block ? D.reckoning.onBlock : i.outcome === 'crit' ? D.reckoning.onCrit : 0;
    if (chance && t.reckoning && (!block || c.t - s.lastReckoning >= D.reckoning.icd) && roll(c, chance * t.reckoning)) {
      if (block) s.lastReckoning = c.t;
      c.addStack(p, { id: 'reckoning', name: 'Reckoning', icon: 'reckoning', duration: Infinity }, D.reckoning.charges);
    }
  });
  // The stored Reckoning charges go off right after your next main-hand swing, hit or miss, without resetting the swing timer.
  c.afterDamage.push((hit: Hit) => {
    const s = state(c);
    if (s.releasing || !hit.white || hit.source !== 'melee_mh') return;
    const n = c.aura(p, 'reckoning')?.stacks ?? 0;
    if (!n) return;
    c.removeAura(p, 'reckoning');
    c.schedule(c.t, () => {
      s.releasing = true;
      for (let k = 0; k < n && hit.target.health > 0; k++) c.whiteHit('main', hit.target);
      s.releasing = false;
      c.count('reckoning', n);
      note(c, n > 1 ? `Reckoning x${n}!` : 'Reckoning!');
    });
  });
}

// ------------------------------------------------------- practice helpers
export function chances(c: Combat): { title: string; rows: [string, string][] }[] {
  const tl = T(c);
  const pct = (n: number) => `${Math.max(0, Math.min(100, n)).toFixed(1)}%`;
  const r = c.rules;
  const hit = c.totalHit();
  const w = c.stats.mainHand;
  const procs: [string, string][] = [];
  if (tl.sealOfCommand) procs.push(['Seal of Command per landed white swing', `${pct(((D.sealOfCommand.ppm * w.speed) / 60) * 100)} (7 per minute, 1 s cooldown)`]);
  procs.push(['Seal of Righteousness', 'every landed white swing; rolls only for a crit']);
  if (tl.twistOfLight) procs.push(['Twist of Light', 'replacing a seal banks an Echo your next landed swing also applies']);
  if (tl.vengeance) procs.push(['Vengeance after any crit', `+${tl.vengeance}% Physical and Holy per stack, 3 stacks, 30 s`]);
  if (tl.vindication) procs.push(['Vindication on every landed melee hit', `+${tl.vindication}% attack power, the dummy -${D.vindication.apPerRank * tl.vindication} attack power`]);
  if (tl.reckoning) procs.push(['Reckoning: a charge after a block / a crit taken', `${D.reckoning.onBlock * tl.reckoning}% / ${D.reckoning.onCrit * tl.reckoning}% (blocks at most once per 1.5 s); up to ${D.reckoning.charges}, all fired by your next swing`]);
  if (tl.redoubt) procs.push(['Redoubt: +block after a hit taken', `${D.redoubt.chance * tl.redoubt}% for +${D.redoubt.block * tl.redoubt}% block (10 s or 5 blocks)`]);
  if (tl.shieldSpecialization) procs.push([`Shield Specialization: ${D.shieldSpecialization.manaPct * 100}% of your mana on a block`, `${[0, 33, 66, 100][tl.shieldSpecialization]}%, 3 s cooldown`]);
  if (c.raid.has('judgementOfWisdom')) procs.push(['Judgement of Wisdom: +59 mana', '50% per landed hit or direct spell']);
  const spells: [string, string][] = [
    ['Seal procs, Judgements, Holy Strike: crit (melee table)', pct(c.critChance('sealOfRighteousness'))],
    ['Holy Strike crit', pct(c.critChance('holyStrike'))],
  ];
  if (tl.holyShock) {
    spells.push(['Holy Shock: miss / crit', `${pct(Math.max(0, r.spellMiss - hit - 6 * tl.divinePrecision))} / ${pct(c.spellCritChance(2 * tl.holyPower))} (Divine Favor: 100%)`]);
  }
  const groups = [
    {
      title: 'Your attacks',
      rows: [
        ['Melee crit (gear + talents, minus 4.8% vs a +3 boss)', pct(c.critChance('melee_mh'))],
        ['Auto attack: miss / dodge / glancing', `${pct(r.specialMiss - hit)} / ${pct(c.dodgeChance())} / ${pct(r.glanceChance)}`],
        ['Parry and block if you stand in front', `${pct(r.parryFromFront)} / 5.0%`],
      ] as [string, string][],
    },
    { title: 'Holy damage', rows: spells },
    { title: 'Procs', rows: procs },
    {
      title: 'Rhythm',
      rows: [
        ['Global cooldown', '1.5 s (Hammer of Wrath 1.0 s); Judgement is off the GCD'],
        ['Weapon swing', `${w.speed.toFixed(1)} s`],
        ['Judgement cooldown', `${D.judgement.cooldown - tl.improvedJudgement} s; your seal stays up`],
        ['Mana regeneration now', `${regen(c).toFixed(1)} per second (Spirit stops 5 s after you spend mana${tl.reverence ? `; Reverence keeps ${10 * tl.reverence}%` : ''})`],
      ] as [string, string][],
    },
  ];
  if (c.stats.tank) {
    const tbl = c.enemyTable(c.target ?? c.targets[0]);
    const tank = c.stats.tank;
    groups.push({
      title: 'The attacking dummy against you',
      rows: [
        ['Miss / dodge / parry / block', `${pct(tbl.miss)} / ${pct(tbl.dodge)} / ${pct(tbl.parry)} / ${pct(tbl.block)}`],
        ['Block with Holy Shield', pct(tank.block + D.holyShield.block - 0.6)],
        ['Crit / crushing blow', `${pct(tbl.crit)} / ${pct(tbl.crush)}`],
        ['Your armor reduces its damage by', pct(c.playerArmorReduction() * 100)],
      ],
    });
  }
  return groups;
}

/** How often an ability was used compared with its cooldown, 0 to 1. */
export function onCooldown(c: Combat, id: string, cooldown: number): number {
  const time = c.counters.combatTime ?? 0;
  const row = c.meter.rows.get(id);
  const casts = row ? row.hits + row.misses : 0;
  return time > 0 ? Math.min(1, (casts * cooldown) / time) : 0;
}

export const SOURCES = [
  { label: 'wow-forever-sim', url: 'https://github.com/gunba/wow-forever-sim' },
  { label: 'foreversim', url: 'https://github.com/laurencestokes/foreversim' },
];
