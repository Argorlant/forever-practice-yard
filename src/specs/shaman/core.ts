// What every shaman spec shares: the spell table with Elemental Fury,
// Clearcasting and Lightning Overload, shocks on one shared cooldown,
// Lava Burst, Stormstrike's personal charge, Maelstrom Weapon, Flurry,
// weapon imbues (Windfury, Flametongue, Rockbiter), totems in four element
// slots (Searing and Magma attack; Fire Nova needs a Fire totem), Lightning
// Shield for the off-tank and the mana model. Numbers in ./data.ts; sources
// in research/shaman_forever.md.
import type { Combat, Incoming } from '../../engine/combat';
import { YARD } from '../../engine/combat';
import type { Ability, Outcome, School, Unit } from '../../engine/types';
import { DATA } from './data';
import { buildById, talentsFor, type ShamanSpec, type Talents } from './talents';

export const D = DATA;
const roll = (c: Combat, pct: number) => c.random() * 100 < pct;
const between = (c: Combat, min: number, max: number) => min + c.random() * (max - min);
const note = (c: Combat, text: string, kind: 'proc' | 'resource' = 'proc') => c.emit('note', { text, kind });

export const specOf = (c: Combat) => c.spec.id.replace('shaman-', '') as ShamanSpec;
/** Talent ranks of the build chosen in Settings. */
export const T = (c: Combat): Talents => talentsFor(c.options.build, specOf(c));
export const build = (c: Combat) => buildById(c.options.build, specOf(c));
/** Enhancement and the off-tank fight in melee; Elemental casts. */
export const melee = (c: Combat) => specOf(c) !== 'elemental';
export const imbue = (c: Combat) => (specOf(c) === 'tank' ? 'rockbiter' : specOf(c) === 'enhancement' ? String(c.options.imbue ?? 'windfury') : 'none');

// ------------------------------------------------------------------- mana
const SHOCKS = ['earthShock', 'flameShock', 'frostShock'];
const CONVECTION = ['lightningBolt', 'chainLightning', 'lavaBurst', ...SHOCKS];
/** Damage spells Clearcasting makes free. */
const CLEARCASTING = ['lightningBolt', 'chainLightning', 'lavaBurst', 'fireNova', ...SHOCKS];
const TOTEMS = ['searingTotem', 'magmaTotem', 'strengthOfEarthTotem', 'stoneskinTotem', 'graceOfAirTotem', 'windfuryTotem', 'manaSpringTotem'];

/** Maelstrom Weapon: each stack takes 4 % per point off Lightning Bolt's cast time and cost (5 stacks at 5/5: instant and free). */
export const maelstromStacks = (c: Combat) => c.aura(c.player, 'maelstromWeapon')?.stacks ?? 0;
const maelstromCut = (c: Combat) => Math.min(1, 0.04 * T(c).maelstromWeapon * maelstromStacks(c));

function cost(id: string, base: number) {
  return (c: Combat) => {
    const tl = T(c);
    if (CLEARCASTING.includes(id) && c.aura(c.player, 'clearcasting')) return 0;
    let cut = 0;
    if (CONVECTION.includes(id)) cut += 0.02 * tl.convection;
    if ((SHOCKS.includes(id) || id === 'lightningShield') && tl.shamanisticFocus) cut += 0.45;
    if (TOTEMS.includes(id)) cut += 0.05 * tl.totemicFocus;
    let m = base * Math.max(0, 1 - cut);
    if (id === 'lightningBolt') m *= 1 - maelstromCut(c);
    return Math.round(m);
  };
}

/** Mana per second: Spirit regen outside the five-second rule (Mindfulness and Improved Stormstrike keep some while casting), MP5 always. */
export function regen(c: Combat): number {
  const elemental = specOf(c) === 'elemental';
  const spirit = 6.25 + Number(c.options.spirit ?? (elemental ? D.spirit.elemental : D.spirit.enhancement)) / 8;
  const mp5 = Number(c.options.mp5 ?? (elemental ? D.mp5.elemental : D.mp5.enhancement)) / 5;
  let keep = [0, 0.17, 0.33, 0.5][T(c).mindfulness];
  if (c.aura(c.player, 'improvedStormstrike')) keep += D.improvedStormstrike.regen;
  return (c.t - c.lastSpend >= 5 ? spirit : spirit * Math.min(1, keep)) + mp5;
}

// --------------------------------------------------------------- spell table
const elementalFury = (c: Combat) => c.rules.spellCritMultiplier + 0.1 * T(c).elementalFury;

