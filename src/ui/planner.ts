// The talent planner (?planner=<class>): any class's three trees with WoW's
// rules, the level each point comes at and the order you spent them in,
// what WoW Forever changed in each talent (talent-notes.json, from the
// research sheets), the sims' builds to start from or compare with, and a
// link that plays the build in the practice yard.
import type { Spec, SpecBuild } from '../engine/types';
import { SPECS } from '../specs';
import { CLASSES } from './picker';
import { iconHtml } from './icon';
import { load, save } from './storage';
import NOTES from './talent-notes.json';
import {
  MAX_POINTS, TREE_VERSION, type Order, type Points, canAdd, canRemove, decodeOrder, defaultOrder, encode, encodeOrder,
  levelFor, pointsOf, repairOrder, totalPoints,
} from './talent-rules';
import { talentTreesHtml } from './talent-tree';
import { classKey, decode, describe, treesOf } from './talents-data';

interface Note { new?: boolean; change?: string; was?: string }
const notes = NOTES as Record<string, { talents: Record<string, Note>; removed: string[] }>;

interface Preset { spec: Spec; build: SpecBuild }
interface Saved { o: string; tree: string }

const h = (tag: string, cls = '', html = '') => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (html) el.innerHTML = html;
  return el;
};
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const wowIcon = (name: string | null) => (name ? `<img class="wow-icon" src="${import.meta.env.BASE_URL}icons/${name}.jpg" alt="" draggable="false">` : '');
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

const presetsOf = (cls: string): Preset[] =>
  SPECS.filter((s) => classKey(s.className) === cls).flatMap((spec) => (spec.builds ?? []).filter((b) => b.talentString).map((build) => ({ spec, build })));
const presetId = (p: Preset) => `${p.spec.id}/${p.build.id}`;
/** Talent points two builds spend differently. */
const distance = (a: Points, b: Points) => a.reduce((n, tree, i) => n + tree.reduce((m, r, j) => m + Math.abs(r - b[i][j]), 0), 0);

