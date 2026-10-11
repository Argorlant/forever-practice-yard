// What both priest damage specs share: the spell table with school hit,
// Shadowform and personal Shadow Weaving stacks, Mind Flay as a channel with
// one hit roll, the DoTs, Smite and Holy Fire with Power in Light, Penance,
// Inner Focus, Power Infusion and the mana model. Numbers in ./data.ts;
// sources in research/priest_forever.md.
import type { Combat } from '../../engine/combat';
import type { Ability, Outcome, School, Unit } from '../../engine/types';
import { DATA } from './data';
import { talentsFor, type PriestSpec, type Talents } from './talents';

export const D = DATA;
const roll = (c: Combat, pct: number) => c.random() * 100 < pct;
const between = (c: Combat, min: number, max: number) => min + c.random() * (max - min);
const note = (c: Combat, text: string, kind: 'proc' | 'resource' = 'proc') => c.emit('note', { text, kind });

const specOf = (c: Combat) => c.spec.id.replace('priest-', '') as PriestSpec;
/** Talent ranks of the build chosen in Settings. */
export const T = (c: Combat): Talents => talentsFor(c.options.build, specOf(c));

// ------------------------------------------------------------------- mana
export const shadowform = (c: Combat) => !!c.aura(c.player, 'shadowform');
const innerFocus = (c: Combat) => !!c.aura(c.player, 'innerFocus');
/** Mental Agility: Smite, Holy Fire and instants cost 3/7/10 % less. */
const agility = (c: Combat) => 1 - [0, 0.03, 0.07, 0.1][T(c).mentalAgility];
/**
 * A spell's cost: Inner Focus makes it free; Shadowform halves Shadow spells
 * and multiplies with the talent discounts (fs and MythicSim's reading).
 */
function cost(base: number, school: School, opts: { agility?: boolean; extra?: (c: Combat) => number } = {}) {
  return (c: Combat) => {
    if (innerFocus(c)) return 0;
    let m = (opts.agility ? agility(c) : 1) * (opts.extra?.(c) ?? 1);
    if (school === 'shadow' && shadowform(c)) m *= D.shadowform.cost;
    return Math.round(base * m);
  };
}
/** Inner Focus: spent by the next costed spell; +25 % crit if the spell is not periodic. */
function useInnerFocus(c: Combat): number {
  if (!innerFocus(c)) return 0;
  c.removeAura(c.player, 'innerFocus');
  c.count('innerFocusUsed');
  return D.innerFocus.crit;
}

/** Mana per second: Spirit regen outside the five-second rule (Meditation keeps 17/33/50 % while casting), MP5 always. */
export function regen(c: Combat): number {
  const spirit = 6.25 + Number(c.options.spirit ?? D.spirit) / 8;
  const mp5 = Number(c.options.mp5 ?? D.mp5) / 5;
  const casting = c.t - c.lastSpend < 5;
  return spirit * (casting ? [0, 0.17, 0.33, 0.5][T(c).meditation] : 1) + mp5;
}

// --------------------------------------------------------------- spell table
/** Shadow Focus +1 % per point to Shadow hit, Holy Precision +6 % per point to Holy hit. */
const schoolHit = (c: Combat, school: School) => (school === 'shadow' ? T(c).shadowFocus : school === 'holy' ? 6 * T(c).holyPrecision : 0);
/** Holy Specialization +1 % crit per point to Holy spells. */
const schoolCrit = (c: Combat, school: School) => (school === 'holy' ? T(c).holySpecialization : 0);

function spellRoll(c: Combat, school: School, opts: { extraCrit?: number; forceCrit?: boolean } = {}): Outcome {
  if (roll(c, Math.max(1, D.spellMiss - c.totalHit() - schoolHit(c, school)))) return 'resist';
  if (opts.forceCrit) return 'crit';
  return roll(c, c.spellCritChance(schoolCrit(c, school) + (opts.extraCrit ?? 0))) ? 'crit' : 'hit';
}
const critRoll = (c: Combat, school: School, extra = 0) => roll(c, c.spellCritChance(schoolCrit(c, school) + extra));

