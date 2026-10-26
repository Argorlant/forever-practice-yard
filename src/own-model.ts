// Settings → Your own model: a character model of the player's own, drawn
// instead of the yard's (src/scene/custom-model.ts). It is optional and the
// yard's model stays the default. The files stay in this browser, one model
// per class (src/ui/model-store.ts); the site never sends or hosts them.
import type * as THREE from 'three';
import { loadCustomModel, type CustomModel, type ModelFile } from './scene/custom-model';
import { deleteModel, getModel, putModel, type StoredModel } from './ui/model-store';

const EXPORT_LINK = '<a href="https://github.com/Kruithne/wow.export" target="_blank" rel="noopener">wow.export</a>';

export class OwnModel {
  model: CustomModel | null = null;
  private stored: StoredModel | null = null;
  private status = '';
  private error = false;
  private busy = true;
  private sec: HTMLElement | null = null;

  constructor(private key: string, private scene: THREE.Scene) {
    getModel(key).then(async (s) => {
      if (!s) return;
      this.stored = s;
      await this.build(s.files, s.rotation);
    }).finally(() => { this.busy = false; this.draw(); });
  }

  /** The model to draw for the player: yours if there is one and it is switched on. */
  get active(): CustomModel | null { return this.stored?.enabled ? this.model : null; }

  private async build(files: ModelFile[], rotation?: number): Promise<boolean> {
    try {
      const m = await loadCustomModel(files, rotation);
      this.model?.dispose();
      this.model = m;
      m.root.visible = false;
      this.scene.add(m.root);
      this.status = describe(m);
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

  private async load(list: File[]): Promise<void> {
    if (!list.length || this.busy) return;
    this.busy = true;
    this.status = 'Reading the model…';
    this.error = false;
    this.draw();
    const files = list.map((f) => ({ name: f.name, type: f.type, data: f as Blob }));
    if (await this.build(files)) {
      const main = files.find((f) => /\.gl(b|tf)$/i.test(f.name))!;
      this.stored = { files, label: main.name, rotation: this.model!.turns, enabled: true };
      if (!(await putModel(this.key, this.stored))) {
        this.status += ' This browser would not keep it (a private window, or no room), so it lasts until you reload.';
      }
    }
    this.busy = false;
    this.draw();
  }

  private save(): void {
    if (this.stored) void putModel(this.key, this.stored);
    this.draw();
  }

  private async remove(): Promise<void> {
    await deleteModel(this.key);
    this.model?.dispose();
    this.model = null;
    this.stored = null;
    this.status = '';
    this.error = false;
    this.draw();
  }

  /** Fills the Settings section; it redraws itself as the model loads. */
  panel(sec: HTMLElement): void {
    this.sec = sec;
    this.draw();
  }

  private draw(): void {
    const sec = this.sec;
    if (!sec?.isConnected) return;
    sec.querySelector('.own-model')?.remove();
    const box = el('div', 'own-model');
    box.append(el('p', 'note', `Optional: play with your own character instead of the yard's. In ${EXPORT_LINK}, which reads your own game files: open your WoW folder, dress your character in the Characters tab, tick Export animations and pick Export GLB (the arrow next to Export glTF). Load that .glb here (or a .gltf with its .bin and textures). Helmets and shoulder pads go back on their attachment points. It stays in this browser: nothing is uploaded. Druid forms keep the yard's animals.`));
    const s = this.stored;
    if (s) {
      const row = el('label', 'field toggle');
      row.append(el('span', '', `Use <b>${escapeHtml(s.label)}</b>`));
      const on = document.createElement('input');
      on.type = 'checkbox';
      on.checked = s.enabled;
      on.disabled = !this.model;
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
    if (s && this.model) {
      const turn = el('button', 'hud-btn small', 'Turn 90°');
      turn.title = 'If your model faces sideways or away from the dummy';
      turn.addEventListener('click', () => {
        s.rotation = (s.rotation + 1) % 4;
        this.model?.setQuarterTurns(s.rotation);
        this.save();
      });
      buttons.append(turn);
    }
    if (s) {
      const del = el('button', 'hud-btn small', 'Remove');
      del.addEventListener('click', () => void this.remove());
      buttons.append(del);
    }
    box.append(buttons);
    if (this.status) box.append(el('p', this.error ? 'note own-model-error' : 'note', escapeHtml(this.status)));
    // Files dropped on the section load too.
    box.addEventListener('dragover', (e) => { e.preventDefault(); box.classList.add('drop'); });
    box.addEventListener('dragleave', () => box.classList.remove('drop'));
    box.addEventListener('drop', (e) => {
      e.preventDefault();
      box.classList.remove('drop');
      void this.load([...(e.dataTransfer?.files ?? [])]);
    });
    sec.append(box);
  }
}

function describe(m: CustomModel): string {
  const files = m.missingFiles.length
    ? ` Missing ${m.missingFiles.join(', ')}: load it again with every file of the export selected.` : '';
  if (!m.animationCount) return `It has no animations, so it will stand still. Export it again with its animations.${files}`;
  const found = `Animations for: ${m.found.join(', ') || 'none of the yard\'s moments'}.`;
  return (m.missing.length ? `${found} Not found: ${m.missing.join(', ')}; there it uses the closest one it has, or none.` : found) + files;
}

const el = (tag: string, cls: string, html = '') => {
  const e = document.createElement(tag);
  e.className = cls;
  if (html) e.innerHTML = html;
  return e;
};

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