export function showPlanner(app: HTMLElement): void {
  app.querySelector('.loading')?.remove();
  document.title = 'Talent planner · Forever Practice Yard';
  const params = new URLSearchParams(location.search);
  const root = h('div', 'picker planner');
  const tip = h('div', 'tal-tip');
  app.append(root, tip);

  let cls = '';
  let order: Order = [];
  let points: Points = [];
  /** The sims' build the points started from, and whether the order was made up for it. */
  let from: Preset | null = null;
  let guessed = false;
  let compare: Preset | null = null;
  let removing = false;

  const keep = () => {
    save(`fpy.planner.${cls}`, { o: encodeOrder(cls, order), tree: TREE_VERSION } satisfies Saved);
    save('fpy.planner', cls);
    const url = new URLSearchParams({ planner: cls });
    if (order.length) url.set('o', encodeOrder(cls, order));
    history.replaceState(null, '', `${location.pathname}?${url}`);
  };
  const setOrder = (next: Order) => {
    order = repairOrder(cls, next);
    points = pointsOf(cls, order);
  };
  const loadPreset = (p: Preset) => {
    from = p;
    guessed = true;
    setOrder(defaultOrder(cls, decode(cls, p.build.talentString!)));
  };

  // ---------------------------------------------------------------- layout
  const classRow = h('div', 'planner-classes');
  const title = h('h1', 'picker-title');
  const bar = h('div', 'talent-edit-bar planner-bar');
  const label = h('span', 'points');
  const startSel = h('select', 'planner-select') as HTMLSelectElement;
  const compareSel = h('select', 'planner-select') as HTMLSelectElement;
  const undoBtn = h('button', 'hud-btn small', 'Undo');
  undoBtn.title = 'Take back the last point you spent';
  const removeBtn = h('button', 'hud-btn small', 'Remove');
  removeBtn.title = 'On a touch screen: tap a talent to take a point back';
  const clearBtn = h('button', 'hud-btn small', 'Clear');
  const linkBtn = h('button', 'hud-btn small', 'Copy link');
  linkBtn.title = 'A link to these talents and the order you took them in';
  const play = h('a', 'hud-btn small play') as HTMLAnchorElement;
  bar.append(label, startSel, compareSel, undoBtn, removeBtn, clearBtn, linkBtn, play);
  const graphic = h('div', 'build-trees planner-trees');
  const cols = h('div', 'planner-cols');
  const orderBox = h('section', 'planner-box');
  const foreverBox = h('section', 'planner-box');
  cols.append(orderBox, foreverBox);
  const back = h('a', 'hud-btn picker-back', '‹ Practice yard') as HTMLAnchorElement;
  back.href = './';
  root.append(back, title,
    h('p', 'picker-sub', `WoW Forever's talent trees (client build ${TREE_VERSION}). Click a talent to spend a point, right-click to take one back. The planner keeps the order you spend them in: one point a level from level 10, 51 at level 60.`),
    classRow, bar, graphic, cols);

  for (const c of CLASSES) {
    const key = classKey(c.name);
    if (!treesOf(key).length) continue;
    const btn = h('button', 'planner-class', `${iconHtml(`class_${key}`)}<span style="color:${c.color}">${c.name}</span>`);
    btn.dataset.cls = key;
    btn.addEventListener('click', () => { if (key !== cls) openClass(key); });
    classRow.append(btn);
  }

  // ---------------------------------------------------------------- drawing
  const levelsOf = (i: number, j: number) => order.flatMap(([a, b], k) => (a === i && b === j ? [levelFor(k + 1)] : []));

  const marks = (i: number, j: number) => {
    const t = treesOf(cls)[i].talents[j];
    let html = notes[cls]?.talents[t.key]?.new ? '<span class="tal-new" aria-label="New in WoW Forever">★</span>' : '';
    if (compare) {
      const other = decode(cls, compare.build.talentString!)[i][j];
      if (other !== points[i][j]) html += `<span class="tal-cmp ${other > points[i][j] ? 'more' : 'less'}">${other}</span>`;
    }
    return html;
  };
  const head = (i: number) => (sum(points[i]) ? `<button class="tt-reset" data-reset="${i}" title="Take back every point in this tree">×</button>` : '');

  const draw = () => {
    const trees = treesOf(cls);
    const total = totalPoints(points);
    const split = points.map(sum);
    const s = encode(points);
    const fromBuild = from && s === encode(decode(cls, from.build.talentString!));
    label.innerHTML = `<b>${split.join('/')}</b> · ${total}/${MAX_POINTS} points · level ${levelFor(total)}`
      + (from ? ` · ${fromBuild ? 'from' : 'changed from'} <i>${esc(from.build.name ?? from.build.label)}</i>` : '');
    for (const p of classRow.querySelectorAll<HTMLElement>('.planner-class')) p.classList.toggle('active', p.dataset.cls === cls);
    undoBtn.toggleAttribute('disabled', !order.length);
    clearBtn.toggleAttribute('disabled', !order.length);
    removeBtn.classList.toggle('active', removing);
    graphic.innerHTML = talentTreesHtml(cls, s, true, { titles: false, marks, head });

    // The yard plays the sims' build nearest to these talents (its gear and action bar), with these talents:
    // one with the same main tree first, then the fewest points spent differently.
    const mine = from ? presetId(from) : '';
    const main = split.indexOf(Math.max(...split));
    const near = presetsOf(cls).map((p) => {
      const other = decode(cls, p.build.talentString!);
      const theirs = other.map(sum);
      return { p, d: distance(points, other) - (theirs.indexOf(Math.max(...theirs)) === main ? 1000 : 0) };
    }).sort((a, b) => a.d - b.d || Number(presetId(b.p) === mine) - Number(presetId(a.p) === mine))[0]?.p;
    play.hidden = !near || !total;
    if (near && total) {
      play.textContent = `Practise as ${near.build.name ?? near.build.label}`;
      play.title = `Opens the practice yard with ${near.build.name ?? near.build.label}'s gear and action bar and these talents`;
      play.href = `?class=${near.spec.id}&build=${encodeURIComponent(near.build.id)}&talents=${s}`;
    }

    // The leveling order, a line for each run of points in one talent.
    orderBox.innerHTML = '<h2>Leveling order</h2>';
    if (!order.length) orderBox.append(h('p', 'planner-note', 'Spend a point and it shows here at the level it comes.'));
    else {
      if (guessed) orderBox.append(h('p', 'planner-note', 'This build came without an order: shown is its main tree from the top, then the others. Take points back and spend them again to change it.'));
      const list = h('ol', 'planner-order');
      for (let k = 0; k < order.length;) {
        const [i, j] = order[k];
        let n = 1;
        while (k + n < order.length && order[k + n][0] === i && order[k + n][1] === j) n++;
        const t = trees[i].talents[j];
        const rank = order.slice(0, k + n).filter(([a, b]) => a === i && b === j).length;
        const lv = n > 1 ? `${levelFor(k + 1)}–${levelFor(k + n)}` : `${levelFor(k + 1)}`;
        list.append(h('li', '', `<span class="lv">${lv}</span>${wowIcon(t.icon)}<span>${esc(t.name)}</span><small>${rank}/${t.max}</small>`));
        k += n;
      }
      orderBox.append(list);
    }

    // What WoW Forever changed: the new talents this build takes, and the Classic ones it no longer has.
    const n = notes[cls] ?? { talents: {}, removed: [] };
    const fresh = trees.flatMap((tree, i) => tree.talents.flatMap((t, j) => (n.talents[t.key]?.new ? [{ t, r: points[i][j] }] : [])));
    foreverBox.innerHTML = `<h2>New in WoW Forever <span>★</span></h2>`;
    const taken = fresh.filter((x) => x.r);
    foreverBox.append(h('p', 'planner-note', taken.length
      ? `This build takes ${taken.length} of the ${fresh.length} talents new in WoW Forever:`
      : `${fresh.length} talents are new in WoW Forever; this build takes none yet.`));
    const chips = h('div', 'planner-chips');
    for (const x of fresh) chips.append(h('span', `chip${x.r ? ' on' : ''}`, `${wowIcon(x.t.icon)}${esc(x.t.name)}`));
    foreverBox.append(chips);
    if (n.removed.length) {
      const gone = h('details', 'planner-gone', `<summary>Classic talents not in these trees (${n.removed.length})</summary>`);
      gone.append(h('ul', '', n.removed.map((r) => `<li>${esc(r)}</li>`).join('')));
      foreverBox.append(gone);
    }
    foreverBox.append(h('p', 'planner-note small', 'From the yard\'s research sheets on the sims and Wowhead\'s Forever tooltips; hover a talent for what changed.'));

    keep();
  };

  // ---------------------------------------------------------------- the tooltip
  const tipHtml = (i: number, j: number) => {
    const trees = treesOf(cls);
    const t = trees[i].talents[j];
    const r = points[i][j];
    const note = notes[cls]?.talents[t.key];
    const lines = [`<div class="tip-head"><b>${esc(t.name)}</b><span>Rank ${r}/${t.max}</span></div>`];
    if (note?.new) lines.push('<div class="tip-new">★ New in WoW Forever</div>');
    if (note?.was) lines.push(`<div class="tip-muted">Was ${esc(note.was)} in Classic</div>`);
    const above = trees[i].talents.reduce((a, x, k) => a + (x.row < t.row ? points[i][k] : 0), 0);
    if (r < t.max && above < 5 * t.row) lines.push(`<div class="tip-req">Requires ${5 * t.row} points in ${esc(trees[i].name)}</div>`);
    if (t.req) {
      const k = trees[i].talents.findIndex((x) => x.row === t.req![0] && x.col === t.req![1]);
      if (k >= 0 && points[i][k] < trees[i].talents[k].max) lines.push(`<div class="tip-req">Requires ${trees[i].talents[k].max} points in ${esc(trees[i].talents[k].name)}</div>`);
    }
    lines.push(`<div class="tip-desc">${esc(describe(t, r || 1))}</div>`);
    if (r > 0 && r < t.max) lines.push(`<div class="tip-next">Next rank:</div><div class="tip-desc">${esc(describe(t, r + 1))}</div>`);
    if (note?.change) lines.push(`<div class="tip-change"><b>WoW Forever:</b> ${esc(note.change)}</div>`);
    const lv = levelsOf(i, j);
    if (lv.length) lines.push(`<div class="tip-muted">Taken at level${lv.length > 1 ? 's' : ''} ${lv.join(', ')}</div>`);
    if (compare) lines.push(`<div class="tip-muted">${esc(compare.build.name ?? compare.build.label)}: ${decode(cls, compare.build.talentString!)[i][j]}/${t.max}</div>`);
    if (canAdd(cls, points, i, j)) lines.push('<div class="tip-hint">Click to spend a point</div>');
    else if (canRemove(cls, points, i, j)) lines.push('<div class="tip-hint">Right-click to take a point back</div>');
    return lines.join('');
  };
  const place = (e: PointerEvent) => {
    const pad = 14;
    const w = tip.offsetWidth, ht = tip.offsetHeight;
    let x = e.clientX + pad, y = e.clientY + pad;
    if (x + w > innerWidth - 8) x = Math.max(8, e.clientX - pad - w);
    if (y + ht > innerHeight - 8) y = Math.max(8, e.clientY - pad - ht);
    tip.style.left = `${x}px`;
    tip.style.top = `${y}px`;
  };
  let hovered: HTMLElement | null = null;
  const showTip = (cell: HTMLElement, e: PointerEvent) => {
    hovered = cell;
    tip.innerHTML = tipHtml(Number(cell.dataset.t), Number(cell.dataset.j));
    tip.classList.add('show');
    place(e);
  };
  graphic.addEventListener('pointermove', (e) => {
    const cell = (e.target as HTMLElement).closest<HTMLElement>('.tal[data-t]');
    if (!cell) { tip.classList.remove('show'); hovered = null; return; }
    if (cell !== hovered) showTip(cell, e);
    else place(e);
  });
  graphic.addEventListener('pointerleave', () => { tip.classList.remove('show'); hovered = null; });

  // ---------------------------------------------------------------- spending points
  const change = (e: MouseEvent, take: boolean) => {
    const reset = (e.target as HTMLElement).closest<HTMLElement>('[data-reset]');
    if (reset) {
      e.preventDefault();
      const i = Number(reset.dataset.reset);
      setOrder(order.filter(([a]) => a !== i));
      draw();
      return;
    }
    const cell = (e.target as HTMLElement).closest<HTMLElement>('.tal[data-t]');
    if (!cell) return;
    e.preventDefault();
    const i = Number(cell.dataset.t), j = Number(cell.dataset.j);
    if (take) {
      if (!canRemove(cls, points, i, j)) return;
      // The talent's last point goes; points after it that it held up wait until they fit again.
      let k = -1;
      order.forEach(([a, b], n) => { if (a === i && b === j) k = n; });
      setOrder(order.filter((_, n) => n !== k));
    } else {
      if (!canAdd(cls, points, i, j)) return;
      setOrder([...order, [i, j]]);
    }
    draw();
    // The tooltip follows the new rank.
    const again = graphic.querySelector<HTMLElement>(`.tal[data-t="${i}"][data-j="${j}"]`);
    if (again && tip.classList.contains('show')) { hovered = again; tip.innerHTML = tipHtml(i, j); }
  };
  graphic.addEventListener('click', (e) => change(e, removing));
  graphic.addEventListener('contextmenu', (e) => change(e, true));
  undoBtn.addEventListener('click', () => { setOrder(order.slice(0, -1)); draw(); });
  removeBtn.addEventListener('click', () => { removing = !removing; draw(); });
  clearBtn.addEventListener('click', () => { from = null; guessed = false; setOrder([]); draw(); });
  linkBtn.addEventListener('click', () => {
    const url = location.href;
    const done = () => { linkBtn.textContent = 'Copied!'; setTimeout(() => { linkBtn.textContent = 'Copy link'; }, 1500); };
    navigator.clipboard?.writeText(url).then(done, () => window.prompt('Copy this link:', url)) ?? window.prompt('Copy this link:', url);
  });

  // The sims' builds: start from one, or compare against one.
  const fillSelects = () => {
    const groups = new Map<string, Preset[]>();
    for (const p of presetsOf(cls)) {
      const name = p.spec.specName === p.spec.className || p.spec.specName === 'WoW Forever' ? p.spec.className : p.spec.specName;
      groups.set(name, [...(groups.get(name) ?? []), p]);
    }
    const options = [...groups].map(([g, ps]) => `<optgroup label="${esc(g)}">${ps.map((p) => `<option value="${presetId(p)}">${esc(p.build.name ?? p.build.label)} · ${decode(cls, p.build.talentString!).map(sum).join('/')}</option>`).join('')}</optgroup>`).join('');
    startSel.innerHTML = `<option value="">Start from a build…</option>${options}`;
    compareSel.innerHTML = `<option value="">Compare with…</option>${options}`;
    compareSel.value = compare ? presetId(compare) : '';
  };
  const byId = (id: string) => presetsOf(cls).find((p) => presetId(p) === id) ?? null;
  startSel.addEventListener('change', () => {
    const p = byId(startSel.value);
    startSel.value = '';
    if (!p) return;
    loadPreset(p);
    draw();
  });
  compareSel.addEventListener('change', () => { compare = byId(compareSel.value); draw(); });

  // ---------------------------------------------------------------- a class
  const openClass = (key: string, link?: URLSearchParams) => {
    cls = key;
    from = null;
    guessed = false;
    compare = null;
    const c = CLASSES.find((x) => classKey(x.name) === key)!;
    title.innerHTML = `${iconHtml(`class_${key}`)}<span style="color:${c.color}">${c.name} talents</span>`;
    fillSelects();
    const linked = link ? decodeOrder(cls, link.get('o')) : null;
    const preset = link?.has('build') ? byId(`${link.get('spec')}/${link.get('build')}`) : null;
    const saved = load<Saved>(`fpy.planner.${cls}`);
    if (linked) setOrder(linked);
    else if (preset) loadPreset(preset);
    else setOrder(saved?.tree === TREE_VERSION ? decodeOrder(cls, saved.o) ?? [] : []);
    draw();
  };

  const asked = params.get('planner') ?? '';
  const start = treesOf(asked).length ? asked : load<string>('fpy.planner') ?? 'warrior';
  openClass(treesOf(start).length ? start : 'warrior', params);
}
