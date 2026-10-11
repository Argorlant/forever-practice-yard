// What every warlock spec shares: the spell table, Ruin and Pandemic crits,
// DoTs with Nightfall, one Bane per target (Agony or Doom), Curse of the
// Elements, Life Tap (health into mana, with raid healing), the personal
// Improved Shadow Bolt debuff, Shadow and Flame, Demonic Sacrifice and the
// demon (a melee swing plus Lash of Pain, or the Imp's Firebolts) with
// Demonic Brand. Numbers in ./data.ts; sources in research/warlock_forever.md.
import type { Combat } from '../../engine/combat';
import type { Ability, Outcome, School, Unit } from '../../engine/types';
import { DATA } from './data';
import { buildById, talentsFor, type Talents, type WarlockSpec } from './talents';

export const D = DATA;
const roll = (c: Combat, pct: number) => c.random() * 100 < pct;
const between = (c: Combat, min: number, max: number) => min + c.random() * (max - min);
const note = (c: Combat, text: string, kind: 'proc' | 'resource' = 'proc') => c.emit('note', { text, kind });

const specOf = (c: Combat) => c.spec.id.replace('warlock-', '') as WarlockSpec;
/** Talent ranks of the build chosen in Settings. */
export const T = (c: Combat): Talents => talentsFor(c.options.build, specOf(c));
export const build = (c: Combat) => buildById(c.options.build, specOf(c));

// ------------------------------------------------------------------- mana
/** Cataclysm: Destruction spells cost 3/6/10 % less. */
const DESTRUCTION = ['shadowBolt', 'immolate', 'searingPain', 'soulFire', 'incinerate', 'conflagrate', 'shadowburn'];
function cost(id: string, base: number) {
  return (c: Combat) => Math.round(base * (DESTRUCTION.includes(id) ? 1 - [0, 0.03, 0.06, 0.1][T(c).cataclysm] : 1));
}
/** Life Tap: (424 + Spirit) x (1 + 10 % per Improved Life Tap point) health into the same mana. */
export const lifeTapAmount = (c: Combat) => Math.round((D.lifeTap.base + Number(c.options.spirit ?? D.spirit)) * (1 + 0.1 * T(c).improvedLifeTap));

/** Mana per second: Spirit regen outside the five-second rule (Life Tap does not restart it), MP5 always. */
export function regen(c: Combat): number {
  const spirit = 6.25 + Number(c.options.spirit ?? D.spirit) / 8;
  const mp5 = Number(c.options.mp5 ?? D.mp5) / 5;
  return (c.t - c.lastSpend >= 5 ? spirit : 0) + mp5;
}

// --------------------------------------------------------------- spell table
const PANDEMIC = ['corruption', 'baneOfAgony', 'baneOfDoom', 'drainLife', 'siphonLife', 'wrack'];
const BINARY = ['immolate', 'shadowburn', 'deathCoil', 'siphonLife'];

function critChance(c: Combat, id: string, school: School): number {
  const tl = T(c);
  let extra = school === 'shadow' ? tl.malevolence : 0;
  if (id === 'conflagrate') extra += [0, 8, 17, 25][tl.fireAndBrimstone];
  if (id === 'searingPain') extra += [0, 3, 7, 10][tl.agonizingFlames];
  return c.spellCritChance(extra);
}
/** Ruin makes Destruction spells 2.0x, Pandemic the DoTs and drains; otherwise 1.5x. */
function critMultiplier(c: Combat, id: string): number {
  const tl = T(c);
  if (DESTRUCTION.includes(id)) return c.rules.spellCritMultiplier + 0.1 * tl.ruin;
  if (PANDEMIC.includes(id)) return c.rules.spellCritMultiplier + [0, 0.167, 0.333, 0.5][tl.pandemic];
  return c.rules.spellCritMultiplier;
}
/** Damage multipliers by school and spell: Shadow Mastery, Malediction, Agonizing Flames, Improved Corruption, your Improved Shadow Bolt debuff, Shadow and Flame, Demonic Sacrifice, Soul Link. */
function damageMult(c: Combat, t: Unit, id: string, school: School, periodic: boolean): number {
  const tl = T(c);
  const p = c.player;
  let m = 1;
  if (school === 'shadow') {
    m *= 1 + 0.01 * tl.shadowMastery;
    if (c.aura(t, 'improvedShadowBolt')) m *= 1 + 0.04 * tl.improvedShadowBolt;
    if (c.aura(p, 'shadowFlameShadow')) m *= 1 + 0.02 * tl.shadowAndFlame;
    if (c.aura(p, 'burningShadow')) m *= D.demonicSacrifice.damage;
    if (c.aura(p, 'masterDemonologist')) m *= 1 + 0.02 * tl.masterDemonologist;
  } else if (school === 'fire') {
    if (c.aura(p, 'shadowFlameFire')) m *= 1 + 0.02 * tl.shadowAndFlame;
    if (c.aura(p, 'touchOfFire')) m *= D.demonicSacrifice.damage;
  }
  if (periodic) m *= 1 + 0.01 * tl.malediction;
  if (DESTRUCTION.includes(id)) m *= 1 + [0, 0.03, 0.07, 0.1][tl.agonizingFlames];
  if (id === 'corruption') m *= 1 + 0.02 * tl.improvedCorruption;
  if (id === 'drainLife' || id === 'wrack') m *= 1 + [0, 0.07, 0.13, 0.2][tl.improvedDrains];
  if ((id === 'corruption' || id === 'baneOfAgony') && c.channeling?.id === 'wrack') m *= 1 + D.wrack.bonus;
  if (c.aura(p, 'soulLink')) m *= D.soulLink;
  return m;
}

