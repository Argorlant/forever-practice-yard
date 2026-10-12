// Balance for WoW Forever: the Wrath - Starfire - Starfire loop with Eclipse,
// Insect Swarm and Moonfire up, Nature's Grace haste, Omen of Clarity and
// mana under the five-second rule. Numbers in ./data.ts, builds in
// ./talents.ts; sources in research/druid_forever.md â†’ Balance.
import type { Combat } from '../../engine/combat';
import type { Ability, Outcome, School, Spec, Unit } from '../../engine/types';
import { LEADER_OF_THE_PACK } from '../../engine/raid';
import { BOSS_RULES } from '../common';
import { BALANCE_STATS } from './data';
import { CONTROLS, D, SOURCES, YARD, barkskin, clearcasting, faerieFire, manaPotion, omen, resetState, roll, useClearcasting } from './shared';
import { buildById, buildLabel, buildsFor, summary, talentsFor, type Talents } from './talents';

const T = (c: Combat): Talents => talentsFor(c.options.build, 'balance');
const RANGE = 30;

// ------------------------------------------------------------------- mana
const moonglow = (c: Combat) => [0, 0.08, 0.17, 0.25][T(c).moonglow];
/** Improved Wrath and Moonglow add up (gs): Wrath 120 -> 30 mana with 5/5 and 3/3. Provisional. */
const wrathMana = (c: Combat) => Math.round(D.wrath.mana * Math.max(0, 1 - 0.1 * T(c).improvedWrath - moonglow(c)));
const balanceMana = (base: number) => (c: Combat) => (clearcasting(c) ? 0 : Math.round(base * (1 - moonglow(c))));
const moonkinMana = (c: Combat) => Math.round(D.moonkinForm.mana * (1 - 0.1 * T(c).naturalShapeshifter));

/** Mana per second: Spirit regen outside the five-second rule (Reflection keeps some while casting), MP5 always. */
function regen(c: Combat): number {
  const spirit = 6.25 + Number(c.options.spirit ?? 123) / 8;
  const mp5 = Number(c.options.mp5 ?? 9) / 5;
  const casting = c.t - c.lastSpend < 5;
  const innervate = !!c.aura(c.player, 'innervate');
  const reflection = [0, 0.17, 0.33, 0.5][T(c).reflection];
  // Innervate: 5 times the Spirit regeneration, all of it while casting.
  const share = innervate ? 1 : casting ? reflection : 1;
  return spirit * (innervate ? D.innervate.regen : 1) * share + mp5;
}

// ----------------------------------------------------------------- spells
const spellPower = (c: Combat) => c.stats.spellPower ?? 0;
const vengeance = (c: Combat) => c.rules.spellCritMultiplier + 0.1 * T(c).vengeance;
/** Moonfury +2 % per point to Arcane and Nature, Naturalist +1 % per point to everything (the engine adds Curse of the Elements). */
function schoolMult(c: Combat, _t: Unit, school: School): number {
  const moonfury = school === 'arcane' || school === 'nature' ? 1 + 0.02 * T(c).moonfury : 1;
  return moonfury * (1 + 0.01 * T(c).naturalist);
}

/** Spell table: miss 17 % minus hit (1 % floor), then crit from spell crit and auras. */
function spellRoll(c: Combat, extraCrit = 0): Outcome {
  if (roll(c, Math.max(1, c.rules.spellMiss - c.totalHit()))) return 'resist';
  return roll(c, c.spellCritChance(extraCrit)) ? 'crit' : 'hit';
}

/** Nature's Grace: a non-periodic spell crit gives +10 % cast speed and -10 % GCD for 3 s. */
function naturesGrace(c: Combat): void {
  if (!T(c).naturesGrace) return;
  const g = D.naturesGrace;
  c.applyAura(c.player, { id: 'naturesGrace', name: "Nature's Grace", icon: 'naturesGrace', duration: g.duration, castHaste: g.haste, gcdMult: g.gcd });
  c.count('naturesGrace');
}

