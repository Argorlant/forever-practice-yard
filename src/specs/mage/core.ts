// What every mage spec shares: the spell table with school hit, additive
// talent damage, personal Fire Vulnerability and Winter's Chill stacks,
// Arcane Blast stacks, Missile Barrage, Clearcasting, Heating Up, rolling
// Ignite, Fingers of Frost, Combustion, Evocation and the mana model.
// Numbers in ./data.ts; sources in research/mage_forever.md.
import type { Combat } from '../../engine/combat';
import type { Ability, Outcome, School, Unit } from '../../engine/types';
import { DATA } from './data';
import { talentsFor, type MageSpec, type Talents } from './talents';

export const D = DATA;
const roll = (c: Combat, pct: number) => c.random() * 100 < pct;
const between = (c: Combat, min: number, max: number) => min + c.random() * (max - min);
const note = (c: Combat, text: string, kind: 'proc' | 'resource' = 'proc') => c.emit('note', { text, kind });

const specOf = (c: Combat) => c.spec.id.replace('mage-', '') as MageSpec;
/** Talent ranks of the build chosen in Settings. */
export const T = (c: Combat): Talents => talentsFor(c.options.build, specOf(c));

interface MageState { lastClearcasting: number }
const states = new WeakMap<Combat, MageState>();
const state = (c: Combat): MageState => {
  let s = states.get(c);
  if (!s) states.set(c, (s = { lastClearcasting: -Infinity }));
  return s;
};

export const stacksOf = (c: Combat, u: Parameters<Combat['aura']>[0], id: string) => (u ? c.aura(u, id)?.stacks ?? 0 : 0);
export const abStacks = (c: Combat) => stacksOf(c, c.player, 'arcaneBlast');
const arcanePower = (c: Combat) => !!c.aura(c.player, 'arcanePower');
const clearcasting = (c: Combat) => !!c.aura(c.player, 'clearcasting');
const pom = (c: Combat) => !!c.aura(c.player, 'presenceOfMind');

// ------------------------------------------------------------------- mana
/** Clearcasting makes a damage spell free; Arcane Power +30 %; Frost Channeling -5 % per point on Frost spells. */
function cost(base: number, opts: { frost?: boolean } = {}) {
  return (c: Combat) => {
    if (clearcasting(c)) return 0;
    let m = 1 + (arcanePower(c) ? D.arcanePower.cost : 0);
    if (opts.frost) m *= 1 - 0.05 * T(c).frostChanneling;
    return Math.round(base * m);
  };
}
/** Arcane Blast: 15 % of base mana, +175 % per stack (Arcane Power adds 30 %). */
const arcaneBlastCost = (c: Combat) => (clearcasting(c) ? 0
  : Math.round(D.baseMana * D.arcaneBlast.manaPct * (1 + D.arcaneBlast.perStack * abStacks(c) + (arcanePower(c) ? D.arcanePower.cost : 0))));

/** Spends Clearcasting and Presence of Mind when a spell uses them. */
function spend(c: Combat, castBase: number): void {
  if (clearcasting(c)) { c.removeAura(c.player, 'clearcasting'); c.count('clearcastingUsed'); }
  if (castBase > 0 && pom(c)) c.removeAura(c.player, 'presenceOfMind');
}
/** Cast time: Presence of Mind makes it instant; casting haste speeds it up. */
const castTime = (base: (c: Combat) => number) => (c: Combat) => (pom(c) ? 0 : base(c) / c.castHaste());

/**
 * Mana per second: Spirit regen outside the five-second rule. While casting,
 * Mage Armor (50 %) and Arcane Meditation (17/33/50 %) add up. Evocation:
 * 16 times the Spirit regen, all of it while channelling. MP5 always.
 */
export function regen(c: Combat): number {
  const spirit = 6.25 + Number(c.options.spirit ?? D.spirit) / 8;
  const mp5 = Number(c.options.mp5 ?? D.mp5) / 5;
  if (c.channeling?.id === 'evocation') return spirit * D.evocation.regen + mp5;
  if (c.t - c.lastSpend >= 5) return spirit + mp5;
  const share = Math.min(1, (c.aura(c.player, 'mageArmor') ? D.mageArmorShare : 0) + [0, 0.17, 0.33, 0.5][T(c).arcaneMeditation]);
  return spirit * share + mp5;
}

