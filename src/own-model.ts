// Settings → Your own models: models of the player's own, drawn instead of the
// yard's: their character, the druid's cat and bear, the training dummy and the
// yard itself (src/scene/custom-model.ts, src/scene/custom-place.ts). All are
// optional and the yard's own stay the default. The files stay in this browser
// (src/ui/model-store.ts). The owner's published exports are also available as
// defaults; models a visitor imports stay in that visitor's browser.
import { AdditiveBlending, type Mesh } from 'three';
import { loadModelSource, type ModelFile, type ModelSource } from './scene/custom-model';
import { isMapExport, loadMapSource } from './scene/wow-map';
import { unpackMapBundle } from './scene/model-bundle';
import { deleteModel, getModel, putModel, type StoredModel } from './ui/model-store';

const EXPORT_LINK = '<a href="https://github.com/Kruithne/wow.export" target="_blank" rel="noopener">wow.export</a>';

export interface SlotSpec {
  /** Store key: one model per key. */
  key: string;
  title: string;
  /** Where to find it in wow.export (HTML). */
  hint: string;
  /** A figure moves (character, form, dummy); a place is the yard around you. */
  kind: 'figure' | 'place';
  /** For a figure: the moments Settings reports as found or missing. */
  moments?: string[];
  /** Names in the published selection or local yard-models.json, best first. */
  localKeys?: () => string[] | Promise<string[]>;
  /** Separate saved places (and anchors) for each faction. */
  cacheKey?: () => string | Promise<string>;
}

interface HostedModels {
  models: Record<string, string>;
  dependencies: Record<string, string[]>;
  maps: Record<string, string[]>;
  archives?: Record<string, string>;
  gzip: string[];
  revision: string;
}

const HOSTED_ROOT = `${import.meta.env.BASE_URL}wow/`;
const hosted: Promise<HostedModels | null> = import.meta.env.DEV ? Promise.resolve(null)
  : fetch(`${HOSTED_ROOT}manifest.json`).then((r) => r.ok ? r.json() : null).catch(() => null);
/** Local development reads wow.export directly; production reads its prepared static selection. */
const localMap: Promise<Record<string, string>> = import.meta.env.DEV
  ? fetch('/@local-wow/yard-models.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({}))
  : hosted.then((h) => h?.models ?? {});

/** The file for the first key that has one; a key without a race ("warrior:Fury") means the class's default race. */
async function localFile(keys: string[]): Promise<string | null> {
  const map = await localMap;
  for (const k of keys) {
    const file = map[k] ?? map[`${k}@${map[`@default:${k.split(/[-:@]/)[0]}`]}`];
    if (file) return file;
  }
  return null;
}

/** The races and sexes available for the class, and its default. */
export async function localRaces(cls: string): Promise<{ list: string[]; start: string } | null> {
  const map = await localMap;
  const list = map[`@races:${cls}`]?.split(',');
  return list ? { list, start: map[`@default:${cls}`] ?? list[0] } : null;
}

/** Whether the selected model is available. */
export async function localHas(keys: string[]): Promise<boolean> {
  const file = await localFile(keys);
  if (!import.meta.env.DEV) return !!file;
  return !!file && (await fetch(`/@local-wow/${file}`, { method: 'HEAD' })).ok;
}

async function hostedFile(name: string, h: HostedModels): Promise<ModelFile> {
  const compressed = h.gzip.includes(name) || name.endsWith('.gz');
  // Ampersands are valid in path segments. Vite's static preview expects them
  // literally (wow.export uses folders such as food&utensils).
  const path = name.split('/').map((part) => encodeURIComponent(part).replace(/%26/gi, '&')).join('/');
  const url = `${HOSTED_ROOT}${path}${h.gzip.includes(name) ? '.gz' : ''}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${name} (${response.status}).`);
  if (response.headers.get('content-type')?.includes('text/html')) throw new Error(`Missing model file: ${name}.`);
  // Some static servers set Content-Encoding for .gz and the browser already
  // decompresses it; others serve the gzip file as an ordinary binary asset.
  const payload = await response.blob();
  const magic = new Uint8Array(await payload.slice(0, 2).arrayBuffer());
  const data = compressed && magic[0] === 0x1f && magic[1] === 0x8b
    ? await new Response(payload.stream().pipeThrough(new DecompressionStream('gzip'))).blob()
    : payload;
  return { name, data };
}

