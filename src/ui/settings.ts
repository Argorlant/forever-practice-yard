// Settings dialog: how to play, character stats, enemy, options, keybinds
// and credits. Every change applies at once and is saved in the browser.
import type { Combat } from '../engine/combat';
import type { Binding, Spec, Stats, WeaponType } from '../engine/types';
import type { MoveBindings } from '../scene/controls';
import { UI } from '../strings';
import { ACTION_SLOTS, MAX_ROWS, ROW, expandBar } from './bars';
import { iconHtml } from './icon';
import { ICON_AUTHORS } from './icons.gen';
import { bindingFor, keyLabel } from './storage';
import { DISCLAIMER_HTML, INSPIRATION_HTML, SUPPORT_HTML } from './disclaimer';
import { raidPicker } from './raid-picker';
import { talentTreesHtml } from './talent-tree';
import { classKey } from './talents-data';

export interface Prefs {
  stats: Stats;
  enemy: { health: number; armor: number; locked: boolean; startPct: number };
  /** The dummy attacks you (tank practice). */
  tank: { attacks: boolean; speed: number; damage: number; lockHealth: boolean };
  /** Raid buffs and dummy debuffs switched on (ids from engine/raid.ts). */
  raid: string[];
  suggest: boolean;
  meter: boolean;
  options: Record<string, number | boolean | string>;
  move: MoveBindings;
  bar: Binding[];
  /** Action bar rows shown (2 to 4); keys on hidden rows do nothing. */
  barRows: number;
  targets: number;
  seenWelcome: boolean;
}

export function defaultPrefs(spec: Spec, move: MoveBindings): Prefs {
  return {
    stats: structuredClone(spec.stats),
    enemy: { health: 1_000_000, armor: 3731, locked: false, startPct: 100 },
    tank: { attacks: !!spec.tank, speed: 2, damage: spec.tankDamage ?? 2500, lockHealth: !spec.showHealth },
    raid: [...(spec.defaultRaid ?? [])],
    suggest: true,
    meter: true,
    options: { ...(spec.defaultOptions ?? {}) },
    move: { ...move },
    bar: expandBar(spec.bar),
    barRows: 3,
    targets: 1,
    seenWelcome: false,
  };
}

const h = (tag: string, cls = '', html = '') => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (html) el.innerHTML = html;
  return el;
};

/** What changed; 'view' only changes what is drawn (the helper, the panel), so the fight goes on. */
export type Change = 'stats' | 'enemy' | 'options' | 'keys' | 'bar' | 'defaults' | 'build' | 'view';

/** Other classes the player can switch to. */
export interface ClassPicker { list: { id: string; name: string; group?: string }[]; current: string; pick(id: string): void }

/** A key does one thing, as in WoW: binding it somewhere unbinds it from every other action and button. */
export function claimKey(p: Prefs, code: string): void {
  for (const k of Object.keys(p.move) as (keyof MoveBindings)[]) if (p.move[k] === code) p.move[k] = '';
  for (const slot of p.bar) if (slot.key === code) slot.key = '';
}

const MOVE_LABELS: [keyof MoveBindings, string][] = [
  ['forward', UI.forward], ['back', UI.back], ['turnLeft', UI.turnLeft],
  ['turnRight', UI.turnRight], ['strafeLeft', UI.strafeLeft], ['strafeRight', UI.strafeRight],
];

export class SettingsDialog {
  private overlay: HTMLElement;
  private body: HTMLElement;
  private chancesBox: HTMLElement | null = null;
  private onChange: (what: Change) => void;
  /** Set while waiting for a key press to rebind. */
  capturing: ((code: string | null, e: KeyboardEvent) => void) | null = null;
  classes: ClassPicker | null = null;

  constructor(
    parent: HTMLElement,
    private spec: Spec,
    private prefs: Prefs,
    private combat: Combat,
    notify: (what: Change) => void,
  ) {
    // Every change also refreshes the live chances table.
    this.onChange = (what) => { notify(what); this.refreshChances(); };
    this.overlay = h('div', 'modal-overlay hidden');
    const box = h('div', 'modal settings');
    const head = h('div', 'modal-head', `<h2>${UI.settings}</h2>`);
    const close = h('button', 'modal-close', '×');
    close.setAttribute('aria-label', UI.close);
    close.addEventListener('click', () => this.close());
    head.append(close);
    this.body = h('div', 'modal-body');
    box.append(head, this.body);
    this.overlay.append(box);
    this.overlay.addEventListener('pointerdown', (e) => { if (e.target === this.overlay) this.close(); });
    parent.append(this.overlay);
  }

  get open(): boolean { return !this.overlay.classList.contains('hidden'); }

