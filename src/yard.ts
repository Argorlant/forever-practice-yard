// The practice yard: the 3D scene, the engine, the HUD and Settings for the
// class in ?class= (the first screen, ./ui/picker.ts, links here).
import * as THREE from 'three';
import { Combat } from './engine/combat';
import type { Unit, Weapon } from './engine/types';
import { Beast, RACE_FORMS } from './scene/beast';
import { DRUID_FORMS, FORM_NAMES, druidFormKeys, type DruidForm } from './scene/druid-forms';
import { Character, type Locomotion } from './scene/character';
import { CustomModel } from './scene/custom-model';
import { CustomPlace } from './scene/custom-place';
import { factionForRace, trainingAreaKeys } from './scene/training-area';
import { Controls, DEFAULT_MOVE } from './scene/controls';
import { Dummy } from './scene/dummy';
import { Totems } from './scene/totems';
import { Vfx } from './scene/vfx';
import { wireVfx } from './combat-vfx';
import { OwnModel, downloads, localHas, localRaces, localSource, ownModelsSection } from './own-model';
import { OnyxiaFight, ROOM } from './encounters/onyxia';
import { OnyxiaView } from './encounter-view';
import type { EnemyView } from './scene/enemy';
import { showFightReview } from './ui/fight-review';
import { createWorld } from './scene/world';
import { SPECS, specById } from './specs';
import { UI, fmt } from './strings';
import { Floaters } from './ui/floaters';
import { isOldSheet } from './specs/gear';
import { addMissing, dropMissing, expandBar, fillExtraRows, noButton, slotShown } from './ui/bars';
import { Hud } from './ui/hud';
import { SettingsDialog, claimKey, defaultPrefs, type Prefs } from './ui/settings';
import { raidPicker } from './ui/raid-picker';
import { DISCLAIMER_SHORT_HTML } from './ui/disclaimer';
import { parseTalents, treeVersion } from './ui/talent-rules';
import { classKey, mainTree } from './ui/talents-data';
import { bindingFor, load, save, wheelBinding } from './ui/storage';

// The class comes from the URL (?class=warrior), else the last one played; ?build= picks a build.
const CLASS_KEY = 'fpy.class';
const params = new URLSearchParams(location.search);
const spec = specById(params.get('class') ?? load<string>(CLASS_KEY));
save(CLASS_KEY, spec.id);
document.title = `${spec.className} Rotations · WoW Forever`;
// v5: four action bar rows before the stance bar (v4: warriors got a stance bar; stats are gear only since v3).
const PREFS_KEY = `fpy.${spec.id}.v5${spec.prefsRevision ? `.r${spec.prefsRevision}` : ''}`;
const MODEL_URL = `${import.meta.env.BASE_URL}models/human.glb`;

const app = document.getElementById('app')!;
const loading = app.querySelector('.loading');
let loadingText = '', loadingFrom = 0, loadingMB = 0;
function showLoading(text: string): void {
  loadingText = text;
  loadingFrom = downloads.received;
  loadingMB = 0;
  if (loading) loading.textContent = text;
}
// How much has arrived, so a slow connection shows it is moving.
downloads.onProgress = () => {
  const mb = Math.floor((downloads.received - loadingFrom) / 1048576);
  if (mb > loadingMB && loading?.isConnected) { loadingMB = mb; loading.textContent = `${loadingText} ${mb} MB`; }
};
/** Covers the scene, with time stopped, while models it needs arrive. */
async function whileLoading(text: string, work: Promise<unknown>): Promise<void> {
  switchingModels = true;
  showLoading(text);
  if (loading) app.append(loading);
  try {
    await work;
  } catch (err) {
    console.error(err);
  } finally {
    loading?.remove();
    switchingModels = false;
  }
}

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
const PATCH = '2026-11-04.1';
// The builds' gear follows WoWSims Forever: a sheet nobody edited moves to its build's new one, a sheet of your own stays.
if (prefs.patch !== PATCH && isOldSheet(prefs.stats)) {
  const build = spec.builds?.find((b) => b.id === prefs.options.build);
  if (build) { prefs.stats = structuredClone(build.stats); Object.assign(prefs.options, build.options ?? {}); }
}
// Talents of your own saved for older trees would read as other talents now.
if (prefs.options.talents && prefs.options.talentsTree !== treeVersion(classKey(spec.className))) prefs.options.talents = '';

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
if (urlTalents !== null) { prefs.options.talents = urlTalents; prefs.options.talentsTree = treeVersion(classKey(spec.className)); refillRows = true; }
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
/** Where you start, and the fence's radius (a place of your own is bigger). */
const START_Z = controls.z;
const FENCE = controls.arenaRadius;
const character = new Character();
world.scene.add(character.root);
let previewForm: DruidForm | null = null;
let formSelect: HTMLSelectElement | null = null;
let formStatus: HTMLElement | null = null;
const initialDruidForm = spec.id === 'druid-cat' ? 'cat' : spec.id === 'druid-bear' ? 'bear' : 'moonkin';
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
/** `npm run dev`: a copy of a model yard-models.json names, ready to fight beside you. */
async function localFigure(key: string, scale = 1): Promise<CustomModel | null> {
  const source = await localSource(key);
  if (!source) return null;
  const figure = source.figure(source.defaultTurns, scale);
  figure.root.visible = true;
  world.scene.add(figure.root);
  return figure;
}
/** What fights beside you: the hunter's pet, or a warlock's demon drawn with the character model. */
interface Companion { root: THREE.Object3D; setLocomotion(state: Locomotion, speed?: number): void; update(dt: number): void; swing(): void; play?(name: string): void }
let companion: Companion | null = pet;
let minionId: string | null = null;
const companionReady = pet
  ? localFigure(`pet:${spec.id}`).then((figure) => {
    if (!figure) return;
    pet.root.removeFromParent();
    companion = figure;
  }) : Promise.resolve();
