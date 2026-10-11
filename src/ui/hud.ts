// Heads-up display: target frame, buffs, resource and combo points, action
// bar, error text, pull countdown and damage meter. Built once, then updated
// every frame without rebuilding the DOM.
import type { Combat } from '../engine/combat';
import { ACTION_BAR_SLOTS, type Aura, type Binding, type Unit } from '../engine/types';
import { UI, fmt } from '../strings';
import { iconHtml } from './icon';
import { keyLabel } from './storage';

const h = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', html = ''): HTMLElementTagNameMap[K] => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (html) el.innerHTML = html;
  return el;
};

const shortTime = (s: number): string =>
  s >= 60 ? `${Math.ceil(s / 60)}m` : s >= 10 ? `${Math.ceil(s)}` : s >= 1.5 ? `${Math.ceil(s)}` : s.toFixed(1);

interface Slot {
  el: HTMLElement; icon: HTMLElement; key: HTMLElement; cost: HTMLElement; cd: HTMLElement; cdText: HTMLElement;
  id: string | null; lastIcon: string | null;
}

class AuraRow {
  readonly el: HTMLElement;
  private items = new Map<string, { el: HTMLElement; time: HTMLElement; stacks: HTMLElement }>();
  constructor(cls: string) { this.el = h('div', `auras ${cls}`); }
  update(auras: Iterable<Aura>, now: number, filter: (a: Aura) => boolean = () => true): void {
    const seen = new Set<string>();
    for (const a of auras) {
      if (a.hidden || !filter(a)) continue;
      seen.add(a.id);
      let it = this.items.get(a.id);
      if (!it) {
        const el = h('div', 'aura');
        el.innerHTML = iconHtml(a.icon);
        el.title = a.name;
        const time = h('span', 'aura-time');
        const stacks = h('span', 'aura-stacks');
        el.append(time, stacks);
        this.el.append(el);
        it = { el, time, stacks };
        this.items.set(a.id, it);
      }
      const left = a.end - now;
      it.time.textContent = Number.isFinite(left) ? shortTime(Math.max(0, left)) : '';
      it.el.classList.toggle('expiring', Number.isFinite(left) && left < 3);
      it.stacks.textContent = a.stacks && a.stacks > 1 ? String(a.stacks) : '';
    }
    for (const [id, it] of this.items) {
      if (!seen.has(id)) { it.el.remove(); this.items.delete(id); }
    }
  }
}

export interface HudCallbacks {
  settings(): void;
  reset(): void;
  pull(): void;
  targets(n: number): void;
  press(slot: number): void;
  swap(a: number, b: number): void;
}

export class Hud {
  readonly root: HTMLElement;
  private slots: Slot[] = [];
  private targetFrame: HTMLElement;
  private targetName: HTMLElement;
  private targetLevel: HTMLElement;
  private targetBar: HTMLElement;
  private targetText: HTMLElement;
  private targetAuras = new AuraRow('target-auras');
  private playerAuras = new AuraRow('player-auras');
  private combatState: HTMLElement;
  private resourceFill: HTMLElement;
  private resourceText: HTMLElement;
  private manaBar: HTMLElement;
  private manaFill: HTMLElement;
  private manaText: HTMLElement;
  private healthBar: HTMLElement;
  private healthFill: HTMLElement;
  private healthText: HTMLElement;
  private castBar: HTMLElement;
  private castFill: HTMLElement;
  private castText: HTMLElement;
  private pips: HTMLElement[] = [];
  private swingMH: HTMLElement;
  private swingOH: HTMLElement;
  private swingRanged: HTMLElement;
  private error: HTMLElement;
  private errorUntil = 0;
  private countdown: HTMLElement;
  private meter: HTMLElement;
  private meterRows: HTMLElement;
  private meterHead: HTMLElement;
  private meterReview: HTMLElement;
  private targetButtons: HTMLButtonElement[] = [];
  private tooltip: HTMLElement;
  private tooltipSlot = -1;
  suggestions = true;