  show(): void {
    this.render();
    this.overlay.classList.remove('hidden');
  }

  close(): void {
    this.capturing = null;
    this.overlay.classList.add('hidden');
  }

  setPrefs(p: Prefs): void { this.prefs = p; if (this.open) this.render(); }

  private render(): void {
    const p = this.prefs;
    const b = this.body;
    b.innerHTML = '';

    if (this.classes && this.classes.list.length > 1) {
      const sec = this.section('Class');
      const sel = document.createElement('select');
      sel.className = 'build-select';
      // One group per class: Druid → Feral Cat, Feral Bear, Balance.
      const groups = new Map<string, HTMLOptGroupElement>();
      for (const c of this.classes.list) {
        const opt = new Option(c.name, c.id, false, c.id === this.classes.current);
        if (!c.group) { sel.append(opt); continue; }
        let g = groups.get(c.group);
        if (!g) { g = document.createElement('optgroup'); g.label = c.group; groups.set(c.group, g); sel.append(g); }
        g.append(opt);
      }
      sel.addEventListener('change', () => this.classes!.pick(sel.value));
      // Back to the first screen: every class with its builds and talent trees.
      const all = h('a', 'hud-btn small picker-link', 'All classes and builds…') as HTMLAnchorElement;
      all.href = location.pathname;
      sec.append(sel, all);
    }

    b.append(h('p', 'help', this.spec.help));

    // Talent build: talents, weapons and action bar come with it.
    if (this.spec.builds?.length) {
      const sec = this.section('Talent build');
      const sel = document.createElement('select');
      sel.className = 'build-select';
      for (const build of this.spec.builds) sel.append(new Option(build.label, build.id, false, build.id === p.options.build));
      sel.addEventListener('change', () => {
        p.options.build = sel.value;
        this.onChange('build');
        this.render();
      });
      sec.append(sel);
      const current = this.spec.builds.find((x) => x.id === p.options.build) ?? this.spec.builds[0];
      // The talent frame, drawn; the same talents as a list (with what is new in Forever) underneath.
      if (current.talentString) sec.append(h('div', 'build-trees', talentTreesHtml(classKey(this.spec.className), current.talentString)));
      const list = h('details', 'talent-list', '<summary>Talents as a list (★ new in WoW Forever)</summary>');
      const trees = h('div', 'talent-trees');
      for (const t of current.trees) {
        trees.append(h('div', 'talent-tree', `<b>${t.tree} <span>${t.points}</span></b>${t.talents.map((x) => `<div>${x}</div>`).join('') || '<div class="none">-</div>'}`));
      }
      list.append(trees);
      sec.append(list, h('p', 'note', 'Picking a build loads its talents, its weapons and its action bar; your keys stay. The yellow glow follows that build\'s priority list. Hover a talent for what it does.'));
    }

    // Character.
    const ch = this.section(UI.character);
    if (this.spec.presets?.length) {
      const row = h('div', 'presets');
      for (const preset of this.spec.presets) {
        const b = h('button', 'hud-btn small', preset.name);
        b.addEventListener('click', () => {
          p.stats = structuredClone(preset.stats);
          this.onChange('stats');
          this.render();
        });
        row.append(b);
      }
      ch.append(h('p', 'note', "What your gear (and Agility) gives; the build's talents, such as Malice and Precision, are added on top. Load a preset:"), row);
    }
    const sheet = this.spec.sheet ?? {};
    const label = (key: keyof NonNullable<Spec['sheet']>, fallback: string): string | null => {
      const v = sheet[key];
      return v === false ? null : v ?? fallback;
    };
    const field = (key: 'attackPower' | 'crit' | 'hit' | 'spellCrit', fallback: string, suffix = '', step = 1) => {
      const l = label(key, fallback);
      if (l) this.number(ch, l, () => p.stats[key], (v) => { p.stats[key] = v; }, 'stats', suffix, step);
    };
    field('attackPower', 'Attack power');
    field('crit', 'Melee crit (gear + Agility)', '%', 0.1);
    field('hit', 'Hit (gear)', '%', 0.1);
    field('spellCrit', 'Spell crit for poisons (gear)', '%', 0.1);
    const sp = label('spellPower', 'Spell power');
    if (sp && p.stats.spellPower !== undefined) this.number(ch, sp, () => p.stats.spellPower ?? 0, (v) => { p.stats.spellPower = Math.max(0, v); }, 'stats');
    const mh = label('mainHand', 'Main hand');
    if (mh) this.weapon(ch, mh, 'mainHand');
    const oh = label('offHand', 'Off hand');
    if (oh) this.weapon(ch, oh, 'offHand');
    // Hunters: the bow, gun or crossbow (what it looks like in your hands, and its damage and speed).
    if (p.stats.ranged) this.weapon(ch, 'Ranged weapon', 'ranged');

    // How often things happen, from the engine with the current gear.
    if (this.spec.chances) {
      const sec = this.section('How often things happen');
      sec.append(h('p', 'note', 'Against the level 63 dummy, standing behind it, with the stats above. These chances are what the rotation feels like at level 60.'));
      this.chancesBox = h('div');
      sec.append(this.chancesBox);
      this.refreshChances();
    }

    // Enemy.
    const en = this.section(UI.enemy);
    this.number(en, UI.enemyHealth, () => p.enemy.health, (v) => { p.enemy.health = Math.max(1, v); }, 'enemy');
    this.number(en, UI.enemyArmor, () => p.enemy.armor, (v) => { p.enemy.armor = Math.max(0, v); }, 'enemy');
    this.number(en, 'Health at the start', () => p.enemy.startPct, (v) => { p.enemy.startPct = Math.min(100, Math.max(1, v)); }, 'enemy', '%');
    this.toggle(en, UI.lockHealth, () => p.enemy.locked, (v) => { p.enemy.locked = v; }, 'enemy');
    en.append(h('p', 'note', 'To practice Execute, start at 15% and lock the health.'));

    // Raid buffs and dummy debuffs: what the rest of the raid would bring.
    const rd = this.section('Raid buffs and debuffs on the dummy');
    rd.append(h('p', 'note', 'What other players would bring. Some change how the rotation plays: Windfury gives extra swings (and rage), Judgement of Wisdom gives mana back, armor debuffs change the damage.'));
    rd.append(raidPicker(p.raid, (ids) => { p.raid = ids; this.onChange('options'); }));

    // Tank practice: the dummy swings at you.
    const tk = this.section('The dummy attacks you');
    this.toggle(tk, 'The dummy attacks you', () => p.tank.attacks, (v) => { p.tank.attacks = v; }, 'enemy');
    this.number(tk, 'Its swing time', () => p.tank.speed, (v) => { p.tank.speed = Math.max(0.5, v); }, 'enemy', 's', 0.1);
    this.number(tk, 'Its damage per hit (before your armor)', () => p.tank.damage, (v) => { p.tank.damage = Math.max(0, v); }, 'enemy');
    this.toggle(tk, 'Lock your health (damage still counts for rage)', () => p.tank.lockHealth, (v) => { p.tank.lockHealth = v; }, 'enemy');
    if (p.stats.tank) {
      const t = p.stats.tank;
      this.number(tk, 'Your health', () => t.health, (v) => { t.health = Math.max(1, v); }, 'stats');
      this.number(tk, 'Your armor', () => t.armor, (v) => { t.armor = Math.max(0, v); }, 'stats');
      this.number(tk, 'Your defense skill', () => t.defense, (v) => { t.defense = Math.max(300, v); }, 'stats');
      this.number(tk, 'Dodge', () => t.dodge, (v) => { t.dodge = Math.max(0, v); }, 'stats', '%', 0.1);
      this.number(tk, 'Parry', () => t.parry, (v) => { t.parry = Math.max(0, v); }, 'stats', '%', 0.1);
      this.number(tk, 'Block', () => t.block, (v) => { t.block = Math.max(0, v); }, 'stats', '%', 0.1);
      this.number(tk, 'Block value', () => t.blockValue, (v) => { t.blockValue = Math.max(0, v); }, 'stats');
    }
    tk.append(h('p', 'note', 'It turns to face you and rolls miss, dodge, parry, block, crit and crushing blows against your sheet, like a level 63 boss.'));

    // Options.
    const op = this.section(UI.options);
    this.toggle(op, UI.suggestions, () => p.suggest, (v) => { p.suggest = v; }, 'view');
    this.toggle(op, UI.showMeter, () => p.meter, (v) => { p.meter = v; }, 'view');
    for (const f of this.spec.options ?? []) {
      if (f.kind === 'toggle') {
        this.toggle(op, f.name, () => !!p.options[f.key], (v) => { p.options[f.key] = v; }, 'options');
      } else if (f.kind === 'choice') {
        this.choice(op, f.name, f.choices ?? [], () => String(p.options[f.key] ?? ''), (v) => { p.options[f.key] = v; });
      } else {
        this.number(op, f.name, () => Number(p.options[f.key] ?? 0), (v) => { p.options[f.key] = v; }, 'options', f.suffix, f.step);
      }
    }

    // Keybinds.
    const kb = this.section(UI.keybinds);
    kb.append(h('p', 'note', 'Click a key, then press the new one. Shift, Ctrl and Alt combine with ability keys. A key does one thing: binding it here unbinds it elsewhere. × or Backspace unbinds a key. Esc cancels. On the screen you can also use the Keys button (hover a button, press a key) and the Spellbook (drag abilities onto the bar; drag a button off the bar to clear it).'));
    this.choice(kb, 'Action bar rows', [2, 3, 4].map((n) => ({ value: String(n), label: `${n} rows of ${ROW}` })), () => String(p.barRows), (v) => { p.barRows = Number(v); }, 'bar');
    const mv = h('div', 'keys-grid');
    for (const [k, label] of MOVE_LABELS) {
      this.keyRow(mv, label, () => p.move[k], (code) => {
        // Movement reads plain keys: Shift+Q moves like Q.
        const key = code?.split('+').pop() ?? '';
        if (key) claimKey(p, key);
        p.move[k] = key;
        return true;
      });
    }
    kb.append(h('h4', '', UI.movement), mv);
    const rows = Array.from({ length: MAX_ROWS }, () => h('div', 'keys-grid bar-grid'));
    const sb = h('div', 'keys-grid bar-grid');
    p.bar.forEach((slot, i) => {
      const row = h('div', 'key-row slot-row');
      const icon = h('div', 'mini-icon', slot.id ? iconHtml(this.spec.abilities.find((a) => a.id === slot.id)?.icon ?? 'melee') : '');
      const sel = document.createElement('select');
      sel.innerHTML = `<option value="">— Empty —</option>` + this.spec.abilities
        .map((a) => `<option value="${a.id}" ${a.id === slot.id ? 'selected' : ''}>${a.name}</option>`).join('');
      sel.addEventListener('change', () => {
        slot.id = sel.value || null;
        icon.innerHTML = slot.id ? iconHtml(this.spec.abilities.find((a) => a.id === slot.id)!.icon) : '';
        this.onChange('bar');
      });
      row.append(icon, sel);
      this.keyButton(row, () => slot.key, (code) => {
        if (code) claimKey(p, code);
        slot.key = code ?? '';
        return true;
      });
      (i >= ACTION_SLOTS ? sb : rows[Math.floor(i / ROW)]).append(row);
    });
    rows.forEach((r, n) => kb.append(h('h4', '', `Action bar, row ${n + 1}${n >= p.barRows ? ' (hidden)' : ''}`), r));
    if (p.bar.length > ACTION_SLOTS) kb.append(h('h4', '', 'Stance bar'), sb);

    const reset = h('button', 'hud-btn wide', UI.restoreDefaults);
    reset.addEventListener('click', () => this.onChange('defaults'));
    b.append(reset);

    // Credits.
    const ab2 = this.section('About this tool');
    ab2.append(h('p', 'note disclaimer', DISCLAIMER_HTML), h('p', 'note', SUPPORT_HTML));

    const cr = this.section(UI.credits);
    cr.append(h('p', 'note', INSPIRATION_HTML));
    cr.append(h('p', 'note', `
      Character model and animations: <a href="https://quaternius.com" target="_blank" rel="noopener">Quaternius</a>, Universal Animation Library 1 and 2 (CC0).
      Ability icons © Blizzard Entertainment, used in this fan tool so the buttons look as they do in the game.
      Dummy portrait: <a href="https://game-icons.net" target="_blank" rel="noopener">game-icons.net</a> by ${ICON_AUTHORS.join(', ')} (CC BY 3.0).
      Combat formulas follow <a href="https://github.com/wowsims/classic" target="_blank" rel="noopener">WoWSims</a> (MIT) and its WoW Forever forks:
      ${this.spec.sources.map((s) => `<a href="${s.url}" target="_blank" rel="noopener">${s.label}</a>`).join(', ')}.<br><br>
      Fan-made practice tool. Not affiliated with or endorsed by Blizzard Entertainment.
      World of Warcraft is a trademark of Blizzard Entertainment, Inc.`));
  }

