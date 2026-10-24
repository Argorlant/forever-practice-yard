// The practice yard: the 3D scene, the engine, the HUD and Settings for the
// class in ?class= (the first screen, ./ui/picker.ts, links here).
import * as THREE from 'three';
import { Combat } from './engine/combat';
import type { Unit } from './engine/types';
import { Beast } from './scene/beast';
import { Character, type Locomotion } from './scene/character';
import { Controls, DEFAULT_MOVE } from './scene/controls';
import { Dummy } from './scene/dummy';
import { Totems } from './scene/totems';
import { Vfx } from './scene/vfx';
import { wireVfx } from './combat-vfx';
import { createWorld } from './scene/world';
import { SPECS, specById } from './specs';
import { UI, fmt } from './strings';
import { Floaters } from './ui/floaters';
import { addMissing, expandBar, fillExtraRows, slotShown } from './ui/bars';
import { Hud } from './ui/hud';
import { SettingsDialog, claimKey, defaultPrefs, type Prefs } from './ui/settings';
import { raidPicker } from './ui/raid-picker';
import { DISCLAIMER_SHORT_HTML } from './ui/disclaimer';
import { TREE_VERSION, parseTalents } from './ui/talent-rules';
import { classKey } from './ui/talents-data';
import { bindingFor, load, save, wheelBinding } from './ui/storage';

// The class comes from the URL (?class=warrior), else the last one played; ?build= picks a build.
const CLASS_KEY = 'fpy.class';
const params = new URLSearchParams(location.search);
const spec = specById(params.get('class') ?? load<string>(CLASS_KEY));
save(CLASS_KEY, spec.id);
document.title = `${spec.className} Practice Yard · WoW Forever`;
// v5: four action bar rows before the stance bar (v4: warriors got a stance bar; stats are gear only since v3).
const PREFS_KEY = `fpy.${spec.id}.v5${spec.prefsRevision ? `.r${spec.prefsRevision}` : ''}`;
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
/** First visit with this layout: rows 3 and 4 get filled once the build is known. */
let refillRows = !load(PREFS_KEY);
let prefs = loadPrefs();
const persist = () => save(PREFS_KEY, prefs);
// Talents of your own saved for older trees would read as other talents now.
if (prefs.options.talents && prefs.options.talentsTree !== TREE_VERSION) prefs.options.talents = '';