/** A direct spell: hit (17 % minus hit and Suppression), crit, damage. */
function directSpell(c: Combat, t: Unit, id: string, school: School, base: number, coeff: number): { outcome: Outcome; amount: number } {
  const outcome: Outcome = roll(c, Math.max(1, D.spellMiss - c.totalHit())) ? 'resist' : roll(c, critChance(c, id, school)) ? 'crit' : 'hit';
  let amount = 0;
  if (outcome !== 'resist') {
    amount = Math.max(1, Math.round((base + coeff * c.spellPowerFor(school)) * damageMult(c, t, id, school, false)
      * (outcome === 'crit' ? critMultiplier(c, id) : 1) * (BINARY.includes(id) ? 1 : D.partialResist)));
  }
  c.deal({ target: t, source: id, outcome, school, amount, white: false, spell: true });
  return { outcome, amount };
}

/** A DoT: hit rolled when applied, ticks crit and use your current stats; Nightfall can proc from Corruption ticks. */
function dot(c: Combat, t: Unit, id: string, name: string, school: School, ticks: number, period: number, perTick: (cc: Combat, n: number) => number,
  opts: { heal?: boolean; nightfall?: boolean } = {}): boolean {
  if (roll(c, Math.max(1, D.spellMiss - c.totalHit()))) {
    c.deal({ target: t, source: id, outcome: 'resist', school, amount: 0, white: false });
    return false;
  }
  let n = 0;
  c.applyAura(t, {
    id, name, icon: id, duration: ticks * period, period, bleed: false,
    onTick: (cc) => {
      n++;
      const crit = roll(cc, critChance(cc, id, school));
      const amount = Math.max(1, Math.round(perTick(cc, n) * damageMult(cc, t, id, school, true) * (crit ? critMultiplier(cc, id) : 1)
        * (BINARY.includes(id) ? 1 : D.partialResist)));
      cc.deal({ target: t, source: id, outcome: crit ? 'crit' : 'hit', school, amount, white: false, periodic: true });
      if (opts.heal) healPlayer(cc, amount);
      if (opts.nightfall) nightfall(cc);
    },
  });
  return true;
}

/** Nightfall: 2 % per point per tick of Corruption, Drain Life and Wrack for an instant Shadow Bolt. */
function nightfall(c: Combat): void {
  const nf = T(c).nightfall;
  if (!nf || !roll(c, 2 * nf)) return;
  c.applyAura(c.player, { id: 'shadowTrance', name: 'Shadow Trance', icon: 'shadowTrance', duration: D.shadowTrance.duration });
  c.count('shadowTrance');
  note(c, 'Shadow Trance: instant Shadow Bolt');
}
const healPlayer = (c: Combat, n: number) => { if (!c.playerHealthLocked) c.player.health = Math.min(c.player.maxHealth, c.player.health + n); };

/** One Bane per target: casting Agony removes Doom and the other way round. */
function bane(c: Combat, t: Unit, keep: string): void {
  for (const id of ['baneOfAgony', 'baneOfDoom']) if (id !== keep) c.removeAura(t, id);
}
export const baneOn = (c: Combat, t: Unit) => !!c.aura(t, 'baneOfAgony') || !!c.aura(t, 'baneOfDoom');
export const left = (c: Combat, t: Unit, id: string) => { const a = c.aura(t, id); return a ? a.end - c.t : 0; };

const talent = (key: keyof Talents, name: string) => ({
  requirements: (c: Combat) => (T(c)[key] ? null : `Requires the ${name} talent`),
  usable: (c: Combat) => T(c)[key] > 0,
});
const spell = (a: Omit<Ability, 'gcd' | 'target' | 'range' | 'hastedGcd' | 'noAutoAttack'> & { range?: number }): Ability => ({
  gcd: D.gcd, target: 'enemy', hastedGcd: true, noAutoAttack: true, animation: 'cast', ...a, range: a.range ?? 30,
});
const castTime = (base: (c: Combat) => number) => (c: Combat) => base(c) / c.castHaste();
export const execute = (c: Combat) => !!c.target && c.target.health / c.target.maxHealth <= D.decimation.threshold;