  private refreshChances(): void {
    if (!this.chancesBox || !this.spec.chances) return;
    this.chancesBox.innerHTML = this.spec.chances(this.combat).map((g) => `
      <table class="chances"><caption>${g.title}</caption>
        ${g.rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}
      </table>`).join('');
  }

  private section(title: string): HTMLElement {
    const s = h('section', 'settings-section', `<h3>${title}</h3>`);
    this.body.append(s);
    return s;
  }

  private number(parent: HTMLElement, label: string, get: () => number, set: (v: number) => void,
    what: 'stats' | 'enemy' | 'options', suffix = '', step = 1): void {
    const row = h('label', 'field');
    row.append(h('span', '', label));
    const wrap = h('span', 'field-input');
    const input = document.createElement('input');
    input.type = 'number';
    input.step = String(step);
    input.value = String(get());
    input.addEventListener('change', () => {
      const v = Number(input.value);
      if (Number.isFinite(v)) { set(v); this.onChange(what); }
      input.value = String(get());
    });
    wrap.append(input, h('em', '', suffix));
    row.append(wrap);
    parent.append(row);
  }

  private toggle(parent: HTMLElement, label: string, get: () => boolean, set: (v: boolean) => void,
    what: 'stats' | 'enemy' | 'options' | 'view'): void {
    const row = h('label', 'field toggle');
    row.append(h('span', '', label));
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = get();
    input.addEventListener('change', () => { set(input.checked); this.onChange(what); });
    row.append(input);
    parent.append(row);
  }