/** A build picked on the first screen (?build=): its talents, gear, options and action bar; your keys stay. */
function applyBuild(id: string): boolean {
  const build = spec.builds?.find((b) => b.id === id);
  if (!build) return false;
  prefs.options.build = build.id;
  // A build brings its own talents.
  prefs.options.talents = '';
  prefs.stats = structuredClone(build.stats);
  Object.assign(prefs.options, build.options ?? {});
  // Tank builds turn on the attacking dummy; the others turn it off.
  prefs.tank.attacks = !!build.tank;
  const full = expandBar(build.bar);
  prefs.bar.forEach((slot, i) => { slot.id = full[i]?.id ?? null; });
  return true;
}
const urlBuild = params.get('build');
if (urlBuild && urlBuild !== prefs.options.build && applyBuild(urlBuild)) refillRows = true;
// A shared link's own talents (Settings → Copy link), if they are a legal level 60 build.
const urlTalents = params.has('talents') ? parseTalents(classKey(spec.className), params.get('talents')) : null;
if (urlTalents !== null) { prefs.options.talents = urlTalents; prefs.options.talentsTree = TREE_VERSION; refillRows = true; }
if (urlBuild || params.has('talents')) {
  // Applied once: a reload keeps whatever you change afterwards.
  params.delete('build');
  params.delete('talents');
  history.replaceState(null, '', `${location.pathname}?${params}`);
}

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
/** What fights beside you: the hunter's pet, or a warlock's demon drawn with the character model. */
interface Companion { root: THREE.Object3D; setLocomotion(state: Locomotion, speed?: number): void; update(dt: number): void; swing(): void; play?(name: string): void }
let companion: Companion | null = pet;
let minionId: string | null = null;
/** Loads the demon the build calls for (once per look); it shows while the pet is out. */
function syncMinion(): void {
  const want = spec.minion?.(combat) ?? null;
  if (!want || want.id === minionId) return;
  minionId = want.id;
  const ch = new Character();
  ch.root.scale.setScalar(want.scale);
  ch.load(MODEL_URL, want.look).then(() => {
    if (minionId !== want.id) return;
    if (companion && companion !== pet) world.scene.remove(companion.root);
    world.scene.add(ch.root);
    companion = ch;
  }).catch((err) => console.error(err));
}
// Shaman totems, drawn where they were dropped.
const totems = new Totems(world.scene);

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
  character.setRanged(st.ranged?.type ?? null);
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
/** The game update the yard follows: on the first visit after it, abilities it added get a button in an empty slot. */
const PATCH = '2026-10-15';
if (refillRows) { fillExtraRows(prefs.bar, combat); prefs.patch = PATCH; persist(); }
else if (prefs.patch !== PATCH) { addMissing(prefs.bar, combat); prefs.patch = PATCH; persist(); }
syncMinion();
combat.on('reset', () => { totems.clear(); syncMinion(); });

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
    barChanged();
  },
  place: (slot, id) => { prefs.bar[slot].id = id; barChanged(); },
  clear: (slot) => { prefs.bar[slot].id = null; barChanged(); },
  bindKey: (slot, code) => {
    // As in WoW, a movement key bound to a button stops moving you.
    if (code) claimKey(prefs, code);
    prefs.bar[slot].key = code ?? '';
    barChanged();
  },
  rows: (n) => { prefs.barRows = n; hud.setRows(n); barChanged(); },
  helper: (on) => {
    prefs.suggest = on;
    hud.setSuggestions(on);
    settings.setPrefs(prefs);
    persist();
  },
});
/** The bar changed on the screen (drag, spellbook, Keys): save it and keep Settings in step. */
function barChanged(): void {
  persist();
  hud.refreshBar();
  settings.setPrefs(prefs);
}
hud.setRows(prefs.barRows);
hud.setTargetCount(prefs.targets);
hud.setMeterVisible(prefs.meter);
hud.setSuggestions(prefs.suggest);

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
    combat.reset();
    fillExtraRows(prefs.bar, combat);
  }
  if (what === 'build' && applyBuild(String(prefs.options.build))) applyEnemy();
  if (what === 'stats' || what === 'options' || what === 'build' || what === 'talents') { applyStats(); combat.reset(); }
  // Talents of your own: abilities they unlock get a button on rows 3 and 4.
  if (what === 'talents') addMissing(prefs.bar, combat);
  // Rows 3 and 4 take what the new build can use and has no button for.
  if (what === 'build') fillExtraRows(prefs.bar, combat);
  if (what === 'enemy') applyEnemy();
  hud.setRows(prefs.barRows);
  hud.setMeterVisible(prefs.meter);
  hud.setSuggestions(prefs.suggest);
  controls.bindings = prefs.move;
  hud.refreshBar();
  persist();
});

// Switching class reloads the page with ?class=.
settings.classes = {
  list: SPECS.map((s) => ({ id: s.id, name: s.specName === 'WoW Forever' ? s.className : s.specName, group: s.className })),
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
  if (!id || !slotShown(slot, prefs.barRows)) return;
  hud.flash(slot);
  combat.use(id);
}

// The mouse wheel: binding it (Settings, or Keys over a button), and pressing the button a direction is bound to.
window.addEventListener('wheel', (e) => {
  if (settings.handleWheel(e)) return;
  if (!settings.open && hud.handleWheel(e)) e.preventDefault();
}, { passive: false, capture: true });
const lastWheel = new Map<string, number>();
controls.wheelAction = (e) => {
  if (settings.open || welcomeOpen) return false;
  const code = wheelBinding(e);
  const slot = code ? prefs.bar.findIndex((b, i) => b.key === code && slotShown(i, prefs.barRows)) : -1;
  if (slot < 0) return false;
  // One press per notch: a touchpad sends a stream of small turns.
  const now = performance.now();
  if (now - (lastWheel.get(code!) ?? 0) >= 100) {
    lastWheel.set(code!, now);
    pressSlot(slot);
  }
  return true;
};

