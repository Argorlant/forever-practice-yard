// The first screen: pick a class (WoW's class icons), then one of its builds,
// grouped by spec, with the build's talent trees drawn. Playing opens the yard
// at ?class=<spec>&build=<build>.
import type { Spec, SpecBuild } from '../engine/types';
import { SPECS } from '../specs';
import { DISCLAIMER_HTML, INSPIRATION_HTML, SUPPORT_HTML } from './disclaimer';
import { iconHtml } from './icon';
import { load } from './storage';
import { talentTreesHtml } from './talent-tree';
import { classKey, mainTree } from './talents-data';

/** WoW's class order and colours. */
const CLASSES: { name: string; color: string }[] = [
  { name: 'Warrior', color: '#c79c6e' }, { name: 'Paladin', color: '#f58cba' }, { name: 'Hunter', color: '#abd473' },
  { name: 'Rogue', color: '#fff569' }, { name: 'Priest', color: '#ffffff' }, { name: 'Shaman', color: '#2a8cff' },
  { name: 'Mage', color: '#69ccf0' }, { name: 'Warlock', color: '#9482c9' }, { name: 'Druid', color: '#ff7d0a' },
];

const h = (tag: string, cls = '', html = '') => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (html) el.innerHTML = html;
  return el;
};
const wowIcon = (name: string) => `<img class="wow-icon" src="${import.meta.env.BASE_URL}icons/${name}.jpg" alt="" draggable="false">`;
const split = (s: string) => s.split('-').map((t) => [...t].reduce((a, d) => a + Number(d), 0));

interface Group { title: string; icon: string | null; entries: { spec: Spec; build: SpecBuild }[] }

/** A class's builds by spec; a class with one spec (rogue, warrior) is split by the tree each build puts most points in. */
function groupsOf(className: string): Group[] {
  const specs = SPECS.filter((s) => s.className === className);
  const cls = classKey(className);
  const groups = new Map<string, Group>();
  for (const spec of specs) {
    for (const build of spec.builds ?? []) {
      const tree = build.talentString ? mainTree(cls, build.talentString) : null;
      const title = specs.length > 1 ? spec.specName : tree?.name ?? spec.specName;
      let g = groups.get(title);
      if (!g) groups.set(title, (g = { title, icon: tree?.icon ?? null, entries: [] }));
      g.entries.push({ spec, build });
    }
  }
  return [...groups.values()];
}

export function showPicker(app: HTMLElement): void {
  app.querySelector('.loading')?.remove();
  document.title = 'Forever Practice Yard · WoW Forever';
  const root = h('div', 'picker');
  app.append(root);
  const last = load<string>('fpy.class');
  const lastSpec = SPECS.find((s) => s.id === last);

  const showClasses = () => {
    root.innerHTML = '';
    root.append(h('h1', 'picker-title', 'Forever Practice Yard'),
      h('p', 'picker-sub', 'Practise your WoW Forever rotation against a training dummy. Choose your class.'),
      h('div', 'disclaimer-box', DISCLAIMER_HTML));
    const grid = h('div', 'class-grid');
    for (const c of CLASSES) {
      const count = SPECS.filter((s) => s.className === c.name).reduce((n, s) => n + (s.builds?.length ?? 0), 0);
      if (!count) continue;
      const btn = h('button', 'class-card', `${iconHtml(`class_${classKey(c.name)}`)}<b style="color:${c.color}">${c.name}</b><small>${count} builds</small>`);
      btn.addEventListener('click', () => showBuilds(c.name, c.color));
      grid.append(btn);
    }
    root.append(grid);
    if (lastSpec) {
      const spec = ['WoW Forever', lastSpec.className].includes(lastSpec.specName) ? '' : ` · ${lastSpec.specName}`;
      const again = h('a', 'hud-btn picker-last', `Continue: ${lastSpec.className}${spec}`) as HTMLAnchorElement;
      again.href = `?class=${lastSpec.id}`;
      root.append(again);
    }
    root.append(h('p', 'picker-note', INSPIRATION_HTML));
    root.append(h('p', 'picker-note', `${SUPPORT_HTML}<br>Not affiliated with or endorsed by Blizzard Entertainment.`));
  };

  const showBuilds = (className: string, color: string) => {
    root.innerHTML = '';
    const back = h('button', 'hud-btn picker-back', '‹ Classes');
    back.addEventListener('click', showClasses);
    root.append(back, h('h1', 'picker-title', `${iconHtml(`class_${classKey(className)}`)}<span style="color:${color}">${className}</span>`),
      h('p', 'picker-sub', 'Choose a build. Each one brings its talents, gear, action bar and the sims\' priority list for the glow.'));
    for (const g of groupsOf(className)) {
      const sec = h('section', 'build-group');
      sec.append(h('h2', '', `${g.icon ? wowIcon(g.icon) : ''}${g.title}`));
      for (const { spec, build } of g.entries) {
        const card = h('div', 'build-card');
        const pts = build.talentString ? split(build.talentString).join('/') : '';
        const info = h('div', 'build-info', `<b>${build.name ?? build.label}</b><span>${pts}</span><small>${build.source ?? ''}</small>`);
        const talents = h('button', 'hud-btn small', 'Talents');
        const play = h('a', 'hud-btn small play', 'Play') as HTMLAnchorElement;
        play.href = `?class=${spec.id}&build=${encodeURIComponent(build.id)}`;
        const actions = h('div', 'build-actions');
        actions.append(talents, play);
        const trees = h('div', 'build-trees hidden');
        talents.addEventListener('click', () => {
          if (!trees.innerHTML && build.talentString) trees.innerHTML = talentTreesHtml(classKey(className), build.talentString);
          trees.classList.toggle('hidden');
          talents.classList.toggle('active', !trees.classList.contains('hidden'));
        });
        card.append(info, actions, trees);
        sec.append(card);
      }
      root.append(sec);
    }
    window.scrollTo(0, 0);
  };

  showClasses();
}
