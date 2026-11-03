// The rest of each class's spellbook: what the specs do not simulate by hand,
// built from the client's numbers (book.gen.json, tools/spellbook.mjs). These
// spells cost, cast and cool down as in the game. Damage, heals and shields are
// real; what needs a party, a pet, the world or a target that is not a boss only
// runs its timers, and its tooltip says so. They stay in the Spellbook: none
// joins a default bar.
import type { Combat } from '../engine/combat';
import type { Ability, School, Spec, Unit } from '../engine/types';
import BOOK from './book.gen.json';
import { ENERGIZED } from './racials';

interface Entry {
  id: string; name: string; school?: string; icon?: string; local?: boolean;
  cost?: { mana?: number; manaPct?: number; rage?: number; energy?: number };
  cast?: number; cd?: number; gcd?: number; range?: number; min?: number; dur?: number; lasting?: boolean; channel?: boolean;
  radius?: number; dmg?: number[]; sp?: number; ap?: number; weapon?: number; dot?: { every: number; each: number; sp?: number };
  heal?: number[]; healSp?: number; hot?: { every: number; each: number }; absorb?: number;
  kind?: string; target?: string; talent?: string; race?: string[]; group?: string; speed?: number; slot?: string; ground?: boolean; shot?: boolean;
  pages?: string[]; needsKill?: boolean; provisional?: boolean; form?: string; rage?: boolean; anyForm?: boolean; demon?: string; aura?: Record<string, number>;
}

/** Base mana at level 60, for the costs the client states as a share of it. */
const BASE_MANA: Record<string, number> = { druid: 1244, hunter: 1720, mage: 1273, paladin: 1512, priest: 1376, shaman: 1520, warlock: 1373 };
const COLORS: Record<string, number> = { holy: 0xffe9a8, fire: 0xff8a3c, nature: 0x8fe36a, frost: 0x9fd8ff, shadow: 0xa86cff, arcane: 0xe9a8ff, physical: 0xd8d8d8 };
const between = (c: Combat, a: number, b: number) => a + c.random() * (b - a);
/** Spell power, for a school the engine knows. */
const power = (c: Combat, school: School) => c.spellPowerFor(school);
const seconds = (s: number) => (s >= 3600 ? `${Math.round(s / 3600)} hr` : s >= 120 ? `${Math.round(s / 60)} min` : `${Math.round(s * 10) / 10} sec`);
const immune = (c: Combat) => c.emit('note', { text: 'Immune', kind: 'proc' });

/** The spells of these groups the specs simulate by hand; casting one ends the book's, and the other way round. */
const BY_HAND: Record<string, string[]> = {
  aspect: ['aspectOfTheHawk', 'aspectOfTheBeast'], seal: ['sealOfRighteousness', 'sealOfCommand', 'sealOfFury'], shield: ['lightningShield'],
  'totem-fire': ['searingTotem', 'magmaTotem'], 'totem-earth': ['strengthOfEarthTotem', 'stoneskinTotem'], 'totem-air': ['graceOfAirTotem', 'windfuryTotem'], 'totem-water': ['manaSpringTotem'],
};
const AURA_OF: Record<string, string> = { windfuryTotem: 'windfuryTotemOwn' };
const groupOf = (e: Entry) => e.group ?? (e.slot ? `totem-${e.slot}` : undefined);

/** What a spell hits: the target and whoever is around it, or whoever is around you. */
function victims(c: Combat, e: Entry, t: Unit | null): Unit[] {
  const r = e.radius ?? 0;
  if (e.target === 'enemy') {
    const u = t!;
    if (!r) return [u];
    const yards = r * 0.9144;
    return [u, ...c.targets.filter((o) => o !== u && o.health > 0 && Math.hypot(o.x - u.x, o.z - u.z) <= yards + o.radius)];
  }
  return r ? c.targets.filter((o) => o.health > 0 && c.inRange(o, r)) : [];
}

function strike(c: Combat, e: Entry, u: Unit): void {
  const school = (e.school ?? 'physical') as School;
  if (school === 'physical') {
    const base = (e.weapon ? e.weapon * c.weaponDamage('main') : 0) + (e.dmg ? between(c, e.dmg[0], e.dmg[1]) : 0);
    const outcome = c.rollSpecial(u, e.id);
    c.deal({ target: u, source: e.id, outcome, school, amount: c.physicalDamage(u, e.id, base, outcome), white: false, weaponStrike: true });
    return;
  }
  const outcome = c.rollSpell();
  const crit = outcome === 'crit' ? c.rules.spellCritMultiplier : 1;
  const amount = outcome === 'resist' ? 0 : Math.max(1, Math.round((between(c, e.dmg![0], e.dmg![1]) + (e.sp ?? 0) * power(c, school)) * c.auraProduct('damageDone') * crit));
  c.deal({ target: u, source: e.id, outcome, school, amount, white: false, spell: true });
}

