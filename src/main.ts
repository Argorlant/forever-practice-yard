import './style.css';
import * as THREE from 'three';
import { Combat } from './engine/combat';
import type { Unit } from './engine/types';
import { Beast } from './scene/beast';
import { Character, type Locomotion } from './scene/character';
import { Controls, DEFAULT_MOVE } from './scene/controls';
import { Dummy } from './scene/dummy';
import { createWorld } from './scene/world';
import { SPECS, specById } from './specs';
import { UI, fmt } from './strings';
import { Floaters } from './ui/floaters';
import { Hud } from './ui/hud';
import { SettingsDialog, defaultPrefs, type Prefs } from './ui/settings';
import { raidPicker } from './ui/raid-picker';
import { bindingFor, load, save } from './ui/storage';

// The class comes from the URL (?class=warrior), else the last one played.
const CLASS_KEY = 'fpy.class';
const spec = specById(new URLSearchParams(location.search).get('class') ?? load<string>(CLASS_KEY));
save(CLASS_KEY, spec.id);
document.title = `${spec.className} Practice Yard · WoW Forever`;
// v4: warriors got a stance bar (stats are gear only since v3).
const PREFS_KEY = `fpy.${spec.id}.v4${spec.prefsRevision ? `.r${spec.prefsRevision}` : ''}`;
const MODEL_URL = `${import.meta.env.BASE_URL}models/human.glb`;

const app = document.getElementById('app')!;
const loading = app.querySelector('.loading');

// --------------------------------------------------------------- prefs
function loadPrefs(): Prefs {
  const base = defaultPrefs(spec, DEFAULT_MOVE);
  const saved = load<Partial<Prefs>>(PREFS_KEY);
  if (!saved) return base;
  const bar = base.bar.map((b, i) => saved.bar?.[i] ?? b)
    .map((b) => ({ id: b.id && spec.abilities.some((a) => a.id === b.id) ? b.id : null, key: b.key ?? '' }));
  return {
    ...base, ...saved,
    stats: { ...base.stats, ...saved.stats },
    enemy: { ...base.enemy, ...saved.enemy },
    tank: { ...base.tank, ...saved.tank },
    raid: saved.raid ?? base.raid,
    options: { ...base.options, ...saved.options },
    move: { ...base.move, ...saved.move },
    bar,
  };
}
let prefs = loadPrefs();
const persist = () => save(PREFS_KEY, prefs);

// --------------------------------------------------------------- world
const world = createWorld(app);
const combat = new Combat(spec, prefs.options);
const controls = new Controls(world.renderer.domElement, world.camera);
controls.bindings = prefs.move;
// Ranged specs start further back.
if (spec.startDistance) controls.z = -spec.startDistance * 0.9144;
const character = new Character();
world.scene.add(character.root);
// Druid forms: animal models shown instead of the humanoid.
const beasts: { cat?: Beast; bear?: Beast } = {};
for (const kind of ['cat', 'bear'] as const) {
  const look = spec.forms?.[kind];
  if (!look) continue;
  const b = new Beast({ kind, ...look });
  b.root.visible = false;
  world.scene.add(b.root);
  beasts[kind] = b;
}
// A hunter's pet: it waits beside you and runs to the dummy when you attack.
const pet = spec.pet ? new Beast({ kind: 'cat', ...spec.pet }) : null;
if (pet) { pet.root.scale.setScalar(0.85); world.scene.add(pet.root); }
const petPos = new THREE.Vector3(controls.x + 0.9, 0, controls.z - 0.6);

/** The model that stands for the player right now. */
const avatar = () => {
  const form = spec.form?.(combat) ?? null;
  return (form && beasts[form]) || character;
};

// Dummies.
const dummies: { dummy: Dummy; unit: Unit }[] = [];
function layoutDummies(n: number): void {
  for (const d of dummies) world.scene.remove(d.dummy.root);
  dummies.length = 0;
  const xs = n === 1 ? [0] : n === 2 ? [-1.5, 1.5] : [-2.8, 0, 2.8];
  xs.forEach((x, i) => {
    const dummy = new Dummy();
    dummy.root.position.set(x, 0, 0);
    world.scene.add(dummy.root);
    const unit: Unit = {
      id: i, name: UI.dummy, level: 63, health: prefs.enemy.health, maxHealth: prefs.enemy.health,
      armor: prefs.enemy.armor, auras: new Map(), x, z: 0, facing: 0, radius: 0.5,
    };
    dummies.push({ dummy, unit });
  });
  combat.targets = dummies.map((d) => d.unit);
  controls.obstacles = dummies.map((d) => ({ x: d.unit.x, z: d.unit.z, r: 0.45 }));
  select(dummies[n === 3 ? 1 : 0].unit);
}