// -------------------------------------------------------------------- demon
const petSp = (c: Combat) => D.pet.spShare * c.spellPowerFor('shadow');
const petAp = (c: Combat) => D.pet.apBase + D.pet.apShare * c.spellPowerFor('shadow');
const petMult = (c: Combat) => (1 + 0.02 * T(c).unholyPower) * (c.aura(c.player, 'soulLink') ? D.soulLink : 1);

/** A demon's hit: melee table from behind for the Succubus, the spell table for spells; Demonic Brand adds a hit. */
function petHit(c: Combat, u: Unit, source: string, base: number, kind: 'melee' | 'spell', school: School): void {
  let outcome: Outcome = 'hit';
  if (kind === 'melee') {
    let x = c.random() * 100;
    if ((x -= Math.max(0, c.rules.specialMiss - c.totalHit())) < 0) outcome = 'miss';
    else if ((x -= c.rules.dodge) < 0) outcome = 'dodge';
    else if (source === 'petMelee' && (x -= c.rules.glanceChance) < 0) outcome = 'glance';
    else if (roll(c, D.pet.crit + c.stats.crit - c.rules.critSuppression)) outcome = 'crit';
  } else {
    outcome = roll(c, Math.max(1, D.spellMiss - c.totalHit())) ? 'resist' : roll(c, c.spellCritChance()) ? 'crit' : 'hit';
  }
  let amount = 0;
  if (outcome === 'hit' || outcome === 'crit' || outcome === 'glance') {
    const m = outcome === 'crit' ? (kind === 'melee' ? c.rules.critMultiplier : c.rules.spellCritMultiplier) : outcome === 'glance' ? 0.65 : 1;
    const armor = school === 'physical' ? 1 - c.armorReduction(u) : 1;
    amount = Math.max(1, Math.round(base * petMult(c) * m * armor));
  }
  c.deal({ target: u, source, outcome, school, amount, white: false });
  // Demonic Brand: each landed demon attack spends a charge for an extra hit.
  const brand = c.aura(u, 'demonicBrand');
  if (brand && amount > 0) {
    const b = D.pet.brand;
    const fire = build(c).demon === 'imp';
    const crit = roll(c, c.spellCritChance());
    const extra = Math.round((between(c, b.min, b.max) + b.coeff * c.spellPowerFor(fire ? 'fire' : 'shadow')) * (crit ? 1.5 : 1));
    c.deal({ target: u, source: 'demonicBrand', outcome: crit ? 'crit' : 'hit', school: fire ? 'fire' : 'shadow', amount: extra, white: false });
    brand.stacks = (brand.stacks ?? 1) - 1;
    if (brand.stacks <= 0) c.removeAura(u, 'demonicBrand');
  }
}

interface PetState { swing: { cancel: () => void } | null; next: number; lashReady: number; castEnd: number }
const pets = new WeakMap<Combat, PetState>();
const petState = (c: Combat): PetState => {
  let s = pets.get(c);
  if (!s) pets.set(c, (s = { swing: null, next: 0, lashReady: 0, castEnd: 0 }));
  return s;
};

function petSwing(c: Combat): void {
  const s = petState(c);
  s.swing = null;
  const u = c.target;
  if (!c.pet.attacking || !u || u.health <= 0) return;
  petHit(c, u, 'petMelee', D.pet.base + petAp(c) / 7, 'melee', 'physical');
  c.emit('petAttack', { kind: 'melee' });
  s.next = c.t + D.pet.swing;
  s.swing = c.schedule(s.next, () => petSwing(c));
}

/** The demon's mind, every 0.1 s: it attacks when you do. The Succubus swings and Lashes every 12 s; the Imp casts Firebolt back to back. */
function petThink(c: Combat): void {
  const s = petState(c);
  const u = c.target;
  const fighting = !!u && u.health > 0 && c.player.inCombat;
  c.pet.attacking = fighting;
  if (!fighting) { s.swing?.cancel(); s.swing = null; return; }
  const demon = build(c).demon;
  if (demon === 'succubus') {
    if (!s.swing) s.swing = c.schedule(Math.max(c.t, s.next), () => petSwing(c));
    if (c.t >= s.lashReady) {
      s.lashReady = c.t + D.pet.lashOfPain.cooldown;
      const l = D.pet.lashOfPain;
      petHit(c, u!, 'lashOfPain', (l.damage + l.coeff * petSp(c)) * (1 + 0.1 * T(c).improvedSayaad), 'spell', 'shadow');
    }
  } else if (demon === 'imp' && c.t >= s.castEnd) {
    const f = D.pet.firebolt;
    s.castEnd = c.t + f.cast + f.gap;
    c.schedule(c.t + f.cast, () => {
      if (c.pet.attacking && c.target) petHit(c, c.target, 'firebolt', (between(c, f.min, f.max) + f.coeff * petSp(c)) * (1 + 0.1 * T(c).improvedImp), 'spell', 'fire');
    });
  }
}