async function modelLabel(file: string): Promise<string> {
  const h = await hosted;
  return h ? `hosted:${h.revision}:${file}` : file;
}

async function localModel(keys: string[]): Promise<StoredModel | null> {
  const file = await localFile(keys);
  if (!file) return null;
  const h = await hosted;
  if (h) {
    const archive = h.archives?.[file];
    if (archive) {
      const bundle = await hostedFile(archive, h);
      return { files: await unpackMapBundle(bundle.data), label: await modelLabel(file), rotation: 0, enabled: true };
    }
    const names = file.startsWith('map:') ? h.maps[file] : [file, ...(h.dependencies[file] ?? [])];
    if (!names?.length) return null;
    const files: ModelFile[] = new Array(names.length);
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(12, names.length) }, async () => {
      for (let i = next++; i < names.length; i = next++) files[i] = await hostedFile(names[i], h);
    }));
    return { files, label: await modelLabel(file), rotation: 0, enabled: true };
  }
  if (!import.meta.env.DEV) return null;
  if (file.startsWith('map:')) {
    const names: string[] = await (await fetch(`/@local-wow/@list?dirs=${file.slice(4)}`)).json();
    const files: ModelFile[] = new Array(names.length);
    let next = 0;
    await Promise.all(Array.from({ length: 12 }, async () => {
      for (let i = next++; i < names.length; i = next++) {
        files[i] = { name: names[i], data: await (await fetch(`/@local-wow/${names[i].split('/').map(encodeURIComponent).join('/')}`)).blob() };
      }
    }));
    return { files, label: file, rotation: 0, enabled: true };
  }
  const res = await fetch(`/@local-wow/${file}`);
  if (!res.ok) return null;
  return { files: [{ name: file.split('/').pop()!, data: await res.blob() }], label: file, rotation: 0, enabled: true };
}

/** The game adds glows and runes to what is behind them; exported as plain textures, their black backgrounds show as dark squares. */
function blendGlows(source: ModelSource): ModelSource {
  source.scene.traverse((o) => {
    const m = o as Mesh;
    if (!m.isMesh) return;
    for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
      if (!/glow|rune|flame/i.test(mat.name)) continue;
      mat.transparent = true;
      mat.blending = AdditiveBlending;
      mat.depthWrite = false;
    }
  });
  return source;
}

const localSources = new Map<string, Promise<ModelSource | null>>();
/** Models for companions, totems and the simulated raid. */
export function localSource(key: string): Promise<ModelSource | null> {
  let source = localSources.get(key);
  if (!source) {
    source = localModel([key]).then((m) => (m ? loadModelSource(m.files).then(blendGlows) : null)).catch(() => null);
    localSources.set(key, source);
  }
  return source;
}

/** A button the yard adds to a slot while its model is on ("Put the dummy here"). */
export interface SlotAction { label: string; title: string; run(): void }

export class OwnModel {
  /** Settles after the saved/hosted model is built and its onChange has run. */
  readonly ready: Promise<void>;
  source: ModelSource | null = null;
  private stored: StoredModel | null = null;
  private status = '';
  private error = false;
  private busy = true;
  private box: HTMLElement | null = null;
  /** The yard redraws what this slot stands for: the model, whether it is on, or its turn changed. */
  onChange: () => void = () => {};
  actions: SlotAction[] = [];
  private localFile: string | null = null;
  private storageKey: string;