function select(u: Unit | null): void {
  if (combat.target !== u) combat.stopAutoAttack();
  combat.target = u;
  for (const d of dummies) d.dummy.setSelected(d.unit === u);
}

function applyEnemy(): void {
  combat.healthLocked = prefs.enemy.locked;
  combat.startHealth = prefs.enemy.startPct / 100;
  for (const { unit } of dummies) {
    unit.maxHealth = prefs.enemy.health;
    unit.health = Math.min(unit.health, Math.round(unit.maxHealth * combat.startHealth));
    unit.armor = prefs.enemy.armor;
  }
  combat.enemyAttacks = { ...combat.enemyAttacks, on: prefs.tank.attacks, speed: prefs.tank.speed, damage: prefs.tank.damage };
  combat.playerHealthLocked = prefs.tank.lockHealth;
}

function applyStats(): void {
  combat.stats = structuredClone(prefs.stats);
  combat.options = { ...prefs.options };
  combat.raid = new Set(prefs.raid);
  equip();
}

function equip(): void {
  const st = prefs.stats;
  character.setWeapons(st.mainHand.type, st.offHand?.type ?? null, { twoHand: st.mainHand.twoHand, shield: st.shield });
}

function fullReset(): void {
  applyStats();
  applyEnemy();
  combat.reset();
  pullTimers.forEach(clearTimeout);
  pullTimers = [];
}

layoutDummies(prefs.targets);
applyEnemy();
applyStats();
combat.reset();

// ------------------------------------------------------------------ HUD
let pullTimers: number[] = [];
const hud = new Hud(app, combat, prefs.bar, {
  settings: () => settings.show(),
  reset: () => fullReset(),
  pull: () => startPull(),
  targets: (n) => {
    prefs.targets = n;
    persist();
    layoutDummies(n);
    fullReset();
    hud.setTargetCount(n);
  },
  press: (slot) => pressSlot(slot),
  swap: (a, b) => {
    const tmp = prefs.bar[a].id;
    prefs.bar[a].id = prefs.bar[b].id;
    prefs.bar[b].id = tmp;
    persist();
    hud.refreshBar();
  },
});
hud.setTargetCount(prefs.targets);
hud.setMeterVisible(prefs.meter);
hud.suggestions = prefs.suggest;

const floaters = new Floaters(app, world.camera);

const settings = new SettingsDialog(app, spec, prefs, combat, (what) => {
  if (what === 'defaults') {
    const targets = prefs.targets;
    prefs = defaultPrefs(spec, DEFAULT_MOVE);
    prefs.targets = targets;
    prefs.seenWelcome = true;
    controls.bindings = prefs.move;
    settings.setPrefs(prefs);
    rebuildHudBindings();
    applyStats();
    applyEnemy();
  }
  if (what === 'build') {
    const build = spec.builds?.find((b) => b.id === prefs.options.build);
    if (build) {
      prefs.stats = structuredClone(build.stats);
      Object.assign(prefs.options, build.options ?? {});
      // Tank builds turn on the attacking dummy; the others turn it off.
      prefs.tank.attacks = !!build.tank;
      applyEnemy();
      // The bar follows the build; the keys stay where the player put them.
      prefs.bar.forEach((slot, i) => { slot.id = build.bar[i]?.id ?? null; });
    }
  }
  if (what === 'stats' || what === 'options' || what === 'build') { applyStats(); combat.reset(); }
  if (what === 'enemy') applyEnemy();
  hud.setMeterVisible(prefs.meter);
  hud.suggestions = prefs.suggest;
  controls.bindings = prefs.move;
  hud.refreshBar();
  persist();
});

// Switching class reloads the page with ?class=.
settings.classes = {
  list: SPECS.map((s) => ({ id: s.id, name: `${s.className} (${s.specName})` })),
  current: spec.id,
  pick: (id) => {
    save(CLASS_KEY, id);
    const url = new URL(location.href);
    url.searchParams.set('class', id);
    location.href = url.toString();
  },
};

/** The HUD keeps a reference to the bar array; swap its contents in place. */
function rebuildHudBindings(): void {
  const bar = (hud as unknown as { bar: Prefs['bar'] }).bar;
  bar.splice(0, bar.length, ...prefs.bar);
  prefs.bar = bar;
  hud.refreshBar();
}

