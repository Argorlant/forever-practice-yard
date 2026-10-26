// WoW's rules for a talent build of your own: 51 points at level 60, five
// points in a tree for every row above a talent, and a talent's prerequisite
// at full rank. Points are per talent in the drawn layout's order, the order
// the specs read (tools/engine_check.ts checks every talent).
import { decode, treesOf } from './talents-data';

export const MAX_POINTS = 51;
/** The trees' version: talents saved for older trees are dropped (the Oct 15 trees moved talents, the Oct 21 hotfix the Mage's Frost tree). */
export const TREE_VERSION = '70450';
export type Points = number[][];

/** The sims' talent string: one digit per talent, trees split by '-', trailing zeros left out. */
export const encode = (points: Points): string =>
  points.map((tree) => tree.join('').replace(/0+$/, '')).join('-').replace(/-+$/, '');

export const totalPoints = (points: Points) => points.reduce((n, tree) => n + tree.reduce((a, b) => a + b, 0), 0);

/** Points spent in a tree's rows above `row`. */
function above(cls: string, points: Points, tree: number, row: number): number {
  return treesOf(cls)[tree].talents.reduce((n, t, j) => n + (t.row < row ? points[tree][j] : 0), 0);
}

function prerequisiteMet(cls: string, points: Points, tree: number, j: number): boolean {
  const talents = treesOf(cls)[tree].talents;
  const req = talents[j].req;
  if (!req) return true;
  const k = talents.findIndex((t) => t.row === req[0] && t.col === req[1]);
  return k < 0 || points[tree][k] >= talents[k].max;
}

/** Every talent with points has its rows and its prerequisite, within 51 points. */
export function isValid(cls: string, points: Points): boolean {
  if (totalPoints(points) > MAX_POINTS) return false;
  return treesOf(cls).every((tree, i) => tree.talents.every((t, j) => {
    const r = points[i]?.[j] ?? 0;
    return r === 0 || (r <= t.max && above(cls, points, i, t.row) >= 5 * t.row && prerequisiteMet(cls, points, i, j));
  }));
}

export function canAdd(cls: string, points: Points, tree: number, j: number): boolean {
  const t = treesOf(cls)[tree].talents[j];
  return totalPoints(points) < MAX_POINTS && points[tree][j] < t.max
    && above(cls, points, tree, t.row) >= 5 * t.row && prerequisiteMet(cls, points, tree, j);
}

/** A point can go if what is left still holds: rows below keep their five per row, and talents keep their prerequisite. */
export function canRemove(cls: string, points: Points, tree: number, j: number): boolean {
  if (points[tree][j] <= 0) return false;
  const next = points.map((t) => [...t]);
  next[tree][j]--;
  return isValid(cls, next);
}

/** A talent string from a link, if it is a legal level 60 build for the class. */
export function parseTalents(cls: string, s: string | null): string | null {
  if (!s || !/^[0-9-]{1,120}$/.test(s)) return null;
  const points = decode(cls, s);
  return isValid(cls, points) ? encode(points) : null;
}

/** The level the first talent point comes at; one more point every level after it, 51 by level 60. */
export const FIRST_LEVEL = 10;
/** The level a build of this many points needs. */
export const levelFor = (points: number) => (points ? FIRST_LEVEL - 1 + points : 1);

/** A leveling order: the talent each point went to, level by level, as [tree, talent]. */
export type Order = [number, number][];

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** An order for a link: one letter per point, the talent's place counting through the three trees. */
export function encodeOrder(cls: string, order: Order): string {
  const start = treesOf(cls).reduce<number[]>((a, t, i) => [...a, (a[i] ?? 0) + t.talents.length], [0]);
  return order.map(([i, j]) => LETTERS[start[i] + j]).join('');
}

/** Points to the talents an order took. */
export function pointsOf(cls: string, order: Order): Points {
  const points = treesOf(cls).map((tree) => tree.talents.map(() => 0));
  for (const [i, j] of order) points[i][j]++;
  return points;
}

/** An order kept to the rules point by point: a point that cannot go yet waits for those after it (taking back an early point can leave a later one too soon). Points that never fit are dropped. */
export function repairOrder(cls: string, order: Order): Order {
  const points = treesOf(cls).map((tree) => tree.talents.map(() => 0));
  const pending = [...order];
  const out: Order = [];
  for (;;) {
    const k = pending.findIndex(([i, j]) => canAdd(cls, points, i, j));
    if (k < 0) return out;
    const [i, j] = pending.splice(k, 1)[0];
    points[i][j]++;
    out.push([i, j]);
  }
}

/** A link's order, if every letter is a talent of the class; kept to the rules. */
export function decodeOrder(cls: string, s: string | null): Order | null {
  if (!s || s.length > MAX_POINTS || ![...s].every((c) => LETTERS.includes(c))) return null;
  const places = treesOf(cls).flatMap((tree, i) => tree.talents.map((_, j): [number, number] => [i, j]));
  const order = [...s].map((c) => places[LETTERS.indexOf(c)]);
  return order.every(Boolean) ? repairOrder(cls, order) : null;
}

/** An order for a build that came without one: its main tree from the top, then the others, most points first. */
export function defaultOrder(cls: string, points: Points): Order {
  const trees = treesOf(cls);
  const byPoints = trees.map((_, i) => i).sort((a, b) => points[b].reduce((x, y) => x + y, 0) - points[a].reduce((x, y) => x + y, 0));
  const order: Order = [];
  for (const i of byPoints) {
    const talents = trees[i].talents.map((t, j) => ({ t, j })).sort((a, b) => a.t.row - b.t.row || a.t.col - b.t.col);
    for (const { j } of talents) for (let r = 0; r < points[i][j]; r++) order.push([i, j]);
  }
  return repairOrder(cls, order);
}