// --------------------------------------------------------------- spell table
/** Arcane Focus +1 % hit per point to Arcane, Elemental Precision +1 % per point to Fire and Frost. */
const schoolHit = (c: Combat, school: School) => (school === 'arcane' ? T(c).arcaneFocus : school === 'fire' || school === 'frost' ? T(c).elementalPrecision : 0);

interface SpellOpts {
  binary?: boolean;
  /** Frostfire Bolt: Fire and Frost at once. */
  frostfire?: boolean;
  /** Missiles: whether they use the Arcane Blast stacks (an option; the client says no). */
  noStacks?: boolean;
}
const isFire = (school: School, o: SpellOpts) => school === 'fire' || !!o.frostfire;
const isFrost = (school: School, o: SpellOpts) => school === 'frost' || !!o.frostfire;

function critChance(c: Combat, t: Unit, id: string, school: School, o: SpellOpts, frozen: boolean): number {
  const tl = T(c);
  let extra = tl.arcaneInstability;
  if (school === 'arcane') extra += 2 * tl.arcaneImpact;
  if (isFire(school, o)) extra += 2 * tl.criticalMass + D.combustion.perHit * stacksOf(c, c.player, 'combustion');
  if (['fireBlast', 'scorch', 'iceLance', 'arcaneBlast'].includes(id)) extra += 2 * tl.incineration;
  if (id === 'frostbolt' || id === 'iceLance') extra += D.wintersChill.perStack * stacksOf(c, t, 'wintersChill');
  if (frozen) extra += [0, 17, 33, 50][tl.shatter];
  return c.spellCritChance(extra);
}
/** Arcane Mind makes Arcane crits 2.0x, Ice Shards Frost and Frostfire crits; Fire stays 1.5x. */
function critMultiplier(c: Combat, school: School, o: SpellOpts): number {
  if (school === 'arcane') return c.rules.spellCritMultiplier + 0.1 * T(c).arcaneMind;
  if (isFrost(school, o)) return c.rules.spellCritMultiplier + 0.1 * T(c).iceShards;
  return c.rules.spellCritMultiplier;
}
/** Additive talents (Arcane Instability, Fire Power, Piercing Ice), Arcane Power and Arcane Blast stacks; your Fire Vulnerability multiplies. */
function damageMult(c: Combat, t: Unit, id: string, school: School, o: SpellOpts): number {
  const tl = T(c);
  let add = 0.01 * tl.arcaneInstability;
  if (isFire(school, o)) add += 0.02 * tl.firePower;
  if (isFrost(school, o)) add += 0.02 * tl.piercingIce;
  if (arcanePower(c)) add += D.arcanePower.damage;
  if (id !== 'arcaneBlast' && !o.noStacks) add += D.arcaneBlast.bonus * abStacks(c);
  const fv = isFire(school, o) ? 1 + D.fireVulnerability.perStack * stacksOf(c, t, 'fireVulnerability') : 1;
  return (1 + add) * fv;
}
const spellPower = (c: Combat, school: School, o: SpellOpts) => (o.frostfire ? Math.max(c.spellPowerFor('fire'), c.spellPowerFor('frost')) : c.spellPowerFor(school));