function tick(c: Combat, e: Entry, u: Unit): void {
  const school = (e.school ?? 'physical') as School;
  const amount = Math.max(1, Math.round((e.dot!.each + (e.dot!.sp ?? 0) * power(c, school)) * c.auraProduct('damageDone')));
  c.deal({ target: u, source: e.id, outcome: 'hit', school, amount, white: false, periodic: true });
}

function effect(c: Combat, e: Entry, t: Unit | null, groups: Map<string, string[]>): void {
  const p = c.player;
  const iconKey = bookIcon(e);
  const group = groupOf(e);
  if (group) for (const id of groups.get(group) ?? []) if (id !== e.id) c.removeAura(p, id);
  if (e.id === 'totemicRecall') for (const [name, ids] of groups) if (name.startsWith('totem-')) for (const id of ids) c.removeAura(p, id);
  if (e.demon) c.options.demon = e.demon;
  if (e.id === 'innervate') c.removeAura(p, ENERGIZED);
  // Nature's Swiftness: the book's healing spells are instant while it lasts.
  if (e.heal && c.aura(p, 'naturesSwiftness')) c.removeAura(p, 'naturesSwiftness');
  const hit = victims(c, e, t);
  if (e.kind === 'control') { immune(c); return; }
  if (e.dmg || e.weapon) for (const u of hit) strike(c, e, u);
  // A channel ticks through the ability's channel; the rest leave a periodic effect on each target.
  if (e.dot && !e.channel) {
    for (const u of hit) {
      c.applyAura(u, { id: e.id, name: e.name, icon: iconKey, duration: e.dur || e.dot.every, period: e.dot.every, onTick: (cc) => { if (u.health > 0) tick(cc, e, u); } });
    }
  }
  if (e.heal) c.healPlayer(Math.round(between(c, e.heal[0], e.heal[1]) + (e.healSp ?? 0) * power(c, 'nature')));
  if (e.hot && !e.channel) {
    const hot = e.hot;
    c.applyAura(p, { id: e.id, name: e.name, icon: iconKey, duration: e.dur || hot.every, period: hot.every, onTick: (cc) => cc.healPlayer(hot.each) });
  }
  if (e.absorb) c.applyAura(p, { id: e.id, name: e.name, icon: iconKey, duration: e.dur || 30, absorb: e.absorb });
  if (e.kind === 'debuff' && t && e.dur) c.applyAura(t, { id: e.id, name: e.name, icon: iconKey, duration: e.dur });
  if (e.slot) {
    c.applyAura(p, { id: e.id, name: e.name, icon: iconKey, duration: e.dur || 300, onRemove: (cc) => cc.emit('totem', { slot: e.slot!, id: null, x: p.x, z: p.z, facing: p.facing }) });
    c.emit('totem', { slot: e.slot, id: e.id, x: p.x, z: p.z, facing: p.facing });
  } else if (e.kind === 'buff') {
    c.applyAura(p, { id: e.id, name: e.name, icon: iconKey, duration: e.lasting || !e.dur ? Infinity : e.dur, ...(e.speed ? { speed: e.speed } : {}), ...(e.aura ?? {}) });
  }
}

/** A sentence for the tooltip: what it does in this yard. Timers and costs come first. */
function describe(e: Entry, cost: number, resource: string): string {
  const parts: string[] = [];
  if (cost) parts.push(`${cost} ${resource}`);
  parts.push(e.channel ? `Channeled, ${seconds(e.dur ?? 0)}` : e.cast ? `${seconds(e.cast)} cast` : 'Instant');
  if (e.range && e.range <= 100 && e.target === 'enemy') parts.push(e.range <= 5 ? 'Melee range' : `${e.range} yd`);
  if (e.cd) parts.push(`${seconds(e.cd)} cooldown`);
  const head = `${parts.join(' · ')}. `;
  const area = e.radius && e.radius <= 40 ? ` to everything within ${e.radius} yards` : '';
  const school = e.school && e.school !== 'physical' ? `${e.school[0].toUpperCase()}${e.school.slice(1)} ` : '';
  if (e.kind === 'control') return `${head}Bosses and training dummies are immune; in the yard it only runs its timers.`;
  const says: string[] = [];
  if (e.dmg) says.push(`${e.dmg[0]}-${e.dmg[1]} ${school}damage${area}`);
  if (e.weapon) says.push(`${Math.round(e.weapon * 100)}% weapon damage`);
  if (e.dot) says.push(`${e.dot.each} ${school}damage every ${e.dot.every} sec${e.dmg ? '' : area}`);
  if (e.heal) says.push(`heals you for ${e.heal[0]}-${e.heal[1]}`);
  if (e.hot) says.push(`heals you for ${e.hot.each} every ${e.hot.every} sec`);
  if (e.absorb) says.push(`absorbs ${e.absorb} damage`);
  if (says.length) return `${head}${says.join(', then ').replace(/^./, (x) => x.toUpperCase())}.`;
  if (e.speed) return `${head}Run speed +${Math.round((e.speed - 1) * 100)}%.`;
  if (e.kind === 'buff') return `${head}Shows on you${e.lasting || !e.dur ? '' : ` for ${seconds(e.dur)}`}; its effect is not simulated in the yard. Raid buffs are in Settings.`;
  if (e.id === 'disengage') return `${head}Reduces your threat on the target; the yard does not simulate it.`;
  if (e.kind === 'debuff') return e.dur ? `${head}Shows on the target for ${seconds(e.dur)}; its effect is not simulated in the yard.` : `${head}Its effect is not simulated in the yard.`;
  if (e.slot) return `${head}Drops the totem; its effect is not simulated in the yard.`;
  return `${head}Nothing to act on in the yard: it only runs its timers.`;
}