/** Loads the demon the build calls for (once per look); it shows while the pet is out. */
function syncMinion(): void {
  const want = spec.minion?.(combat) ?? null;
  if (!want || want.id === minionId) return;
  minionId = want.id;
  void localFigure(`minion:${want.id}`, want.scale).then((figure) => {
    if (minionId !== want.id) { figure?.dispose(); return; }
    if (figure) {
      if (companion && companion !== pet) world.scene.remove(companion.root);
      companion = figure;
    } else drawMinion(want);
  });
}
/** A demon drawn with the character model. */
function drawMinion(want: NonNullable<ReturnType<NonNullable<typeof spec.minion>>>): void {
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
const totemsReady = spec.className === 'Shaman'
  ? Promise.all(['searingTotem', 'magmaTotem', 'strengthOfEarthTotem', 'stoneskinTotem', 'graceOfAirTotem', 'windfuryTotem', 'manaSpringTotem']
    .map((id) => localSource(`totem:${id}`).then((source) => { if (source) totems.useModel(id, source); })))
  : Promise.resolve();

// ------------------------------------------------------ your own models
// Models from the player's own game files (Settings → Your own models), kept in
// this browser: the character (per class), the druid's forms, the dummy and the yard.
const CODE = (s: string) => `<code>${s}</code>`;
const LOCAL_RACE = `fpy.localRace.${classKey(spec.className)}`;
/** The race saved for this class. A race with no character model ("highorder", no sex) counts only for the specs that stay in form. */
const savedRace = (): string | null => {
  const race = load<string>(LOCAL_RACE);
  return race && !race.includes('-') && !spec.form ? null : race;
};
const currentRace = async () => savedRace() ?? (await localRaces(classKey(spec.className)))?.start;
/** The forms drawn in code take the race's colors. */
async function paintBeasts(): Promise<void> {
  const race = (await currentRace())?.split('-')[0];
  for (const kind of ['cat', 'bear'] as const) {
    const look = (race && RACE_FORMS[race]?.[kind]) || spec.forms?.[kind];
    if (look) beasts[kind]?.setLook(look);
  }
}
const ownPlayer = new OwnModel({
  key: classKey(spec.className), title: 'Your character', kind: 'figure',
  moments: ['stand', 'run', 'run backwards', 'attack', 'cast', 'shoot', 'jump'],
  hint: 'Characters tab: dress your character (Item Sets puts on a whole tier set), tick Export animations, then Export GLB. Helmets and shoulder pads go back on their attachment points.',
  localKeys: () => localPlayerKeys(savedRace()),
});
/** `npm run dev`: a model per spec, per talent tree for a class with one spec ("warrior:Fury"), and per race ("@human-m"). */
function localPlayerKeys(race: string | null): string[] {
  const cls = classKey(spec.className);
  const build = spec.builds?.find((b) => b.id === prefs.options.build);
  const tree = build?.talentString ? mainTree(cls, build.talentString)?.name : null;
  // Skyborne has no character model yet: out of form it stands as a Night Elf, the same one every time.
  const who = race ? `@${race.includes('-') ? race : 'nightelf-f'}` : '';
  return [`${spec.id}:${tree}${who}`, `${spec.id}${who}`];
}
const ownForms: Partial<Record<DruidForm, OwnModel>> = {};
for (const kind of DRUID_FORMS) {
  if (spec.className !== 'Druid') continue;
  ownForms[kind] = new OwnModel({
    key: `form-${kind}`, title: FORM_NAMES[kind], kind: 'figure', moments: ['stand', 'run', 'attack', 'jump'],
    hint: 'The published form follows your race: SD for Night Elf and Tauren; Skyborne keeps HD where SD is unavailable. You can import a replacement GLB with animations.',
    later: kind !== initialDruidForm,
    raceOnly: true,
    localKeys: async () => druidFormKeys(await currentRace(), kind),
  });
}
void paintBeasts();
const ownDummy = new OwnModel({
  key: 'dummy', title: 'Training dummy', kind: 'figure', moments: ['stand', 'wound'],
  hint: `Models tab: ${CODE('creature/object/woodendummy.m2')}, then Export GLB.`,
});
const ownYard = new OwnModel({
  key: 'yard', title: 'Training area', kind: 'place',
  localKeys: async () => trainingAreaKeys(await currentRace()),
  cacheKey: async () => `yard:${factionForRace(await currentRace())}`,
  hint: `A zone: Maps tab, Shift+click a map tile (Goldshire is Azeroth 31, 49), Export OBJ, then Load a map folder… here and pick wow.export's export folder (its Settings → Export Directory). Your browser may call this an upload: nothing leaves your computer. Or a building, an arena or a raid room: Models tab, WMO filter, such as ${CODE('stranglegladiatorarena.wmo')} (the Gurubashi Arena), Export GLB. Then walk to where the dummy should stand and press Put the dummy here.`,
});
const ownLair = new OwnModel({
  key: 'onyxia-lair', title: "Onyxia's lair", kind: 'place', later: true,
  hint: `For the Onyxia fight only; the training area above stays around the dummies. Models tab: ${CODE('world/wmo/dungeon/kl_onyxiaslair/kl_onyxiaslair.wmo')}, then Export GLB.`,
});
const ownOnyxia = new OwnModel({
  key: 'onyxia', title: 'Onyxia', kind: 'figure', moments: ['stand', 'attack', 'wound'], later: true,
  hint: `For the Onyxia fight. Models tab: ${CODE('creature/dragon/dragononyxia.m2')}, then Export GLB.`,
});
const ownWhelp = new OwnModel({
  key: 'onyxian-whelp', title: 'Onyxian Whelp', kind: 'figure', moments: ['stand', 'attack', 'wound'], later: true,
  hint: `For the Onyxia fight. Models tab: ${CODE('creature/dragonwhelp/dragonwhelp.m2')} with its black skin, then Export GLB.`,
});
const fightSlots = [ownLair, ownOnyxia, ownWhelp];
const ownSlots = [ownPlayer, ...Object.values(ownForms), ownDummy, ownYard, ...fightSlots];
/** The copies drawn now: yours, else null for the yard's own. */
let ownCharacter: CustomModel | null = null;
const ownForm: Partial<Record<DruidForm, CustomModel | null>> = {};
let place: CustomPlace | null = null;

/** A fresh copy of a slot's model, hidden until it is the one in use; the old copy goes. */
function figureOf(slot: OwnModel, old: CustomModel | null | undefined): CustomModel | null {
  old?.dispose();
  if (!slot.on) return null;
  const m = slot.source!.figure(slot.turns);
  m.root.visible = false;
  world.scene.add(m.root);
  return m;
}
ownPlayer.onChange = () => {
  ownCharacter = figureOf(ownPlayer, ownCharacter);
  dressOwn();
  if (!ownCharacter) void prepareFallback().catch((err) => console.error(err));
};
for (const [kind, slot] of Object.entries(ownForms) as [DruidForm, OwnModel][]) {
  slot.onChange = () => { ownForm[kind] = figureOf(slot, ownForm[kind]); updateFormStatus(); };
}

/** The floor under (x, z): flat in the yard, the place's own floors in yours. */
const groundY = (x: number, z: number, y = 0) => place?.groundAt(x, z, y) ?? 0;
controls.ground = groundY;
controls.canStep = (x, z, y, toX, toZ) => place?.canStep(x, z, y, toX, toZ) ?? true;
controls.clearance = (from, dir, far) => place?.clearance(from, dir, far) ?? far;
/**
 * The floor under what stands apart from you (a pet, a totem, a range ring). Near you it is the floor closest to your feet,
 * or level with you at a cliff's edge; further away, the floor seen from your height or the dummies', whichever is higher.
 */
const floorNear = (x: number, z: number): number => {
  if (!place) return 0;
  const y = controls.y;
  if (Math.hypot(x - controls.x, z - controls.z) >= 10) return place.groundAt(x, z, Math.max(0, y)) ?? Math.max(0, y);
  // From above your head too: on a slope the floor beside you can be higher than a step.
  const low = place.groundAt(x, z, y), high = place.groundAt(x, z, y + 2);
  const floor = low === null || (high !== null && Math.abs(high - y) < Math.abs(low - y)) ? high : low;
  return floor !== null && Math.abs(floor - y) < 3 ? floor : y;
};
totems.ground = floorNear;

/** The model that stands for the player right now. */
const avatar = () => {
  const form = previewForm ?? spec.form?.(combat) ?? null;
  if (form) return ownForm[form] || (form === 'cat' || form === 'bear' ? beasts[form] : null) || ownCharacter || character;
  return ownCharacter || character;
};

function updateFormStatus(): void {
  if (!formStatus) return;
  const form = previewForm ?? spec.form?.(combat) ?? null;
  const slot = form ? ownForms[form] : undefined;
  const definition = slot?.source?.scene.userData.definition;
  const detail = form ? `${FORM_NAMES[form]} · ${definition === 'hd' ? 'HD (Skyborne SD unavailable)' : definition === 'sd' ? 'SD' : slot?.personal ? 'your model' : slot?.loading ? 'loading' : 'model unavailable'}`
    : spec.id === 'druid-balance' && !combat.ability('moonkinForm')?.usable?.(combat) ? 'Humanoid · Moonkin requires its talent; preview is available' : 'Humanoid';
  const text = previewForm ? `Preview · practice paused. ${detail}.${previewForm === 'tree' ? ' Client model only; no healing simulation.' : previewForm === 'aquatic' ? ' Model preview on land; no swimming simulation.' : ''}` : `Practice · ${detail}`;
  if (formStatus.textContent !== text) formStatus.textContent = text;
}

// What you fight: the practice dummies, or an encounter's boss and adds (src/encounter-view.ts fills it then).
const dummies: { dummy: EnemyView; unit: Unit }[] = [];
function layoutDummies(n: number): void {
  for (const d of dummies) world.scene.remove(d.dummy.root);
  dummies.length = 0;
  const xs = n === 1 ? [0] : n === 2 ? [-1.5, 1.5] : [-2.8, 0, 2.8];
  xs.forEach((x, i) => {
    const dummy = new Dummy();
    dummy.root.position.set(x, groundY(x, 0), 0);
    dressDummy(dummy);
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

/** The dummy's own look: the straw one, or a model of yours. */
function dressDummy(dummy: Dummy): void {
  dummy.setModel(ownDummy.on ? ownDummy.source!.figure(ownDummy.turns) : null);
}
ownDummy.onChange = () => { for (const d of dummies) if (d.dummy instanceof Dummy) dressDummy(d.dummy); };

/** The yard built in code, or a place of yours around the dummies. */
function applyPlace(): void {
  place?.dispose();
  place = null;
  // The Onyxia fight in her lair if you have it; the dummies in your yard.
  const slot = fight && ownLair.on ? ownLair : ownYard;
  if (slot.on) {
    place = new CustomPlace(slot.source!, slot.anchor, slot.turns);
    world.scene.add(place.root);
    if (!slot.anchor) slot.setAnchor(place.anchor.toArray());
  }
  applyScenery();
}
/** Around the fight: the yard or your place; for Onyxia her lair (built in code, or just its cracks over your place). */
function applyScenery(): void {
  const lair = !!fightView;
  world.setEnvironment(!place && !lair, !place?.hasGround && !lair);
  fightView?.lair.setCave(!place);
  fightView?.lair.setFloor(place ? (x, z) => groundY(x, z, 3) : null);
  world.setAmbience(lair && !place ? 'cave' : 'dusk');
  // In a place of your own you can walk off to find a spot for the dummy; Onyxia's room has its walls.
  controls.arenaRadius = lair ? ROOM.radius - 1 : place ? 400 : FENCE;
  standOnFloors();
}
/** Dummies and you on the floor where you are. */
function standOnFloors(): void {
  if (!fight) for (const d of dummies) d.dummy.root.position.y = groundY(d.unit.x, d.unit.z);
  controls.y = groundY(controls.x, controls.z, controls.y);
  totems.settle();
}
ownYard.onChange = applyPlace;
ownLair.onChange = applyPlace;
ownYard.actions = [{
  label: 'Put the dummy here',
  title: "The floor where you stand becomes the center of the training area, where the dummies stand",
  run: () => {
    if (!place || fight) return;
    ownYard.setAnchor(place.centerOn(controls.x, controls.z, controls.y));
    // Back to the start, facing the dummy.
    controls.x = 0;
    controls.z = START_Z;
    controls.facing = 0;
    standOnFloors();
    settings.close();
  },
}];

function select(u: Unit | null): void {
  if (combat.target !== u) combat.stopAutoAttack();
  combat.target = u;
  for (const d of dummies) d.dummy.setSelected(d.unit === u);
}

function applyEnemy(): void {
  if (fight) {
    // An encounter: real health on both sides; its boss swings at you only if you are the tank.
    combat.healthLocked = false;
    combat.startHealth = 1;
    combat.playerHealthLocked = false;
    combat.enemyAttacks = { ...combat.enemyAttacks, on: false, speed: 2, damage: 3000 };
    combat.enemyAttacker = fight.boss;
    return;
  }
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
  dressOwn();
}

/** A published character holds what its talent tree's first build holds: a build or a choice in Settings that differs gets the yard's own weapon in that hand. A model you imported keeps its own. */
function dressOwn(): void {
  if (!ownCharacter) return;
  const st = prefs.stats;
  ownCharacter.setRanged(st.ranged?.type ?? null);
  const cls = classKey(spec.className);
  const tree = (talents?: string) => (talents ? mainTree(cls, talents)?.name : null);
  const current = spec.builds?.find((b) => b.id === prefs.options.build);
  const exported = ownPlayer.personal ? st : spec.builds?.find((b) => tree(b.talentString) === tree(current?.talentString))?.stats ?? spec.stats;
  // A weaving hunter swings its two-hander in plain sight, and a pair of weapons cannot stand for that.
  const asExported = ownPlayer.personal || !(prefs.options.meleeWeaving && st.mainHand.twoHand && ownCharacter.holdsPair);
  const same = (a?: Weapon | null, b?: Weapon | null) => asExported && a?.type === b?.type && !!a?.twoHand === !!b?.twoHand;
  ownCharacter.setMelee(
    same(st.mainHand, exported.mainHand) ? 'own' : st.mainHand.type,
    same(st.offHand, exported.offHand) ? 'own' : st.offHand?.type ?? null,
    !!st.mainHand.twoHand,
  );
}

function fullReset(): void {
  applyStats();
  applyEnemy();
  combat.reset();
  if (fight) {
    fight.reset();
    fightView!.reset();
    placeAtStart();
    select(fight.boss);
  }
  pullTimers.forEach(clearTimeout);
  pullTimers = [];
}

// ----------------------------------------------------------- encounters
let fight: OnyxiaFight | null = null;
let fightView: OnyxiaView | null = null;

/** You tank: a tank spec (bear, protection paladin, shaman tank) or a tank build (a protection warrior). */
const tanking = () => !!spec.tank || !!spec.builds?.find((b) => b.id === prefs.options.build)?.tank;

/** Training dummies, or an encounter: Onyxia, with a simulated tank (unless you are one) and healer. */
function setFight(id: string): void {
  if ((prefs.encounter ?? 'dummies') !== id) { prefs.encounter = id; persist(); }
  hud.setFight(id);
  if (fight) {
    fightView!.dispose();
    fightView = null;
    fight = null;
    combat.encounter = false;
    combat.enemyAttacker = null;
  }
  if (id === 'onyxia') {
    // Her lair and the dragons arrive the first time you go to her.
    const arriving = Promise.all(fightSlots.map((slot) => slot.start()));
    if (sceneUp && fightSlots.some((slot) => slot.loading)) void whileLoading("Loading Onyxia's lair…", arriving);
    for (const d of dummies) d.dummy.root.removeFromParent();
    dummies.length = 0;
    fight = new OnyxiaFight(combat, !tanking());
    combat.encounter = true;
    fightView = new OnyxiaView(fight, {
      scene: world.scene, camera: world.camera, vfx, hud, floaters, controls, combat, enemies: dummies, modelUrl: MODEL_URL,
      tankLook: tanking() ? null : specById('warrior').look, whelpTankLook: specById('warrior').look, healerLook: specById('priest-smite').look,
      raidModel: (role) => localFigure(`raid:${role}`),
      playerPos, groundAt: (x, z) => groundY(x, z, 3), onEnd: (r) => showFightReview(app, r, () => fullReset()),
    });
    dragonSources();
  } else {
    layoutDummies(prefs.targets);
  }
  applyPlace();
  fullReset();
  if (!fight) {
    // Back in front of the dummy.
    controls.x = 0;
    controls.z = START_Z;
    controls.facing = 0;
    standOnFloors();
  }
}
/** Your own Onyxia and whelp models, when you have them on. */
function dragonSources(): void {
  fightView?.setSources(ownOnyxia.on ? ownOnyxia.source : null, ownWhelp.on ? ownWhelp.source : null);
}
ownOnyxia.onChange = dragonSources;
ownWhelp.onChange = dragonSources;

/** At the room's west side, facing her. */
function placeAtStart(): void {
  controls.x = ROOM.start.x;
  controls.z = ROOM.start.z;
  controls.facing = Math.atan2(-ROOM.start.x, -ROOM.start.z);
  controls.y = groundY(controls.x, controls.z, 5);
}

/** The pull: she wakes; with you as the tank she swings at you. */
function startFight(): void {
  if (previewForm) return;
  if (!fight || fight.phase) return;
  fight.start();
  if (!fight.tankBot) {
    combat.enemyAttacks.on = true;
    combat.enemyAttacker = fight.boss;
  }
}

layoutDummies(prefs.targets);
applyEnemy();
applyStats();
combat.reset();
/** The game update the yard follows: on the first visit after it, abilities it added get a button in an empty slot. */
const newPatch = refillRows || prefs.patch !== PATCH;
dropMissing(prefs.bar, combat);
if (refillRows) { fillExtraRows(prefs.bar, combat); prefs.patch = PATCH; persist(); }
else if (prefs.patch !== PATCH) { addMissing(prefs.bar, combat); prefs.patch = PATCH; persist(); }
/** Your race decides your racials: one you no longer have leaves the bar, and yours takes an empty slot. */
function setRace(race: string | null | undefined, join: boolean): void {
  combat.race = race ?? '';
  const mine = combat.race.split('-')[0];
  for (const b of prefs.bar) {
    const r = b.id ? combat.ability(b.id)?.race : undefined;
    if (r && !r.includes(mine)) b.id = null;
  }
  if (join) addMissing(prefs.bar, combat);
  persist();
  hud.refreshBar();
}
void currentRace().then((race) => setRace(race, newPatch));
syncMinion();
combat.on('reset', () => { totems.clear(); syncMinion(); });

// ------------------------------------------------------------------ HUD
let pullTimers: number[] = [];
const hud = new Hud(app, combat, prefs.bar, {
  settings: () => settings.show(),
  reset: () => fullReset(),
  pull: () => startPull(),
  fight: (id) => setFight(id),
  targets: (n) => {
    if (fight) return;
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
  place: (slot, id) => {
    if (noButton(combat.ability(id), combat)) { hud.showError(UI.noTalent); return; }
    prefs.bar[slot].id = id;
    barChanged();
  },
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
// Race and sex from the published selection (or wow.export during development).
{
  void localRaces(classKey(spec.className)).then(async (races) => {
    if (!races) return;
    const sel = document.createElement('select');
    sel.className = 'fight-select';
    sel.title = "Your character's race and sex";
    const label = (who: string) => {
      const [race, sex] = who.split('-');
      const name = { nightelf: 'Night Elf', highorder: 'Skyborne (High Order)', windshaper: 'Skyborne (Windshaper)' }[race] ?? race[0].toUpperCase() + race.slice(1);
      return sex ? `${name} ${sex === 'm' ? 'male' : 'female'}` : name;
    };
    const current = savedRace() ?? races.start;
    // The specs that stay in form need no character model: Skyborne druids are there even without one.
    const formOnly = spec.form ? ['highorder', 'windshaper'].filter((race) => !races.list.some((who) => who.startsWith(race))) : [];
    for (const who of [...races.list, ...formOnly]) {
      const option = new Option(label(who), who, false, who === current);
      // Not exported yet.
      option.disabled = !spec.form && !(await localHas(localPlayerKeys(who)));
      sel.append(option);
    }
    sel.addEventListener('change', async () => {
      save(LOCAL_RACE, sel.value);
      setRace(sel.value, true);
      sel.blur();
      sel.disabled = true;
      if (formSelect) formSelect.disabled = true;
      await whileLoading('Loading your character and training area…', Promise.all([ownPlayer.refreshLocal(), ownYard.refreshLocal(), ...Object.values(ownForms).filter((slot) => !slot.loading).map((slot) => slot.refreshLocal()), paintBeasts()]));
      sel.disabled = false;
      if (formSelect) formSelect.disabled = false;
      updateFormStatus();
    });
    hud.root.querySelector('.hud-right')?.prepend(sel);
  });
}
if (spec.className === 'Druid') {
  const panel = document.createElement('div');
  panel.className = 'druid-form-picker';
  const label = document.createElement('label');
  label.textContent = 'Druid forms';
  formSelect = document.createElement('select');
  formSelect.title = 'Druid form preview';
  formSelect.append(new Option('Practice form (automatic)', ''));
  for (const kind of DRUID_FORMS) formSelect.append(new Option(FORM_NAMES[kind], kind));
  formStatus = document.createElement('p');
  formStatus.setAttribute('role', 'status');
  label.append(formSelect);
  panel.append(label, formStatus);
  hud.root.append(panel);
  formSelect.addEventListener('change', async () => {
    previewForm = formSelect!.value as DruidForm || null;
    pullTimers.forEach(clearTimeout); pullTimers = [];
    hud.showCountdown('');
    formSelect!.blur();
    formSelect!.disabled = true;
    if (previewForm) {
      const slot = ownForms[previewForm]!;
      await whileLoading(`Loading ${FORM_NAMES[previewForm]}…`, slot.start().then(() => slot.refreshLocal()));
    }
    formSelect!.disabled = false;
    updateFormStatus();
  });
  updateFormStatus();
}
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
    const encounter = prefs.encounter;
    prefs = defaultPrefs(spec, DEFAULT_MOVE);
    prefs.targets = targets;
    prefs.encounter = encounter;
    prefs.seenWelcome = true;
    controls.bindings = prefs.move;
    settings.setPrefs(prefs);
    rebuildHudBindings();
    applyStats();
    applyEnemy();
    combat.reset();
    dropMissing(prefs.bar, combat);
    fillExtraRows(prefs.bar, combat);
  }
  if (what === 'build' && applyBuild(String(prefs.options.build))) {
    applyEnemy();
    void ownPlayer.refreshLocal();
  }
  if (what === 'stats' || what === 'options' || what === 'build' || what === 'talents') { applyStats(); combat.reset(); }
  // A build's layout or your own talents: what they lack has no button, and what yours unlock gets one on rows 3 and 4.
  if (what === 'talents' || what === 'build') dropMissing(prefs.bar, combat);
  if (what === 'talents') addMissing(prefs.bar, combat);
  // Rows 3 and 4 take what the new build can use and has no button for.
  if (what === 'build') fillExtraRows(prefs.bar, combat);
  // A tank build tanks Onyxia itself: the fight starts over with or without the simulated tank.
  if (what === 'build' && fight) setFight('onyxia');
  if (what === 'enemy') applyEnemy();
  hud.setRows(prefs.barRows);
  hud.setMeterVisible(prefs.meter);
  hud.setSuggestions(prefs.suggest);
  controls.bindings = prefs.move;
  hud.refreshBar();
  persist();
});

settings.ownModel = (sec) => ownModelsSection(sec, ownSlots);

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
  if (previewForm) { hud.showError('Return to Practice form to resume combat.'); return; }
  pullTimers.forEach(clearTimeout);
  pullTimers = [];
  for (let i = 10; i >= 1; i--) {
    pullTimers.push(window.setTimeout(() => hud.showCountdown(String(i)), (10 - i) * 1000));
  }
  pullTimers.push(window.setTimeout(() => {
    hud.showCountdown(UI.go, false);
    combat.clearMeter();
    startFight();
  }, 10_000));
}

// --------------------------------------------------------------- input
function pressSlot(slot: number): void {
  if (previewForm) { hud.showError('Return to Practice form to resume combat.'); return; }
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
    const list = dummies.filter((d) => d.unit.health > 0).map((d) => d.unit);
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
      if (button === 2 && !previewForm) combat.startAutoAttack();
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
  // Hitting a sleeping Onyxia pulls her.
  if (fight && !fight.phase && hit.target === fight.boss) startFight();
  const d = dummyOf(hit.target);
  if (!d) return;
  floaters.damage(hit, d.headPosition);
  if (!hit.periodic && hit.amount > 0 && hit.school === 'physical') {
    d.hit(playerPos(), hit.outcome === 'crit' ? 1.6 : hit.white ? 0.6 : 1);
  }
});
combat.on('swing', () => avatar().swing());
combat.on('ability', ({ id, animation }) => {
  const a = avatar();
  // Models of your own have WoW's animation for some abilities (Maul, Claw, Whirlwind).
  if (a instanceof CustomModel) a.playAbility(id, animation);
  else if (animation) a.play(animation);
});
combat.on('shot', () => avatar().play('shoot'));
// A form with its own page, a form whose model is not loaded yet, and a demon just summoned.
combat.on('switchSpec', (id) => {
  save(CLASS_KEY, id);
  const url = new URL(location.href);
  url.searchParams.set('class', id);
  location.href = url.toString();
});
combat.on('ability', () => {
  const form = spec.form?.(combat);
  const slot = form ? ownForms[form] : undefined;
  if (slot && !slot.source) void slot.start().then(() => slot.refreshLocal());
  syncMinion();
});
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
    const a = avatar();
    const p = a === character || a instanceof CustomModel ? a.handPosition(side) : null;
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
  rings.position.set(t.x, floorNear(t.x, t.z), t.z);
}

combat.on('note', ({ text, kind }) => {
  floaters.note(text, playerPos().add(new THREE.Vector3(0, 2.1, 0)), kind === 'proc' ? 'ft-proc' : 'ft-note');
});

combat.on('death', (u) => {
  // An encounter's adds die by the dozen (the whelp groups kill most): only its boss gets the word.
  if (fight && u !== fight.boss) return;
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
  // An encounter shows its review first; the dummy just starts over.
  if (!fight) window.setTimeout(() => fullReset(), 1500);
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
let switchingModels = false;
/** The first frame has been drawn. */
let sceneUp = false;

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
  if (switchingModels) { requestAnimationFrame(frame); return; }
  if (!previewForm) elapsed += dt;
  const move = controls.update(dt);
  if (dash && !previewForm) {
    dash.t = Math.min(1, dash.t + dt / 0.25);
    const x = dash.fromX + (dash.toX - dash.fromX) * dash.t;
    const z = dash.fromZ + (dash.toZ - dash.fromZ) * dash.t;
    // A wall in the way ends the rush.
    const clear = controls.canStep(controls.x, controls.z, controls.y, x, z);
    if (clear) { controls.x = x; controls.z = z; }
    if (!clear || dash.t >= 1) dash = null;
  }
  const p = combat.player;
  p.x = controls.x; p.z = controls.z; p.facing = controls.facing; p.moving = move.moving;
  // The attacking dummy turns to face you.
  if (!fight) {
    for (const { dummy, unit } of dummies) {
      const facing = combat.enemyAttacks.on && unit === combat.target ? Math.atan2(controls.x - unit.x, controls.z - unit.z) : 0;
      unit.facing = facing;
      dummy.root.rotation.y = facing;
    }
  }
  if (!previewForm) combat.update(dt);
  if (fight && !previewForm) {
    fight.update(dt);
    // Her body is in the way on the ground; in the air you walk under her.
    const b = fight.boss;
    controls.obstacles = fight.pose === 'ground' || fight.pose === 'asleep' || fight.pose === 'dead' ? [{ x: b.x, z: b.z, r: 4 }] : [];
  }

  const active = avatar();
  for (const a of [character, ownCharacter, ...Object.values(ownForm), beasts.cat, beasts.bear]) if (a) a.root.visible = a === active;
  active.root.position.set(controls.x, controls.y, controls.z);
  active.root.rotation.y = controls.facing;
  active.setBodyYaw(move.moving ? move.bodyYaw : 0);
  const aiming = shooting();
  character.setRangedMode(aiming);
  ownCharacter?.setRangedMode(aiming);
  active.setLocomotion(previewForm ? move.moving ? 'run' : 'idle' : locomotion(move.moving, move.backwards, move.airborne, aiming), move.backwards ? -move.speed : move.speed);
  if (active instanceof CustomModel) active.setPose(previewForm === 'aquatic' ? [move.moving ? 'swim' : 'swimidle'] : null);
  active.update(dt);
  if (fightView) fightView.update(dt, elapsed);
  else for (const d of dummies) d.dummy.update(dt, elapsed);
  fx.update(dt, elapsed);
  vfx.update(dt, world.camera, world.renderer.domElement.height);
  updateRings();
  totems.update(dt, elapsed);
  if (companion) updatePet(dt);
  world.update(dt, elapsed);
  hud.update();
  updateFormStatus();
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
  pet.root.position.set(st.x, floorNear(st.x, st.z), st.z);
  pet.root.rotation.y = st.facing;
  // 6.4 m/s is the run (7 yards per second); following a sprinting owner it runs faster.
  pet.setLocomotion(st.moving ? 'run' : st.attacking ? 'ready' : 'idle', st.moving ? 6.4 * Math.max(1, combat.moveSpeed()) : 0);
  pet.update(dt);
}

window.addEventListener('resize', () => world.resize());

if (prefs.encounter && prefs.encounter !== 'dummies') setFight(prefs.encounter);
else hud.setFight('dummies');

let fallbackLoad: Promise<void> | null = null;
function prepareFallback(): Promise<void> {
  return fallbackLoad ??= character.load(MODEL_URL, spec.look).then(equip);
}

showLoading('Loading your character and training area…');
Promise.all([...ownSlots.filter((slot) => !slot.slot.later || (fight && fightSlots.includes(slot))).map((slot) => slot.ready), companionReady, totemsReady]).then(async () => {
  // The very first rendered frame already has the WoW character, dummy, map
  // and companion. Load the mannequin only when a custom character is absent
  // or the player explicitly switches it off.
  if (!ownPlayer.on) await prepareFallback();
  loading?.remove();
  sceneUp = true;
  equip();
  clock.start();
  requestAnimationFrame(frame);
  if (!prefs.seenWelcome) showWelcome();
}).catch((err) => {
  console.error(err);
  if (loading) loading.textContent = 'Could not load the training area. Reload to try again.';
});

// Debug handle for automated checks.
(window as unknown as { yard: unknown }).yard = {
  combat, controls, character, world, vfx, prefs: () => prefs,
  own: { slots: ownSlots, player: () => ownCharacter, forms: ownForm, place: () => place, dummies: () => dummies },
  fight: () => fight,
  startFight,
};
