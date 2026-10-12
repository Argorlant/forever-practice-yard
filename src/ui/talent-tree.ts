// A build's talents drawn like WoW's talent frame: the three trees side by
// side over their backgrounds, every talent at its row and column, lit with
// its rank where the build put points, dark where it did not.
import { decode, describe, treesOf } from './talents-data';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

export function talentTreesHtml(cls: string, talentString: string): string {
  const base = import.meta.env.BASE_URL;
  const points = decode(cls, talentString);
  const trees = treesOf(cls).map((tree, i) => {
    const total = points[i].reduce((a, b) => a + b, 0);
    const rows = Math.max(7, ...tree.talents.map((t) => t.row + 1));
    const cells = tree.talents.map((t, j) => {
      const r = points[i][j];
      const state = r === 0 ? 'off' : r >= t.max ? 'max' : 'part';
      const tip = esc(`${t.name} (${r}/${t.max})\n${describe(t, r || 1)}`);
      const icon = t.icon ? `<img src="${base}icons/${t.icon}.jpg" alt="" draggable="false" loading="lazy">` : '';
      return `<div class="tal ${state}" style="grid-row:${t.row + 1};grid-column:${t.col + 1}" title="${tip}">${icon}<span class="tal-rank">${r}/${t.max}</span></div>`;
    }).join('');
    const bg = tree.bg ? ` style="background-image:url('${base}talent-bg/${tree.bg}.jpg')"` : '';
    return `<div class="tt-tree"${bg}>
      <div class="tt-head"><img src="${base}icons/${tree.icon}.jpg" alt=""><b>${tree.name}</b><span>${total}</span></div>
      <div class="tt-grid" style="grid-template-rows: repeat(${rows}, var(--tal))">${cells}</div>
    </div>`;
  }).join('');
  return `<div class="talent-graphic">${trees}</div>`;
}