/** A direct damage spell; `delay` is the missile's flight time. Wrath, Starfire and Moonfire lose ~6 % to partial resists. */
function directSpell(c: Combat, t: Unit, id: string, school: School, base: number, opts: { extraCrit?: number; mult?: number; delay?: number } = {}): Outcome {
  const outcome = spellRoll(c, opts.extraCrit);
  if (outcome === 'crit') naturesGrace(c);
  const amount = outcome === 'resist' ? 0
    : Math.round(base * schoolMult(c, t, school) * (opts.mult ?? 1) * D.partialResist * (outcome === 'crit' ? vengeance(c) : 1));
  const land = () => c.deal({ target: t, source: id, outcome, school, amount, white: false, spell: true });
  if (opts.delay) c.schedule(c.t + opts.delay, land); else land();
  return outcome;
}

/** A damage over time spell: ticks can crit and re-read spell power (Forever client flag); Genesis +1 % per point. */
function dot(c: Combat, t: Unit, id: string, name: string, school: School, ticks: number, period: number,
  perTick: (cc: Combat) => number, opts: { extraCrit?: number; mult?: number; partial?: boolean } = {}): void {
  c.applyAura(t, {
    id, name, icon: id, duration: ticks * period, period,
    onTick: (cc) => {
      const crit = roll(cc, cc.spellCritChance(opts.extraCrit));
      const mult = schoolMult(cc, t, school) * (opts.mult ?? 1) * (1 + 0.01 * T(cc).genesis) * (opts.partial ? D.partialResist : 1);
      const amount = Math.round(perTick(cc) * mult * (crit ? vengeance(cc) : 1));
      cc.deal({ target: t, source: id, outcome: crit ? 'crit' : 'hit', school, amount, white: false, periodic: true });
    },
  });
}

/** Rolls Omen of Clarity for a cast of `castTime` seconds (the engine tracks the five-second rule). */
function afterCast(c: Combat, castTime: number): void {
  const moonkin = !!c.aura(c.player, 'moonkinForm');
  // fs: 2 procs per minute by cast time (instants count 1.5 s), doubled in Moonkin Form (5 s cooldown there).
  omen(c, Math.max(1.5, castTime), { mult: moonkin ? 2 : 1, icd: moonkin ? 5 : D.omen.icd });
}

const wrathCast = (c: Combat) => (D.wrath.cast - 0.1 * T(c).improvedWrath) / c.castHaste();
const eclipseCharges = (c: Combat) => c.aura(c.player, 'eclipse')?.stacks ?? 0;
const eclipseCut = (c: Combat) => [0, 0.17, 0.33, 0.5][T(c).eclipse];
const starfireCast = (c: Combat) => (D.starfire.cast - 0.1 * T(c).improvedStarfire - (eclipseCharges(c) ? eclipseCut(c) : 0)) / c.castHaste();
const splendor = (c: Combat) => T(c).naturesSplendor;
const improvedMoonfire = (c: Combat) => T(c).improvedMoonfire;

const spell = (a: Omit<Ability, 'gcd' | 'target' | 'range' | 'hastedGcd' | 'noAutoAttack'>): Ability => ({
  gcd: D.spellGcd, target: 'enemy', range: RANGE, hastedGcd: true, noAutoAttack: true, ...a,
});

