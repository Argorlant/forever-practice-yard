// Action bar layout. Specs define two rows of 8 (16 slots) and, for warriors,
// a stance bar after them. The player's bar holds four rows of 8 (rows 3 and
// 4 above the main two, shown when Settings asks for them), then the stance
// bar. Rows 3 and 4 start with the build's abilities that have no button yet.
import type { Combat } from '../engine/combat';
import { ACTION_BAR_SLOTS, type Ability, type Binding } from '../engine/types';

export const ROW = 8;
export const MAX_ROWS = 4;
/** Action slots in the player's bar (four rows); the stance bar comes after them. */
export const ACTION_SLOTS = ROW * MAX_ROWS;

/** A spec's bar (16 slots, then stances) laid out as the player's: 32 slots, row 3 on Shift+1-8, then the stances. */
export function expandBar(specBar: Binding[]): Binding[] {
  const extra = Array.from({ length: ACTION_SLOTS - ACTION_BAR_SLOTS }, (_, i): Binding => ({ id: null, key: i < ROW ? `Shift+Digit${i + 1}` : '' }));
  return [...specBar.slice(0, ACTION_BAR_SLOTS).map((b) => ({ ...b })), ...extra, ...specBar.slice(ACTION_BAR_SLOTS).map((b) => ({ ...b }))];
}

/** What a bar takes by itself: what this character can use, without the rest of the spellbook. */
const joinsBar = (a: Ability, c: Combat) => !a.book && (a.usable?.(c) ?? true) && (!a.race || a.race.includes(c.race.split('-')[0]));

/** Puts the abilities the build can use and that have no button into rows 3 and 4 (Charge, cooldowns, pet orders…). */
export function fillExtraRows(bar: Binding[], c: Combat): void {
  for (let i = ACTION_BAR_SLOTS; i < ACTION_SLOTS; i++) bar[i].id = null;
  const used = new Set(bar.map((b) => b.id).filter(Boolean));
  const rest = c.spec.abilities.filter((a) => !used.has(a.id) && joinsBar(a, c)).map((a) => a.id);
  for (let i = ACTION_BAR_SLOTS; i < ACTION_SLOTS && rest.length; i++) bar[i].id = rest.shift()!;
}

/** A talent this character does not have: no button for it. */
export const noButton = (a: Ability | undefined, c: Combat) => !!a?.dropsFromBar && !(a.usable?.(c) ?? true);

/** Takes those buttons off a bar saved or laid out before the talents changed. */
export function dropMissing(bar: Binding[], c: Combat): void {
  for (const b of bar) if (b.id && noButton(c.ability(b.id), c)) b.id = null;
}

/** Abilities you can use but have no button for (a talent just taken) go into empty slots on rows 3 and 4. */
export function addMissing(bar: Binding[], c: Combat): void {
  const used = new Set(bar.map((b) => b.id).filter(Boolean));
  const rest = c.spec.abilities.filter((a) => !used.has(a.id) && joinsBar(a, c)).map((a) => a.id);
  for (let i = ACTION_BAR_SLOTS; i < ACTION_SLOTS && rest.length; i++) if (!bar[i].id) bar[i].id = rest.shift()!;
}

/** The row of an action slot (0 = the main row, keys 1-8), or -1 for the stance bar. */
export const rowOf = (slot: number) => (slot < ACTION_SLOTS ? Math.floor(slot / ROW) : -1);
/** Whether a slot is on a row the player shows (the stance bar always is). */
export const slotShown = (slot: number, rows: number) => rowOf(slot) < rows;
