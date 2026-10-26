// Settings → Your own models: models of the player's own, drawn instead of the
// yard's: their character, the druid's cat and bear, the training dummy and the
// yard itself (src/scene/custom-model.ts, src/scene/custom-place.ts). All are
// optional and the yard's own stay the default. The files stay in this browser
// (src/ui/model-store.ts); the site never sends or hosts them.
import { loadModelSource, type ModelFile, type ModelSource } from './scene/custom-model';
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
}

/** A button the yard adds to a slot while its model is on ("Put the dummy here"). */
export interface SlotAction { label: string; title: string; run(): void }

export class OwnModel {
  source: ModelSource | null = null;
  private stored: StoredModel | null = null;
  private status = '';
  private error = false;
  private busy = true;
  private box: HTMLElement | null = null;
  /** The yard redraws what this slot stands for: the model, whether it is on, or its turn changed. */
  onChange: () => void = () => {};
  actions: SlotAction[] = [];

  constructor(readonly slot: SlotSpec) {
    getModel(slot.key).then(async (s) => {
      if (!s) return;
      this.stored = s;
      await this.build(s.files);
    }).finally(() => { this.busy = false; this.draw(); this.onChange(); });
  }

  /** There is a model and it is switched on. */
  get on(): boolean { return !!(this.stored?.enabled && this.source); }
  get turns(): number { return this.stored?.rotation ?? 0; }
  get anchor(): number[] | null { return this.stored?.anchor ?? null; }

  setAnchor(a: number[]): void {
    if (!this.stored) return;
    this.stored.anchor = a;
    void putModel(this.slot.key, this.stored);
  }

  private async build(files: ModelFile[]): Promise<boolean> {
    try {
      const source = await loadModelSource(files);
      this.source?.dispose();
      this.source = source;
      this.status = this.describe(source);
      this.error = false;
      return true;
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
      return false;
    }
  }

  private describe(source: ModelSource): string {
    const files = source.missingFiles.length
      ? ` Missing ${source.missingFiles.join(', ')}: load it again with every file of the export selected.` : '';
    if (this.slot.kind === 'place') {
      let triangles = 0;
      source.scene.traverse((o) => {
        const g = (o as { geometry?: { index: { count: number } | null; attributes: { position: { count: number } } } }).geometry;
        if (g) triangles += (g.index ? g.index.count : g.attributes.position.count) / 3;
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

  private async load(list: File[]): Promise<void> {
    if (!list.length || this.busy) return;
    this.busy = true;
    this.status = 'Reading the model…';
    this.error = false;
    this.draw();
    const files = list.map((f) => ({ name: f.name, type: f.type, data: f as Blob }));
    if (await this.build(files)) {
      const main = files.find((f) => /\.gl(b|tf)$/i.test(f.name))!;
      const turns = this.slot.kind === 'figure' ? this.source!.defaultTurns : 0;
      this.stored = { files, label: main.name, rotation: turns, enabled: true };
      if (!(await putModel(this.slot.key, this.stored))) {
        this.status += ' This browser would not keep it (a private window, or no room), so it lasts until you reload.';
      }
    }
    this.busy = false;
    this.draw();
    this.onChange();
  }

  private save(): void {
    if (this.stored) void putModel(this.slot.key, this.stored);
    this.draw();
    this.onChange();
  }

  private async remove(): Promise<void> {
    await deleteModel(this.slot.key);
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
      row.append(el('span', '', `Use <b>${escapeHtml(s.label)}</b>`));
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
      void this.load([...(e.dataTransfer?.files ?? [])]);
    };
  }
}

/** The Settings section: what these are, then one part per slot. */
export function ownModelsSection(sec: HTMLElement, slots: OwnModel[]): void {
  sec.append(el('p', 'note', `Optional: models from your own game files instead of the yard's, exported with ${EXPORT_LINK} as GLB (the arrow next to its Export button). Open your WoW folder in it first. Each model stays in this browser: nothing is uploaded.`));
  for (const s of slots) s.panel(sec);
}

const el = (tag: string, cls: string, html = '') => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
};

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