  constructor(parent: HTMLElement, private combat: Combat, private bar: Binding[], private cb: HudCallbacks) {
    this.root = h('div', 'hud');
    parent.append(this.root);

    // Top left: settings, reset, pull.
    const left = h('div', 'hud-left');
    const btn = (label: string, fn: () => void) => {
      const b = h('button', 'hud-btn', label);
      b.addEventListener('click', fn);
      left.append(b);
      return b;
    };
    btn(UI.settings, () => cb.settings());
    btn(UI.reset, () => cb.reset());
    btn(UI.pull, () => cb.pull());
    this.root.append(left);

    // Top right: number of dummies.
    const right = h('div', 'hud-right', `<span>${UI.targets}</span>`);
    for (let n = 1; n <= 3; n++) {
      const b = h('button', 'hud-num', String(n));
      b.addEventListener('click', () => cb.targets(n));
      right.append(b);
      this.targetButtons.push(b);
    }
    this.root.append(right);

    // Target frame.
    this.targetFrame = h('div', 'target-frame');
    const portrait = h('div', 'target-portrait', iconHtml('dummy'));
    this.targetName = h('div', 'target-name');
    this.targetLevel = h('div', 'target-level');
    const barWrap = h('div', 'target-bar');
    this.targetBar = h('div', 'target-fill');
    this.targetText = h('div', 'target-text');
    barWrap.append(this.targetBar, this.targetText);
    const info = h('div', 'target-info');
    const row = h('div', 'target-row');
    row.append(this.targetLevel, this.targetName);
    info.append(row, barWrap);
    this.targetFrame.append(portrait, info, this.targetAuras.el);
    this.root.append(this.targetFrame);

    this.error = h('div', 'error-text');
    this.countdown = h('div', 'countdown');
    this.root.append(this.error, this.countdown);

    // Bottom: player auras, resources, action bar.
    const bottom = h('div', 'bottom');
    this.combatState = h('div', 'combat-state');
    const resource = h('div', `resource ${combat.spec.resource}`);
    this.resourceFill = h('div', 'resource-fill');
    this.resourceText = h('div', 'resource-text');
    resource.append(this.resourceFill, this.resourceText);
    // Your health, shown while the dummy attacks you.
    this.healthBar = h('div', 'resource health');
    this.healthFill = h('div', 'resource-fill');
    this.healthText = h('div', 'resource-text');
    this.healthBar.append(this.healthFill, this.healthText);
    // Cast bar (Slam).
    this.castBar = h('div', 'cast-bar');
    this.castFill = h('div', 'cast-fill');
    this.castText = h('div', 'cast-text');
    this.castBar.append(this.castFill, this.castText);
    const pips = h('div', 'combo');
    if (!combat.spec.comboPoints) pips.style.display = 'none';
    // Mana as a second pool (a cat's Shifting Power).
    this.manaBar = h('div', 'resource mana second');
    this.manaFill = h('div', 'resource-fill');
    this.manaText = h('div', 'resource-text');
    this.manaBar.append(this.manaFill, this.manaText);
    for (let i = 0; i < 5; i++) {
      const p = h('div', 'pip');
      pips.append(p);
      this.pips.push(p);
    }
    const swings = h('div', 'swings');
    this.swingMH = h('div', 'swing');
    this.swingOH = h('div', 'swing off');
    this.swingRanged = h('div', 'swing ranged');
    this.swingRanged.title = 'Auto Shot: red while the windup is on (stand still)';
    swings.append(this.swingMH, this.swingOH, this.swingRanged);

    const barEl = h('div', 'action-bar');
    // Slots after the 16 of the action bar: the stance bar, above it on the left.
    const stanceEl = h('div', 'stance-bar');
    bar.forEach((_b, i) => {
      const el = h('button', 'slot');
      el.dataset.slot = String(i);
      const icon = h('div', 'slot-icon');
      const cd = h('div', 'slot-cd');
      const cdText = h('div', 'slot-cdtext');
      const key = h('div', 'slot-key');
      const cost = h('div', 'slot-cost');
      el.append(icon, cd, cdText, key, cost);
      if (i >= ACTION_BAR_SLOTS) { el.classList.add('stance-slot'); stanceEl.append(el); } else barEl.append(el);
      this.slots.push({ el, icon, key, cost, cd, cdText, id: null, lastIcon: null });
      el.addEventListener('pointerdown', (e) => this.startDrag(e, i));
      el.addEventListener('pointerenter', () => { this.tooltipSlot = i; });
      el.addEventListener('pointerleave', () => { if (this.tooltipSlot === i) this.tooltipSlot = -1; });
    });
    bottom.append(this.castBar, this.playerAuras.el, this.combatState, this.healthBar, resource, pips, this.manaBar, swings);
    if (bar.length > ACTION_BAR_SLOTS) bottom.append(stanceEl);
    bottom.append(barEl);
    this.root.append(bottom);

    // Damage meter.
    this.meter = h('div', 'meter');
    this.meterHead = h('div', 'meter-head');
    this.meterRows = h('div', 'meter-rows');
    this.meterReview = h('div', 'meter-review');
    this.meter.append(this.meterHead, this.meterRows, this.meterReview);
    this.root.append(this.meter);

    this.tooltip = h('div', 'tooltip');
    this.root.append(this.tooltip);

    combat.on('error', (msg) => this.showError(msg));
    this.refreshBar();
  }

