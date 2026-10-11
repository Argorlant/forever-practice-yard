// The yard: a training clearing at dusk, built in code (no third-party
// models): ground, fence, pines, torches, banners.
import * as THREE from 'three';

export interface World {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  update(dt: number, t: number): void;
  resize(): void;
}

/** Seeded pseudo-random numbers, so the yard always looks the same. */
export function seeded(s: number) {
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function flagstoneTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d')!;
  const rnd = seeded(7);
  g.fillStyle = '#4a3f33';
  g.fillRect(0, 0, 512, 512);
  // Irregular flagstones with dark joints.
  const rows = 6;
  for (let y = 0; y < rows; y++) {
    let x = -rnd() * 60;
    while (x < 512) {
      const w = 60 + rnd() * 50;
      const h = 512 / rows;
      const tone = 95 + rnd() * 30;
      g.fillStyle = `rgb(${tone + 8},${tone + 2},${tone - 8})`;
      g.fillRect(x + 3, y * h + 3, w - 6, h - 6);
      // Stains and moss.
      for (let k = 0; k < 14; k++) {
        g.fillStyle = rnd() < 0.25 ? 'rgba(70,90,50,0.25)' : `rgba(0,0,0,${0.05 + rnd() * 0.08})`;
        g.beginPath();
        g.arc(x + rnd() * w, y * h + rnd() * h, 2 + rnd() * 9, 0, Math.PI * 2);
        g.fill();
      }
      x += w;
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function grassTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const rnd = seeded(11);
  g.fillStyle = '#3d4a2a';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) {
    const v = rnd();
    g.fillStyle = v < 0.5 ? 'rgba(80,100,50,0.5)' : v < 0.8 ? 'rgba(40,52,28,0.6)' : 'rgba(110,105,60,0.4)';
    g.fillRect(rnd() * 256, rnd() * 256, 1 + rnd() * 2, 2 + rnd() * 4);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function sky(): THREE.Mesh {
  const geo = new THREE.SphereGeometry(400, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color('#1b2340') },
      middle: { value: new THREE.Color('#7a4f5a') },
      horizon: { value: new THREE.Color('#e59a5c') },
    },
    vertexShader: `varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform vec3 top; uniform vec3 middle; uniform vec3 horizon; varying vec3 vPos;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
      void main(){
        vec3 d = normalize(vPos);
        float h = d.y;
        // Low sun towards -X, +Z.
        float sun = max(dot(d, normalize(vec3(-0.6, 0.08, 0.8))), 0.0);
        vec3 c = mix(horizon, middle, smoothstep(-0.02, 0.18, h));
        c = mix(c, top, smoothstep(0.15, 0.7, h));
        c += vec3(1.0, 0.6, 0.3) * pow(sun, 24.0) * 0.8 + vec3(1.0,0.5,0.25) * pow(sun, 4.0) * 0.15;
        float star = step(0.9985, hash(floor(d.xz * 300.0 / max(h, 0.2)))) * smoothstep(0.35, 0.8, h);
        c += vec3(star) * 0.7;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  return new THREE.Mesh(geo, mat);
}

function pine(rnd: () => number): THREE.Group {
  const g = new THREE.Group();
  const height = 6 + rnd() * 6;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.28, height * 0.35, 6),
    new THREE.MeshStandardMaterial({ color: 0x3b2a1e, roughness: 1 }),
  );
  trunk.position.y = height * 0.17;
  g.add(trunk);
  const green = new THREE.Color().setHSL(0.33 + rnd() * 0.05, 0.35, 0.16 + rnd() * 0.06);
  const mat = new THREE.MeshStandardMaterial({ color: green, roughness: 0.95, flatShading: true });
  for (let i = 0; i < 4; i++) {
    const radius = (1.9 - i * 0.38) * (height / 9);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(radius, height * 0.34, 7), mat);
    cone.position.y = height * 0.25 + i * height * 0.19;
    cone.rotation.y = rnd() * Math.PI;
    cone.castShadow = true;
    g.add(cone);
  }
  return g;
}

function torch(): { group: THREE.Group; light: THREE.PointLight; flame: THREE.Mesh } {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x4a3322, roughness: 0.9 });
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 2.2, 6), wood);
  post.position.y = 1.1;
  post.castShadow = true;
  g.add(post);
  const cup = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.1, 0.25, 8, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x2b2b2b, metalness: 0.7, roughness: 0.5, side: THREE.DoubleSide }),
  );
  cup.position.y = 2.25;
  g.add(cup);
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.16, 0.5, 8),
    new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.9 }),
  );
  flame.position.y = 2.55;
  g.add(flame);
  const light = new THREE.PointLight(0xff9a40, 9, 14, 1.6);
  light.position.y = 2.6;
  g.add(light);
  return { group: g, light, flame };
}

function banner(color: number): THREE.Group {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x3e2b1c, roughness: 0.9 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 4.2, 6), wood);
  pole.position.y = 2.1;
  pole.castShadow = true;
  g.add(pole);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.1, 6), wood);
  bar.rotation.z = Math.PI / 2;
  bar.position.y = 3.9;
  g.add(bar);
  // Swallowtail cloth.
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, 0);
  shape.lineTo(0.5, 0);
  shape.lineTo(0.5, -1.9);
  shape.lineTo(0, -1.5);
  shape.lineTo(-0.5, -1.9);
  shape.closePath();
  const cloth = new THREE.Mesh(
    new THREE.ShapeGeometry(shape),
    new THREE.MeshStandardMaterial({ color, roughness: 0.8, side: THREE.DoubleSide }),
  );
  cloth.position.set(0, 3.88, 0.06);
  cloth.castShadow = true;
  g.add(cloth);
  // Emblem: two crossed gold daggers.
  const gold = new THREE.MeshStandardMaterial({ color: 0xd9a441, metalness: 0.6, roughness: 0.4, side: THREE.DoubleSide });
  for (const s of [-1, 1]) {
    const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.8), gold);
    blade.position.set(0, 3.05, 0.07);
    blade.rotation.z = s * 0.6;
    g.add(blade);
  }
  return g;
}

function fence(radius: number, gap: number): THREE.Group {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 0.95, flatShading: true });
  const n = 40;
  const inGap = (a: number) => Math.abs(Math.atan2(Math.sin(a - Math.PI), Math.cos(a - Math.PI))) < gap;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    if (inGap(a)) continue;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.3, 0.18), wood);
    post.position.set(Math.sin(a) * radius, 0.65, Math.cos(a) * radius);
    post.rotation.y = a;
    post.castShadow = true;
    g.add(post);
    const a2 = ((i + 1) / n) * Math.PI * 2;
    if (inGap(a2)) continue;
    const length = 2 * radius * Math.sin(Math.PI / n);
    const am = (a + a2) / 2;
    for (const y of [0.45, 0.95]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(length, 0.12, 0.06), wood);
      rail.position.set(Math.sin(am) * radius * Math.cos(Math.PI / n), y, Math.cos(am) * radius * Math.cos(Math.PI / n));
      rail.rotation.y = am + Math.PI / 2;
      rail.castShadow = true;
      g.add(rail);
    }
  }
  return g;
}

function props(rnd: () => number): THREE.Group {
  const g = new THREE.Group();
  const hay = new THREE.MeshStandardMaterial({ color: 0xc8a457, roughness: 1, flatShading: true });
  const barrelMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.85 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.6, roughness: 0.5 });
  const spots: [number, number, 'hay' | 'barrel'][] = [
    [-9.5, 6, 'hay'], [-10.4, 4.6, 'hay'], [9.8, 5.5, 'barrel'], [10.3, 4.4, 'barrel'],
    [9.2, -6.5, 'hay'], [-9.6, -6, 'barrel'], [-10.2, -4.8, 'hay'],
  ];
  for (const [x, z, kind] of spots) {
    let m: THREE.Mesh;
    if (kind === 'hay') {
      m = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.7), hay);
      m.position.set(x, 0.3, z);
      m.rotation.y = rnd() * Math.PI;
    } else {
      m = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.95, 12), barrelMat);
      m.position.set(x, 0.475, z);
      for (const y of [-0.3, 0.3]) {
        const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.39, 0.025, 6, 16), iron);
        hoop.rotation.x = Math.PI / 2;
        hoop.position.y = y;
        m.add(hoop);
      }
    }
    m.castShadow = m.receiveShadow = true;
    g.add(m);
  }
  // Loose rocks outside the fence.
  const rock = new THREE.MeshStandardMaterial({ color: 0x6d6a66, roughness: 1, flatShading: true });
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2;
    const d = 14.5 + rnd() * 10;
    const s = 0.3 + rnd() * 0.9;
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rock);
    m.position.set(Math.sin(a) * d, s * 0.35, Math.cos(a) * d);
    m.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
  }
  return g;
}

export function createWorld(container: HTMLElement): World {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x5d4a55, 25, 110);
  scene.add(sky());

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 600);

  scene.add(new THREE.HemisphereLight(0x9fb3d9, 0x3a2e24, 1.2));
  // Key light from behind the starting camera, so the character is lit;
  // the sunset glow stays ahead in the sky with a warm rim light.
  const sun = new THREE.DirectionalLight(0xffd9b0, 2.3);
  sun.position.set(-16, 18, -20);
  const rim = new THREE.DirectionalLight(0xff9a5a, 1.4);
  rim.position.set(-12, 6, 30);
  scene.add(rim);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -18; sc.right = 18; sc.top = 18; sc.bottom = -18; sc.near = 1; sc.far = 70;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);

  // Ground: grass around, a circle of flagstones in the middle.
  const grass = grassTexture();
  grass.repeat.set(40, 40);
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(200, 64),
    new THREE.MeshStandardMaterial({ map: grass, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const stones = flagstoneTexture();
  stones.repeat.set(5, 5);
  const plaza = new THREE.Mesh(
    new THREE.CircleGeometry(12.5, 64),
    new THREE.MeshStandardMaterial({ map: stones, roughness: 0.9 }),
  );
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.y = 0.01;
  plaza.receiveShadow = true;
  scene.add(plaza);
  const curb = new THREE.Mesh(
    new THREE.RingGeometry(12.5, 13.1, 64),
    new THREE.MeshStandardMaterial({ color: 0x4c4136, roughness: 1 }),
  );
  curb.rotation.x = -Math.PI / 2;
  curb.position.y = 0.015;
  curb.receiveShadow = true;
  scene.add(curb);

  scene.add(fence(15, 0.22));

  const rnd = seeded(42);
  for (let i = 0; i < 46; i++) {
    const a = rnd() * Math.PI * 2;
    const d = 19 + rnd() * 30;
    const p = pine(rnd);
    p.position.set(Math.sin(a) * d, 0, Math.cos(a) * d);
    scene.add(p);
  }
  scene.add(props(rnd));

  const torches: ReturnType<typeof torch>[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const t = torch();
    t.group.position.set(Math.sin(a) * 11.5, 0, Math.cos(a) * 11.5);
    scene.add(t.group);
    torches.push(t);
  }
  for (const [x, z, color] of [[-4, 12.2, 0x7b1d1d], [4, 12.2, 0x1d3b7b]] as const) {
    const b = banner(color);
    b.position.set(x, 0, z);
    b.rotation.y = Math.PI;
    scene.add(b);
  }

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    // Portrait phones need a wider vertical angle to show the dummy and the character.
    camera.fov = camera.aspect < 0.8 ? 68 : 55;
    camera.updateProjectionMatrix();
  }
  resize();

  return {
    renderer, scene, camera, resize,
    update(_dt, t) {
      torches.forEach((tc, i) => {
        const f = 0.85 + Math.sin(t * 9 + i * 1.7) * 0.08 + Math.sin(t * 23 + i) * 0.05;
        tc.light.intensity = 9 * f;
        tc.flame.scale.set(1, f * 1.1, 1);
      });
    },
  };
}
