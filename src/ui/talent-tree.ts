// A build's talents drawn like WoW's talent frame: the three trees side by
// side over their backgrounds, every talent at its row and column, lit with
// its rank where the build put points, dark where it did not. In edit mode
// (Settings → Edit talents) the talents you can take are lit green, as in the game.
import { canAdd } from './talent-rules';
import { decode, describe, treesOf } from './talents-data';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

export function talentTreesHtml(cls: string, talentString: string, editing = false): string {
  const base = import.meta.env.BASE_URL;
  const points = decode(cls, talentString);
  const trees = treesOf(cls).map((tree, i) => {
    const total = points[i].reduce((a, b) => a + b, 0);
    const rows = Math.max(7, ...tree.talents.map((t) => t.row + 1));
    const cells = tree.talents.map((t, j) => {
      const r = points[i][j];
      let state = r === 0 ? 'off' : r >= t.max ? 'max' : 'part';
      let tip = `${t.name} (${r}/${t.max})\n${describe(t, r || 1)}`;
      if (editing) {
        state += canAdd(cls, points, i, j) ? ' avail' : r === 0 ? ' locked' : '';
        if (r > 0 && r < t.max) tip += `\n\nNext rank:\n${describe(t, r + 1)}`;
      }
      const icon = t.icon ? `<img src="${base}icons/${t.icon}.jpg" alt="" draggable="false" loading="lazy">` : '';
      const at = editing ? ` data-t="${i}" data-j="${j}"` : '';
      return `<div class="tal ${state}"${at} style="grid-row:${t.row + 1};grid-column:${t.col + 1}" title="${esc(tip)}">${icon}<span class="tal-rank">${r}/${t.max}</span></div>`;
    }).join('');
    const bg = tree.bg ? ` style="background-image:url('${base}talent-bg/${tree.bg}.jpg')"` : '';
    return `<div class="tt-tree"${bg}>
      <div class="tt-head"><img src="${base}icons/${tree.icon}.jpg" alt=""><b>${tree.name}</b><span>${total}</span></div>
      <div class="tt-grid" style="grid-template-rows: repeat(${rows}, var(--tal))">${cells}</div>
    </div>`;
  }).join('');
  return `<div class="talent-graphic${editing ? ' editing' : ''}">${trees}</div>`;
}