function startPull(): void {
  pullTimers.forEach(clearTimeout);
  pullTimers = [];
  for (let i = 10; i >= 1; i--) {
    pullTimers.push(window.setTimeout(() => hud.showCountdown(String(i)), (10 - i) * 1000));
  }
  pullTimers.push(window.setTimeout(() => {
    hud.showCountdown(UI.go, false);
    combat.clearMeter();
  }, 10_000));
}

// --------------------------------------------------------------- input
function pressSlot(slot: number): void {
  const id = prefs.bar[slot]?.id;
  if (!id) return;
  hud.flash(slot);
  combat.use(id);
}

window.addEventListener('keydown', (e) => {
  if (settings.handleKey(e)) return;
  const tag = (e.target as HTMLElement)?.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
  if (e.code === 'Escape') {
    if (settings.open) settings.close();
    else select(null);
    return;
  }
  if (settings.open || welcomeOpen) return;
  if (e.code === 'Tab') {
    e.preventDefault();
    const list = dummies.map((d) => d.unit);
    const i = combat.target ? list.indexOf(combat.target) : -1;
    select(list[(i + 1) % list.length]);
    return;
  }
  const binding = bindingFor(e);
  if (binding) {
    const slot = prefs.bar.findIndex((b) => b.key === binding);
    if (slot >= 0) {
      e.preventDefault();
      if (!e.repeat) pressSlot(slot);
      return;
    }
  }
  if (controls.isMovementKey(e.code)) {
    e.preventDefault();
    controls.keyDown(e.code);
  }
});

const raycaster = new THREE.Raycaster();
controls.onClick = (x, y, button) => {
  const rect = world.renderer.domElement.getBoundingClientRect();
  const ndc = new THREE.Vector2(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(ndc, world.camera);
  for (const d of dummies) {
    if (raycaster.intersectObjects(d.dummy.pickables, false).length) {
      select(d.unit);
      if (button === 2) combat.startAutoAttack();
      return;
    }
  }
  if (button === 0) select(null);
};

// Touch joystick.
const joy = document.createElement('div');
joy.className = 'joystick';
joy.innerHTML = '<div class="knob"></div>';
app.append(joy);
{
  const knob = joy.firstElementChild as HTMLElement;
  let id = -1;
  const setFrom = (e: PointerEvent) => {
    const r = joy.getBoundingClientRect();
    let dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    let dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }
    knob.style.transform = `translate(${dx * 31}px, ${dy * 31}px)`;
    controls.setJoystick(dx, dy);
  };
  joy.addEventListener('pointerdown', (e) => { id = e.pointerId; joy.setPointerCapture(id); setFrom(e); });
  joy.addEventListener('pointermove', (e) => { if (e.pointerId === id) setFrom(e); });
  const end = (e: PointerEvent) => {
    if (e.pointerId !== id) return;
    id = -1;
    knob.style.transform = '';
    controls.setJoystick(0, 0);
  };
  joy.addEventListener('pointerup', end);
  joy.addEventListener('pointercancel', end);
}

// ------------------------------------------------------- engine → scene
const dummyOf = (u: Unit) => dummies.find((d) => d.unit === u)?.dummy;
const playerPos = () => new THREE.Vector3(controls.x, controls.y, controls.z);

combat.on('damage', (hit) => {
  const d = dummyOf(hit.target);
  if (!d) return;
  floaters.damage(hit, d.headPosition);
  if (!hit.periodic && hit.amount > 0 && hit.school === 'physical') {
    d.hit(playerPos(), hit.outcome === 'crit' ? 1.6 : hit.white ? 0.6 : 1);
  }
});
combat.on('swing', () => avatar().swing());
combat.on('ability', ({ id, animation }) => {
  if (animation) avatar().play(animation);
  const bolt = combat.ability(id)?.projectile;
  if (bolt && combat.target) launch(bolt, combat.target);
});