/** Talent multipliers per spell: Concussion, Call of Flame, Improved Fire Nova; Lava Burst on your Flame Shock. */
function spellMult(c: Combat, t: Unit, id: string): number {
  const tl = T(c);
  let m = 1;
  if (id === 'lightningBolt' || id === 'chainLightning' || id === 'earthShock' || id === 'lightningOverload') m *= 1 + 0.01 * tl.concussion;
  if (id === 'flameShock' || id === 'fireNova' || id === 'lavaBurst' || id === 'searingTotem' || id === 'magmaTotem') m *= 1 + 0.05 * tl.callOfFlame;
  if (id === 'fireNova') m *= 1 + 0.1 * tl.improvedFireNova;
  if (id === 'lavaBurst' && c.aura(t, 'flameShock')) m *= 1 + D.lavaBurst.flameShockBonus;
  return m;
}

/**
 * One spell hit: 17 % miss minus hit, crit (Call of Thunder +3 % for Lightning Bolt and Chain Lightning),
 * Elemental Fury's crit damage, average partial resists (Earth Shock all or nothing). The Stormstrike
 * charge adds 20 % to your next Lightning Bolt, Chain Lightning or Earth Shock (not an Overload copy).
 */
function spellHit(c: Combat, t: Unit, id: string, school: School, base: number, coeff: number,
  opts: { charge?: boolean; scale?: number; binary?: boolean; direct?: boolean } = {}): { outcome: Outcome; amount: number } {
  const tl = T(c);
  const thunder = (id === 'lightningBolt' || id === 'chainLightning' || id === 'lightningOverload') ? 3 * tl.callOfThunder : 0;
  const outcome: Outcome = roll(c, Math.max(1, D.spellMiss - c.totalHit())) ? 'resist' : roll(c, c.spellCritChance(thunder)) ? 'crit' : 'hit';
  let amount = 0;
  if (outcome !== 'resist') {
    let m = spellMult(c, t, id) * (opts.scale ?? 1);
    if (opts.charge && c.aura(t, 'stormstrike')) {
      m *= 1 + D.stormstrike.bonus;
      c.removeAura(t, 'stormstrike');
      c.count('stormstrikeCharges');
    }
    amount = Math.max(1, Math.round((base + coeff * c.spellPowerFor(school)) * m
      * (outcome === 'crit' ? elementalFury(c) : 1) * (opts.binary ? 1 : D.partialResist)));
  }
  c.deal({ target: t, source: id, outcome, school, amount, white: false, spell: opts.direct !== false });
  // Elemental Devastation: a direct spell crit gives melee crit (not ticks, totems, procs or Overload copies).
  if (outcome === 'crit' && opts.direct !== false && id !== 'lightningOverload' && tl.elementalDevastation) {
    c.applyAura(c.player, { id: 'elementalDevastation', name: 'Elemental Devastation', icon: 'elementalDevastation', duration: D.elementalDevastation.duration, crit: 3 * tl.elementalDevastation });
  }
  return { outcome, amount };
}

/** After a damage spell is cast: it spends Clearcasting, then may give a new one (10 %, hit or miss). */
function afterCast(c: Combat, id: string): void {
  const p = c.player;
  if (CLEARCASTING.includes(id) && c.aura(p, 'clearcasting')) {
    c.removeAura(p, 'clearcasting');
    c.count('clearcastingUsed');
    c.count(`clearcasting:${id}`);
  }
  if (T(c).elementalFocus && roll(c, D.clearcasting.chance)) {
    c.applyAura(p, { id: 'clearcasting', name: 'Clearcasting', icon: 'clearcasting', duration: D.clearcasting.duration });
    c.count('clearcasting');
    note(c, 'Clearcasting');
  }
}

/** Lightning Overload: 3/7/10 % for a free copy at half damage, no threat. */
function overload(c: Combat, t: Unit, base: number, coeff: number): void {
  const lo = T(c).lightningOverload;
  if (!lo || !roll(c, [0, 3, 7, 10][lo])) return;
  c.count('overloads');
  c.emit('bolt', { target: t, color: 0x9ad8ff, speed: D.lightningBolt.speed });
  spellHit(c, t, 'lightningOverload', 'nature', base, coeff, { scale: D.lightningOverload.damage, direct: false });
}

/** Spells start your melee swing when you stand next to the dummy (Enhancement). */
const swingIn = (c: Combat, t: Unit) => { if (melee(c) && c.inRange(t)) c.startAutoAttack(); };

