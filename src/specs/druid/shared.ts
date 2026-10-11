// Pieces every druid spec uses: Omen of Clarity, bleeds, Faerie Fire,
// potions and the text shared by the three help pages.
import type { Combat } from '../../engine/combat';
import type { Ability, Outcome, Unit } from '../../engine/types';
import { DATA } from './data';

export const D = DATA;
export const landed = (o: Outcome) => o === 'hit' || o === 'crit' || o === 'glance' || o === 'block';
export const roll = (c: Combat, pct: number) => c.random() * 100 < pct;
export const note = (c: Combat, text: string, kind: 'proc' | 'resource' = 'proc') => c.emit('note', { text, kind });
export const YARD = 0.9144;

/** Per-fight state that is not an aura. */
interface DruidState { lastOmen: number }
const states = new WeakMap<Combat, DruidState>();
export function resetState(c: Combat): void { states.set(c, { lastOmen: -Infinity }); }
export const state = (c: Combat): DruidState => {
  let s = states.get(c);
  if (!s) states.set(c, (s = { lastOmen: -Infinity }));
  return s;
};

// --------------------------------------------------------- Omen of Clarity
/**
 * Omen of Clarity, baseline in Forever: 2 procs per minute (fs, from beta
 * logs), so the chance per hit is 2 x speed / 60 (a cat hit 3.3 %, a bear
 * hit 8.3 %), with a 10 s internal cooldown. Clearcasting makes the next
 * costed ability free. Provisional: the biggest open number of the class.
 */
export function omen(c: Combat, speed: number, opts: { mult?: number; icd?: number } = {}): void {
  const s = state(c);
  const icd = opts.icd ?? D.omen.icd;
  if (c.t - s.lastOmen < icd) return;
  if (!roll(c, ((D.omen.ppm * speed) / 60) * 100 * (opts.mult ?? 1))) return;
  s.lastOmen = c.t;
  c.applyAura(c.player, { id: 'clearcasting', name: 'Clearcasting', icon: 'clearcasting', duration: 15 });
  c.count('clearcasting');
  note(c, 'Clearcasting');
}
export const clearcasting = (c: Combat) => !!c.aura(c.player, 'clearcasting');
/** Spends Clearcasting (when the ability was free because of it). */
export function useClearcasting(c: Combat): void {
  if (!clearcasting(c)) return;
  c.removeAura(c.player, 'clearcasting');
  c.count('clearcastingUsed');
}
/** A cost that Clearcasting makes free. */
export const freeWithClearcasting = (base: (c: Combat) => number) => (c: Combat) => (clearcasting(c) ? 0 : base(c));

// ------------------------------------------------------------------ bleeds
/**
 * A bleed: ticks ignore armor, can crit and re-read attack power each tick
 * (Forever client flag). Rend and Tear counts (the target is bleeding),
 * Genesis adds 1 % periodic damage per point.
 */
export function bleed(c: Combat, t: Unit, id: string, name: string, ticks: number, period: number,
  perTick: (cc: Combat, stacks: number) => number, opts: { genesis?: number; stacks?: number } = {}): void {
  const genesis = 1 + 0.01 * (opts.genesis ?? 0);
  c.applyAura(t, {
    id, name, icon: id, duration: ticks * period, period, bleed: true, stacks: opts.stacks,
    onTick: (cc, a) => {
      const crit = cc.rollTickCrit(cc.critChance(id));
      const mult = cc.mod.physicalDamage * cc.auraProduct('damageDone') * (cc.mod.damageFor[id] ?? 1) * (1 + cc.mod.vsBleeding) * genesis;
      const amount = Math.round(perTick(cc, a.stacks ?? 1) * mult * (crit ? cc.mod.critMultiplierFor[id] ?? cc.rules.critMultiplier : 1));
      cc.deal({ target: t, source: id, outcome: crit ? 'crit' : 'hit', school: 'physical', amount, white: false, periodic: true });
    },
  });
}

// ------------------------------------------------------------ shared spells
/** Faerie Fire: -505 armor for 40 s. It rolls on the spell table, so it can miss. */
export function faerieFire(opts: { gcd: number; cooldown?: number; cost?: (c: Combat) => number; hasted?: boolean }): Ability {
  return {
    id: 'faerieFire', name: 'Faerie Fire', icon: 'faerieFire', gcd: opts.gcd, target: 'enemy', range: 30,
    hastedGcd: opts.hasted, noAutoAttack: true,
    cooldown: opts.cooldown, cost: opts.cost,
    animation: 'cast',
    description: () => `Lowers the target's armor by ${D.faerieFire.armor} for ${D.faerieFire.duration} sec. A spell: it can miss. Does not stack with another Faerie Fire.${opts.cooldown ? ` Free in an animal form, ${opts.cooldown} sec cooldown.` : ''}`,
    use: (c, t) => {
      const u = t!;
      const miss = Math.max(1, c.rules.spellMiss - c.totalHit());
      if (roll(c, miss)) {
        c.deal({ target: u, source: 'faerieFire', outcome: 'resist', school: 'nature', amount: 0, white: false });
        return;
      }
      c.applyAura(u, { id: 'faerieFire', name: 'Faerie Fire', icon: 'faerieFire', duration: D.faerieFire.duration, armor: D.faerieFire.armor, armorSlot: 'faerieFire' });
    },
  };
}

/** Is some Faerie Fire (yours or the raid's) on the target, and for how long. */
export function faerieFireLeft(c: Combat, t: Unit): number {
  let left = 0;
  for (const a of t.auras.values()) if (a.armorSlot === 'faerieFire') left = Math.max(left, a.end - c.t);
  return left;
}

export const manaPotion: Ability = {
  id: 'manaPotion', name: 'Major Mana Potion', icon: 'manaPotion', gcd: 0, target: 'self',
  cooldown: D.manaPotion.cooldown, cooldownGroup: 'potion',
  animation: 'drink',
  description: () => `Restores ${D.manaPotion.min} to ${D.manaPotion.max} mana. Works in animal forms.`,
  use: (c) => {
    const n = Math.round(D.manaPotion.min + c.random() * (D.manaPotion.max - D.manaPotion.min));
    c.gainMana(n);
    c.count('potionMana', n);
    note(c, `+${n} Mana`, 'resource');
  },
};

export const barkskin = (gcd: number): Ability => ({
  id: 'barkskin', name: 'Barkskin', icon: 'barkskin', gcd, target: 'self',
  cooldown: D.barkskin.cooldown,
  animation: 'cast',
  description: () => `You take ${Math.round((1 - D.barkskin.damageTaken) * 100)}% less physical damage for ${D.barkskin.duration} sec. Usable in any form.`,
  use: (c) => { c.applyAura(c.player, { id: 'barkskin', name: 'Barkskin', icon: 'barkskin', duration: D.barkskin.duration, damageTaken: D.barkskin.damageTaken }); },
});

export const attack: Ability = {
  id: 'attack', name: 'Attack', icon: 'melee', gcd: 0, target: 'enemy', range: 'melee',
  highlight: (c) => c.player.autoAttacking,
  description: () => 'Starts your auto attack.',
  use: () => {},
};

export { CONTROLS } from '../common';

export const SOURCES = [
  { label: 'wow-forever-sim', url: 'https://github.com/gunba/wow-forever-sim' },
  { label: 'foreversim', url: 'https://github.com/laurencestokes/foreversim' },
];