window.addEventListener('keydown', (e) => {
  if (settings.handleKey(e)) return;
  if (!settings.open && hud.handleKey(e)) return;
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
    const slot = prefs.bar.findIndex((b, i) => b.key === binding && slotShown(i, prefs.barRows));
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
combat.on('ability', ({ animation }) => {
  if (animation) avatar().play(animation);
});
combat.on('shot', () => avatar().play('shoot'));
combat.on('petAttack', ({ kind }) => {
  if (kind === 'lash') companion?.play?.('slash');
  else if (kind === 'cast') companion?.play?.('cast');
  else if (kind !== 'firebolt') companion?.swing();
});

// Spell and weapon effects (src/combat-vfx.ts).
const vfx = new Vfx(world.scene);
const fx = wireVfx(combat, vfx, {
  // On the dummy's side that faces you, not inside it.
  chest: (u) => {
    const d = dummyOf(u);
    if (!d) return null;
    const c = d.headPosition.add(new THREE.Vector3(0, -0.75, 0));
    const toward = playerPos().setY(c.y).sub(c);
    if (toward.lengthSq() > 0.01) c.add(toward.normalize().multiplyScalar(0.4));
    return c;
  },
  feet: playerPos,
  hand: (side) => {
    const p = avatar() === character ? character.handPosition(side) : null;
    if (p) return p;
    // Animal forms: in front of the chest.
    return playerPos().add(new THREE.Vector3(Math.sin(controls.facing) * 0.5, 1.1, Math.cos(controls.facing) * 0.5));
  },
  totemHead: (slot, x, z) => totems.head(slot, x, z),
  pet: () => (companion?.root.visible ? companion.root.position.clone() : null),
});
combat.on('totem', ({ slot, id, x, z, facing }) => totems.set(slot, id, x, z, facing));

// Range rings around the target (melee weaving: melee range and Auto Shot's minimum), rebuilt when their sizes change.
const rings = new THREE.Group();
world.scene.add(rings);
let ringKey = '';
function updateRings(): void {
  const list = spec.rings?.(combat) ?? [];
  const t = combat.target;
  rings.visible = list.length > 0 && !!t;
  if (!rings.visible || !t) return;
  const key = list.map((r) => `${r.radius.toFixed(3)}:${r.color}`).join('|');
  if (key !== ringKey) {
    ringKey = key;
    for (const m of [...rings.children] as THREE.Mesh[]) {
      rings.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
    for (const r of list) {
      const m = new THREE.Mesh(new THREE.RingGeometry(r.radius - 0.04, r.radius + 0.04, 96),
        new THREE.MeshBasicMaterial({ color: r.color, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }));
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.02;
      rings.add(m);
    }
  }
  rings.position.set(t.x, 0, t.z);
}

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
    <p class="note disclaimer">${DISCLAIMER_SHORT_HTML} The dummy is a level 63 boss with ${prefs.enemy.armor} armor; change stats, armor and keys in Settings.</p>
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

/** Shooting (hunters): Auto Shot on and not swinging in melee (weaving), or casting a shot. The bow, gun or crossbow comes out. */
function shooting(): boolean {
  if (!combat.stats.ranged) return false;
  const t = combat.target;
  const meleeNow = combat.player.autoAttacking && !!t && combat.inRange(t);
  return (combat.autoShooting && !meleeNow) || (!!combat.casting && !!combat.ability(combat.casting.id)?.ranged);
}

function locomotion(moving: boolean, backwards: boolean, airborne: boolean, aiming: boolean): Locomotion {
  if (airborne) return 'air';
  if (combat.stealthed()) return moving ? 'sneakMove' : 'sneak';
  if (!moving && (combat.casting || combat.channeling)) return aiming ? 'aim' : 'cast';
  if (!moving) return aiming ? 'aim' : combat.player.inCombat || combat.player.autoAttacking ? 'ready' : 'idle';
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
  const aiming = shooting();
  character.setRangedMode(aiming);
  active.setLocomotion(locomotion(move.moving, move.backwards, move.airborne, aiming), move.backwards ? -move.speed : move.speed);
  active.update(dt);
  for (const d of dummies) d.dummy.update(dt, elapsed);
  fx.update(dt, elapsed);
  vfx.update(dt, world.camera, world.renderer.domElement.height);
  updateRings();
  totems.update(dt, elapsed);
  if (companion) updatePet(dt);
  world.update(dt, elapsed);
  hud.update();
  floaters.update();
  world.renderer.render(world.scene, world.camera);
  requestAnimationFrame(frame);
}

/** The pet stands where the engine moved it: running to its target, fighting there, or at your side. */
function updatePet(dt: number): void {
  const pet = companion;
  if (!pet) return;
  const st = combat.pet;
  pet.root.visible = st.out && Number.isFinite(st.x);
  if (!pet.root.visible) return;
  pet.root.position.set(st.x, 0, st.z);
  pet.root.rotation.y = st.facing;
  // 6.4 m/s is the run (7 yards per second); following a sprinting owner it runs faster.
  pet.setLocomotion(st.moving ? 'run' : st.attacking ? 'ready' : 'idle', st.moving ? 6.4 * Math.max(1, combat.moveSpeed()) : 0);
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
(window as unknown as { yard: unknown }).yard = { combat, controls, character, world, vfx, prefs: () => prefs };