// Spells you can see: a missile from your hands (Wrath) or a bolt from the sky (Starfire, Moonfire).
interface Bolt { mesh: THREE.Mesh; from: THREE.Vector3; to: () => THREE.Vector3; t: number; duration: number }
const bolts: Bolt[] = [];
const boltGeometry = new THREE.SphereGeometry(1, 14, 10);
function launch(p: { color: number; fromSky?: boolean; speed?: number; size?: number }, target: Unit): void {
  const d = dummyOf(target);
  if (!d) return;
  const mesh = new THREE.Mesh(boltGeometry, new THREE.MeshBasicMaterial({ color: p.color, transparent: true, opacity: 0.9 }));
  mesh.scale.setScalar(p.size ?? (p.fromSky ? 0.22 : 0.13));
  if (p.fromSky) mesh.scale.y = 0.7;
  const to = () => d.headPosition.clone().add(new THREE.Vector3(0, -0.45, 0));
  const hand = new THREE.Vector3(Math.sin(controls.facing) * 0.45, 1.35, Math.cos(controls.facing) * 0.45);
  const from = p.fromSky ? to().add(new THREE.Vector3(0, 7, 0)) : playerPos().add(hand);
  const yards = from.distanceTo(to()) / 0.9144;
  mesh.position.copy(from);
  world.scene.add(mesh);
  bolts.push({ mesh, from, to, t: 0, duration: p.fromSky ? 0.22 : yards / (p.speed ?? 30) });
}
function updateBolts(dt: number): void {
  for (let i = bolts.length - 1; i >= 0; i--) {
    const b = bolts[i];
    b.t += dt;
    const k = Math.min(1, b.t / Math.max(0.05, b.duration));
    b.mesh.position.lerpVectors(b.from, b.to(), k);
    if (k >= 1) {
      world.scene.remove(b.mesh);
      (b.mesh.material as THREE.Material).dispose();
      bolts.splice(i, 1);
    }
  }
}
combat.on('shot', (u) => {
  avatar().play('throw');
  launch({ color: 0xd8c08a, speed: 40, size: 0.06 }, u);
});
combat.on('petAttack', () => pet?.swing());

combat.on('note', ({ text, kind }) => {
  floaters.note(text, playerPos().add(new THREE.Vector3(0, 2.1, 0)), kind === 'proc' ? 'ft-proc' : 'ft-note');
});

combat.on('death', (u) => {
  const d = dummyOf(u);
  if (d) floaters.note('Defeated!', d.headPosition, 'ft-buff');
});

// The attacking dummy: its swing, your avoidance and the damage you take.
combat.on('incoming', (i) => {
  dummyOf(i.attacker)?.attack();
  const above = playerPos().add(new THREE.Vector3(0, 1.9, 0));
  if (i.outcome === 'miss' || i.outcome === 'dodge' || i.outcome === 'parry') {
    floaters.note({ miss: UI.miss, dodge: UI.dodge, parry: UI.parry }[i.outcome], above, 'ft-avoid');
    if (i.outcome !== 'miss') avatar().play('block');
    return;
  }
  const label = i.outcome === 'block' ? `${fmt(i.amount)} (${fmt(i.blocked)} ${UI.block.toLowerCase()})`
    : i.outcome === 'crush' ? `${fmt(i.amount)} crushing` : fmt(i.amount);
  floaters.note(`-${label}`, above, i.outcome === 'crit' || i.outcome === 'crush' ? 'ft-incoming ft-crit' : 'ft-incoming');
  avatar().play(i.outcome === 'block' ? 'block' : 'hitReact');
});
// Charge and Intercept: rush to the target over a quarter of a second.
let dash: { fromX: number; fromZ: number; toX: number; toZ: number; t: number } | null = null;
combat.on('dash', (u) => {
  const dx = controls.x - u.x, dz = controls.z - u.z;
  const d = Math.hypot(dx, dz) || 1;
  const stop = u.radius + 1.2;
  dash = { fromX: controls.x, fromZ: controls.z, toX: u.x + (dx / d) * stop, toZ: u.z + (dz / d) * stop, t: 0 };
  controls.facing = Math.atan2(u.x - controls.x, u.z - controls.z);
});
combat.on('playerDeath', () => {
  floaters.note('You died', playerPos().add(new THREE.Vector3(0, 2, 0)), 'ft-incoming ft-crit');
  window.setTimeout(() => fullReset(), 1500);
});

controls.speedMultiplier = () => combat.moveSpeed();