  constructor(readonly slot: SlotSpec) {
    this.storageKey = slot.key;
    this.ready = this.restore().finally(() => { this.busy = false; this.draw(); this.onChange(); });
  }

  /** Imported models stay personal; the hosted selection supplies defaults for empty slots. */
  private async restore(): Promise<void> {
    this.storageKey = await (this.slot.cacheKey?.() ?? this.slot.key);
    const kept = await getModel(this.storageKey)
      ?? (this.storageKey !== this.slot.key ? await getModel(this.slot.key) : null);
    const keys = await (this.slot.localKeys?.() ?? [this.slot.key]);
    const file = await localFile(keys);
    const name = file ? await modelLabel(file) : null;
    // Already kept in this browser (with its anchor): a zone's files are not fetched again.
    const personal = kept && !kept.label.startsWith('hosted:') && !import.meta.env.DEV;
    const local = name && kept?.label !== name && !personal ? await localModel(keys).catch((err) => {
      console.error(err);
      return null;
    }) : null;
    const s = local ?? kept;
    if (!s) return;
    const samePlace = !!(local && kept?.label.startsWith('hosted:') && this.slot.kind === 'place'
      && kept.label.split(':').slice(2).join(':') === file);
    if (samePlace && kept) {
      local.anchor = kept.anchor;
      local.rotation = kept.rotation;
      local.enabled = kept.enabled;
    }
    this.localFile = local?.label ?? (name === kept?.label ? name : null);
    this.stored = s;
    const built = await this.build(s.files, !local);
    if (local && this.slot.kind === 'figure' && this.source) local.rotation = this.source.defaultTurns;
    if (local && this.slot.kind === 'place' && built) {
      if (!samePlace) local.rotation = Number(this.source?.scene.userData.defaultRotation ?? 0);
      local.files = built.keep;
      void putModel(this.storageKey, local);
    }
  }

  /** Refresh the character after a race or talent build change. */
  async refreshLocal(): Promise<void> {
    if (!this.slot.localKeys) return;
    const file = await localFile(await this.slot.localKeys());
    if (!file || await modelLabel(file) === this.localFile) return;
    // A deliberate race/build change replaces the currently selected figure.
    if (!import.meta.env.DEV && this.slot.kind === 'figure') await deleteModel(this.storageKey);
    this.busy = true;
    this.draw();
    await this.restore();
    this.busy = false;
    this.draw();
    this.onChange();
  }

  /** There is a model and it is switched on. */
  get on(): boolean { return !!(this.stored?.enabled && this.source); }
  get turns(): number { return this.stored?.rotation ?? 0; }
  get anchor(): number[] | null { return this.stored?.anchor ?? null; }

  setAnchor(a: number[]): void {
    if (!this.stored) return;
    this.stored.anchor = a;
    void putModel(this.storageKey, this.stored);
  }

