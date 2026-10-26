// A zone of WoW as the yard: map tiles exported from the player's own game
// files with wow.export (Maps tab, Export OBJ). Each tile is a terrain OBJ with
// its baked texture and a placement CSV for its trees, props (M2) and buildings
// (WMO), whose own CSVs place their furniture. Placements follow wow.export's
// Blender importer (addon/io_scene_wowobj): its Z-up frame is turned to the
// yard's Y-up. Repeated models are drawn as instances. Nothing here ships with
// the site: the files come from the player's folder and stay in their browser.
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { ModelSource, type ModelFile } from './custom-model';

/** Half the world's width in yards: placements count from its corner. */
const MAX = 51200 / 3;
/** wow.export's importer works Z-up; the yard is Y-up. */
const TO_Y_UP = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
const RX90 = new THREE.Matrix4().makeRotationX(Math.PI / 2);
/** Buildings bigger than this (a whole city, such as Stormwind) are left out. */
const TOO_BIG = 40e6;
/** The terrain's baked texture is drawn at most this wide (wow.export bakes it at up to 8K). */
const TERRAIN_TEXTURE = 2048;
const DEG = Math.PI / 180;

export interface MapLoad {
  source: ModelSource;
  /** The files the place uses, to keep in the browser (the terrain texture shrunk). */
  keep: ModelFile[];
  label: string;
  notes: string[];
}

const TILE = /(^|\/)adt_(\d+)_(\d+)\.obj$/i;

/** Files from a wow.export map export (a terrain tile among them). */
export function isMapExport(files: ModelFile[]): boolean {
  return files.some((f) => TILE.test(f.name));
}

const norm = (p: string) => p.replace(/\\/g, '/').toLowerCase();
const dirOf = (p: string) => p.slice(0, p.lastIndexOf('/') + 1);
/** "maps/azeroth/" + "..\..\world\x.obj" → "world/x.obj". */
function resolve(dir: string, rel: string): string {
  const out = dir.split('/').filter(Boolean);
  for (const part of norm(rel).split('/')) {
    if (part === '..') out.pop();
    else if (part && part !== '.') out.push(part);
  }
  return out.join('/');
}

function readCsv(text: string): Record<string, string>[] {
  const [head, ...lines] = text.split(/\r?\n/).filter(Boolean);
  const keys = head.split(';');
  return lines.map((l) => Object.fromEntries(l.split(';').map((v, i) => [keys[i], v])));
}

/** Material settings from wow.export's JSON beside a model: blend mode and two-sidedness per material name. */
interface Look { blend: number; twoSided: boolean }
function looksOf(meta: Record<string, unknown> | null): Map<string, Look> {
  const looks = new Map<string, Look>();
  if (!meta) return looks;
  const textures = (meta.textures ?? []) as { mtlName?: string; fileDataID?: number }[];
  if (meta.fileType === 'm2') {
    const materials = (meta.materials ?? []) as { flags: number; blendingMode: number }[];
    const combos = (meta.textureCombos ?? []) as number[];
    const units = ((meta.skin as { textureUnits?: unknown[] } | undefined)?.textureUnits ?? []) as { materialIndex: number; textureComboIndex: number }[];
    for (const u of units) {
      const mat = materials[u.materialIndex];
      const name = textures[combos[u.textureComboIndex]]?.mtlName;
      if (mat && name && !looks.has(name)) looks.set(name, { blend: mat.blendingMode, twoSided: !!(mat.flags & 4) });
    }
  } else if (meta.fileType === 'wmo') {
    const materials = (meta.materials ?? []) as { flags: number; blendMode: number; texture1: number }[];
    for (const mat of materials) {
      const name = textures.find((t) => t.fileDataID === mat.texture1)?.mtlName;
      if (name && !looks.has(name)) looks.set(name, { blend: mat.blendMode, twoSided: !!(mat.flags & 4) });
    }
  }
  return looks;
}

/** A texture image no wider than `max`, as a JPEG (the image itself when it is small enough). */
async function shrink(blob: Blob, max: number): Promise<Blob> {
  const bmp = await createImageBitmap(blob);
  if (bmp.width <= max && bmp.height <= max) { bmp.close(); return blob; }
  const k = max / Math.max(bmp.width, bmp.height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * k);
  canvas.height = Math.round(bmp.height * k);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return new Promise((done) => canvas.toBlob((b) => done(b ?? blob), 'image/jpeg', 0.88));
}

interface Placement { model: string; matrix: THREE.Matrix4; building: boolean }

/**
 * Reads the newest export of map tiles among the player's files (several tiles of one export go together).
 * Restoring the files kept from a first load, what that load left out is left out again without a word.
 */