export const weavingStacks = (c: Combat, t: Unit) => c.aura(t, 'shadowWeaving')?.stacks ?? 0;
/** Shadowform's 2.0x crit covers Mind Blast, Mind Flay, the DoTs and (gs, MythicSim) Shadow Word: Death. */
const critMultiplier = (c: Combat, school: School) => (school === 'shadow' && shadowform(c) ? D.shadowform.critMultiplier : c.rules.spellCritMultiplier);

/** Multipliers by school: Shadowform, Darkness and your Shadow Weaving stacks; Searing Light on Holy; Power Infusion on everything. */
function schoolMult(c: Combat, t: Unit, school: School): number {
  const tl = T(c);
  let m = c.aura(c.player, 'powerInfusion') ? D.powerInfusion.damage : 1;
  if (school === 'shadow') {
    if (shadowform(c)) m *= D.shadowform.damage;
    m *= (1 + 0.02 * tl.darkness) * (1 + D.shadowWeaving.perStack * weavingStacks(c, t));
  } else if (school === 'holy') {
    m *= 1 + [0, 0.02, 0.05][tl.searingLight];
  }
  return m;
}

/** Damage of a spell hit or tick: base plus spell power of its school (and Judgement of the Crusader for Holy), times modifiers. */
function spellDamage(c: Combat, t: Unit, id: string, school: School, base: number, coeff: number, outcome: Outcome, opts: { binary?: boolean } = {}): number {
  if (outcome === 'resist' || outcome === 'miss') return 0;
  const crit = outcome === 'crit' ? critMultiplier(c, school) : 1;
  const d = (base + coeff * (c.spellPowerFor(school) + c.bonusTaken(t, school))) * schoolMult(c, t, school) * (c.mod.damageFor[id] ?? 1)
    * crit * (opts.binary ? 1 : D.partialResist);
  return Math.max(1, Math.round(d));
}

/** Shadow Weaving: each landed Shadow damage spell can add a stack (+2 % of your Shadow damage, 5 stacks, 15 s). */
function weave(c: Combat, t: Unit): void {
  const sw = T(c).shadowWeaving;
  if (!sw || !roll(c, [0, 33, 67, 100][sw])) return;
  c.addStack(t, { id: 'shadowWeaving', name: 'Shadow Weaving', icon: 'shadowWeaving', duration: D.shadowWeaving.duration }, D.shadowWeaving.stacks);
}

/** A DoT that re-reads your stats each tick and can crit. Recasting restarts it. */
function dot(c: Combat, t: Unit, id: string, name: string, school: School, ticks: number, period: number, perTick: { base: number; coeff: number }, onTick?: (cc: Combat, amount: number) => void): void {
  c.applyAura(t, {
    id, name, icon: id, duration: ticks * period, period,
    onTick: (cc) => {
      const outcome: Outcome = critRoll(cc, school) ? 'crit' : 'hit';
      const amount = spellDamage(cc, t, id, school, perTick.base, perTick.coeff, outcome);
      cc.deal({ target: t, source: id, outcome, school, amount, white: false, periodic: true });
      onTick?.(cc, amount);
    },
  });
}

const holyFireOn = (c: Combat, t: Unit) => !!c.aura(t, 'holyFire');
/** Power in Light: +2 % per point to Smite and Penance while your Holy Fire burns on the target. */
const powerInLight = (c: Combat, t: Unit) => (holyFireOn(c, t) ? 1 + 0.02 * T(c).powerInLight : 1);