// ------------------------------------------------------------------ totems
type Slot = 'fire' | 'earth' | 'air' | 'water';
const SLOTS: Record<Slot, string[]> = {
  fire: ['searingTotem', 'magmaTotem'],
  earth: ['strengthOfEarthTotem', 'stoneskinTotem'],
  air: ['graceOfAirTotem', 'windfuryTotemOwn'],
  water: ['manaSpringTotem'],
};
const totemSpots = new WeakMap<Combat, Partial<Record<Slot, { x: number; z: number }>>>();
export const fireTotem = (c: Combat) => !!c.aura(c.player, 'searingTotem') || !!c.aura(c.player, 'magmaTotem');
/** A target within `yards` of your Fire totem. */
export function nearFireTotem(c: Combat, u: Unit, yards: number): boolean {
  const spot = totemSpots.get(c)?.fire;
  return !!spot && Math.hypot(u.x - spot.x, u.z - spot.z) <= yards * YARD + u.radius;
}
const targetsNearFire = (c: Combat, yards: number) => c.targets.filter((u) => u.health > 0 && nearFireTotem(c, u, yards));

function totem(id: string, auraId: string, slot: Slot, name: string, mana: number, describe: (c: Combat) => string,
  aura: (c: Combat) => Record<string, unknown>, extra: Partial<Ability> = {}): Ability {
  return {
    id, name, icon: id, gcd: D.totemGcd, target: 'self', animation: 'cast',
    cost: cost(id, mana),
    description: (c) => `${describe(c)} One totem per element: it replaces your other ${slot[0].toUpperCase() + slot.slice(1)} totem. 1.0 sec global cooldown.`,
    use: (c) => {
      const p = c.player;
      for (const other of SLOTS[slot]) if (other !== auraId) c.removeAura(p, other);
      let spots = totemSpots.get(c);
      if (!spots) totemSpots.set(c, (spots = {}));
      spots[slot] = { x: p.x, z: p.z };
      // The scene draws the totem where you stand; it goes away with the aura.
      c.applyAura(p, {
        id: auraId, name, icon: id, duration: 300, ...aura(c),
        onRemove: (cc) => cc.emit('totem', { slot, id: null, x: p.x, z: p.z, facing: p.facing }),
      });
      c.emit('totem', { slot, id, x: p.x, z: p.z, facing: p.facing });
      c.count(`casts:${id}`);
    },
    ...extra,
  };
}

function totemAttack(c: Combat, u: Unit, id: string, base: number, coeff: number): void {
  const outcome: Outcome = roll(c, Math.max(1, D.spellMiss - c.totalHit())) ? 'resist' : roll(c, c.spellCritChance()) ? 'crit' : 'hit';
  const amount = outcome === 'resist' ? 0 : Math.max(1, Math.round((base + coeff * c.spellPowerFor('fire')) * spellMult(c, u, id)
    * (outcome === 'crit' ? elementalFury(c) : 1) * D.partialResist));
  c.deal({ target: u, source: id, outcome, school: 'fire', amount, white: false });
}

// --------------------------------------------------------------- abilities
const talent = (key: keyof Talents, name: string) => ({
  requirements: (c: Combat) => (T(c)[key] ? null : `Requires the ${name} talent`),
  usable: (c: Combat) => T(c)[key] > 0,
});
const spell = (a: Omit<Ability, 'gcd' | 'target' | 'hastedGcd' | 'noAutoAttack'> & { range?: number }): Ability => ({
  gcd: D.gcd, target: 'enemy', hastedGcd: true, noAutoAttack: true, animation: 'cast', ...a, range: a.range ?? 30,
});
const alacrity = (c: Combat) => [0, 0.17, 0.33, 0.5][T(c).elementalAlacrity];
const castTime = (base: (c: Combat) => number) => (c: Combat) => Math.max(0, base(c)) / c.castHaste();
const shockCd = (c: Combat) => D.shockCooldown - 0.2 * T(c).reverberation;
const shock = { cooldown: shockCd, cooldownGroup: 'shock' };