export async function loadMapSource(files: ModelFile[], restoring = false): Promise<MapLoad> {
  const vfs = new Map<string, ModelFile>();
  for (const f of files) vfs.set(norm(f.name), f);
  const keep = new Map<string, ModelFile>();
  const notes: string[] = [];
  const missing = new Set<string>();
  const has = (path: string) => vfs.has(norm(path));
  const use = (path: string) => {
    const f = vfs.get(norm(path));
    if (f) keep.set(norm(path), f); else missing.add(path.split('/').pop()!);
    return f ?? null;
  };
  const text = async (path: string) => { const f = use(path); return f ? f.data.text() : null; };

  // The tiles: the newest one's folder, and the tiles exported with it.
  const tiles = files.filter((f) => TILE.test(f.name));
  const time = (f: ModelFile) => (f.data as File).lastModified ?? 0;
  const newest = tiles.reduce((a, b) => (time(b) > time(a) ? b : a));
  const tileDir = dirOf(norm(newest.name));
  const chosen = tiles.filter((f) => dirOf(norm(f.name)) === tileDir && Math.abs(time(f) - time(newest)) < 30 * 60e3);

  const root = new THREE.Group();
  const placements: Placement[] = [];
  const seen = new Set<string>();
  const loader = new OBJLoader();
  const textures = new Map<string, Promise<THREE.Texture | null>>();
  const texture = (path: string, override?: Blob): Promise<THREE.Texture | null> => {
    let t = textures.get(path);
    if (!t) {
      const f = override ? null : use(path);
      const blob = override ?? f?.data;
      t = blob ? (async () => {
        const url = URL.createObjectURL(blob);
        try {
          const tex = await new THREE.TextureLoader().loadAsync(url);
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
          tex.anisotropy = 4;
          return tex;
        } catch { missing.add(path.split('/').pop()!); return null; } finally { URL.revokeObjectURL(url); }
      })() : Promise.resolve(null);
      textures.set(path, t);
    }
    return t;
  };

  /** An OBJ with its MTL textures and its materials' blend modes, ready to place. */
  const models = new Map<string, Promise<THREE.Group | null>>();
  const model = (path: string): Promise<THREE.Group | null> => {
    let m = models.get(path);
    if (!m) {
      m = (async () => {
        const objText = await text(path);
        if (objText === null) return null;
        const group = loader.parse(objText);
        const dir = dirOf(path);
        const mtl = await text(path.replace(/\.obj$/, '.mtl'));
        const metaText = has(path.replace(/\.obj$/, '.json')) ? await text(path.replace(/\.obj$/, '.json')) : null;
        let meta: Record<string, unknown> | null = null;
        try { meta = metaText ? JSON.parse(metaText) : null; } catch { /* no metadata */ }
        const looks = looksOf(meta);
        const maps = new Map<string, string>();
        let current = '';
        for (const line of (mtl ?? '').split(/\r?\n/)) {
          const [key, ...rest] = line.trim().split(/\s+/);
          if (key === 'newmtl') current = rest.join(' ');
          else if (key === 'map_Kd' && current) maps.set(current, resolve(dir, rest.join(' ')));
        }
        const isM2 = meta?.fileType === 'm2' || (!meta && !/\/wmo\//.test(path));
        const materials = new Map<string, THREE.Material>();
        const material = async (name: string) => {
          let mat = materials.get(name);
          if (!mat) {
            const look = looks.get(name) ?? { blend: isM2 ? 1 : 0, twoSided: false };
            const texPath = maps.get(name);
            const map = texPath ? await texture(texPath) : null;
            mat = new THREE.MeshLambertMaterial({
              map, name,
              side: look.twoSided || isM2 ? THREE.DoubleSide : THREE.FrontSide,
              // WoW's blend modes: 0 opaque, 1 alpha key (leaves), 2 alpha, 3 and up additive.
              alphaTest: look.blend === 1 ? 0.5 : 0,
              transparent: look.blend >= 2,
              depthWrite: look.blend < 2,
              blending: look.blend >= 3 ? THREE.AdditiveBlending : THREE.NormalBlending,
            });
            materials.set(name, mat);
          }
          return mat;
        };
        const meshes: THREE.Mesh[] = [];
        group.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });
        for (const mesh of meshes) {
          const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          const mats = await Promise.all(list.map((mm) => material(mm.name)));
          mesh.material = Array.isArray(mesh.material) ? mats : mats[0];
          if (!mesh.geometry.attributes.normal) mesh.geometry.computeVertexNormals();
        }
        return group;
      })();
      models.set(path, m);
    }
    return m;
  };

  const sizeOf = (path: string) => vfs.get(norm(path))?.data.size ?? 0;
  /** A building's placement in wow.export's Z-up frame, before its own Y-up turn. */
  const placeOf = (r: Record<string, string>) => new THREE.Matrix4().compose(
    new THREE.Vector3(MAX - +r.PositionX, -(MAX - +r.PositionZ), +r.PositionY),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(+r.RotationZ * DEG, +r.RotationX * DEG, (90 + +r.RotationY) * DEG, 'ZYX')),
    new THREE.Vector3().setScalar(+r.ScaleFactor || 1),
  );

  for (const tile of chosen) {
    const path = norm(tile.name);
    // The ground.
    const objText = await text(path);
    if (objText === null) continue;
    const ground = loader.parse(objText);
    const texPath = path.replace(/adt_(\d+_\d+)\.obj$/, 'tex_$1.png');
    use(path.replace(/\.obj$/, '.mtl'));
    const texFile = use(texPath);
    let groundMap: THREE.Texture | null = null;
    if (texFile) {
      const small = await shrink(texFile.data, TERRAIN_TEXTURE);
      keep.set(norm(texPath), { name: texFile.name, type: small.type, data: small });
      groundMap = await texture(texPath, small);
      if (groundMap) groundMap.wrapS = groundMap.wrapT = THREE.ClampToEdgeWrapping;
    }
    const groundMat = new THREE.MeshLambertMaterial({ map: groundMap, color: groundMap ? 0xffffff : 0x55703a });
    ground.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.material = groundMat;
      if (!m.geometry.attributes.normal) m.geometry.computeVertexNormals();
      m.name = 'ground';
    });
    root.add(ground);

    // Its trees, props and buildings.
    const csvText = await text(path.replace(/\.obj$/, '_ModelPlacementInformation.csv'));
    for (const r of csvText ? readCsv(csvText) : []) {
      const type = (r.Type ?? '').toLowerCase();
      if (type !== 'm2' && type !== 'wmo') continue;
      // A placement that crosses tiles is listed by each of them.
      const id = `${type}:${r.ModelId}`;
      if (r.ModelId && seen.has(id)) continue;
      seen.add(id);
      const file = resolve(dirOf(path), r.ModelFile);
      if (type === 'm2') {
        const matrix = placeOf(r).multiply(RX90);
        placements.push({ model: file, matrix: TO_Y_UP.clone().multiply(matrix), building: false });
        continue;
      }
      // A building whose files are not in the folder was left out (or deleted to save room, as a city's
      // often is): the zone goes on without it, without a note.
      if (!has(file)) continue;
      if (sizeOf(file) > TOO_BIG) {
        if (!restoring) notes.push(`Left out ${file.split('/').pop()} (${Math.round(sizeOf(file) / 1e6)} MB, too big for a browser).`);
        continue;
      }
      const parent = placeOf(r);
      placements.push({ model: file, matrix: TO_Y_UP.clone().multiply(parent.clone().multiply(RX90)), building: true });
      // The building's furniture, placed in its own frame.
      const setCsv = file.replace(/\.obj$/, '_ModelPlacementInformation.csv');
      const setText = has(setCsv) ? await text(setCsv) : null;
      for (const d of setText ? readCsv(setText) : []) {
        const local = new THREE.Matrix4().compose(
          new THREE.Vector3(+d.PositionX, +d.PositionY, +d.PositionZ),
          new THREE.Quaternion(+d.RotationX, +d.RotationY, +d.RotationZ, +d.RotationW),
          new THREE.Vector3().setScalar(+d.ScaleFactor || 1),
        ).multiply(RX90);
        placements.push({ model: resolve(dirOf(file), d.ModelFile), matrix: TO_Y_UP.clone().multiply(parent.clone().multiply(local)), building: false });
      }
    }
  }

  // Draw: buildings as meshes (you walk on their floors), everything else as instances of its model.
  const byModel = new Map<string, Placement[]>();
  for (const p of placements) {
    const list = byModel.get(p.model) ?? [];
    list.push(p);
    byModel.set(p.model, list);
  }
  const loaded = await Promise.all([...byModel.keys()].map(async (path) => [path, await model(path)] as const));
  const tmp = new THREE.Matrix4();
  for (const [path, group] of loaded) {
    if (!group) continue;
    const list = byModel.get(path)!;
    group.updateMatrixWorld(true);
    const meshes: THREE.Mesh[] = [];
    group.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });
    for (const mesh of meshes) {
      const props = list.filter((p) => !p.building);
      for (const p of list.filter((q) => q.building)) {
        const m = new THREE.Mesh(mesh.geometry, mesh.material);
        m.matrixAutoUpdate = false;
        m.matrix.copy(p.matrix).multiply(mesh.matrixWorld);
        m.castShadow = m.receiveShadow = true;
        root.add(m);
      }
      if (!props.length) continue;
      const inst = new THREE.InstancedMesh(mesh.geometry, mesh.material, props.length);
      props.forEach((p, i) => inst.setMatrixAt(i, tmp.copy(p.matrix).multiply(mesh.matrixWorld)));
      inst.instanceMatrix.needsUpdate = true;
      inst.computeBoundingSphere();
      inst.castShadow = inst.receiveShadow = true;
      root.add(inst);
    }
  }

  if (missing.size && !restoring) notes.push(`Missing ${missing.size} file${missing.size > 1 ? 's' : ''} (${[...missing].slice(0, 3).join(', ')}${missing.size > 3 ? '…' : ''}): choose wow.export's whole export folder.`);
  const map = tileDir.split('/').filter(Boolean).pop() ?? 'map';
  const names = chosen.map((f) => f.name.match(TILE)!).map((m) => `${m[2]}_${m[3]}`);
  return {
    source: new ModelSource(root, [], true, []),
    keep: [...keep.values()],
    label: `${map} ${names.join(', ')}`,
    notes,
  };
}