  setMeterVisible(on: boolean): void { this.meter.style.display = on ? '' : 'none'; }
  setTargetCount(n: number): void {
    this.targetButtons.forEach((b, i) => b.classList.toggle('active', i + 1 === n));
  }

  showError(msg: string): void {
    this.error.textContent = msg;
    this.error.classList.remove('show');
    void this.error.offsetWidth;
    this.error.classList.add('show');
    this.errorUntil = performance.now() + 1600;
  }

  showCountdown(text: string, big = true): void {
    this.countdown.textContent = text;
    this.countdown.classList.toggle('go', !big);
    this.countdown.classList.remove('show');
    void this.countdown.offsetWidth;
    this.countdown.classList.add('show');
  }

  flash(slot: number): void {
    const s = this.slots[slot];
    if (!s) return;
    s.el.classList.remove('pressed');
    void s.el.offsetWidth;
    s.el.classList.add('pressed');
  }

  /** Rebuilds icons and key labels after the bar or keybinds change. */
  refreshBar(): void {
    this.bar.forEach((b, i) => {
      const s = this.slots[i];
      s.id = b.id;
      s.key.textContent = keyLabel(b.key);
      const a = b.id ? this.combat.ability(b.id) : null;
      const icon = a?.icon ?? null;
      if (icon !== s.lastIcon) {
        s.icon.innerHTML = icon ? iconHtml(icon) : '';
        s.lastIcon = icon;
      }
      s.el.classList.toggle('empty', !a);
      s.el.setAttribute('aria-label', a ? a.name : 'Empty slot');
    });
  }