export const ABILITIES: Ability[] = [
  spell({
    id: 'lightningBolt', name: 'Lightning Bolt', icon: 'lightningBolt',
    projectile: { color: 0x9ad8ff, speed: D.lightningBolt.speed },
    cost: cost('lightningBolt', D.lightningBolt.mana),
    castTime: castTime((c) => (D.lightningBolt.cast - alacrity(c)) * (1 - maelstromCut(c))),
    resetsSwing: true,
    highlight: (c) => T(c).maelstromWeapon > 0 && maelstromStacks(c) >= D.maelstromWeapon.max,
    description: (c) => `A ${(D.lightningBolt.cast - alacrity(c)).toFixed(1)} sec cast: ${D.lightningBolt.min}-${D.lightningBolt.max} Nature damage plus ${Math.round(D.lightningBolt.coeff * 100)}% of spell damage.${T(c).maelstromWeapon ? ' Each Maelstrom Weapon stack makes it faster and cheaper; at 5 stacks it is instant and free.' : ''}${T(c).lightningOverload ? ' Lightning Overload can cast a free copy for half damage.' : ''} A hardcast restarts your melee swing.`,
    use: (c, t) => {
      const u = t!;
      const l = D.lightningBolt;
      if (maelstromStacks(c)) {
        if (maelstromStacks(c) >= D.maelstromWeapon.max) c.count('maelstromBolts');
        c.removeAura(c.player, 'maelstromWeapon');
      }
      const base = between(c, l.min, l.max);
      spellHit(c, u, 'lightningBolt', 'nature', base, l.coeff, { charge: true });
      overload(c, u, base, l.coeff);
      afterCast(c, 'lightningBolt');
    },
  }),
  spell({
    id: 'chainLightning', name: 'Chain Lightning', icon: 'chainLightning',
    projectile: { color: 0x9ad8ff, speed: 30 },
    cost: cost('chainLightning', D.chainLightning.mana), cooldown: D.chainLightning.cooldown,
    castTime: castTime((c) => D.chainLightning.cast - alacrity(c)),
    resetsSwing: true,
    highlight: (c) => !!c.aura(c.player, 'clearcasting'),
    description: (c) => `A ${(D.chainLightning.cast - alacrity(c)).toFixed(1)} sec cast: ${D.chainLightning.min}-${D.chainLightning.max} Nature damage plus spell damage, then jumps to 2 more targets for 30% less each. 6 sec cooldown. Best on Clearcasting (free).`,
    use: (c, t) => {
      const u = t!;
      const k = D.chainLightning;
      const others = c.targets.filter((x) => x !== u && x.health > 0 && c.inRange(x, 30));
      [u, ...others].slice(0, k.targets).forEach((x, i) => {
        const base = between(c, k.min, k.max);
        spellHit(c, x, 'chainLightning', 'nature', base, k.coeff, { charge: i === 0, scale: k.jump ** i });
        if (i > 0) c.emit('bolt', { target: x, color: 0x9ad8ff, speed: 30 });
        overload(c, x, base * k.jump ** i, k.coeff * k.jump ** i);
      });
      afterCast(c, 'chainLightning');
    },
  }),
  spell({
    id: 'lavaBurst', name: 'Lava Burst', icon: 'lavaBurst',
    projectile: { color: 0xff6a1a, speed: 24 },
    cost: cost('lavaBurst', D.lavaBurst.mana), cooldown: D.lavaBurst.cooldown,
    castTime: castTime((c) => D.lavaBurst.cast - alacrity(c)),
    resetsSwing: true,
    ...talent('lavaBurst', 'Lava Burst'),
    description: (c) => `A ${(D.lavaBurst.cast - alacrity(c)).toFixed(1)} sec cast: ${D.lavaBurst.min}-${D.lavaBurst.max} Fire damage plus spell damage, 20% more while your Flame Shock burns on the target. 10 sec cooldown.`,
    use: (c, t) => {
      spellHit(c, t!, 'lavaBurst', 'fire', between(c, D.lavaBurst.min, D.lavaBurst.max), D.lavaBurst.coeff);
      afterCast(c, 'lavaBurst');
    },
  }),
  spell({
    id: 'earthShock', name: 'Earth Shock', icon: 'earthShock', range: D.earthShock.range,
    projectile: { color: 0xc89a4a, speed: 40 },
    cost: cost('earthShock', D.earthShock.mana), ...shock,
    description: (c) => `Instant: ${D.earthShock.min}-${D.earthShock.max} Nature damage plus spell damage, double threat. All or nothing. Shares a ${shockCd(c).toFixed(1)} sec cooldown with your other shocks.`,
    use: (c, t) => {
      const u = t!;
      spellHit(c, u, 'earthShock', 'nature', between(c, D.earthShock.min, D.earthShock.max), D.earthShock.coeff, { charge: true, binary: true });
      afterCast(c, 'earthShock');
      swingIn(c, u);
    },
  }),
  spell({
    id: 'flameShock', name: 'Flame Shock', icon: 'flameShock', range: D.flameShock.range,
    cost: cost('flameShock', D.flameShock.mana), ...shock,
    description: () => `Instant: ${D.flameShock.direct} Fire damage plus spell damage, then ${D.flameShock.ticks} ticks of ${D.flameShock.tick} plus spell damage over ${D.flameShock.ticks * D.flameShock.period} sec; the ticks can crit. Lava Burst deals 20% more while it burns. Shares the shock cooldown.`,
    use: (c, t) => {
      const u = t!;
      const f = D.flameShock;
      const r = spellHit(c, u, 'flameShock', 'fire', f.direct, f.coeff);
      afterCast(c, 'flameShock');
      swingIn(c, u);
      if (r.outcome === 'resist') return;
      c.applyAura(u, {
        id: 'flameShock', name: 'Flame Shock', icon: 'flameShock', duration: f.ticks * f.period, period: f.period,
        onTick: (cc) => {
          const crit = roll(cc, cc.spellCritChance());
          const amount = Math.max(1, Math.round((f.tick + f.tickCoeff * cc.spellPowerFor('fire')) * spellMult(cc, u, 'flameShock') * (crit ? elementalFury(cc) : 1) * D.partialResist));
          cc.deal({ target: u, source: 'flameShock', outcome: crit ? 'crit' : 'hit', school: 'fire', amount, white: false, periodic: true });
        },
      });
    },
  }),
  spell({
    id: 'frostShock', name: 'Frost Shock', icon: 'frostShock', range: D.frostShock.range,
    projectile: { color: 0x8ad0ff, speed: 40 },
    cost: cost('frostShock', D.frostShock.mana), ...shock,
    description: () => `Instant: ${D.frostShock.min}-${D.frostShock.max} Frost damage plus spell damage and a slow. Shares the shock cooldown; the sims do not use it on a boss.`,
    use: (c, t) => {
      const u = t!;
      spellHit(c, u, 'frostShock', 'frost', between(c, D.frostShock.min, D.frostShock.max), D.frostShock.coeff);
      afterCast(c, 'frostShock');
      swingIn(c, u);
    },
  }),
  {
    id: 'stormstrike', name: 'Stormstrike', icon: 'stormstrike', gcd: D.gcd, target: 'enemy', range: 'melee',
    cost: cost('stormstrike', D.stormstrike.mana), cooldown: D.stormstrike.cooldown,
    ...talent('stormstrike', 'Stormstrike'),
    description: (c) => `Instant: a main-hand weapon hit. Your next Lightning Bolt, Chain Lightning or Earth Shock within 12 sec deals 20% more (personal).${T(c).improvedStormstrike ? ` Improved Stormstrike: ${50 * T(c).improvedStormstrike}% chance to keep 50% of your Spirit regen while casting for 15 sec.` : ''} 8 sec cooldown.`,
    use: (c, t) => {
      const u = t!;
      const outcome = c.rollSpecial(u, 'stormstrike');
      const amount = c.physicalDamage(u, 'stormstrike', c.weaponDamage('main'), outcome);
      c.deal({ target: u, source: 'stormstrike', outcome, school: 'physical', amount, white: false, hand: 'main', weaponStrike: true });
      c.count('casts:stormstrike');
      if (amount > 0) c.applyAura(u, { id: 'stormstrike', name: 'Stormstrike', icon: 'stormstrike', duration: D.stormstrike.duration });
      const iss = T(c).improvedStormstrike;
      if (iss && roll(c, 50 * iss)) c.applyAura(c.player, { id: 'improvedStormstrike', name: 'Improved Stormstrike', icon: 'improvedStormstrike', duration: D.improvedStormstrike.duration });
    },
  },
  spell({
    id: 'fireNova', name: 'Fire Nova', icon: 'fireNova',
    cost: cost('fireNova', D.fireNova.mana),
    cooldown: (c) => D.fireNova.cooldown - 2 * T(c).improvedFireNova,
    requirements: (c) => (fireTotem(c) ? null : 'Needs your Searing or Magma Totem'),
    usable: (c) => fireTotem(c),
    highlight: (c) => !!c.aura(c.player, 'clearcasting') && fireTotem(c),
    description: (c) => `Instant: ${D.fireNova.min}-${D.fireNova.max} Fire damage plus spell damage to every enemy within ${D.fireNova.radius} yards of your Fire totem. Needs a Searing or Magma Totem. ${D.fireNova.cooldown - 2 * T(c).improvedFireNova} sec cooldown.`,
    use: (c, t) => {
      const spot = totemSpots.get(c)?.fire;
      if (spot) c.emit('nova', { ...spot, radius: D.fireNova.radius, color: 0xff8a2a, totem: 'fire' });
      const hit = targetsNearFire(c, D.fireNova.radius);
      for (const u of hit) spellHit(c, u, 'fireNova', 'fire', between(c, D.fireNova.min, D.fireNova.max), D.fireNova.coeff);
      if (!hit.length) note(c, 'No enemy near your Fire totem');
      afterCast(c, 'fireNova');
      if (t) swingIn(c, t);
    },
  }),
  {
    id: 'rageOfTheFarseer', name: 'Rage of the Farseer', icon: 'rageOfTheFarseer', gcd: 0, target: 'self',
    cooldown: D.rageOfTheFarseer.cooldown,
    ...talent('rageOfTheFarseer', 'Rage of the Farseer'),
    description: () => `+30% melee attack speed for ${D.rageOfTheFarseer.duration} sec. Off the global cooldown; 3 min cooldown.`,
    use: (c) => { c.applyAura(c.player, { id: 'rageOfTheFarseer', name: 'Rage of the Farseer', icon: 'rageOfTheFarseer', duration: D.rageOfTheFarseer.duration, haste: D.rageOfTheFarseer.haste }); },
  },
  {
    id: 'lightningShield', name: 'Lightning Shield', icon: 'lightningShield', gcd: D.gcd, target: 'self', hastedGcd: true, animation: 'cast',
    cost: cost('lightningShield', D.lightningShield.mana),
    description: () => `3 orbs for 10 min: when an enemy hits you in melee, an orb deals ${D.lightningShield.damage} Nature damage plus spell damage to it (at most every 3.5 sec). Only useful when the dummy attacks you.`,
    use: (c) => { c.applyAura(c.player, { id: 'lightningShield', name: 'Lightning Shield', icon: 'lightningShield', duration: D.lightningShield.duration, stacks: D.lightningShield.orbs }); },
  },
  totem('searingTotem', 'searingTotem', 'fire', 'Searing Totem', D.searingTotem.mana,
    () => `For ${D.searingTotem.duration} sec it hits one enemy within ${D.searingTotem.range} yards for ${D.searingTotem.min}-${D.searingTotem.max} Fire every ${D.searingTotem.period} sec.`,
    () => ({
      duration: D.searingTotem.duration, period: D.searingTotem.period,
      onTick: (cc: Combat) => {
        const u = cc.target;
        const s = D.searingTotem;
        const spot = totemSpots.get(cc)?.fire;
        if (!u || u.health <= 0 || !spot || !nearFireTotem(cc, u, s.range)) return;
        cc.emit('bolt', { target: u, color: 0xff7a1a, speed: 25, from: { ...spot, totem: 'fire' } });
        totemAttack(cc, u, 'searingTotem', between(cc, s.min, s.max), s.coeff);
      },
    })),
  totem('magmaTotem', 'magmaTotem', 'fire', 'Magma Totem', D.magmaTotem.mana,
    () => `For ${D.magmaTotem.duration} sec it burns every enemy within ${D.magmaTotem.radius} yards for ${D.magmaTotem.damage} Fire every ${D.magmaTotem.period} sec. For two or more targets.`,
    () => ({
      duration: D.magmaTotem.duration, period: D.magmaTotem.period,
      onTick: (cc: Combat) => {
        const spot = totemSpots.get(cc)?.fire;
        if (spot) cc.emit('nova', { ...spot, radius: D.magmaTotem.radius, color: 0xff5a1a, totem: 'fire' });
        for (const u of targetsNearFire(cc, D.magmaTotem.radius)) totemAttack(cc, u, 'magmaTotem', D.magmaTotem.damage, D.magmaTotem.coeff);
      },
    })),
  totem('strengthOfEarthTotem', 'strengthOfEarthTotem', 'earth', 'Strength of Earth Totem', D.strengthOfEarthTotem.mana,
    () => '+53 Strength (+106 attack power) for 5 min.', () => ({ attackPower: D.strengthOfEarthTotem.ap })),
  totem('stoneskinTotem', 'stoneskinTotem', 'earth', 'Stoneskin Totem', D.stoneskinTotem.mana,
    () => 'Physical hits on you deal 30 less damage, for 5 min (here about 1% of the dummy\'s hits).', () => ({ damageTaken: 0.99 })),
  totem('graceOfAirTotem', 'graceOfAirTotem', 'air', 'Grace of Air Totem', D.graceOfAirTotem.mana,
    () => `+89 Agility (+${D.graceOfAirTotem.crit.toFixed(1)}% melee crit) for 5 min. It does not stack with Windfury Totem; with your own Windfury Weapon, this is your Air totem.`,
    () => ({ crit: D.graceOfAirTotem.crit })),
  totem('windfuryTotem', 'windfuryTotemOwn', 'air', 'Windfury Totem', D.windfuryTotem.mana,
    () => 'Main-hand attacks: 20% for an extra attack with +246 AP, for 5 min. Your own Windfury Weapon turns it off for you: then use Grace of Air.',
    () => ({ windfury: true })),
  totem('manaSpringTotem', 'manaSpringTotem', 'water', 'Mana Spring Totem', D.manaSpringTotem.mana,
    () => '10 mana every 2 sec for 5 min. It does not stack with a raid Mana Spring Totem.', () => ({ manaPerSecond: D.manaSpringTotem.perSecond }),
    {
      requirements: (c) => (c.raid.has('manaSpring') ? 'A raid shaman already has Mana Spring Totem up (Raid buffs and debuffs)' : null),
      usable: (c) => !c.raid.has('manaSpring'),
    }),
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
  const tl = T(c);
  const p = c.player;
  totemSpots.set(c, {});
  p.maxResource = Math.max(1, Number(c.options.mana ?? 4000));
  p.regenPerSecond = 0;
  c.manaLocked = !!c.options.lockMana;
  // Thundering Strikes: crit for every attack and spell. Tidal Focus: melee and spell hit.
  c.mod.crit += tl.thunderingStrikes;
  c.mod.spellCrit += tl.thunderingStrikes;
  c.mod.hit += tl.tidalFocus;
  c.mod.threatFor.earthShock = D.earthShock.threat;
  c.mod.threatFor.lightningOverload = 0;
  if (c.options.weaponMastery) c.mod.physicalDamage *= D.weaponMastery;
  const ew = tl.elementalWeapons;
  const kind = imbue(c);
  if (kind === 'windfury') {
    c.mod.windfuryWeapon = { ap: Math.round(D.windfuryWeapon.ap * (1 + [0, 0.13, 0.27, 0.4][ew])), source: 'windfuryWeapon' };
    c.applyAura(p, { id: 'windfuryWeapon', name: 'Windfury Weapon', icon: 'windfuryWeapon', duration: Infinity });
  } else if (kind === 'flametongue') {
    c.applyAura(p, { id: 'flametongueWeapon', name: 'Flametongue Weapon', icon: 'flametongueWeapon', duration: Infinity });
  } else if (kind === 'rockbiter') {
    c.applyAura(p, { id: 'rockbiterWeapon', name: 'Rockbiter Weapon', icon: 'rockbiterWeapon', duration: Infinity, attackPower: Math.round(D.rockbiterWeapon.ap * (1 + [0, 0.07, 0.13, 0.2][ew])) });
  }
  // Spirit Weapons: -30% threat, or +30% with Rockbiter.
  if (tl.spiritWeapons) c.mod.threat *= kind === 'rockbiter' ? 1.3 : 0.7;

  c.onHit.push((h) => {
    if (h.hand === 'off' || h.ranged) return;
    // Flurry: white swings spend the charges; a melee crit gives 3 faster swings.
    const fl = c.aura(p, 'flurry');
    if (fl && h.white) {
      fl.stacks = (fl.stacks ?? 1) - 1;
      if (fl.stacks <= 0) c.removeAura(p, 'flurry');
    }
    if (h.outcome === 'crit' && tl.flurry) c.applyAura(p, { id: 'flurry', name: 'Flurry', icon: 'flurry', duration: D.flurry.duration, stacks: D.flurry.charges, haste: 0.05 * tl.flurry });
    // Maelstrom Weapon: 2 procs per minute per point, from any landed melee hit.
    if (tl.maelstromWeapon && roll(c, (100 * D.maelstromWeapon.ppmPerPoint * tl.maelstromWeapon * c.stats.mainHand.speed) / 60)) {
      const before = maelstromStacks(c);
      c.addStack(p, { id: 'maelstromWeapon', name: 'Maelstrom Weapon', icon: 'maelstromWeapon', duration: D.maelstromWeapon.duration }, D.maelstromWeapon.max);
      c.count('maelstromStacks');
      if (before === D.maelstromWeapon.max - 1) note(c, 'Maelstrom Weapon: instant Lightning Bolt');
    }
    // Flametongue Weapon: Fire damage on every landed hit, scaled by weapon speed.
    if (kind === 'flametongue') {
      const f = D.flametongueWeapon;
      const outcome: Outcome = roll(c, Math.max(1, D.spellMiss - c.totalHit())) ? 'resist' : roll(c, c.spellCritChance()) ? 'crit' : 'hit';
      const amount = outcome === 'resist' ? 0 : Math.round((f.perSpeed * c.stats.mainHand.speed + f.coeff * c.spellPowerFor('fire')) * (1 + 0.05 * ew)
        * (outcome === 'crit' ? c.rules.spellCritMultiplier : 1) * D.partialResist);
      c.deal({ target: h.target, source: 'flametongueWeapon', outcome, school: 'fire', amount, white: false });
    }
    // Rockbiter: bonus threat on each of the weapon's hits.
    if (kind === 'rockbiter') c.meter.threat += D.rockbiterWeapon.threat * c.mod.threat * c.auraProduct('threat');
  });

  // When the dummy attacks: Lightning Shield orbs, and Improved Stormstrike resets on your dodges and parries.
  let lastOrb = -Infinity;
  c.onIncoming.push((i: Incoming) => {
    const landed = i.outcome === 'hit' || i.outcome === 'crit' || i.outcome === 'crush' || i.outcome === 'block';
    const ls = c.aura(p, 'lightningShield');
    if (landed && ls && c.t - lastOrb >= D.lightningShield.icd) {
      lastOrb = c.t;
      const l = D.lightningShield;
      const amount = Math.round((l.damage + l.coeff * c.spellPowerFor('nature')) * (1 + 0.05 * tl.improvedLightningShield) * D.partialResist);
      c.deal({ target: i.attacker, source: 'lightningShield', outcome: 'hit', school: 'nature', amount, white: false });
      ls.stacks = (ls.stacks ?? 1) - 1;
      if (ls.stacks <= 0) c.removeAura(p, 'lightningShield');
    }
    if ((i.outcome === 'dodge' || i.outcome === 'parry') && tl.improvedStormstrike && roll(c, 50 * tl.improvedStormstrike) && c.cooldownLeft('stormstrike').left > 0) {
      c.clearCooldown('stormstrike');
      c.count('stormstrikeResets');
      note(c, 'Stormstrike reset');
    }
  });

  c.registerSource('windfuryWeapon', 'Windfury Weapon', 'windfuryWeapon');
  c.registerSource('flametongueWeapon', 'Flametongue Weapon', 'flametongueWeapon');
  c.registerSource('searingTotem', 'Searing Totem', 'searingTotem');
  c.registerSource('magmaTotem', 'Magma Totem', 'magmaTotem');
  c.registerSource('lightningOverload', 'Lightning Overload', 'lightningOverload');
  c.registerSource('lightningShield', 'Lightning Shield', 'lightningShield');
  c.trackedTargetAuras.push('flameShock', 'stormstrike');
  c.trackedAuras.push('searingTotem', 'flurry', 'elementalDevastation');
}