  private choice(parent: HTMLElement, label: string, choices: { value: string; label: string }[], get: () => string, set: (v: string) => void,
    what: 'options' | 'bar' = 'options'): void {
    const row = h('label', 'field');
    row.append(h('span', '', label));
    const sel = document.createElement('select');
    for (const c of choices) sel.append(new Option(c.label, c.value, false, c.value === get()));
    sel.addEventListener('change', () => { set(sel.value); this.onChange(what); if (what === 'bar') this.render(); });
    row.append(sel);
    parent.append(row);
  }

  private weapon(parent: HTMLElement, label: string, hand: 'mainHand' | 'offHand' | 'ranged'): void {
    const w = this.prefs.stats[hand];
    if (!w) return;
    const row = h('div', 'field weapon');
    row.append(h('span', '', label));
    const grid = h('span', 'weapon-grid');
    const num = (key: 'min' | 'max' | 'speed', title: string, step: number) => {
      const input = document.createElement('input');
      input.type = 'number';
      input.step = String(step);
      input.title = title;
      input.value = String(w[key]);
      input.addEventListener('change', () => {
        const v = Number(input.value);
        if (Number.isFinite(v) && v > 0) { w[key] = v; this.onChange('stats'); }
        input.value = String(w[key]);
      });
      const l = h('label', 'mini', `<small>${title}</small>`);
      l.append(input);
      grid.append(l);
    };
    num('min', 'Min', 1);
    num('max', 'Max', 1);
    num('speed', 'Speed', 0.1);
    const type = document.createElement('select');
    const types: WeaponType[] = hand === 'ranged' ? ['bow', 'gun', 'crossbow'] : ['sword', 'dagger', 'mace', 'fist', 'axe'];
    if (!types.includes(w.type)) types.push(w.type);
    for (const t of types) {
      type.append(new Option(t[0].toUpperCase() + t.slice(1), t, false, t === w.type));
    }
    type.addEventListener('change', () => { w.type = type.value as WeaponType; this.onChange('stats'); });
    const l = h('label', 'mini', '<small>Type</small>');
    l.append(type);
    grid.append(l);
    row.append(grid);
    parent.append(row);
  }