// ------------------------------------------------------------- abilities
const abilities: Ability[] = [
  spell({
    id: 'wrath', name: 'Wrath', icon: 'wrath', animation: 'cast',
    projectile: { color: 0x8ef05a, speed: 20 },
    cost: wrathMana,
    castTime: wrathCast,
    description: (c) => `A ${wrathCast(c).toFixed(2)} sec cast: ${D.wrath.min}-${D.wrath.max} Nature damage plus ${Math.round(D.wrath.coeff * 100)}% of spell power.${T(c).eclipse ? ` Grants ${D.wrath.eclipseCharges} Eclipse charges (max ${D.eclipse.maxCharges}).` : ''} Never uses Clearcasting.`,
    use: (c, t) => {
      const u = t!;
      const w = D.wrath;
      const base = w.min + c.random() * (w.max - w.min) + w.coeff * spellPower(c);
      directSpell(c, u, 'wrath', 'nature', base, { delay: c.distance(u) / (20 * YARD) });
      if (T(c).eclipse) {
        const stacks = Math.min(D.eclipse.maxCharges, eclipseCharges(c) + w.eclipseCharges);
        c.applyAura(c.player, { id: 'eclipse', name: 'Eclipse', icon: 'eclipse', duration: D.eclipse.duration, stacks });
      }
      afterCast(c, wrathCast(c));
    },
  }),
  spell({
    id: 'starfire', name: 'Starfire', icon: 'starfire', animation: 'cast',
    projectile: { color: 0xe9a8ff, fromSky: true },
    cost: balanceMana(D.starfire.mana),
    castTime: starfireCast,
    highlight: (c) => eclipseCharges(c) > 0,
    description: (c) => `A ${starfireCast(c).toFixed(2)} sec cast: ${D.starfire.min}-${D.starfire.max} Arcane damage plus ${D.starfire.coeff * 100}% of spell power.${T(c).eclipse ? ` Each Eclipse charge makes one Starfire ${eclipseCut(c)} sec faster.` : ''}`,
    use: (c, t) => {
      const s = D.starfire;
      const cast = starfireCast(c);
      useClearcasting(c);
      const ec = c.aura(c.player, 'eclipse');
      if (ec) {
        c.count('eclipseStarfires');
        if ((ec.stacks ?? 1) <= 1) c.removeAura(c.player, 'eclipse'); else ec.stacks = (ec.stacks ?? 1) - 1;
      }
      c.count('starfires');
      directSpell(c, t!, 'starfire', 'arcane', s.min + c.random() * (s.max - s.min) + s.coeff * spellPower(c));
      afterCast(c, cast);
    },
  }),
  spell({
    id: 'moonfire', name: 'Moonfire', icon: 'moonfire', animation: 'cast',
    projectile: { color: 0x9fd8ff, fromSky: true },
    cost: balanceMana(D.moonfire.mana),
    description: (c) => `${D.moonfire.min}-${D.moonfire.max} Arcane damage, then ${D.moonfire.tick} every ${D.moonfire.period} sec for ${(D.moonfire.ticks + splendor(c)) * D.moonfire.period} sec, both with spell power. The ticks can crit.`,
    use: (c, t) => {
      const u = t!;
      const m = D.moonfire;
      useClearcasting(c);
      const imf = { extraCrit: 5 * improvedMoonfire(c), mult: 1 + 0.05 * improvedMoonfire(c) };
      const outcome = directSpell(c, u, 'moonfire', 'arcane', m.min + c.random() * (m.max - m.min) + m.coeff * spellPower(c), imf);
      if (outcome !== 'resist') dot(c, u, 'moonfire', 'Moonfire', 'arcane', m.ticks + splendor(c), m.period, (cc) => m.tick + m.tickCoeff * spellPower(cc), { ...imf, partial: true });
      afterCast(c, 0);
    },
  }),
  spell({
    id: 'insectSwarm', name: 'Insect Swarm', icon: 'insectSwarm', animation: 'cast',
    cost: balanceMana(D.insectSwarm.mana),
    requirements: (c) => (T(c).insectSwarm ? null : 'Requires the Insect Swarm talent'),
    usable: (c) => T(c).insectSwarm > 0,
    description: (c) => `${D.insectSwarm.tick} Nature damage plus spell power every ${D.insectSwarm.period} sec for ${(D.insectSwarm.ticks + splendor(c)) * D.insectSwarm.period} sec; the target's hit chance drops by 2%. All or nothing: no partial resists.`,
    use: (c, t) => {
      const u = t!;
      const s = D.insectSwarm;
      useClearcasting(c);
      if (roll(c, Math.max(1, c.rules.spellMiss - c.totalHit()))) {
        c.deal({ target: u, source: 'insectSwarm', outcome: 'resist', school: 'nature', amount: 0, white: false });
      } else {
        dot(c, u, 'insectSwarm', 'Insect Swarm', 'nature', s.ticks + splendor(c), s.period, (cc) => s.tick + s.tickCoeff * spellPower(cc));
      }
      afterCast(c, 0);
    },
  }),
  faerieFire({ gcd: D.spellGcd, hasted: true, cost: () => D.faerieFire.mana }),
  {
    id: 'innervate', name: 'Innervate', icon: 'innervate', gcd: D.spellGcd, target: 'self', hastedGcd: true,
    animation: 'cast',
    cost: () => D.innervate.mana, cooldown: D.innervate.cooldown,
    description: () => `For ${D.innervate.duration} sec your Spirit regeneration is 5 times faster and continues fully while casting.`,
    use: (c) => {
      c.applyAura(c.player, { id: 'innervate', name: 'Innervate', icon: 'innervate', duration: D.innervate.duration });
      afterCast(c, 0);
    },
  },
  {
    id: 'moonkinForm', name: 'Moonkin Form', icon: 'moonkinForm', gcd: D.spellGcd, target: 'self',
    animation: 'cast',
    cost: (c) => (c.aura(c.player, 'moonkinForm') ? 0 : moonkinMana(c)),
    requirements: (c) => (T(c).moonkinForm ? null : 'Requires the Moonkin Form talent'),
    usable: (c) => T(c).moonkinForm > 0,
    highlight: (c) => !!c.aura(c.player, 'moonkinForm'),
    description: (c) => `Moonkin Aura: 3% crit for you and your party (not with Leader of the Pack); Omen of Clarity procs twice as often. ${moonkinMana(c)} mana. Press again to leave the form.`,
    use: (c) => {
      if (c.aura(c.player, 'moonkinForm')) { leaveMoonkin(c); return; }
      enterMoonkin(c);
    },
  },
  barkskin(D.spellGcd),
  manaPotion,
];