/** An icon already in the site, or one the browser loads from Wowhead's image server. */
function bookIcon(e: { icon?: string; local?: boolean }): string {
  return !e.icon ? 'dummy' : e.local ? `local:${e.icon}` : `cdn:${e.icon}`;
}

function build(e: Entry, cls: string, spec: Spec, talents: (c: Combat) => Record<string, number>, groups: Map<string, string[]>): Ability {
  const mana = e.cost?.mana ?? (e.cost?.manaPct ? Math.round((BASE_MANA[cls] ?? 1300) * e.cost.manaPct / 100) : 0);
  const main = spec.resource === 'mana' ? mana : spec.resource === 'rage' ? e.cost?.rage ?? 0 : e.cost?.energy ?? 0;
  const side = spec.resource === 'mana' ? 0 : mana;
  const self = e.target !== 'enemy';
  const school = e.school ?? 'physical';
  const a: Ability = {
    id: e.id, name: e.name, icon: bookIcon(e), gcd: e.gcd ?? 1.5, target: self ? 'self' : 'enemy', book: true, provisional: e.provisional,
    ...(main ? { cost: () => main } : {}),
    ...(side ? { manaCost: () => side } : {}),
    ...(e.cd ? { cooldown: e.cd } : {}),
    ...(e.cast && !e.channel ? { castTime: e.heal && e.school === 'nature' ? (c: Combat) => (c.aura(c.player, 'naturesSwiftness') ? 0 : e.cast!) : e.cast } : {}),
    ...(!self && e.range ? { range: e.range <= 5 ? 'melee' as const : e.range } : {}),
    ...(e.ground ? { needsFacing: false } : {}),
    ...(e.shot ? { ranged: true, minRange: 8, animation: 'shoot' } : school === 'physical' ? {} : { animation: 'cast', hastedGcd: true, noAutoAttack: true }),
    ...(e.race ? { race: e.race } : {}),
    ...(e.talent ? { usable: (c: Combat) => (talents(c)[e.talent!] ?? 0) > 0, learned: (c: Combat) => (talents(c)[e.talent!] ?? 0) > 0 } : {}),
    ...(!self && e.range && e.range > 5 && school !== 'physical' && !e.ground && e.kind === 'damage' && !e.channel ? { projectile: { color: COLORS[school] ?? 0xffffff } } : {}),
    description: () => describe(e, main || side, side ? 'mana' : spec.resource),
    requirements: (c: Combat) => {
      if (e.talent && !((talents(c)[e.talent] ?? 0) > 0)) return `Requires the ${e.name} talent`;
      if (e.needsKill) return 'Only after a killing blow';
      if (spec.className !== 'Druid' || e.anyForm) return null;
      const form = c.spec.form?.(c);
      if (e.rage) return form === 'bear' ? null : 'Must be in Bear Form';
      // Moonkin casts everything but healing spells.
      return form && !(form === 'moonkin' && !e.heal && !e.hot) ? SHAPESHIFTED : null;
    },
    use: (c, t) => effect(c, e, t, groups),
  };
  if (e.channel && (e.dot || e.hot)) {
    const every = (e.dot ?? e.hot)!.every;
    a.channel = {
      duration: e.dur ?? every, ticks: Math.max(1, Math.round((e.dur ?? every) / every)),
      onTick: (c, t) => {
        if (e.hot) c.healPlayer(e.hot.each);
        if (e.dot) for (const u of victims(c, e, t)) tick(c, e, u);
      },
    };
  }
  return a;
}

const SHAPESHIFTED = "Can't do that while shapeshifted";
const SHIFTS = ['casterForm', 'travelForm', 'aquaticForm'];

/**
 * A druid's form. Cat and Bear have a page each, with their own resource: the form of the page you are on
 * goes on and off, and the other takes you to its page. Travel and Aquatic show on any page.
 */