  private keyRow(parent: HTMLElement, label: string, get: () => string, set: (code: string | null) => boolean): void {
    const row = h('div', 'key-row');
    row.append(h('span', '', label));
    this.keyButton(row, get, set);
    parent.append(row);
  }

  private keyButton(row: HTMLElement, get: () => string, set: (code: string | null) => boolean): void {
    const btn = h('button', 'key-btn', keyLabel(get()) || '—') as HTMLButtonElement;
    const unbind = h('button', 'key-clear', '×') as HTMLButtonElement;
    unbind.title = 'Unbind';
    unbind.disabled = !get();
    unbind.addEventListener('click', () => {
      if (set(null)) this.onChange('keys');
      this.render();
    });
    btn.addEventListener('click', () => {
      btn.textContent = UI.pressKey;
      btn.classList.add('capturing');
      this.capturing = (code, e) => {
        btn.classList.remove('capturing');
        this.capturing = null;
        if (e.code === 'Escape') { btn.textContent = keyLabel(get()) || '—'; return; }
        const value = e.code === 'Backspace' || e.code === 'Delete' ? null : code;
        if (set(value)) this.onChange('keys');
        this.render();
      };
    });
    const keys = h('span', 'key-pair');
    keys.append(btn, unbind);
    row.append(keys);
  }

  /** Feeds a keydown to the dialog while capturing. Returns true if used. */
  handleKey(e: KeyboardEvent): boolean {
    if (!this.capturing) return false;
    const code = bindingFor(e);
    if (code === null) return true;
    e.preventDefault();
    this.capturing(code, e);
    return true;
  }
}