/** Resolves one spell hit (or one missile): hit, crit, damage and every proc that rolls on it. */
function resolve(c: Combat, t: Unit, id: string, school: School, base: number, coeff: number, o: SpellOpts = {}, frozenBonus = 1): { outcome: Outcome; amount: number } {
  const tl = T(c);
  // Fingers of Frost: this damage cast treats the target as frozen and spends a charge.
  const fof = c.aura(c.player, 'fingersOfFrost');
  const frozen = !!fof;
  if (fof) {
    fof.stacks = (fof.stacks ?? 1) - 1;
    if (fof.stacks <= 0) c.removeAura(c.player, 'fingersOfFrost');
    c.count('fingersUsed');
  }
  const outcome: Outcome = roll(c, Math.max(1, D.spellMiss - c.totalHit() - schoolHit(c, school))) ? 'resist'
    : roll(c, critChance(c, t, id, school, o, frozen)) ? 'crit' : 'hit';
  let amount = 0;
  if (outcome !== 'resist') {
    const m = damageMult(c, t, id, school, o) * (outcome === 'crit' ? critMultiplier(c, school, o) : 1) * (o.binary ? 1 : D.partialResist);
    amount = Math.max(1, Math.round((base + coeff * spellPower(c, school, o)) * m * (frozen ? frozenBonus : 1)));
  }
  c.deal({ target: t, source: id, outcome, school: o.frostfire ? 'fire' : school, amount, white: false, spell: true });
  if (outcome === 'resist') return { outcome, amount };

  // Clearcasting: 2 % per point per landed damage spell, 1 s internal cooldown.
  const s = state(c);
  if (tl.arcaneConcentration && c.t - s.lastClearcasting >= D.clearcasting.icd && roll(c, 2 * tl.arcaneConcentration)) {
    s.lastClearcasting = c.t;
    c.applyAura(c.player, { id: 'clearcasting', name: 'Clearcasting', icon: 'clearcasting', duration: D.clearcasting.duration });
    c.count('clearcasting');
  }
  // Missile Barrage: 40 % from Arcane Blast, 20 % from Fireball, Frostbolt and Frostfire Bolt.
  const barrage = id === 'arcaneBlast' ? 40 : ['fireball', 'frostbolt', 'frostfireBolt'].includes(id) ? 20 : 0;
  if (tl.missileBarrage && barrage && roll(c, barrage)) {
    c.applyAura(c.player, { id: 'missileBarrage', name: 'Missile Barrage', icon: 'missileBarrage', duration: D.missileBarrage.duration });
    c.count('missileBarrage');
    note(c, 'Missile Barrage');
  }
  if (isFire(school, o)) fireProcs(c, t, id, outcome, amount);
  if (isFrost(school, o)) {
    // Winter's Chill: personal crit stacks for your Frostbolt and Ice Lance.
    if (tl.wintersChill && roll(c, 20 * tl.wintersChill)) {
      c.addStack(t, { id: 'wintersChill', name: "Winter's Chill", icon: 'wintersChill', duration: D.wintersChill.duration }, tl.wintersChill);
    }
    // Fingers of Frost from a landed Chill (Frostbolt, Frostfire Bolt).
    if (tl.fingersOfFrost && (id === 'frostbolt' || id === 'frostfireBolt') && roll(c, D.fingersOfFrost.chance)) {
      c.applyAura(c.player, { id: 'fingersOfFrost', name: 'Fingers of Frost', icon: 'fingersOfFrost', duration: D.fingersOfFrost.duration, stacks: tl.fingersOfFrost });
      c.count('fingers', tl.fingersOfFrost);
      note(c, 'Fingers of Frost');
    }
  }
  // Master of Elements: Fire and Frost crits give back 10 % of the base cost per point.
  if (outcome === 'crit' && tl.masterOfElements && (isFire(school, o) || isFrost(school, o))) {
    const baseCost = (D as unknown as Record<string, { mana?: number }>)[id]?.mana ?? 0;
    if (baseCost) c.gainMana(Math.round(baseCost * 0.1 * tl.masterOfElements));
  }
  return { outcome, amount };
}