function enterMoonkin(c: Combat): void {
  c.applyAura(c.player, { id: 'moonkinForm', name: 'Moonkin Form', icon: 'moonkinForm', duration: Infinity });
  c.applyAura(c.player, { ...LEADER_OF_THE_PACK, name: 'Moonkin Aura', icon: 'moonkinForm' });
}
function leaveMoonkin(c: Combat): void {
  c.removeAura(c.player, 'moonkinForm');
  // The raid's Leader of the Pack stays.
  if (c.raid.has('leaderOfThePack')) c.applyAura(c.player, LEADER_OF_THE_PACK);
  else c.removeAura(c.player, 'leaderOfThePack');
}

// ----------------------------------------------------------------- setup
function prepare(c: Combat): void {
  const t = T(c);
  const p = c.player;
  resetState(c);
  p.maxResource = Math.max(1, Number(c.options.mana ?? 4024));
  p.regenPerSecond = 0;
  c.manaLocked = !!c.options.lockMana;
  c.mod.spellCrit = 2 * t.naturesMajesty;
  c.mod.hit = 2 * t.naturesReach;
  // Moonkin Form before the pull.
  if (t.moonkinForm) enterMoonkin(c);
  c.trackedTargetAuras.push('moonfire', 'insectSwarm');
  c.trackedAuras.push('naturesGrace');
}

// ------------------------------------------------------------- rotation
/** gs's ranked moonkin list (research/druid_forever.md â†’ Balance). */
function suggest(c: Combat): string | null {
  const t = c.target;
  if (!t || t.health <= 0) return null;
  const p = c.player;
  const tl = T(c);
  const ready = (id: string) => c.cooldownLeft(id).left === 0;
  if (tl.moonkinForm && !c.aura(p, 'moonkinForm')) return 'moonkinForm';
  if (!c.manaLocked && p.inCombat) {
    if (p.resource <= 500 && ready('innervate')) return 'innervate';
    if (p.resource <= p.maxResource - D.manaPotion.max && p.resource <= 1500 && ready('manaPotion')) return 'manaPotion';
  }
  // Short on mana: skip what you cannot pay for; Wrath (30 mana) keeps you casting.
  const afford = (id: string) => c.cost(c.ability(id)!) <= p.resource;
  if (tl.insectSwarm && !c.aura(t, 'insectSwarm') && afford('insectSwarm')) return 'insectSwarm';
  if (!c.aura(t, 'moonfire') && afford('moonfire')) return 'moonfire';
  if (eclipseCharges(c) >= 1 && afford('starfire')) return 'starfire';
  return 'wrath';
}