function formAbility(e: Entry, spec: Spec, page: string): Ability {
  const mana = e.cost?.mana ?? (e.cost?.manaPct ? Math.round(BASE_MANA.druid * e.cost.manaPct / 100) : 0);
  const elsewhere = (e.form === 'cat' || e.form === 'bear') && e.form !== page;
  const on = (c: Combat) => c.spec.form?.(c) === e.form;
  const price = (c: Combat) => (elsewhere || on(c) ? 0 : mana);
  const aura = `${e.form}Form`;
  return {
    id: e.id, name: e.name, icon: bookIcon(e), gcd: e.gcd ?? 1.5, target: 'self', book: true, animation: 'cast', keepsStealth: elsewhere,
    ...(spec.resource === 'mana' ? { cost: price } : { manaCost: price }),
    highlight: on,
    description: () => (elsewhere ? `Practiced on its own page: this takes you there and starts over.`
      : `${mana} mana. ${e.speed ? `Run speed +${Math.round((e.speed - 1) * 100)}%. ` : ''}Press again to leave the form${e.form === page ? ': spells need you out of it, and your form abilities need you in it' : ''}.`),
    use: (c) => {
      const p = c.player;
      if (elsewhere) { c.emit('switchSpec', `druid-${e.form}`); return; }
      const wasOn = on(c);
      const inHome = e.form === page;
      for (const id of SHIFTS) c.removeAura(p, id);
      if (inHome) {
        if (wasOn) { c.applyAura(p, { id: 'casterForm', name: 'Caster Form', icon: 'cdn:spell_nature_healingtouch', duration: Infinity }); c.stopAutoAttack(); }
        return;
      }
      if (wasOn) return;
      if (c.aura(p, 'moonkinForm')) c.ability('moonkinForm')?.use(c, null);
      c.stopAutoAttack();
      c.applyAura(p, { id: aura, name: e.name, icon: bookIcon(e), duration: Infinity, ...(e.speed ? { speed: e.speed } : {}) });
    },
  };
}

/** Works in any form: drinks, and what does not depend on the form. */
const ANY_FORM = new Set(['manaPotion', 'ragePotion', 'thistleTea', 'barkskin', 'innervate']);

/** Forms on top of the page's own, and the page's abilities only in its form. */
function shapeshifting(spec: Spec, page: string): void {
  const home = spec.form!;
  const form: NonNullable<Spec['form']> = (c) => (c.aura(c.player, 'travelForm') ? 'travel' : c.aura(c.player, 'aquaticForm') ? 'aquatic' : c.aura(c.player, 'casterForm') ? null : home(c));
  spec.form = form;
  const need = page === 'cat' ? 'Cat' : 'Bear';
  spec.abilities = spec.abilities.map((a) => (ANY_FORM.has(a.id) ? a : {
    ...a,
    requirements: (c, t) => {
      const now = form(c);
      if (page === 'balance' ? now === 'travel' || now === 'aquatic' : now !== page) return page === 'balance' ? SHAPESHIFTED : `Must be in ${need} Form`;
      return a.requirements?.(c, t) ?? null;
    },
  }));
}

/** Adds the spells this spec has no ability for, by name. */
export function addSpellbook(spec: Spec, cls: string, talents: (c: Combat) => Record<string, number>, keep: Ability[] = []): void {
  const entries = ((BOOK as unknown as Record<string, Entry[]>)[cls] ?? []).filter((e) => !e.pages || e.pages.includes(spec.id.replace('druid-', '')));
  const have = new Set(spec.abilities.map((a) => a.name.toLowerCase()));
  const page = spec.id.replace('druid-', '');
  const groups = new Map<string, string[]>();
  for (const e of entries) {
    const group = groupOf(e);
    if (group) groups.set(group, [...(groups.get(group) ?? []), e.id]);
  }
  if (cls === 'druid') shapeshifting(spec, page);
  // What the specs cast by hand ends the book's spell of its group; the book's ends theirs too.
  const own = new Set(entries.map((e) => e.id));
  spec.abilities = spec.abilities.map((a) => {
    const name = Object.keys(BY_HAND).find((g) => BY_HAND[g].includes(a.id));
    if (!name || !groups.has(name) || own.has(a.id)) return a;
    return { ...a, use: (c, t) => { for (const id of groups.get(name)!) c.removeAura(c.player, id); a.use(c, t); } };
  });
  for (const [name, ids] of groups) groups.set(name, [...ids, ...(BY_HAND[name] ?? []).map((id) => AURA_OF[id] ?? id)]);
  const added = entries.filter((e) => !have.has(e.name.toLowerCase())).map((e) => (e.form ? formAbility(e, spec, page) : build(e, cls, spec, talents, groups)));
  spec.abilities = [...spec.abilities, ...keep, ...added];
}