// --------------------------------------------------------------- abilities
export const ABILITIES: Ability[] = [
  spell({
    id: 'shadowBolt', name: 'Shadow Bolt', icon: 'shadowBolt',
    projectile: { color: 0x9a4aff, speed: D.shadowBolt.speed },
    cost: cost('shadowBolt', D.shadowBolt.mana),
    castTime: (c) => (c.aura(c.player, 'shadowTrance') ? 0 : castTime((cc) => D.shadowBolt.cast - 0.1 * T(cc).bane)(c)),
    highlight: (c) => !!c.aura(c.player, 'shadowTrance'),
    description: (c) => `A ${(D.shadowBolt.cast - 0.1 * T(c).bane).toFixed(1)} sec cast: ${D.shadowBolt.min}-${D.shadowBolt.max} Shadow damage plus ${Math.round(D.shadowBolt.coeff * 100)}% of spell power. Instant with Shadow Trance.${T(c).improvedShadowBolt ? ` A crit gives your Improved Shadow Bolt debuff: +${4 * T(c).improvedShadowBolt}% to your Shadow damage for 12 sec.` : ''}`,
    use: (c, t) => {
      const u = t!;
      // Only an instant Shadow Bolt (the GCD started just now) spends Shadow Trance; one that procs mid-cast waits.
      if (c.aura(c.player, 'shadowTrance') && c.t - c.player.gcdStart < 1e-6) {
        c.removeAura(c.player, 'shadowTrance');
        c.count('tranceUsed');
      }
      const s = D.shadowBolt;
      const r = directSpell(c, u, 'shadowBolt', 'shadow', between(c, s.min, s.max), s.coeff);
      if (r.outcome === 'crit' && T(c).improvedShadowBolt) {
        c.applyAura(u, { id: 'improvedShadowBolt', name: 'Improved Shadow Bolt', icon: 'improvedShadowBolt', duration: D.improvedShadowBolt.duration });
      }
      if (execute(c) && T(c).decimation) c.applyAura(c.player, { id: 'decimation', name: 'Decimation', icon: 'decimation', duration: D.decimation.duration });
    },
  }),
  spell({
    id: 'immolate', name: 'Immolate', icon: 'immolate',
    cost: cost('immolate', D.immolate.mana),
    castTime: castTime((c) => D.immolate.cast - 0.1 * T(c).bane),
    description: () => `A cast: ${D.immolate.direct} Fire damage plus spell power, then ${D.immolate.ticks} ticks of ${D.immolate.tick} every ${D.immolate.period} sec. All or nothing. Refresh it when it has less time left than its cast.`,
    use: (c, t) => {
      const u = t!;
      const i = D.immolate;
      const r = directSpell(c, u, 'immolate', 'fire', i.direct * (1 + 0.1 * T(c).aftermath), i.coeff);
      if (r.outcome === 'resist') return;
      c.applyAura(u, {
        id: 'immolate', name: 'Immolate', icon: 'immolate', duration: i.ticks * i.period, period: i.period,
        onTick: (cc) => {
          const crit = roll(cc, critChance(cc, 'immolate', 'fire'));
          const amount = Math.max(1, Math.round((i.tick + i.tickCoeff * cc.spellPowerFor('fire')) * damageMult(cc, u, 'immolate', 'fire', true) * (crit ? critMultiplier(cc, 'immolate') : 1)));
          cc.deal({ target: u, source: 'immolate', outcome: crit ? 'crit' : 'hit', school: 'fire', amount, white: false, periodic: true });
        },
      });
    },
  }),
  spell({
    id: 'corruption', name: 'Corruption', icon: 'corruption',
    cost: cost('corruption', D.corruption.mana),
    castTime: castTime((c) => Math.max(0, D.corruption.cast - 0.4 * T(c).improvedCorruption)),
    description: (c) => `${D.corruption.ticks} ticks of ${D.corruption.tick} Shadow damage plus spell power over ${D.corruption.ticks * D.corruption.period} sec.${T(c).nightfall ? ` Each tick has a ${2 * T(c).nightfall}% chance to give Shadow Trance.` : ''}`,
    use: (c, t) => {
      const k = D.corruption;
      dot(c, t!, 'corruption', 'Corruption', 'shadow', k.ticks, k.period, (cc) => k.tick + k.coeff * cc.spellPowerFor('shadow'), { nightfall: true });
    },
  }),
  spell({
    id: 'baneOfAgony', name: 'Bane of Agony', icon: 'baneOfAgony',
    cost: cost('baneOfAgony', D.baneOfAgony.mana),
    description: () => `${D.baneOfAgony.ticks} ticks over ${D.baneOfAgony.ticks * D.baneOfAgony.period} sec that grow stronger. A Bane: one per target (Agony or Doom). Amplify Curse adds 50%.`,
    use: (c, t) => {
      const u = t!;
      const a = D.baneOfAgony;
      const amp = c.aura(c.player, 'amplifyCurse') ? 1 + D.amplifyCurse.bonus : 1;
      c.removeAura(c.player, 'amplifyCurse');
      const improved = 1 + 0.05 * T(c).improvedBaneOfAgony;
      bane(c, u, 'baneOfAgony');
      dot(c, u, 'baneOfAgony', 'Bane of Agony', 'shadow', a.ticks, a.period, (cc, n) => a.blocks[Math.min(2, Math.floor((n - 1) / 4))] * amp * improved + a.coeff * cc.spellPowerFor('shadow'));
    },
  }),
  spell({
    id: 'baneOfDoom', name: 'Bane of Doom', icon: 'baneOfDoom',
    cost: cost('baneOfDoom', D.baneOfDoom.mana), cooldown: D.baneOfDoom.cooldown,
    description: (c) => `After ${D.baneOfDoom.delay} sec: ${D.baneOfDoom.damage} Shadow damage plus ${D.baneOfDoom.coeff * 100}% of spell power (${Math.round(D.baneOfDoom.damage + D.baneOfDoom.coeff * c.spellPowerFor('shadow'))}). A Bane: one per target. On an endless dummy it beats Agony.`,
    use: (c, t) => {
      const u = t!;
      const d = D.baneOfDoom;
      bane(c, u, 'baneOfDoom');
      dot(c, u, 'baneOfDoom', 'Bane of Doom', 'shadow', 1, d.delay, (cc) => d.damage + d.coeff * cc.spellPowerFor('shadow'));
    },
  }),
  spell({
    id: 'curseOfTheElements', name: 'Curse of the Elements', icon: 'curseOfElements',
    cost: () => D.curseOfTheElements.mana,
    requirements: (c) => (c.raid.has('curseOfElements') ? 'A raid warlock already keeps it up (Raid buffs and debuffs)' : null),
    usable: (c) => !c.raid.has('curseOfElements'),
    description: () => 'All magic schools: +10% damage taken and -75 resistances for 5 min. Your one Curse on the target; skip it if a raid warlock already keeps it up.',
    use: (c, t) => {
      const magic = { arcane: 1.1, fire: 1.1, frost: 1.1, holy: 1.1, nature: 1.1, shadow: 1.1 };
      if (roll(c, Math.max(1, D.spellMiss - c.totalHit()))) { c.deal({ target: t!, source: 'curseOfTheElements', outcome: 'resist', school: 'shadow', amount: 0, white: false }); return; }
      c.applyAura(t!, { id: 'curseOfElements', name: 'Curse of the Elements', icon: 'curseOfElements', duration: D.curseOfTheElements.duration, schoolTaken: magic });
    },
  }),
  spell({
    id: 'siphonLife', name: 'Siphon Life', icon: 'siphonLife',
    cost: () => D.siphonLife.mana,
    ...talent('siphonLife', 'Siphon Life'),
    description: () => `${D.siphonLife.ticks} ticks of ${D.siphonLife.tick} Shadow damage plus spell power every ${D.siphonLife.period} sec; heals you for the damage.`,
    use: (c, t) => {
      const s = D.siphonLife;
      dot(c, t!, 'siphonLife', 'Siphon Life', 'shadow', s.ticks, s.period, (cc) => s.tick + s.coeff * cc.spellPowerFor('shadow'), { heal: true });
    },
  }),
  {
    ...spell({
      id: 'drainLife', name: 'Drain Life', icon: 'drainLife', range: 20,
      cost: () => D.drainLife.mana,
      description: () => `A ${D.drainLife.duration} sec channel: ${D.drainLife.ticks} ticks of ${D.drainLife.tick} Shadow damage plus spell power; heals you for the damage. Its ticks can give Shadow Trance.`,
      use: () => {},
    }),
    channel: {
      duration: D.drainLife.duration, ticks: D.drainLife.ticks,
      onStart: (c, t) => {
        if (!roll(c, Math.max(1, D.spellMiss - c.totalHit()))) return true;
        c.deal({ target: t!, source: 'drainLife', outcome: 'resist', school: 'shadow', amount: 0, white: false });
        return false;
      },
      onTick: (c, t) => {
        const u = t!;
        const crit = roll(c, critChance(c, 'drainLife', 'shadow'));
        const amount = Math.max(1, Math.round((D.drainLife.tick + D.drainLife.coeff * c.spellPowerFor('shadow')) * damageMult(c, u, 'drainLife', 'shadow', true) * (crit ? critMultiplier(c, 'drainLife') : 1) * D.partialResist));
        c.deal({ target: u, source: 'drainLife', outcome: crit ? 'crit' : 'hit', school: 'shadow', amount, white: false, periodic: true });
        healPlayer(c, amount);
        nightfall(c);
      },
    },
  },
  {
    ...spell({
      id: 'wrack', name: 'Wrack', icon: 'wrack',
      cost: () => D.wrack.mana,
      ...talent('wrack', 'Wrack'),
      description: () => `A ${D.wrack.duration} sec channel: ${D.wrack.ticks} ticks of ${D.wrack.tick} Shadow damage plus spell power; your Corruption and Bane of Agony deal ${D.wrack.bonus * 100}% more while it runs. No sim casts it yet.`,
      use: () => {},
    }),
    channel: {
      duration: D.wrack.duration, ticks: D.wrack.ticks,
      onTick: (c, t) => {
        const u = t!;
        const crit = roll(c, critChance(c, 'wrack', 'shadow'));
        const amount = Math.max(1, Math.round((D.wrack.tick + D.wrack.coeff * c.spellPowerFor('shadow')) * damageMult(c, u, 'wrack', 'shadow', true) * (crit ? critMultiplier(c, 'wrack') : 1) * D.partialResist));
        c.deal({ target: u, source: 'wrack', outcome: crit ? 'crit' : 'hit', school: 'shadow', amount, white: false, periodic: true });
        nightfall(c);
      },
    },
  },
  spell({
    id: 'searingPain', name: 'Searing Pain', icon: 'searingPain',
    cost: cost('searingPain', D.searingPain.mana),
    castTime: castTime(() => D.searingPain.cast),
    description: (c) => `A ${D.searingPain.cast} sec cast: ${D.searingPain.min}-${D.searingPain.max} Fire damage plus spell power, double threat.${T(c).demonicBrand ? ` Demonic Brand: your demon's next ${2 * T(c).demonicBrand} attacks add Shadow damage.` : ''}`,
    use: (c, t) => {
      const u = t!;
      const s = D.searingPain;
      const r = directSpell(c, u, 'searingPain', 'fire', between(c, s.min, s.max), s.coeff);
      const db = T(c).demonicBrand;
      if (r.outcome !== 'resist' && db && c.pet.out) c.applyAura(u, { id: 'demonicBrand', name: 'Demonic Brand', icon: 'demonicBrand', duration: 10, stacks: 2 * db });
      if (execute(c) && T(c).decimation) c.applyAura(c.player, { id: 'decimation', name: 'Decimation', icon: 'decimation', duration: D.decimation.duration });
    },
  }),
  spell({
    id: 'soulFire', name: 'Soul Fire', icon: 'soulFire',
    cost: cost('soulFire', D.soulFire.mana),
    cooldown: (c) => D.soulFire.cooldown * (1 - [0, 0.45, 0.9][T(c).decimation]),
    castTime: castTime((c) => (D.soulFire.cast - 0.4 * T(c).bane) * (c.aura(c.player, 'decimation') ? 1 - 0.2 * T(c).decimation : 1)),
    highlight: (c) => !!c.aura(c.player, 'decimation'),
    description: () => `A long cast: ${D.soulFire.min}-${D.soulFire.max} Fire damage plus all your spell power. Decimation (below 35% health) makes it faster and cheaper to repeat.`,
    use: (c, t) => { directSpell(c, t!, 'soulFire', 'fire', between(c, D.soulFire.min, D.soulFire.max), D.soulFire.coeff); },
  }),
  spell({
    id: 'incinerate', name: 'Incinerate', icon: 'incinerate',
    projectile: { color: 0xff7a2a, speed: 30 },
    cost: cost('incinerate', D.incinerate.mana),
    castTime: castTime((c) => D.incinerate.cast - 0.1 * T(c).bane),
    ...talent('incinerate', 'Incinerate'),
    description: () => `A cast: ${D.incinerate.min}-${D.incinerate.max} Fire damage plus spell power; the base is ${D.incinerate.immolateBonus * 100}% higher while your Immolate burns.`,
    use: (c, t) => {
      const u = t!;
      const i = D.incinerate;
      directSpell(c, u, 'incinerate', 'fire', between(c, i.min, i.max) * (c.aura(u, 'immolate') ? 1 + i.immolateBonus : 1), i.coeff);
    },
  }),
  spell({
    id: 'conflagrate', name: 'Conflagrate', icon: 'conflagrate',
    cost: cost('conflagrate', D.conflagrate.mana), cooldown: D.conflagrate.cooldown,
    requirements: (c, t) => (T(c).conflagrate ? null : 'Requires the Conflagrate talent') ?? (t && !c.aura(t, 'immolate') ? 'Needs your Immolate on the target' : null),
    usable: (c) => T(c).conflagrate > 0 && !!c.target && !!c.aura(c.target, 'immolate'),
    description: (c) => `Instant: ${D.conflagrate.min}-${D.conflagrate.max} Fire damage plus spell power. Needs your Immolate${T(c).shadowAndFlame ? `; Shadow and Flame keeps it (${20 * T(c).shadowAndFlame}%) and gives +${2 * T(c).shadowAndFlame}% Shadow damage for 20 sec` : ' and consumes it'}.`,
    use: (c, t) => {
      const u = t!;
      const r = directSpell(c, u, 'conflagrate', 'fire', between(c, D.conflagrate.min, D.conflagrate.max), D.conflagrate.coeff);
      const sf = T(c).shadowAndFlame;
      if (r.outcome !== 'resist' && sf) c.applyAura(c.player, { id: 'shadowFlameShadow', name: 'Shadow and Flame: Shadow', icon: 'shadowBolt', duration: D.shadowAndFlame.duration });
      if (!roll(c, 20 * sf)) c.removeAura(u, 'immolate');
    },
  }),
  spell({
    id: 'shadowburn', name: 'Shadowburn', icon: 'shadowburn',
    cost: cost('shadowburn', D.shadowburn.mana), cooldown: D.shadowburn.cooldown,
    ...talent('shadowburn', 'Shadowburn'),
    description: (c) => `Instant: ${D.shadowburn.min}-${D.shadowburn.max} Shadow damage plus spell power. All or nothing.${T(c).shadowAndFlame ? ` Shadow and Flame: +${2 * T(c).shadowAndFlame}% Fire damage for 20 sec.` : ''}`,
    use: (c, t) => {
      const r = directSpell(c, t!, 'shadowburn', 'shadow', between(c, D.shadowburn.min, D.shadowburn.max), D.shadowburn.coeff);
      if (r.outcome !== 'resist' && T(c).shadowAndFlame) c.applyAura(c.player, { id: 'shadowFlameFire', name: 'Shadow and Flame: Flame', icon: 'immolate', duration: D.shadowAndFlame.duration });
    },
  }),
  spell({
    id: 'deathCoil', name: 'Death Coil', icon: 'deathCoil',
    projectile: { color: 0x7a2aff, speed: 24 },
    cost: () => D.deathCoil.mana, cooldown: D.deathCoil.cooldown,
    description: () => `Instant: ${D.deathCoil.damage} Shadow damage plus spell power; heals you for all of it. 2 min cooldown.`,
    use: (c, t) => {
      const r = directSpell(c, t!, 'deathCoil', 'shadow', D.deathCoil.damage, D.deathCoil.coeff);
      healPlayer(c, r.amount);
    },
  }),
  {
    id: 'lifeTap', name: 'Life Tap', icon: 'lifeTap', gcd: D.gcd, target: 'self', hastedGcd: true, animation: 'cast',
    requirements: (c) => (!c.playerHealthLocked && c.player.health <= lifeTapAmount(c) ? 'Not enough health' : null),
    description: (c) => `Turns ${lifeTapAmount(c)} health into ${lifeTapAmount(c)} mana ((424 + Spirit) x Improved Life Tap). Instant; it does not stop your Spirit regeneration. Raid healers give the health back over time.`,
    use: (c) => {
      const n = lifeTapAmount(c);
      if (!c.playerHealthLocked) c.player.health = Math.max(1, c.player.health - n);
      c.gainMana(n);
      c.count('lifeTaps');
      c.count('lifeTapMana', n);
      note(c, `+${n} Mana`, 'resource');
    },
  },
  {
    id: 'amplifyCurse', name: 'Amplify Curse', icon: 'amplifyCurse', gcd: 0, target: 'self',
    cooldown: D.amplifyCurse.cooldown,
    ...talent('amplifyCurse', 'Amplify Curse'),
    description: () => 'Your next Bane of Agony deals 50% more base damage. Off the global cooldown. It does nothing for Bane of Doom.',
    use: (c) => { c.applyAura(c.player, { id: 'amplifyCurse', name: 'Amplify Curse', icon: 'amplifyCurse', duration: D.amplifyCurse.duration }); },
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
  const b = build(c);
  const p = c.player;
  pets.set(c, { swing: null, next: 0, lashReady: 0, castEnd: 0 });
  p.maxResource = Math.max(1, Number(c.options.mana ?? 4000));
  p.regenPerSecond = 0;
  c.manaLocked = !!c.options.lockMana;
  c.mod.hit = t.suppression;
  // Raid healers give Life Tap's health back.
  c.enemyAttacks = { ...c.enemyAttacks, healing: Number(c.options.raidHealing ?? D.raidHealing) };
  // Demonic Sacrifice before the pull: the buff of the demon given up (Demonic Pact keeps it with another demon out).
  if (t.demonicSacrifice && b.sacrificed === 'imp') c.applyAura(p, { id: 'burningShadow', name: 'Burning Shadow (Imp sacrificed)', icon: 'demonicSacrifice', duration: Infinity });
  if (t.demonicSacrifice && b.sacrificed === 'succubus') c.applyAura(p, { id: 'touchOfFire', name: 'Touch of Fire', icon: 'demonicSacrifice', duration: Infinity });
  if (t.demonicSacrifice && b.sacrificed === 'voidwalker') {
    c.applyAura(p, {
      id: 'felEnergy', name: 'Fel Energy (Voidwalker sacrificed)', icon: 'demonicSacrifice', duration: Infinity, period: D.demonicSacrifice.voidPeriod,
      onTick: (cc) => cc.gainMana(Math.round(cc.player.maxResource * D.demonicSacrifice.voidMana)),
    });
  }
  c.pet.out = b.demon !== 'none';
  if (c.pet.out) {
    if (t.soulLink) c.applyAura(p, { id: 'soulLink', name: 'Soul Link', icon: 'soulLink', duration: Infinity });
    if (t.masterDemonologist && b.demon === 'succubus') c.applyAura(p, { id: 'masterDemonologist', name: 'Master Demonologist', icon: 'masterDemonologist', duration: Infinity });
    c.applyAura(p, { id: 'petAI', name: 'Demon', icon: 'summonSuccubus', duration: Infinity, period: 0.1, hidden: true, onTick: (cc) => petThink(cc) });
  }
  c.registerSource('petMelee', b.demon === 'imp' ? 'Imp' : 'Succubus', b.demon === 'imp' ? 'summonImp' : 'summonSuccubus');
  c.registerSource('lashOfPain', 'Succubus: Lash of Pain', 'lashOfPain');
  c.registerSource('firebolt', 'Imp: Firebolt', 'firebolt');
  c.registerSource('demonicBrand', 'Demonic Brand', 'demonicBrand');
  c.trackedTargetAuras.push('corruption', 'immolate', 'baneOfDoom', 'baneOfAgony', 'improvedShadowBolt', 'siphonLife');
  c.trackedAuras.push('shadowFlameShadow', 'shadowFlameFire');
}

// ------------------------------------------------------- practice helpers
export function chances(c: Combat): { title: string; rows: [string, string][] }[] {
  const tl = T(c);
  const pct = (n: number) => `${Math.max(0, Math.min(100, n)).toFixed(1)}%`;
  const procs: [string, string][] = [];
  if (tl.nightfall) procs.push(['Shadow Trance per Corruption or drain tick', `${2 * tl.nightfall}%: next Shadow Bolt instant`]);
  if (tl.improvedShadowBolt) procs.push(['Improved Shadow Bolt on a Shadow Bolt crit', `+${4 * tl.improvedShadowBolt}% to your Shadow damage, 12 s`]);
  if (tl.shadowAndFlame) procs.push(['Shadow and Flame', `Conflagrate: +${2 * tl.shadowAndFlame}% Shadow; Shadowburn: +${2 * tl.shadowAndFlame}% Fire; ${20 * tl.shadowAndFlame}% to keep Immolate`]);
  if (tl.demonicBrand) procs.push(['Demonic Brand from Searing Pain', `your demon's next ${2 * tl.demonicBrand} attacks add Shadow damage`]);
  if (c.raid.has('judgementOfWisdom')) procs.push(['Judgement of Wisdom: +59 mana', '50% per landed direct spell']);
  return [
    {
      title: 'Your spells',
      rows: [
        ['Miss (17% minus hit and Suppression)', pct(Math.max(1, D.spellMiss - c.totalHit()))],
        ['Shadow crit / Fire crit', `${pct(critChance(c, 'shadowBolt', 'shadow'))} / ${pct(critChance(c, 'immolate', 'fire'))}`],
        ['Crit damage: Destruction spells / DoTs and drains', `${critMultiplier(c, 'shadowBolt').toFixed(1)}x / ${critMultiplier(c, 'corruption').toFixed(1)}x`],
        ['Partial resists', `-${Math.round((1 - D.partialResist) * 100)}% on average (Immolate, Shadowburn, Siphon Life all or nothing)`],
      ],
    },
    { title: 'Procs', rows: procs },
    {
      title: 'Mana and health',
      rows: [
        ['Life Tap', `${lifeTapAmount(c)} health into ${lifeTapAmount(c)} mana`],
        ['Raid healing', `${Number(c.options.raidHealing ?? D.raidHealing)} health per second`],
        ['Regeneration now', `${regen(c).toFixed(1)} mana per second`],
      ],
    },
  ];
}

export const SOURCES = [
  { label: 'wow-forever-sim', url: 'https://github.com/gunba/wow-forever-sim' },
  { label: 'foreversim', url: 'https://github.com/laurencestokes/foreversim' },
];