// ------------------------------------------------------- practice helpers
function chances(c: Combat): { title: string; rows: [string, string][] }[] {
  const tl = T(c);
  const pct = (n: number) => `${Math.max(0, n).toFixed(1)}%`;
  const miss = Math.max(1, c.rules.spellMiss - c.totalHit());
  const moonkin = !!c.aura(c.player, 'moonkinForm');
  const omenAt = (cast: number) => pct(((D.omen.ppm * Math.max(1.5, cast)) / 60) * 100 * (moonkin ? 2 : 1));
  const procs: [string, string][] = [
    ['Clearcasting: next Starfire, Moonfire or Insect Swarm free', `Wrath ${omenAt(wrathCast(c))} / Starfire ${omenAt(starfireCast(c))} / instants ${omenAt(1.5)} per cast${moonkin ? ' (doubled in Moonkin Form)' : ''}; provisional`],
  ];
  if (tl.naturesGrace) procs.push(["Nature's Grace: +10% cast speed, -10% GCD for 3 s", `on every direct spell crit (${pct(c.spellCritChance())})`]);
  if (c.raid.has('judgementOfWisdom')) procs.push(['Judgement of Wisdom: +59 mana', '50% per landed direct spell']);
  return [
    {
      title: 'Your spells',
      rows: [
        ['Miss (17% minus hit, 1% floor)', pct(miss)],
        ['Crit (Moonfire +' + 5 * tl.improvedMoonfire + '%)', pct(c.spellCritChance())],
        ['Crit damage', `${vengeance(c).toFixed(1)}x`],
        ['Partial resists on Wrath, Starfire and Moonfire', `-${Math.round((1 - D.partialResist) * 100)}% on average`],
      ],
    },
    { title: 'Procs', rows: procs },
    {
      title: 'Rhythm',
      rows: [
        ['Wrath cast / Starfire cast (with Eclipse)', `${wrathCast(c).toFixed(2)} s / ${((D.starfire.cast - 0.1 * tl.improvedStarfire) / c.castHaste()).toFixed(2)} s (${((D.starfire.cast - 0.1 * tl.improvedStarfire - eclipseCut(c)) / c.castHaste()).toFixed(2)} s)`],
        ['Global cooldown', '1.5 s, shorter with casting haste (1.0 s floor)'],
        ['Eclipse', tl.eclipse ? `Wrath gives ${D.wrath.eclipseCharges} charges, max ${D.eclipse.maxCharges}, ${D.eclipse.duration} s` : 'not talented'],
        ['Mana: Wrath / Starfire / Moonfire / Insect Swarm', `${wrathMana(c)} / ${Math.round(D.starfire.mana * (1 - moonglow(c)))} / ${Math.round(D.moonfire.mana * (1 - moonglow(c)))} / ${Math.round(D.insectSwarm.mana * (1 - moonglow(c)))}`],
        ['Mana regeneration now', `${regen(c).toFixed(1)} per second`],
      ],
    },
  ];
}

function review(c: Combat): { label: string; value: string; good?: boolean }[] {
  const k = c.counters;
  const time = k.combatTime ?? 0;
  if (time < 1) return [];
  const pctOf = (n: number) => `${Math.round(n * 100)}%`;
  const uptime = (key: string) => (k[key] ?? 0) / time;
  const starfires = k.starfires ?? 0;
  const rows: { label: string; value: string; good?: boolean }[] = [
    { label: 'Moonfire uptime', value: pctOf(uptime('uptime:target:moonfire')), good: uptime('uptime:target:moonfire') >= 0.85 },
  ];
  if (T(c).insectSwarm) rows.push({ label: 'Insect Swarm uptime', value: pctOf(uptime('uptime:target:insectSwarm')), good: uptime('uptime:target:insectSwarm') >= 0.85 });
  if (T(c).eclipse) rows.push({ label: 'Starfires with Eclipse', value: starfires ? `${k.eclipseStarfires ?? 0} of ${starfires}` : '-', good: starfires === 0 || (k.eclipseStarfires ?? 0) / starfires >= 0.9 });
  if (T(c).naturesGrace) rows.push({ label: "Nature's Grace uptime", value: pctOf(uptime('uptime:naturesGrace')) });
  rows.push({ label: 'Clearcasting procs / used', value: `${k.clearcasting ?? 0} / ${k.clearcastingUsed ?? 0}` });
  if (!c.manaLocked) {
    if (c.raid.has('judgementOfWisdom')) rows.push({ label: 'Mana from Judgement of Wisdom', value: `+${Math.round(k.manaOnHit ?? 0)}` });
    rows.push({ label: 'Time without mana for Starfire', value: `${Math.round(k.lowMana ?? 0)} s (${pctOf((k.lowMana ?? 0) / time)})`, good: (k.lowMana ?? 0) / time < 0.1 });
  }
  return rows;
}