// ---------------------------------------------------------------- welcome
let welcomeOpen = false;
function showWelcome(): void {
  welcomeOpen = true;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal welcome"><div class="modal-body">
    <h2>${spec.className} · ${spec.specName}</h2>
    <p>${spec.welcome}</p>
    <p class="note">Not a full damage simulator: numbers follow WoWSims formulas with the default gear below,
    against a level 63 boss with ${prefs.enemy.armor} armor. Change stats, armor and keys in Settings.
    Values marked provisional are still being confirmed for WoW Forever.</p>
    <div class="welcome-raid"><h3>What your raid brings</h3>
    <p class="note">Pick the buffs and dummy debuffs you will have. You can change them later in Settings.</p></div>
    <button class="hud-btn">${UI.start}</button></div></div>`;
  overlay.querySelector('.welcome-raid')!.append(raidPicker(prefs.raid, (ids) => {
    prefs.raid = ids;
    persist();
    applyStats();
    combat.reset();
  }));
  app.append(overlay);
  overlay.querySelector('button')!.addEventListener('click', () => {
    overlay.remove();
    welcomeOpen = false;
    prefs.seenWelcome = true;
    persist();
  });
}

// ------------------------------------------------------------------- loop
const clock = new THREE.Clock();
let elapsed = 0;

function locomotion(moving: boolean, backwards: boolean, airborne: boolean): Locomotion {
  if (airborne) return 'air';
  if (combat.stealthed()) return moving ? 'sneakMove' : 'sneak';
  if (!moving && combat.casting) return 'cast';
  if (!moving) return combat.player.inCombat || combat.player.autoAttacking ? 'ready' : 'idle';
  if (backwards) return 'back';
  // Sprint, Dash: the fast run.
  return combat.moveSpeed() > 1.25 ? 'sprint' : 'run';
}

function frame(): void {
  const dt = Math.min(0.1, clock.getDelta());
  elapsed += dt;
  const move = controls.update(dt);
  if (dash) {
    dash.t = Math.min(1, dash.t + dt / 0.25);
    controls.x = dash.fromX + (dash.toX - dash.fromX) * dash.t;
    controls.z = dash.fromZ + (dash.toZ - dash.fromZ) * dash.t;
    if (dash.t >= 1) dash = null;
  }
  const p = combat.player;
  p.x = controls.x; p.z = controls.z; p.facing = controls.facing; p.moving = move.moving;
  // The attacking dummy turns to face you.
  for (const { dummy, unit } of dummies) {
    const facing = combat.enemyAttacks.on && unit === combat.target ? Math.atan2(controls.x - unit.x, controls.z - unit.z) : 0;
    unit.facing = facing;
    dummy.root.rotation.y = facing;
  }
  combat.update(dt);

  const active = avatar();
  for (const a of [character, beasts.cat, beasts.bear]) if (a) a.root.visible = a === active;
  active.root.position.set(controls.x, controls.y, controls.z);
  active.root.rotation.y = controls.facing;
  active.setBodyYaw(move.moving ? move.bodyYaw : 0);
  active.setLocomotion(locomotion(move.moving, move.backwards, move.airborne), move.backwards ? -move.speed : move.speed);
  active.update(dt);
  for (const d of dummies) d.dummy.update(dt, elapsed);
  updateBolts(dt);
  if (pet) updatePet(dt);
  world.update(dt, elapsed);
  hud.update();
  floaters.update();
  world.renderer.render(world.scene, world.camera);
  requestAnimationFrame(frame);
}

/** The pet runs to the side of the target while it fights, else to your side. */
function updatePet(dt: number): void {
  if (!pet) return;
  pet.root.visible = combat.pet.out;
  if (!combat.pet.out) return;
  const t = combat.target;
  const want = new THREE.Vector3();
  if (combat.pet.attacking && t) want.set(t.x + 0.95, 0, t.z - 0.35);
  else want.set(controls.x + Math.cos(controls.facing) * 0.9, 0, controls.z - Math.sin(controls.facing) * 0.9);
  const to = want.clone().sub(petPos);
  const dist = to.length();
  const step = Math.min(dist, 9 * dt);
  const moving = dist > 0.05;
  if (moving) petPos.add(to.multiplyScalar(step / dist));
  pet.root.position.copy(petPos);
  const look = combat.pet.attacking && t ? Math.atan2(t.x - petPos.x, t.z - petPos.z) : moving ? Math.atan2(to.x, to.z) : controls.facing;
  pet.root.rotation.y = look;
  pet.setLocomotion(moving && dist > 0.3 ? 'run' : combat.pet.attacking ? 'ready' : 'idle', moving ? 9 : 0);
  pet.update(dt);
}

window.addEventListener('resize', () => world.resize());

character.load(MODEL_URL, spec.look).then(() => {
  loading?.remove();
  equip();
  requestAnimationFrame(frame);
  if (!prefs.seenWelcome) showWelcome();
}).catch((err) => {
  console.error(err);
  if (loading) loading.textContent = 'Could not load the character model.';
});

// Debug handle for automated checks.
(window as unknown as { yard: unknown }).yard = { combat, controls, character, world, prefs: () => prefs };