  /** Reads the files; returns the ones to keep (a map export keeps only what the zone uses) and a label, or null. */
  private async build(files: ModelFile[], restoring = false): Promise<{ keep: ModelFile[]; label: string | null } | null> {
    try {
      if (this.slot.kind === 'place' && isMapExport(files)) {
        const map = await loadMapSource(files, restoring);
        this.source?.dispose();
        this.source = map.source;
        const mb = map.keep.reduce((n, f) => n + f.data.size, 0) / 1e6;
        this.status = [this.describe(map.source), `${mb.toFixed(0)} MB kept in this browser.`, ...map.notes].join(' ');
        this.error = false;
        return { keep: map.keep, label: map.label };
      }
      const source = await loadModelSource(files);
      this.source?.dispose();
      this.source = source;
      this.status = this.describe(source);
      this.error = false;
      return { keep: files, label: null };
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      // A .gltf whose .bin or textures were left out.
      const lost = msg.match(/Failed to load (?:buffer|texture) "(?:.*[\\/])?([^"\\/]+)"/i);
      let name = lost?.[1] ?? '';
      try { name = decodeURIComponent(name); } catch { /* as written */ }
      this.status = lost ? `It needs ${name}: choose it together with the .gltf (select all of the export's files at once).`
        : `Could not read this model: ${msg}`;
      this.error = true;
      return null;
    }
  }

  private describe(source: ModelSource): string {
    const files = source.missingFiles.length
      ? ` Missing ${source.missingFiles.join(', ')}: load it again with every file of the export selected.` : '';
    if (this.slot.kind === 'place') {
      let triangles = 0;
      source.scene.traverse((o) => {
        const m = o as { geometry?: { index: { count: number } | null; attributes: { position: { count: number } } }; isInstancedMesh?: boolean; count?: number };
        const g = m.geometry;
        if (g) triangles += ((g.index ? g.index.count : g.attributes.position.count) / 3) * (m.isInstancedMesh ? m.count ?? 1 : 1);
      });
      return `${Math.round(triangles).toLocaleString('en')} triangles. Walk to where the dummy should stand and press Put the dummy here.${files}`;
    }
    if (!source.animations.length) return `It has no animations, so it will stand still. Export it again with its animations.${files}`;
    const m = source.figure();
    const moments = this.slot.moments ?? [];
    const found = moments.filter((k) => m.has(k));
    const missing = moments.filter((k) => !m.has(k));
    m.dispose();
    const text = `Animations for: ${found.join(', ') || 'none of the yard\'s moments'}.`;
    return (missing.length ? `${text} Not found: ${missing.join(', ')}; there it uses the closest one it has, or none.` : text) + files;
  }

  /** Files picked, dropped, or from a folder (named by their path in it, as a map export needs). */
  private async load(list: File[]): Promise<void> {
    if (!list.length || this.busy) return;
    this.busy = true;
    this.status = list.length > 20 ? `Reading ${list.length} files…` : 'Reading the model…';
    this.error = false;
    this.draw();
    const files = list.map((f) => ({ name: pathOf(f), type: f.type, data: f as Blob }));
    const built = await this.build(files);
    if (built) {
      const main = files.find((f) => /\.gl(b|tf)$/i.test(f.name));
      const turns = this.slot.kind === 'figure' ? this.source!.defaultTurns : 0;
      this.stored = { files: built.keep, label: built.label ?? main?.name ?? 'model', rotation: turns, enabled: true };
      if (!(await putModel(this.storageKey, this.stored))) {
        this.status += ' This browser would not keep it (a private window, or no room), so it lasts until you reload.';
      }
    }
    this.busy = false;
    this.draw();
    this.onChange();
  }

  private save(): void {
    if (this.stored) void putModel(this.storageKey, this.stored);
    this.draw();
    this.onChange();
  }

  private async remove(): Promise<void> {
    await deleteModel(this.storageKey);
    this.source?.dispose();
    this.source = null;
    this.stored = null;
    this.status = '';
    this.error = false;
    this.draw();
    this.onChange();
  }

  /** Fills this slot's part of the Settings section; it redraws itself as the model loads. */
  panel(parent: HTMLElement): void {
    this.box = el('div', 'own-model');
    parent.append(this.box);
    this.draw();
  }

  private draw(): void {
    const box = this.box;
    if (!box?.isConnected) return;
    box.innerHTML = '';
    box.append(el('h4', '', this.slot.title), el('p', 'note', this.slot.hint));
    const s = this.stored;
    if (s) {
      const row = el('label', 'field toggle');
      const label = s.label.startsWith('hosted:')
        ? (s.label.includes(':map:') ? 'Published map' : s.label.split('/').pop()!) : s.label;
      row.append(el('span', '', `Use <b>${escapeHtml(label)}</b>`));
      const on = document.createElement('input');
      on.type = 'checkbox';
      on.checked = s.enabled;
      on.disabled = !this.source;
      on.addEventListener('change', () => { s.enabled = on.checked; this.save(); });
      row.append(on);
      box.append(row);
    }
    const buttons = el('div', 'presets');
    const pick = el('label', 'hud-btn small file-btn', s ? 'Load another…' : 'Load a model…');
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.glb,.gltf,.bin,image/*';
    input.disabled = this.busy;
    input.addEventListener('change', () => void this.load([...(input.files ?? [])]));
    pick.append(input);
    buttons.append(pick);
    if (this.slot.kind === 'place') {
      // A zone: wow.export's export folder, with the tiles and every model they place.
      const folder = el('label', 'hud-btn small file-btn', 'Load a map folder…');
      folder.title = "wow.export's export folder (its Settings → Export Directory)";
      const dirInput = document.createElement('input');
      dirInput.type = 'file';
      dirInput.webkitdirectory = true;
      dirInput.disabled = this.busy;
      dirInput.addEventListener('change', () => void this.load([...(dirInput.files ?? [])]));
      folder.append(dirInput);
      buttons.append(folder);
    }
    if (s && this.source) {
      const turn = el('button', 'hud-btn small', 'Turn 90°');
      turn.title = this.slot.kind === 'place' ? 'Turn the place around the dummy' : 'If it faces sideways or away';
      turn.addEventListener('click', () => { s.rotation = (s.rotation + 1) % 4; this.save(); });
      buttons.append(turn);
      if (this.on) {
        for (const a of this.actions) {
          const b = el('button', 'hud-btn small', a.label);
          b.title = a.title;
          b.addEventListener('click', () => a.run());
          buttons.append(b);
        }
      }
    }
    if (s) {
      const del = el('button', 'hud-btn small', 'Remove');
      del.addEventListener('click', () => void this.remove());
      buttons.append(del);
    }
    box.append(buttons);
    if (this.status) box.append(el('p', this.error ? 'note own-model-error' : 'note', escapeHtml(this.status)));
    // Files dropped on the slot load too.
    box.ondragover = (e) => { e.preventDefault(); box.classList.add('drop'); };
    box.ondragleave = () => box.classList.remove('drop');
    box.ondrop = (e) => {
      e.preventDefault();
      box.classList.remove('drop');
      if (e.dataTransfer) void droppedFiles(e.dataTransfer).then((list) => this.load(list));
    };
  }
}

/** A file's path in the folder it was picked from (or just its name). */
const paths = new WeakMap<File, string>();
const pathOf = (f: File) => paths.get(f) || f.webkitRelativePath || f.name;

/** Files dropped, folders included (walked through, keeping each file's path). */
async function droppedFiles(dt: DataTransfer): Promise<File[]> {
  const entries = [...dt.items].map((i) => i.webkitGetAsEntry?.()).filter((e): e is FileSystemEntry => !!e);
  if (!entries.some((e) => e.isDirectory)) return [...dt.files];
  const out: File[] = [];
  const walk = async (entry: FileSystemEntry): Promise<void> => {
    if (entry.isFile) {
      const file = await new Promise<File>((ok, fail) => (entry as FileSystemFileEntry).file(ok, fail));
      paths.set(file, entry.fullPath.replace(/^\//, ''));
      out.push(file);
      return;
    }
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    // A directory reader hands out its entries in batches until an empty one.
    for (;;) {
      const batch = await new Promise<FileSystemEntry[]>((ok, fail) => reader.readEntries(ok, fail));
      if (!batch.length) break;
      for (const e of batch) await walk(e);
    }
  };
  for (const e of entries) await walk(e);
  return out;
}

/** The Settings section: what these are, then one part per slot. */
export function ownModelsSection(sec: HTMLElement, slots: OwnModel[]): void {
  sec.append(el('p', 'note', `The published models load automatically. You can replace them with your own, exported with ${EXPORT_LINK} as GLB (the arrow next to its Export button). Models you import stay in this browser: nothing is uploaded.`));
  for (const s of slots) s.panel(sec);
}

const el = (tag: string, cls: string, html = '') => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
};

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