  // Drag a button onto another to swap them.
  private startDrag(e: PointerEvent, from: number): void {
    const startX = e.clientX, startY = e.clientY;
    let dragging = false;
    let ghost: HTMLElement | null = null;
    const move = (ev: PointerEvent) => {
      if (!dragging && Math.hypot(ev.clientX - startX, ev.clientY - startY) > 8 && this.slots[from].id) {
        dragging = true;
        ghost = h('div', 'drag-ghost', this.slots[from].icon.innerHTML);
        document.body.append(ghost);
      }
      if (ghost) { ghost.style.left = `${ev.clientX}px`; ghost.style.top = `${ev.clientY}px`; }
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      ghost?.remove();
      if (!dragging) {
        if (ev.target instanceof Node && this.slots[from].el.contains(ev.target)) this.cb.press(from);
        return;
      }
      const over = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.slot') as HTMLElement | null;
      const to = over ? Number(over.dataset.slot) : -1;
      if (to >= 0 && to !== from) this.cb.swap(from, to);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  update(): void {
    const c = this.combat;
    const p = c.player;
    const now = c.t;

    // Target frame.
    const t: Unit | null = c.target;
    this.targetFrame.classList.toggle('hidden', !t);
    if (t) {
      this.targetName.textContent = t.name;
      this.targetLevel.textContent = String(t.level);
      const pct = t.health / t.maxHealth;
      this.targetBar.style.transform = `scaleX(${pct})`;
      this.targetText.textContent = c.healthLocked ? '100%' : `${fmt(t.health)}  (${(pct * 100).toFixed(1)}%)`;
      this.targetAuras.update(t.auras.values(), now);
    } else {
      this.targetAuras.update([], now);
    }

    // Player.
    this.playerAuras.update(p.auras.values(), now);
    this.combatState.textContent = p.inCombat ? UI.inCombat : UI.outOfCombat;
    this.combatState.classList.toggle('in', p.inCombat);
    this.resourceFill.style.transform = `scaleX(${p.resource / p.maxResource})`;
    this.resourceText.textContent = c.manaLocked && c.spec.resource === 'mana' ? `${fmt(p.maxResource)} (locked)`
      : `${fmt(Math.floor(p.resource))} / ${fmt(p.maxResource)}`;
    this.healthBar.style.display = c.enemyAttacks.on ? '' : 'none';
    if (c.enemyAttacks.on) {
      this.healthFill.style.transform = `scaleX(${p.health / p.maxHealth})`;
      this.healthText.textContent = c.playerHealthLocked ? `${fmt(p.maxHealth)} (locked)` : `${fmt(p.health)} / ${fmt(p.maxHealth)}`;
    }
    this.manaBar.style.display = p.maxMana > 0 && c.spec.resource !== 'mana' ? '' : 'none';
    if (p.maxMana > 0) {
      this.manaFill.style.transform = `scaleX(${p.mana / p.maxMana})`;
      this.manaText.textContent = c.manaLocked ? `${fmt(p.maxMana)} (locked)` : `${fmt(Math.floor(p.mana))} / ${fmt(p.maxMana)}`;
    }
    const cast = c.casting;
    this.castBar.classList.toggle('show', !!cast);
    if (cast) {
      this.castFill.style.transform = `scaleX(${Math.min(1, (now - cast.start) / (cast.end - cast.start))})`;
      this.castText.textContent = `${c.ability(cast.id)?.name ?? ''}  ${Math.max(0, cast.end - now).toFixed(1)}`;
    }
    const cp = c.comboPointsOn(t);
    this.pips.forEach((pip, i) => pip.classList.toggle('on', i < cp));
    const mh = c.swingLeft('main'), oh = c.swingLeft('off');
    this.swingMH.style.setProperty('--p', mh.total ? String(1 - mh.left / mh.total) : '0');
    this.swingOH.style.setProperty('--p', oh.total ? String(1 - oh.left / oh.total) : '0');
    const rs = c.rangedLeft();
    this.swingRanged.style.display = c.stats.ranged ? '' : 'none';
    this.swingRanged.style.setProperty('--p', rs.total ? String(rs.winding ? 1 : Math.max(0, 1 - rs.left / rs.total)) : '0');
    this.swingRanged.classList.toggle('winding', rs.winding);
    this.swingMH.style.display = c.autoShooting ? 'none' : '';
    this.swingOH.style.display = c.autoShooting || !c.stats.offHand ? 'none' : '';
    this.swingMH.parentElement!.classList.toggle('active', p.autoAttacking || c.autoShooting);

    // Action bar.
    const suggested = this.suggestions && c.spec.suggest ? c.spec.suggest(c) : null;
    for (const s of this.slots) {
      if (!s.id) continue;
      const st = c.buttonState(s.id);
      const cd = st.cooldown;
      s.cd.style.setProperty('--p', cd.total ? String(cd.left / cd.total) : '0');
      s.cdText.textContent = cd.left > 1.5 && cd.total > 1.6 ? shortTime(cd.left) : '';
      s.cost.textContent = st.cost ? String(st.cost) : '';
      s.el.classList.toggle('no-resource', st.noResource);
      s.el.classList.toggle('unusable', !st.usable);
      s.el.classList.toggle('out-of-range', st.outOfRange);
      s.el.classList.toggle('glow', st.highlight);
      s.el.classList.toggle('suggest', suggested === s.id);
    }

    // Tooltip.
    if (this.tooltipSlot >= 0 && this.slots[this.tooltipSlot].id) {
      const s = this.slots[this.tooltipSlot];
      const a = c.ability(s.id!)!;
      const cost = c.cost(a);
      const mana = a.manaCost ? Math.round(a.manaCost(c)) : 0;
      const cd = typeof a.cooldown === 'function' ? a.cooldown(c) : a.cooldown;
      const costText = [cost ? `${fmt(Math.round(cost))} ${c.spec.resource[0].toUpperCase()}${c.spec.resource.slice(1)}` : '', mana ? `${fmt(mana)} Mana` : ''].filter(Boolean).join(', ');
      const range = a.range === 'melee' ? 'Melee range' : typeof a.range === 'number' ? `${a.range} yd range` : '';
      const lines = [
        `<b>${a.name}</b>`,
        `<span class="tt-row">${costText}<span>${range}</span></span>`,
        cd ? `<span class="tt-row"><span></span><span>${cd >= 60 ? `${cd / 60} min` : `${cd} sec`} cooldown</span></span>` : '',
        `<span class="tt-desc">${a.description(c)}</span>`,
      ];
      this.tooltip.innerHTML = lines.filter(Boolean).join('');
      const r = s.el.getBoundingClientRect();
      this.tooltip.style.left = `${Math.min(innerWidth - 300, Math.max(8, r.left + r.width / 2 - 140))}px`;
      this.tooltip.style.top = `${r.top - 10}px`;
      this.tooltip.classList.add('show');
    } else {
      this.tooltip.classList.remove('show');
    }

    if (performance.now() > this.errorUntil) this.error.classList.remove('show');
    this.updateMeter();
  }

  private meterTick = 0;
  private updateMeter(): void {
    if (this.meter.style.display === 'none') return;
    // A few times per second is enough.
    if (performance.now() - this.meterTick < 250) return;
    this.meterTick = performance.now();
    const c = this.combat;
    const m = c.meter;
    const dur = m.start === null ? 0 : Math.max(0, m.end - m.start);
    const threat = c.spec.showThreat || c.enemyAttacks.on ? `<b class="tps">${fmt(c.tps(), 0)} TPS</b>` : '';
    this.meterHead.innerHTML = `<span>${UI.damage}</span><b>${fmt(c.dps(), 1)} ${UI.dps}</b>${threat}
      <small>${fmt(m.total)} · ${Math.floor(dur / 60)}:${String(Math.floor(dur % 60)).padStart(2, '0')}</small>`;
    const rows = [...m.rows.values()].filter((r) => r.total > 0).sort((a, b) => b.total - a.total);
    const max = rows[0]?.total ?? 1;
    this.meterRows.innerHTML = rows.map((r) => {
      const share = m.total ? (r.total / m.total) * 100 : 0;
      const landed = r.hits + r.misses;
      const crit = r.hits ? (r.crits / r.hits) * 100 : 0;
      return `<div class="meter-row" title="${r.name}: ${landed} attempts, ${crit.toFixed(1)}% crit, ${r.misses} missed or dodged${r.glances ? `, ${r.glances} glancing` : ''}">
        <div class="meter-fill" style="transform: scaleX(${r.total / max})"></div>
        <div class="meter-icon">${iconHtml(r.icon)}</div>
        <span class="meter-name">${r.name}</span>
        <span class="meter-val">${fmt(r.total)} <small>${share.toFixed(1)}%</small></span>
      </div>`;
    }).join('');
    // How the rotation went: the habits matter more than the exact damage.
    const review = c.spec.review?.(c) ?? [];
    this.meterReview.innerHTML = review.map((r) =>
      `<div class="review-row"><span>${r.label}</span><b class="${r.good === undefined ? '' : r.good ? 'good' : 'bad'}">${r.value}</b></div>`).join('');
  }
}
