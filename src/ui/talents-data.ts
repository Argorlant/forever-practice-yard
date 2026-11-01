// Talent trees as data: every class's three trees in the order the talent
// strings use (gunba's trees, via tools/talent_layout.mjs), and helpers to
// read a build's talent string against them.
import type { Spec } from '../engine/types';
import LAYOUT from './talent-layout.json';

/** WoW's class order and colours. */
export const CLASSES: { name: string; color: string }[] = [
  { name: 'Warrior', color: '#c79c6e' }, { name: 'Paladin', color: '#f58cba' }, { name: 'Hunter', color: '#abd473' },
  { name: 'Rogue', color: '#fff569' }, { name: 'Priest', color: '#ffffff' }, { name: 'Shaman', color: '#2a8cff' },
  { name: 'Mage', color: '#69ccf0' }, { name: 'Warlock', color: '#9482c9' }, { name: 'Druid', color: '#ff7d0a' },
];

export interface LayoutTalent {
  key: string;
  name: string;
  row: number;
  col: number;
  max: number;
  icon: string | null;
  /** The talent it needs maxed first: [row, column] in the same tree. */
  req: [number, number] | null;
  /** Description with {0}-style holes, filled from the rank's values. */
  text: string;
  ranks: number[][];
}
export interface LayoutTree { name: string; icon: string; bg: string | null; talents: LayoutTalent[] }

const layout = LAYOUT as unknown as Record<string, LayoutTree[]>;

/** 'Warrior' → 'warrior', the layout's key. */
export const classKey = (className: string) => className.toLowerCase();
export const treesOf = (cls: string): LayoutTree[] => layout[cls] ?? [];

/** Points in each talent: trees split by '-', one digit per talent in the tree's order, trailing zeros left out. */
export function decode(cls: string, talentString: string): number[][] {
  const parts = talentString.split('-');
  return treesOf(cls).map((tree, i) => tree.talents.map((_, j) => Number(parts[i]?.[j] ?? 0) || 0));
}

export const pointsPerTree = (cls: string, talentString: string) => decode(cls, talentString).map((p) => p.reduce((a, b) => a + b, 0));

/** The tree with the most points: the build's specialisation. */
export function mainTree(cls: string, talentString: string): LayoutTree | null {
  const pts = pointsPerTree(cls, talentString);
  const trees = treesOf(cls);
  if (!trees.length) return null;
  return trees[pts.indexOf(Math.max(...pts))];
}

/**
 * A spec's name for titles: 'Retribution Paladin', or for a class with one spec the trees its builds use
 * ('Arms, Fury and Protection Warrior'). Notes in brackets ('experimental') are left out.
 */
export function specTitle(spec: Spec): string {
  let name = spec.specName.replace(/\s*\(.*\)$/, '');
  if (name === 'WoW Forever' || name === spec.className) {
    const cls = classKey(spec.className);
    const trees = [...new Set((spec.builds ?? []).map((b) => (b.talentString ? mainTree(cls, b.talentString)?.name : null)).filter(Boolean))] as string[];
    name = trees.length > 1 ? `${trees.slice(0, -1).join(', ')} and ${trees[trees.length - 1]}` : trees[0] ?? '';
  }
  return `${name} ${spec.className}`.trim();
}

/** A talent's text at a rank (rank 1 for an untaken talent). */
export function describe(t: LayoutTalent, rank: number): string {
  const values = t.ranks[Math.max(0, Math.min(t.ranks.length, rank) - 1)] ?? [];
  return t.text.replace(/\{(\d+)\}/g, (_, i) => String(values[Number(i)] ?? '?'));
}