const talent = (key: keyof Talents, name: string) => ({
  requirements: (c: Combat) => (T(c)[key] ? null : `Requires the ${name} talent`),
  usable: (c: Combat) => T(c)[key] > 0,
});
const spell = (a: Omit<Ability, 'gcd' | 'target' | 'range' | 'hastedGcd' | 'noAutoAttack'> & { range?: number | ((c: Combat) => number) }): Ability => {
  const { range, ...rest } = a;
  return { gcd: D.gcd, target: 'enemy', range: typeof range === 'number' ? range : 30, hastedGcd: true, noAutoAttack: true, animation: 'cast', ...rest };
};
const healPlayer = (c: Combat, n: number) => { if (!c.playerHealthLocked) c.player.health = Math.min(c.player.maxHealth, c.player.health + n); };

// --------------------------------------------------------------- abilities
export const ABILITIES: Ability[] = [
  spell({
    id: 'mindBlast', name: 'Mind Blast', icon: 'mindBlast',
    projectile: { color: 0xb07cff, speed: 40 },
    cost: cost(D.mindBlast.mana, 'shadow'),
    cooldown: (c) => D.mindBlast.cooldown - 0.5 * T(c).improvedMindBlast,
    castTime: (c) => D.mindBlast.cast / c.castHaste(),
    description: (c) => `A 1.5 sec cast: ${D.mindBlast.min}-${D.mindBlast.max} Shadow damage plus ${D.mindBlast.coeff * 100}% of spell power. ${D.mindBlast.cooldown - 0.5 * T(c).improvedMindBlast} sec cooldown.`,
    use: (c, t) => {
      const u = t!;
      const m = D.mindBlast;
      const outcome = spellRoll(c, 'shadow', { extraCrit: useInnerFocus(c) });
      const amount = spellDamage(c, u, 'mindBlast', 'shadow', between(c, m.min, m.max), m.coeff, outcome);
      c.deal({ target: u, source: 'mindBlast', outcome, school: 'shadow', amount, white: false, spell: true });
      if (amount) weave(c, u);
    },
  }),
  {
    ...spell({
      id: 'mindFlay', name: 'Mind Flay', icon: 'mindFlay',
      cost: cost(D.mindFlay.mana, 'shadow'),
      ...talent('mindFlay', 'Mind Flay'),
      description: (c) => `A ${D.mindFlay.duration} sec channel: ${D.mindFlay.ticks} ticks of ${D.mindFlay.tick} Shadow damage plus spell power, one per second. All or nothing: one hit roll for the whole channel. Another spell after the GCD clips it; clip right after a tick, never in the middle. Range ${D.mindFlay.range + 5 * T(c).improvedMindFlay} yards.`,
      use: (c) => { useInnerFocus(c); },
    }),
    range: D.mindFlay.range + 10,
    requirements: (c, t) => (T(c).mindFlay ? null : 'Requires the Mind Flay talent')
      ?? (t && c.distance(t) > (D.mindFlay.range + 5 * T(c).improvedMindFlay) * 0.9144 + t.radius ? 'Out of range' : null),
    channel: {
      duration: D.mindFlay.duration, ticks: D.mindFlay.ticks,
      onStart: (c, t) => {
        const u = t!;
        if (roll(c, Math.max(1, D.spellMiss - c.totalHit() - schoolHit(c, 'shadow')))) {
          c.deal({ target: u, source: 'mindFlay', outcome: 'resist', school: 'shadow', amount: 0, white: false });
          return false;
        }
        weave(c, u);
        return true;
      },
      onTick: (c, t) => {
        const u = t!;
        const outcome: Outcome = critRoll(c, 'shadow') ? 'crit' : 'hit';
        const amount = spellDamage(c, u, 'mindFlay', 'shadow', D.mindFlay.tick, D.mindFlay.coeff, outcome, { binary: true });
        c.deal({ target: u, source: 'mindFlay', outcome, school: 'shadow', amount, white: false, spell: true });
      },
    },
  },
  spell({
    id: 'shadowWordPain', name: 'Shadow Word: Pain', icon: 'shadowWordPain',
    cost: cost(D.shadowWordPain.mana, 'shadow', { agility: true }),
    description: (c) => `${D.shadowWordPain.ticks + T(c).improvedShadowWordPain} ticks of ${D.shadowWordPain.tick} Shadow damage plus spell power, every ${D.shadowWordPain.period} sec. Recasting restarts it and loses the pending tick: recast after the last tick. The ticks can crit.`,
    use: (c, t) => {
      const u = t!;
      useInnerFocus(c);
      const s = D.shadowWordPain;
      if (spellRoll(c, 'shadow') === 'resist') { c.deal({ target: u, source: 'shadowWordPain', outcome: 'resist', school: 'shadow', amount: 0, white: false }); return; }
      dot(c, u, 'shadowWordPain', 'Shadow Word: Pain', 'shadow', s.ticks + T(c).improvedShadowWordPain, s.period, { base: s.tick, coeff: s.coeff });
      weave(c, u);
    },
  }),
  spell({
    id: 'devouringPlague', name: 'Devouring Plague', icon: 'devouringPlague',
    cost: cost(D.devouringPlague.mana, 'shadow', { agility: true, extra: (c) => 1 - 0.25 * T(c).devouringContagion }),
    cooldown: D.devouringPlague.cooldown,
    description: () => `${D.devouringPlague.ticks} ticks of ${D.devouringPlague.tick} Shadow damage plus spell power every ${D.devouringPlague.period} sec; it heals you for the damage. Baseline for every race in WoW Forever, 1 min cooldown.`,
    use: (c, t) => {
      const u = t!;
      useInnerFocus(c);
      const s = D.devouringPlague;
      if (spellRoll(c, 'shadow') === 'resist') { c.deal({ target: u, source: 'devouringPlague', outcome: 'resist', school: 'shadow', amount: 0, white: false }); return; }
      dot(c, u, 'devouringPlague', 'Devouring Plague', 'shadow', s.ticks, s.period, { base: s.tick, coeff: s.coeff }, (cc, n) => healPlayer(cc, n));
      weave(c, u);
    },
  }),
  spell({
    id: 'shadowWordDeath', name: 'Shadow Word: Death', icon: 'shadowWordDeath',
    cost: cost(D.shadowWordDeath.mana, 'shadow', { agility: true }),
    cooldown: D.shadowWordDeath.cooldown,
    description: () => `${D.shadowWordDeath.min}-${D.shadowWordDeath.max} Shadow damage plus ${D.shadowWordDeath.coeff * 100}% of spell power. If the target survives, you take ${D.shadowWordDeath.backlash * 100}% of your maximum health: every cast on a dummy. New and baseline in WoW Forever.`,
    use: (c, t) => {
      const u = t!;
      const s = D.shadowWordDeath;
      const early = u.health / u.maxHealth <= 0.2 ? 15 * T(c).earlyDemise : 0;
      const outcome = spellRoll(c, 'shadow', { extraCrit: useInnerFocus(c) + early });
      const amount = spellDamage(c, u, 'shadowWordDeath', 'shadow', between(c, s.min, s.max), s.coeff, outcome);
      c.deal({ target: u, source: 'shadowWordDeath', outcome, school: 'shadow', amount, white: false, spell: true });
      if (amount) weave(c, u);
      if (u.health > 0 && !c.playerHealthLocked) {
        const p = c.player;
        p.health = Math.max(0, p.health - Math.round(p.maxHealth * s.backlash));
        c.count('deathBacklash');
        if (p.health === 0) c.emit('playerDeath', undefined);
      }
    },
  }),
  {
    id: 'shadowform', name: 'Shadowform', icon: 'shadowform', gcd: D.gcd, target: 'self', animation: 'cast',
    cost: (c) => (shadowform(c) ? 0 : D.shadowform.mana),
    ...talent('shadowform', 'Shadowform'),
    highlight: shadowform,
    description: () => `+${Math.round((D.shadowform.damage - 1) * 100)}% Shadow damage, Shadow spells cost half, Shadow crits deal double damage. No healing and no Penance. Press again to leave.`,
    use: (c) => {
      if (shadowform(c)) { c.removeAura(c.player, 'shadowform'); return; }
      c.applyAura(c.player, { id: 'shadowform', name: 'Shadowform', icon: 'shadowform', duration: Infinity });
    },
  },
  {
    id: 'innerFocus', name: 'Inner Focus', icon: 'innerFocus', gcd: 0, target: 'self',
    cooldown: D.innerFocus.cooldown,
    ...talent('innerFocus', 'Inner Focus'),
    highlight: innerFocus,
    description: () => `Your next spell costs no mana and, if it is not a damage over time spell, has ${D.innerFocus.crit}% more crit. Off the global cooldown.`,
    use: (c) => { c.applyAura(c.player, { id: 'innerFocus', name: 'Inner Focus', icon: 'innerFocus', duration: Infinity }); },
  },
  {
    id: 'powerInfusion', name: 'Power Infusion', icon: 'powerInfusion', gcd: 0, target: 'self',
    cost: () => D.powerInfusion.mana, cooldown: D.powerInfusion.cooldown,
    ...talent('powerInfusion', 'Power Infusion'),
    description: () => `+${Math.round((D.powerInfusion.damage - 1) * 100)}% spell damage for ${D.powerInfusion.duration} sec. Off the global cooldown.`,
    use: (c) => { c.applyAura(c.player, { id: 'powerInfusion', name: 'Power Infusion', icon: 'powerInfusion', duration: D.powerInfusion.duration }); },
  },
  spell({
    id: 'smite', name: 'Smite', icon: 'smite',
    projectile: { color: 0xffe680, fromSky: true },
    cost: cost(D.smite.mana, 'holy', { agility: true }),
    castTime: (c) => (D.smite.cast - 0.1 * T(c).divineFury) / c.castHaste(),
    description: (c) => `A ${(D.smite.cast - 0.1 * T(c).divineFury).toFixed(1)} sec cast: ${D.smite.min}-${D.smite.max} Holy damage plus ${Math.round(D.smite.coeff * 100)}% of spell power.${T(c).powerInLight ? ` Power in Light: +${2 * T(c).powerInLight}% while your Holy Fire burns on the target.` : ''}`,
    use: (c, t) => {
      const u = t!;
      const s = D.smite;
      const outcome = spellRoll(c, 'holy', { extraCrit: useInnerFocus(c) });
      const amount = Math.round(spellDamage(c, u, 'smite', 'holy', between(c, s.min, s.max), s.coeff, outcome) * powerInLight(c, u));
      c.deal({ target: u, source: 'smite', outcome, school: 'holy', amount, white: false, spell: true });
    },
  }),
  spell({
    id: 'holyFire', name: 'Holy Fire', icon: 'holyFire',
    projectile: { color: 0xffa040, fromSky: true },
    cost: cost(D.holyFire.mana, 'holy', { agility: true }),
    castTime: (c) => (D.holyFire.cast - 0.1 * T(c).divineFury) / c.castHaste(),
    description: (c) => `A ${(D.holyFire.cast - 0.1 * T(c).divineFury).toFixed(1)} sec cast: ${D.holyFire.min}-${D.holyFire.max} Holy damage plus spell power, then ${D.holyFire.ticks} ticks of ${D.holyFire.tick} over ${D.holyFire.ticks * D.holyFire.period} sec. Keep it burning for Power in Light: recast when less than 3 sec are left.`,
    use: (c, t) => {
      const u = t!;
      const h = D.holyFire;
      const outcome = spellRoll(c, 'holy', { extraCrit: useInnerFocus(c) });
      const amount = spellDamage(c, u, 'holyFire', 'holy', between(c, h.min, h.max), h.coeff, outcome);
      c.deal({ target: u, source: 'holyFire', outcome, school: 'holy', amount, white: false, spell: true });
      if (outcome === 'resist') return;
      const sl = T(c).searingLight;
      dot(c, u, 'holyFire', 'Holy Fire', 'holy', h.ticks, h.period, { base: h.tick, coeff: h.tickCoeff }, (cc) => {
        // Searing Light: a Holy Fire tick can make your next Holy Nova free.
        if (sl && T(cc).holyNova && roll(cc, [0, 5, 10][sl])) {
          cc.applyAura(cc.player, { id: 'holyPurpose', name: 'Holy Purpose', icon: 'holyPurpose', duration: D.holyPurpose });
          note(cc, 'Holy Purpose: free Holy Nova');
        }
      });
    },
  }),
  {
    id: 'holyNova', name: 'Holy Nova', icon: 'holyNova', gcd: D.gcd, target: 'self', hastedGcd: true, animation: 'cast',
    cost: (c) => (c.aura(c.player, 'holyPurpose') ? 0 : cost(D.holyNova.mana, 'holy', { agility: true })(c)),
    ...talent('holyNova', 'Holy Nova'),
    highlight: (c) => !!c.aura(c.player, 'holyPurpose'),
    description: () => `${D.holyNova.min}-${D.holyNova.max} Holy damage plus spell power to every enemy within ${D.holyNova.range} yards of you. Free after Holy Purpose.`,
    use: (c) => {
      c.removeAura(c.player, 'holyPurpose');
      useInnerFocus(c);
      const h = D.holyNova;
      for (const u of c.targets.filter((x) => x.health > 0 && c.inRange(x, h.range))) {
        const outcome = spellRoll(c, 'holy');
        const amount = spellDamage(c, u, 'holyNova', 'holy', between(c, h.min, h.max), h.coeff, outcome);
        c.deal({ target: u, source: 'holyNova', outcome, school: 'holy', amount, white: false, spell: true });
      }
    },
  },
  {
    ...spell({
      id: 'penance', name: 'Penance', icon: 'penance', range: D.penance.range,
      cost: cost(D.penance.mana, 'holy', { extra: (c) => 1 - 0.05 * T(c).improvedHealing }),
      cooldown: D.penance.cooldown,
      description: () => `A ${D.penance.duration} sec channel: ${D.penance.bolts} bolts of ${D.penance.damage} Holy damage plus spell power, at 0, 1 and 2 sec; each bolt rolls its own hit and crit. Not in Shadowform.`,
      use: () => {},
    }),
    requirements: (c) => (T(c).penance ? null : 'Requires the Penance talent') ?? (shadowform(c) ? 'Not in Shadowform' : null),
    usable: (c) => T(c).penance > 0 && !shadowform(c),
    channel: {
      duration: D.penance.duration, ticks: D.penance.bolts, tickAtStart: true,
      onStart: (c) => {
        const crit = useInnerFocus(c);
        if (crit) c.applyAura(c.player, { id: 'penanceFocus', name: 'Inner Focus', icon: 'innerFocus', duration: D.penance.duration + 0.1, hidden: true });
        return true;
      },
      onTick: (c, t) => {
        const u = t!;
        const p = D.penance;
        const outcome = spellRoll(c, 'holy', { extraCrit: c.aura(c.player, 'penanceFocus') ? D.innerFocus.crit : 0 });
        const amount = Math.round(spellDamage(c, u, 'penance', 'holy', p.damage, p.coeff, outcome) * powerInLight(c, u));
        c.deal({ target: u, source: 'penance', outcome, school: 'holy', amount, white: false, spell: true });
      },
    },
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

// ----------------------------------------------------------------- setup
export function prepare(c: Combat): void {
  const t = T(c);
  const p = c.player;
  p.maxResource = Math.max(1, Number(c.options.mana ?? 4300));
  p.regenPerSecond = 0;
  c.manaLocked = !!c.options.lockMana;
  // Improved Mind Flay +10 % per point; Twin Disciplines +1 % per point to Pain, Plague and Holy Nova (the client masks).
  c.mod.damageFor = {
    mindFlay: 1 + 0.1 * t.improvedMindFlay,
    shadowWordPain: 1 + 0.01 * t.twinDisciplines,
    devouringPlague: 1 + 0.01 * t.twinDisciplines,
    holyNova: 1 + 0.01 * t.twinDisciplines,
  };
  // Shadowform before the pull.
  if (t.shadowform) c.applyAura(p, { id: 'shadowform', name: 'Shadowform', icon: 'shadowform', duration: Infinity });
  c.trackedTargetAuras.push('shadowWordPain', 'devouringPlague', 'shadowWeaving', 'holyFire');
}

// ------------------------------------------------------- practice helpers
export function chances(c: Combat): { title: string; rows: [string, string][] }[] {
  const tl = T(c);
  const pct = (n: number) => `${Math.max(0, Math.min(100, n)).toFixed(1)}%`;
  const miss = (school: School) => Math.max(1, D.spellMiss - c.totalHit() - schoolHit(c, school));
  const rows: [string, string][] = [
    ['Shadow: miss / crit', `${pct(miss('shadow'))} / ${pct(c.spellCritChance())}`],
    ['Holy: miss / crit', `${pct(miss('holy'))} / ${pct(c.spellCritChance(schoolCrit(c, 'holy')))}`],
    ['Crit damage', shadowform(c) ? '2.0x for Shadow spells in Shadowform, 1.5x otherwise' : '1.5x'],
    ['Partial resists', `-${Math.round((1 - D.partialResist) * 100)}% on average (Mind Flay is all or nothing)`],
  ];
  const procs: [string, string][] = [];
  if (tl.shadowWeaving) procs.push(['Shadow Weaving per landed Shadow spell', `${[0, 33, 67, 100][tl.shadowWeaving]}%: +2% of your Shadow damage, 5 stacks, 15 s`]);
  if (tl.searingLight && tl.holyNova) procs.push(['Holy Purpose per Holy Fire tick (free Holy Nova)', `${[0, 5, 10][tl.searingLight]}%`]);
  if (c.raid.has('judgementOfWisdom')) procs.push(['Judgement of Wisdom: +59 mana', '50% per landed direct spell']);
  return [
    { title: 'Your spells', rows },
    { title: 'Procs', rows: procs },
    {
      title: 'Rhythm',
      rows: [
        ['Global cooldown', '1.5 s, shorter with casting haste (1.0 s floor)'],
        ['Mind Flay', `3 ticks over 3 s, not sped up by haste; ${D.mindFlay.range + 5 * tl.improvedMindFlay} yards`],
        ['Mind Blast cooldown', `${D.mindBlast.cooldown - 0.5 * tl.improvedMindBlast} s`],
        ['Mana regeneration now', `${regen(c).toFixed(1)} per second (Spirit stops 5 s after you spend mana${tl.meditation ? `; Meditation keeps ${[0, 17, 33, 50][tl.meditation]}%` : ''})`],
      ],
    },
  ];
}

export function onCooldown(c: Combat, id: string, cooldown: number): number {
  const time = c.counters.combatTime ?? 0;
  const row = c.meter.rows.get(id);
  const casts = row ? row.hits + row.misses : 0;
  return time > 0 ? Math.min(1, (casts * cooldown) / time) : 0;
}

export const SOURCES = [
  { label: 'wow-forever-sim', url: 'https://github.com/gunba/wow-forever-sim' },
  { label: 'foreversim', url: 'https://github.com/laurencestokes/foreversim' },
  { label: 'mythicsim-forever-engine', url: 'https://github.com/sage3648/mythicsim-forever-engine-go' },
];