function fireProcs(c: Combat, t: Unit, id: string, outcome: Outcome, amount: number): void {
  const tl = T(c);
  // Combustion: every Fire hit adds 10 % crit; it ends after 3 crits.
  const comb = c.aura(c.player, 'combustion');
  if (comb) {
    if (outcome === 'crit') {
      comb.value = (comb.value ?? 0) + 1;
      if (comb.value >= D.combustion.crits) c.removeAura(c.player, 'combustion');
    } else {
      comb.stacks = (comb.stacks ?? 1) + 1;
    }
  }
  if (id === 'scorch' && tl.improvedScorch && roll(c, [0, 33, 66, 100][tl.improvedScorch])) {
    c.addStack(t, { id: 'fireVulnerability', name: 'Fire Vulnerability', icon: 'fireVulnerability', duration: D.fireVulnerability.duration }, D.fireVulnerability.stacks);
  }
  if (outcome !== 'crit') return;
  // Heating Up: direct crits of Fireball, Frostfire, Fire Blast and Scorch cut the next Pyroblast by 25 % each.
  if (tl.hotStreak && ['fireball', 'frostfireBolt', 'fireBlast', 'scorch'].includes(id)) {
    c.addStack(c.player, { id: 'heatingUp', name: 'Heating Up', icon: 'heatingUp', duration: D.heatingUp.duration }, D.heatingUp.stacks);
    if (stacksOf(c, c.player, 'heatingUp') === D.heatingUp.stacks) note(c, 'Heating Up: 1.5 sec Pyroblast');
  }
  // Ignite: 8 % per point of the crit over 4 s; unpaid ticks roll into the new one.
  if (tl.ignite) {
    const old = c.aura(t, 'ignite');
    const unpaid = old ? (old.value ?? 0) * (old.stacks ?? 0) : 0;
    const total = unpaid + amount * 0.08 * tl.ignite;
    const ticks = D.ignite.ticks;
    c.applyAura(t, {
      id: 'ignite', name: 'Ignite', icon: 'ignite', duration: D.ignite.duration, period: D.ignite.duration / ticks, stacks: ticks, value: total / ticks,
      onTick: (cc, a) => {
        a.stacks = (a.stacks ?? 1) - 1;
        cc.deal({ target: t, source: 'ignite', outcome: 'hit', school: 'fire', amount: Math.round(a.value ?? 0), white: false, periodic: true, final: true });
      },
    });
  }
}

/** A DoT part of a spell (Fireball, Pyroblast, Frostfire Bolt): ticks can crit and use current stats. */
function spellDot(c: Combat, t: Unit, id: string, name: string, school: School, ticks: number, period: number, base: number, coeff: number, o: SpellOpts = {}): void {
  c.applyAura(t, {
    id: `${id}Dot`, name, icon: id, duration: ticks * period, period,
    onTick: (cc) => {
      const crit = roll(cc, critChance(cc, t, id, school, o, false));
      const amount = Math.max(1, Math.round((base + coeff * spellPower(cc, school, o)) * damageMult(cc, t, id, school, { ...o, noStacks: true })
        * (crit ? critMultiplier(cc, school, o) : 1)));
      cc.deal({ target: t, source: id, outcome: crit ? 'crit' : 'hit', school: o.frostfire ? 'fire' : school, amount, white: false, periodic: true });
    },
  });
}

/** Any damage spell but Arcane Blast spends the Arcane Blast stacks. */
function spendStacks(c: Combat, id: string, o: SpellOpts = {}): void {
  if (id === 'arcaneBlast' || o.noStacks || !abStacks(c)) return;
  c.count(`stacksSpent:${abStacks(c)}`);
  c.removeAura(c.player, 'arcaneBlast');
}

const talent = (key: keyof Talents, name: string) => ({
  requirements: (c: Combat) => (T(c)[key] ? null : `Requires the ${name} talent`),
  usable: (c: Combat) => T(c)[key] > 0,
});
const spell = (a: Omit<Ability, 'gcd' | 'target' | 'range' | 'hastedGcd' | 'noAutoAttack'> & { range?: number }): Ability => ({
  gcd: D.gcd, target: 'enemy', hastedGcd: true, noAutoAttack: true, animation: 'cast', ...a, range: a.range ?? 30,
});
const missilesUseStacks = (c: Combat) => !!c.options.missilesUseStacks;