export const druidBalance: Spec = {
  id: 'druid-balance',
  className: 'Druid',
  specName: 'Balance',
  resource: 'mana',
  abilities,
  stats: BALANCE_STATS,
  rules: BOSS_RULES,
  builds: buildsFor('balance').map((b) => ({ id: b.id, label: buildLabel(b), name: b.name, source: 'gunba/wow-forever-sim', talentString: b.talentString, stats: b.stats, bar: b.bar, trees: summary(talentsFor(b.id, 'balance')) })),
  defaultOptions: { build: 'moonkin', mana: 4024, spirit: 123, mp5: 9, lockMana: false },
  // Running out of mana is part of Balance: play with the raid's mana buffs on.
  defaultRaid: ['judgementOfWisdom', 'blessingOfWisdom', 'manaSpring'],
  prefsRevision: 2,
  lowMana: (c) => Math.round(D.starfire.mana * (1 - moonglow(c))),
  options: [
    { key: 'lockMana', name: 'Lock your mana (spells cost nothing)', kind: 'toggle' },
    { key: 'mana', name: 'Mana pool', kind: 'number', step: 100 },
    { key: 'spirit', name: 'Spirit (regeneration outside the five-second rule)', kind: 'number', step: 1 },
    { key: 'mp5', name: 'Mana per 5 sec from gear', kind: 'number', step: 1 },
  ],
  sheet: { attackPower: false, crit: false, spellCrit: 'Spell crit (gear + Intellect)', spellPower: 'Spell power', mainHand: false, offHand: false },
  regen,
  bar: buildById('moonkin', 'balance').bar,
  welcome: 'Welcome to the Balance practice yard. Keep Insect Swarm and Moonfire up, then loop Wrath - Starfire - Starfire: each Wrath gives two Eclipse charges that make Starfire faster. Mana runs out, as it does in Forever: Judgement of Wisdom, Blessing of Wisdom and Mana Spring Totem are on, and Innervate and Major Mana Potions are on your bar.',
  help: `${CONTROLS}
    Spells have a cast bar; moving interrupts it. The global cooldown is 1.5 sec and shrinks with casting haste down to 1.0 sec.
    Wrath (1.5 sec with Improved Wrath) gives two Eclipse charges; each one takes 0.5 sec off a Starfire (3.0 -> 2.5 sec). A spell crit gives Nature's Grace: 10% faster casts and a 10% shorter GCD for 3 sec.
    Moonfire and Insect Swarm ticks can crit and use your spell power each tick. Clearcasting makes your next Starfire, Moonfire or Insect Swarm free, never Wrath; Moonkin Form doubles its chance.
    Mana: Spirit regeneration stops for 5 sec after you spend mana (Reflection keeps half of it while casting), MP5 always counts. Judgement of Wisdom on the dummy gives mana back on your direct spells; Blessing of Wisdom and Mana Spring Totem add 8 and 5 mana per second (all three are on by default under Raid buffs and debuffs); Innervate and Major Mana Potions do the rest. You can lock your mana in Settings.
    This is a practice tool: hit, crit and proc chances follow WoW Forever; damage numbers are an approximation.`,
  look: { clothColor: 0x2f5a3a, leatherColor: 0x3d3326, hood: false, robe: true },
  sources: SOURCES,
  prepare,
  suggest,
  chances,
  review,
};
