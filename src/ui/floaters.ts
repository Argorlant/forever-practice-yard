// Floating combat text: damage rises from the target, crits pop bigger.
import * as THREE from 'three';
import type { Hit } from '../engine/types';
import { UI, fmt } from '../strings';

interface Floater { el: HTMLElement; pos: THREE.Vector3; born: number; life: number; dx: number; dy: number; rise: number }

export class Floaters {
  private layer: HTMLElement;
  private live: Floater[] = [];
  private v = new THREE.Vector3();
  /** Numbers that appear close together stack upwards instead of overlapping. */
  private lastSpawn = 0;
  private stack = 0;

  constructor(parent: HTMLElement, private camera: THREE.PerspectiveCamera) {
    this.layer = document.createElement('div');
    this.layer.className = 'floaters';
    parent.append(this.layer);
  }

  damage(hit: Hit, at: THREE.Vector3): void {
    let text: string;
    let cls = 'ft';
    if (hit.outcome === 'miss' || hit.outcome === 'dodge' || hit.outcome === 'parry' || hit.outcome === 'resist') {
      text = { miss: UI.miss, dodge: UI.dodge, parry: UI.parry, resist: UI.resist }[hit.outcome];
      cls += ' ft-miss';
    } else {
      text = fmt(hit.amount);
      // Windfury Weapon's attacks read as white hits, as in the game (Oct 15); the engine keeps them special for Flurry.
      if (hit.white || hit.source === 'windfuryWeapon') cls += ' ft-white';
      else if (hit.school === 'nature') cls += ' ft-nature';
      else if (hit.school === 'arcane') cls += ' ft-arcane';
      else if (hit.school === 'holy') cls += ' ft-holy';
      else cls += ' ft-yellow';
      if (hit.periodic) cls += ' ft-dot';
      if (hit.outcome === 'crit') cls += ' ft-crit';
      if (hit.outcome === 'glance') cls += ' ft-glance';
    }
    this.spawn(text, cls, at, hit.outcome === 'crit' ? 1.5 : 1.15);
  }

  /** Small text near the player (e.g. energy gained). */
  note(text: string, at: THREE.Vector3, cls = 'ft-note'): void {
    this.spawn(text, `ft ${cls}`, at, 1.2);
  }

  private spawn(text: string, cls: string, at: THREE.Vector3, life: number): void {
    const el = document.createElement('div');
    el.className = cls;
    el.textContent = text;
    this.layer.append(el);
    const now = performance.now();
    this.stack = now - this.lastSpawn < 280 ? (this.stack + 1) % 4 : 0;
    this.lastSpawn = now;
    this.live.push({
      el, pos: at.clone(), born: now, life: life * 1000,
      dx: (Math.random() - 0.5) * 50, dy: -this.stack * 26, rise: 55 + Math.random() * 20,
    });
    if (this.live.length > 40) this.live.shift()!.el.remove();
  }

  update(): void {
    const now = performance.now();
    const w = this.layer.clientWidth, hgt = this.layer.clientHeight;
    this.live = this.live.filter((f) => {
      const k = (now - f.born) / f.life;
      if (k >= 1) { f.el.remove(); return false; }
      this.v.copy(f.pos).project(this.camera);
      if (this.v.z > 1) { f.el.style.opacity = '0'; return true; }
      const x = (this.v.x * 0.5 + 0.5) * w + f.dx * Math.min(1, k * 3);
      const y = (-this.v.y * 0.5 + 0.5) * hgt + f.dy - f.rise * k;
      const pop = f.el.classList.contains('ft-crit') ? 1 + Math.max(0, 0.6 - k * 4) : 1;
      f.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${pop})`;
      f.el.style.opacity = String(k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3);
      return true;
    });
  }
}