// --------------------------------------------------------------- abilities
export const ABILITIES: Ability[] = [
  spell({
    id: 'frostbolt', name: 'Frostbolt', icon: 'frostbolt',
    projectile: { color: 0x8fd8ff, speed: D.frostbolt.speed, style: 'frost' },
    cost: cost(D.frostbolt.mana, { frost: true }),
    castTime: castTime((c) => D.frostbolt.cast - 0.1 * T(c).improvedFrostbolt),
    description: (c) => `A ${(D.frostbolt.cast - 0.1 * T(c).improvedFrostbolt).toFixed(1)} sec cast: ${D.frostbolt.min}-${D.frostbolt.max} Frost damage plus ${Math.round(D.frostbolt.coeff * 100)}% of spell power. All or nothing (no partial resists).`,
    use: (c, t) => {
      spend(c, D.frostbolt.cast);
      const f = D.frostbolt;
      resolve(c, t!, 'frostbolt', 'frost', between(c, f.min, f.max), f.coeff, { binary: true });
      spendStacks(c, 'frostbolt');
    },
  }),
  spell({
    id: 'fireball', name: 'Fireball', icon: 'fireball', range: 35,
    projectile: { color: 0xff7a2a, speed: D.fireball.speed, style: 'fire' },
    cost: cost(D.fireball.mana),
    castTime: castTime((c) => D.fireball.cast - 0.1 * T(c).improvedFireball),
    description: (c) => `A ${(D.fireball.cast - 0.1 * T(c).improvedFireball).toFixed(1)} sec cast: ${D.fireball.min}-${D.fireball.max} Fire damage plus spell power, then ${D.fireball.dot * D.fireball.dotTicks} over ${D.fireball.dotTicks * D.fireball.dotPeriod} sec.`,
    use: (c, t) => {
      const u = t!;
      spend(c, D.fireball.cast);
      const f = D.fireball;
      const r = resolve(c, u, 'fireball', 'fire', between(c, f.min, f.max), f.coeff);
      if (r.outcome !== 'resist') spellDot(c, u, 'fireball', 'Fireball', 'fire', f.dotTicks, f.dotPeriod, f.dot, 0);
      spendStacks(c, 'fireball');
    },
  }),
  spell({
    id: 'scorch', name: 'Scorch', icon: 'scorch',
    cost: cost(D.scorch.mana),
    castTime: castTime(() => D.scorch.cast),
    description: (c) => `A ${D.scorch.cast} sec cast: ${D.scorch.min}-${D.scorch.max} Fire damage plus spell power.${T(c).improvedScorch ? ' Improved Scorch: your Fire Vulnerability, +3% of your Fire damage per stack (5 stacks, 30 sec).' : ''} Its fast crits build Heating Up.`,
    use: (c, t) => {
      spend(c, D.scorch.cast);
      resolve(c, t!, 'scorch', 'fire', between(c, D.scorch.min, D.scorch.max), D.scorch.coeff);
      spendStacks(c, 'scorch');
    },
  }),
  spell({
    id: 'fireBlast', name: 'Fire Blast', icon: 'fireBlast', range: D.fireBlast.range,
    cost: cost(D.fireBlast.mana),
    cooldown: (c) => D.fireBlast.cooldown - T(c).wakeOfFire,
    description: (c) => `Instant: ${D.fireBlast.min}-${D.fireBlast.max} Fire damage plus spell power, ${D.fireBlast.range} yards. ${D.fireBlast.cooldown - T(c).wakeOfFire} sec cooldown. Your spell on the move.`,
    use: (c, t) => {
      spend(c, 0);
      resolve(c, t!, 'fireBlast', 'fire', between(c, D.fireBlast.min, D.fireBlast.max), D.fireBlast.coeff);
      spendStacks(c, 'fireBlast');
    },
  }),
  spell({
    id: 'pyroblast', name: 'Pyroblast', icon: 'pyroblast', range: D.pyroblast.range,
    projectile: { color: 0xff4a1a, speed: 24, style: 'fire' },
    cost: cost(D.pyroblast.mana),
    castTime: castTime((c) => D.pyroblast.cast * (1 - D.heatingUp.cut * stacksOf(c, c.player, 'heatingUp'))),
    highlight: (c) => stacksOf(c, c.player, 'heatingUp') >= D.heatingUp.stacks,
    ...talent('pyroblast', 'Pyroblast'),
    description: (c) => `A ${(D.pyroblast.cast * (1 - D.heatingUp.cut * stacksOf(c, c.player, 'heatingUp'))).toFixed(1)} sec cast: ${D.pyroblast.min}-${D.pyroblast.max} Fire damage plus spell power, then ${D.pyroblast.dot * D.pyroblast.dotTicks} more over ${D.pyroblast.dotTicks * D.pyroblast.dotPeriod} sec. Each Heating Up stack takes 25% off its cast: at 3 stacks it is a 1.5 sec cast.`,
    use: (c, t) => {
      const u = t!;
      spend(c, D.pyroblast.cast);
      c.removeAura(c.player, 'heatingUp');
      const p = D.pyroblast;
      const r = resolve(c, u, 'pyroblast', 'fire', between(c, p.min, p.max), p.coeff);
      if (r.outcome !== 'resist') spellDot(c, u, 'pyroblast', 'Pyroblast', 'fire', p.dotTicks, p.dotPeriod, p.dot, p.dotCoeff);
      c.count('pyroblasts');
      spendStacks(c, 'pyroblast');
    },
  }),
  {
    ...spell({
      id: 'arcaneMissiles', name: 'Arcane Missiles', icon: 'arcaneMissiles',
      cost: (c) => (c.aura(c.player, 'missileBarrage') ? 0 : cost(D.arcaneMissiles.mana)(c)),
      highlight: (c) => !!c.aura(c.player, 'missileBarrage'),
      description: () => `A ${D.arcaneMissiles.duration} sec channel: ${D.arcaneMissiles.missiles} missiles of ${D.arcaneMissiles.damage} Arcane damage plus spell power, one per second, each with its own hit and crit roll. Missile Barrage makes the next one free and twice as fast.`,
      use: () => {},
    }),
    channel: {
      duration: (c) => (c.aura(c.player, 'missileBarrage') ? D.arcaneMissiles.duration / 2 : D.arcaneMissiles.duration),
      ticks: D.arcaneMissiles.missiles,
      onStart: (c) => {
        spend(c, 0);
        if (c.aura(c.player, 'missileBarrage')) { c.removeAura(c.player, 'missileBarrage'); c.count('barrageUsed'); }
        return true;
      },
      onTick: (c, t) => {
        const u = t!;
        c.emit('bolt', { target: u, color: 0xe9a8ff, speed: 20, style: 'arcane' });
        const noStacks = !missilesUseStacks(c);
        resolve(c, u, 'arcaneMissiles', 'arcane', D.arcaneMissiles.damage, D.arcaneMissiles.coeff, { noStacks });
      },
    },
  },
  spell({
    id: 'arcaneBlast', name: 'Arcane Blast', icon: 'arcaneBlast',
    projectile: { color: 0xe9a8ff, speed: 40, style: 'arcane' },
    cost: arcaneBlastCost,
    castTime: castTime(() => D.arcaneBlast.cast),
    ...talent('arcaneBlast', 'Arcane Blast'),
    description: (c) => `A ${D.arcaneBlast.cast} sec cast: ${D.arcaneBlast.min}-${D.arcaneBlast.max} Arcane damage plus ${Math.round(D.arcaneBlast.coeff * 100)}% of spell power. Each cast adds a stack (max ${D.arcaneBlast.stacks}, ${D.arcaneBlast.duration} sec): +10% damage to your other spells and +175% to Arcane Blast's own cost. The next other damage spell spends them all. Stacks now: ${abStacks(c)}.`,
    use: (c, t) => {
      spend(c, D.arcaneBlast.cast);
      const a = D.arcaneBlast;
      resolve(c, t!, 'arcaneBlast', 'arcane', between(c, a.min, a.max), a.coeff);
      c.addStack(c.player, { id: 'arcaneBlast', name: 'Arcane Blast', icon: 'arcaneBlast', duration: a.duration }, a.stacks);
    },
  }),
  spell({
    id: 'iceLance', name: 'Ice Lance', icon: 'iceLance',
    projectile: { color: 0xb0e8ff, speed: 38, style: 'frost' },
    cost: cost(D.iceLance.mana, { frost: true }),
    ...talent('iceLance', 'Ice Lance'),
    highlight: (c) => !!c.aura(c.player, 'fingersOfFrost'),
    description: () => `Instant: ${D.iceLance.min}-${D.iceLance.max} Frost damage plus spell power, ${D.iceLance.frozen} times as much with Fingers of Frost (bosses cannot be frozen otherwise). All or nothing.`,
    use: (c, t) => {
      spend(c, 0);
      resolve(c, t!, 'iceLance', 'frost', between(c, D.iceLance.min, D.iceLance.max), D.iceLance.coeff, { binary: true }, D.iceLance.frozen);
      spendStacks(c, 'iceLance');
    },
  }),
  spell({
    id: 'frostfireBolt', name: 'Frostfire Bolt', icon: 'frostfireBolt',
    projectile: { color: 0xc080ff, speed: 26, style: 'frost' },
    cost: cost(D.frostfireBolt.mana),
    castTime: castTime((c) => D.frostfireBolt.cast - 0.1 * T(c).improvedFireball),
    description: () => `A ${D.frostfireBolt.cast} sec cast: ${D.frostfireBolt.min}-${D.frostfireBolt.max} Fire and Frost damage plus spell power (your higher one), then ${D.frostfireBolt.dot * D.frostfireBolt.dotTicks} over ${D.frostfireBolt.dotTicks * D.frostfireBolt.dotPeriod} sec. New and baseline in WoW Forever: both schools' talents apply.`,
    use: (c, t) => {
      const u = t!;
      spend(c, D.frostfireBolt.cast);
      const f = D.frostfireBolt;
      const r = resolve(c, u, 'frostfireBolt', 'fire', between(c, f.min, f.max), f.coeff, { frostfire: true });
      if (r.outcome !== 'resist') spellDot(c, u, 'frostfireBolt', 'Frostfire Bolt', 'fire', f.dotTicks, f.dotPeriod, f.dot, 0, { frostfire: true });
      spendStacks(c, 'frostfireBolt');
    },
  }),
  {
    id: 'presenceOfMind', name: 'Presence of Mind', icon: 'presenceOfMind', gcd: 0, target: 'self',
    cooldown: D.presenceOfMind.cooldown,
    ...talent('presenceOfMind', 'Presence of Mind'),
    highlight: pom,
    description: () => 'Your next spell with a cast time is instant. Off the global cooldown.',
    use: (c) => { c.applyAura(c.player, { id: 'presenceOfMind', name: 'Presence of Mind', icon: 'presenceOfMind', duration: Infinity }); },
  },
  {
    id: 'arcanePower', name: 'Arcane Power', icon: 'arcanePower', gcd: 0, target: 'self',
    cooldown: D.arcanePower.cooldown,
    ...talent('arcanePower', 'Arcane Power'),
    description: () => `+${D.arcanePower.damage * 100}% spell damage and +${D.arcanePower.cost * 100}% mana cost for ${D.arcanePower.duration} sec. Off the global cooldown.`,
    use: (c) => { c.applyAura(c.player, { id: 'arcanePower', name: 'Arcane Power', icon: 'arcanePower', duration: D.arcanePower.duration }); },
  },
  {
    id: 'combustion', name: 'Combustion', icon: 'combustion', gcd: 0, target: 'self',
    requirements: (c) => (T(c).combustion ? null : 'Requires the Combustion talent') ?? (c.aura(c.player, 'combustion') ? 'Already active' : null),
    usable: (c) => T(c).combustion > 0 && !c.aura(c.player, 'combustion'),
    highlight: (c) => !!c.aura(c.player, 'combustion'),
    description: () => `Each Fire spell hit adds ${D.combustion.perHit}% Fire crit until you land ${D.combustion.crits} Fire crits. The 3 min cooldown starts when it ends.`,
    use: (c) => {
      c.applyAura(c.player, {
        id: 'combustion', name: 'Combustion', icon: 'combustion', duration: Infinity, stacks: 1, value: 0,
        onRemove: (cc) => cc.startCooldown('combustion', D.combustion.cooldown),
      });
    },
  },
  {
    id: 'evocation', name: 'Evocation', icon: 'evocation', gcd: D.gcd, target: 'self', animation: 'cast',
    cooldown: D.evocation.cooldown,
    description: () => `An ${D.evocation.duration} sec channel: your Spirit regeneration is ${D.evocation.regen} times faster and keeps going while you channel. Moving stops it.`,
    use: () => {},
    channel: { duration: D.evocation.duration, ticks: D.evocation.duration, onTick: () => {} },
  },
  {
    id: 'manaRuby', name: 'Mana Ruby', icon: 'manaRuby', gcd: 0, target: 'self',
    cooldown: D.manaRuby.cooldown, cooldownGroup: 'gem',
    description: () => `Restores ${D.manaRuby.min} to ${D.manaRuby.max} mana. Its own 2 min cooldown, separate from potions.`,
    use: (c) => {
      const n = Math.round(between(c, D.manaRuby.min, D.manaRuby.max));
      c.gainMana(n);
      c.count('gemMana', n);
      note(c, `+${n} Mana`, 'resource');
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
  const p = c.player;
  states.set(c, { lastClearcasting: -Infinity });
  p.maxResource = Math.max(1, Number(c.options.mana ?? 4500));
  p.regenPerSecond = 0;
  c.manaLocked = !!c.options.lockMana;
  // Mage Armor is up before the pull (50 % of your Spirit regen while casting).
  c.applyAura(p, { id: 'mageArmor', name: 'Mage Armor', icon: 'mageArmor', duration: Infinity });
  c.registerSource('ignite', 'Ignite', 'ignite');
  c.trackedTargetAuras.push('fireVulnerability', 'wintersChill', 'ignite');
  c.trackedAuras.push('arcaneBlast');
}

// ------------------------------------------------------- practice helpers
export function chances(c: Combat): { title: string; rows: [string, string][] }[] {
  const tl = T(c);
  const pct = (n: number) => `${Math.max(0, Math.min(100, n)).toFixed(1)}%`;
  const miss = (school: School) => Math.max(1, D.spellMiss - c.totalHit() - schoolHit(c, school));
  const t = c.target ?? c.targets[0];
  const rows: [string, string][] = [
    ['Arcane: miss / crit / crit damage', `${pct(miss('arcane'))} / ${pct(critChance(c, t, 'arcaneBlast', 'arcane', {}, false))} / ${critMultiplier(c, 'arcane', {}).toFixed(1)}x`],
    ['Fire: miss / crit / crit damage', `${pct(miss('fire'))} / ${pct(critChance(c, t, 'fireball', 'fire', {}, false))} (Scorch and Fire Blast ${pct(critChance(c, t, 'scorch', 'fire', {}, false))}) / 1.5x`],
    ['Frost: miss / crit / crit damage', `${pct(miss('frost'))} / ${pct(critChance(c, t, 'frostbolt', 'frost', {}, false))} / ${critMultiplier(c, 'frost', {}).toFixed(1)}x`],
    ['Partial resists', `-${Math.round((1 - D.partialResist) * 100)}% on average; Frostbolt and Ice Lance are all or nothing`],
  ];
  const procs: [string, string][] = [];
  if (tl.arcaneConcentration) procs.push(['Clearcasting per landed damage spell', `${2 * tl.arcaneConcentration}%, 1 s cooldown`]);
  if (tl.missileBarrage) procs.push(['Missile Barrage', '40% per Arcane Blast, 20% per Fireball, Frostbolt or Frostfire Bolt']);
  if (tl.hotStreak) procs.push(['Heating Up per direct Fire crit', '-25% Pyroblast cast, 3 stacks, 20 s']);
  if (tl.ignite) procs.push(['Ignite', `${8 * tl.ignite}% of a Fire crit over 4 s, rolling`]);
  if (tl.improvedScorch) procs.push(['Fire Vulnerability per Scorch', `${[0, 33, 66, 100][tl.improvedScorch]}%: +3% of your Fire damage, 5 stacks`]);
  if (tl.fingersOfFrost) procs.push(['Fingers of Frost per landed Frostbolt', `${D.fingersOfFrost.chance}%: ${tl.fingersOfFrost} charge(s), Ice Lance x4, Shatter +${[0, 17, 33, 50][tl.shatter]}% crit`]);
  if (tl.wintersChill) procs.push(["Winter's Chill per landed Frost spell", `${20 * tl.wintersChill}%: +2% crit for your Frostbolt and Ice Lance, ${tl.wintersChill} stacks`]);
  if (c.raid.has('judgementOfWisdom')) procs.push(['Judgement of Wisdom: +59 mana', '50% per landed direct spell']);
  return [
    { title: 'Your spells', rows },
    { title: 'Procs', rows: procs },
    {
      title: 'Mana',
      rows: [
        ['Arcane Blast cost at 0 / 1 / 2 / 3 stacks', [0, 1, 2, 3].map((n) => Math.round(D.baseMana * D.arcaneBlast.manaPct * (1 + D.arcaneBlast.perStack * n))).join(' / ')],
        ['Regeneration now', `${regen(c).toFixed(1)} per second (Mage Armor + Arcane Meditation keep up to 100% while casting)`],
      ],
    },
  ];
}

export const SOURCES = [
  { label: 'wow-forever-sim', url: 'https://github.com/gunba/wow-forever-sim' },
  { label: 'foreversim', url: 'https://github.com/laurencestokes/foreversim' },
];