// ------------------------------------------------------- practice helpers
export function chances(c: Combat): { title: string; rows: [string, string][] }[] {
  const tl = T(c);
  const pct = (n: number) => `${Math.max(0, Math.min(100, n)).toFixed(1)}%`;
  const procs: [string, string][] = [];
  if (tl.elementalFocus) procs.push(['Clearcasting after a damage spell', `${D.clearcasting.chance}%: next damage spell free`]);
  if (tl.lightningOverload) procs.push(['Lightning Overload per Lightning Bolt or Chain Lightning', `${[0, 3, 7, 10][tl.lightningOverload]}%: a free copy at half damage`]);
  if (tl.elementalDevastation) procs.push(['Elemental Devastation on a spell crit', `+${3 * tl.elementalDevastation}% melee crit, 10 s`]);
  if (melee(c)) {
    if (imbue(c) === 'windfury') procs.push(['Windfury Weapon per landed main-hand hit', `20% (1.5 s cooldown): 2 attacks with +${c.mod.windfuryWeapon?.ap ?? D.windfuryWeapon.ap} AP`]);
    if (tl.maelstromWeapon) procs.push(['Maelstrom Weapon stack per landed hit', pct((100 * D.maelstromWeapon.ppmPerPoint * tl.maelstromWeapon * c.stats.mainHand.speed) / 60)]);
    if (tl.flurry) procs.push(['Flurry after a melee crit', `+${5 * tl.flurry}% attack speed for 3 swings`]);
  }
  if (c.raid.has('judgementOfWisdom')) procs.push(['Judgement of Wisdom: +59 mana', '50% per landed hit or direct spell']);
  const rows: [string, string][] = [
    ['Spell miss (17% minus hit)', pct(Math.max(1, D.spellMiss - c.totalHit()))],
    ['Spell crit (Lightning Bolt, Chain Lightning)', `${pct(c.spellCritChance())} (${pct(c.spellCritChance(3 * tl.callOfThunder))})`],
    ['Spell crit damage', `${elementalFury(c).toFixed(1)}x`],
    ['Partial resists', `-${Math.round((1 - D.partialResist) * 100)}% on average (Earth Shock all or nothing)`],
  ];
  if (melee(c)) {
    const tbl = c.target ? c.whiteTable(c.target) : null;
    if (tbl) rows.push(['Melee: miss / dodge / glancing / crit', `${pct(tbl.miss)} / ${pct(tbl.dodge)} / ${pct(tbl.glance)} / ${pct(tbl.crit)}`]);
  }
  return [
    { title: 'Your attacks', rows },
    { title: 'Procs', rows: procs },
    { title: 'Mana', rows: [['Regeneration now', `${regen(c).toFixed(1)} mana per second (Spirit stops 5 s after you spend mana${tl.mindfulness ? `; Mindfulness keeps ${[0, 17, 33, 50][tl.mindfulness]}%` : ''})`]] },
  ];
}

export const SOURCES = [
  { label: 'wow-forever-sim', url: 'https://github.com/gunba/wow-forever-sim' },
  { label: 'foreversim', url: 'https://github.com/laurencestokes/foreversim' },
];
