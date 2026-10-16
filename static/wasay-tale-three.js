import * as T from './vendor/three/three.module.min.js';

// The scroll film: a person leaps from a grassy cliff onto a mossy tree trunk in slow motion, somersaulting in the sky; the trunk gives
// under the landing like a sponge, and a droplet is squeezed out of it and falls. Everything is drawn here, nothing is a video, so it
// scrubs smoothly in both directions. draw(p) shows the moment p (0 to 1) of the film.
const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const smooth = (n) => { n = clamp(n); return n * n * (3 - 2 * n); };
const smoother = (n) => { n = clamp(n); return n * n * n * (n * (n * 6 - 15) + 10); };
const lerp = (a, b, t) => a + (b - a) * t;
const rad = (d) => d * Math.PI / 180;

// ---- moments of the film (p)
const TAKEOFF = .15, LAND = .62, DROP_GROW = .76, DROP_FALL = .88;

// ---- the person's poses (degrees; planar, seen from the side, facing right). s = shoulder, e = elbow, h = hip, k = knee.
const POSES = [
  { t: 0,    torso: 0,  head: 0,   sL: 8,   eL: 10,  sR: -6,  eR: 10,  hL: 0,   kL: 0,    hR: 0,   kR: 0 },
  { t: .07,  torso: 3,  head: 4,   sL: 14,  eL: 12,  sR: -10, eR: 12,  hL: 0,   kL: 0,    hR: 0,   kR: 0 },
  { t: .11,  torso: 40, head: -14, sL: -58, eL: 12,  sR: -64, eR: 12,  hL: 76,  kL: -124, hR: 70,  kR: -118 },
  { t: .155, torso: 6,  head: 8,   sL: 160, eL: 8,   sR: 150, eR: 8,   hL: 6,   kL: -4,   hR: 2,   kR: -8 },
  { t: .23,  torso: 10, head: 6,   sL: 96,  eL: 26,  sR: -42, eR: 26,  hL: 76,  kL: -106, hR: -24, kR: -52 },
  { t: .33,  torso: 32, head: 0,   sL: 62,  eL: 100, sR: 50,  eR: 100, hL: 102, kL: -132, hR: 96,  kR: -126 },
  { t: .42,  torso: 56, head: 8,   sL: 40,  eL: 112, sR: 34,  eR: 112, hL: 116, kL: -142, hR: 112, kR: -138 },
  { t: .51,  torso: 24, head: 4,   sL: 104, eL: 18,  sR: 84,  eR: 18,  hL: 56,  kL: -66,  hR: 44,  kR: -54 },
  { t: .60,  torso: 10, head: 0,   sL: 72,  eL: 12,  sR: 56,  eR: 12,  hL: 20,  kL: -18,  hR: 14,  kR: -14 },
  { t: .645, torso: 34, head: -6,  sL: 84,  eL: 24,  sR: 70,  eR: 24,  hL: 72,  kL: -112, hR: 66,  kR: -106 },
  { t: .71,  torso: 4,  head: -4,  sL: 150, eL: 10,  sR: 144, eR: 10,  hL: 4,   kL: -6,   hR: 2,   kR: -6 },
  { t: .80,  torso: -4, head: -12, sL: 172, eL: 6,   sR: 166, eR: 6,   hL: 0,   kL: -2,   hR: 0,   kR: -2 },
  { t: 1,    torso: -4, head: -12, sL: 172, eL: 6,   sR: 166, eR: 6,   hL: 0,   kL: -2,   hR: 0,   kR: -2 },
];
const CHANNELS = Object.keys(POSES[0]).filter((k) => k !== 't');
function pose(p) {
  let i = 0;
  while (i < POSES.length - 2 && p > POSES[i + 1].t) i++;
  const a = POSES[i], b = POSES[i + 1], u = smooth((p - a.t) / (b.t - a.t));
  const out = {};
  for (const c of CHANNELS) out[c] = lerp(a[c], b[c], u);
  return out;
}

// ---- the camera: where it looks, how far back, and a slow drift (x, y, distance)
const CAM = [
  { t: 0,    x: -2.2, y: 1.2,  d: 12 },
  { t: .10,  x: -3.2, y: 1.0,  d: 8.4 },
  { t: .20,  x: -2.6, y: 2.4,  d: 11 },
  { t: .30,  x: -1.5, y: 3.7,  d: 12.5 },
  { t: .42,  x: -.4,  y: 4.0,  d: 12.5 },
  { t: .53,  x: .1,   y: 3.1,  d: 10.5 },
  { t: .61,  x: .35,  y: 2.3,  d: 8.2 },
  { t: .68,  x: .4,   y: 2.0,  d: 7.6 },
  { t: .78,  x: .5,   y: 2.0,  d: 11 },
  { t: .88,  x: 1.1,  y: 1.2,  d: 11.6 },
  { t: 1,    x: 2.8,  y: -4.4, d: 10.5 },
];
function camera(p) {
  let i = 0;
  while (i < CAM.length - 2 && p > CAM[i + 1].t) i++;
  const a = CAM[i], b = CAM[i + 1], u = smooth((p - a.t) / (b.t - a.t));
  return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), d: lerp(a.d, b.d, u) };
}

export function createTale(canvas) {
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  const scene = new T.Scene();
  const cam = new T.PerspectiveCamera(32, 1, .1, 120);
  let seed = 311;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const texture = (w, h, paint) => { const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), c); return new T.CanvasTexture(c); };

  // ---- sky, reflections and light
  const sky = texture(8, 512, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, '#2c78dc'); g.addColorStop(.45, '#5fa4ec'); g.addColorStop(.8, '#a8d0f4'); g.addColorStop(1, '#e8f3fb');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 8, 512);
  });
  sky.colorSpace = T.SRGBColorSpace; scene.background = sky;
  const env = texture(512, 256, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#5a9be6'); g.addColorStop(.5, '#cfe5f8'); g.addColorStop(.52, '#8da566'); g.addColorStop(1, '#5d6e3d');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = '#fff6d8'; ctx.beginPath(); ctx.arc(380, 60, 26, 0, 7); ctx.fill();
  });
  env.colorSpace = T.SRGBColorSpace; env.mapping = T.EquirectangularReflectionMapping;
  const pmrem = new T.PMREMGenerator(renderer); scene.environment = pmrem.fromEquirectangular(env).texture; env.dispose(); pmrem.dispose();
  scene.add(new T.HemisphereLight('#d6e9ff', '#7f9650', 1.15));
  const sun = new T.DirectionalLight('#fff3d6', 3.1); sun.position.set(5, 9, 7); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -9; sun.shadow.camera.right = 9; sun.shadow.camera.top = 9; sun.shadow.camera.bottom = -9;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 30; sun.shadow.bias = -.0004; sun.shadow.radius = 4;
  scene.add(sun);

  // soft clouds, far behind everything
  const cloudMap = texture(128, 128, (ctx) => { const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(.5, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128); });
  const clouds = new T.Group(); scene.add(clouds);
  for (let i = 0; i < 26; i++) {
    const s = new T.Sprite(new T.SpriteMaterial({ map: cloudMap, transparent: true, opacity: .35 + random() * .4, depthWrite: false, fog: false }));
    const w = 7 + random() * 9; s.scale.set(w, w * (.4 + random() * .25), 1);
    s.position.set(-16 + random() * 34, -4 + random() * 13, -26 - random() * 14); clouds.add(s);
  }

  // ---- the grassy cliff the person starts from, on the left
  const grassMap = texture(256, 256, (ctx) => {
    ctx.fillStyle = '#d8d8d8'; ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) { const v = 150 + random() * 105; ctx.fillStyle = `rgba(${v},${v},${v},.6)`; ctx.fillRect(random() * 256, random() * 256, 2 + random() * 3, 5 + random() * 9); }
  });
  grassMap.colorSpace = T.SRGBColorSpace; grassMap.wrapS = grassMap.wrapT = T.RepeatWrapping; grassMap.repeat.set(10, 3);
  const cliffGeo = new T.PlaneGeometry(40, 14, 200, 40); cliffGeo.rotateX(-Math.PI / 2);
  { const pos = cliffGeo.attributes.position, colors = new Float32Array(pos.count * 3), grass = new T.Color('#86ab45'), rock = new T.Color('#8c7a66'), tmp = new T.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) - 18, z = pos.getZ(i), rim = smooth((x + 3.7) / 1.7);   // the cliff top ends at about x = -3.7
      pos.setX(i, x); pos.setY(i, -60 * rim + .06 * Math.sin(x * .9 + z * .7) * (1 - rim) - (z > 2.2 ? (z - 2.2) * .4 : 0));
      tmp.copy(grass).lerp(rock, smooth(rim * 6)); colors.set([tmp.r, tmp.g, tmp.b], i * 3);
    }
    cliffGeo.setAttribute('color', new T.BufferAttribute(colors, 3));
    cliffGeo.computeVertexNormals(); }
  const cliff = new T.Mesh(cliffGeo, new T.MeshStandardMaterial({ map: grassMap, vertexColors: true, roughness: 1 })); cliff.receiveShadow = true; scene.add(cliff);
  const groundY = (x) => -60 * smooth((x + 3.7) / 1.7);

  // ---- the trunk: a gnarled mossy arch that leaves the cliff and spans the sky
  const curve = new T.CatmullRomCurve3([[-5.2, -.9, 0], [-3.4, -.5, 0], [-1.6, .35, 0], [.3, .72, 0], [2.4, .4, 0], [4.6, -.5, 0], [7.4, -1.8, 0]].map(([x, y, z]) => new T.Vector3(x, y, z)));
  const NU = 150, NV = 22, TRUNK_R = .62;
  const barkMap = texture(512, 512, (ctx) => {
    ctx.fillStyle = '#6b4b32'; ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 1500; i++) { const x = random() * 512, w = 1 + random() * 5; ctx.fillStyle = `hsla(${22 + random() * 10},${30 + random() * 22}%,${14 + random() * 34}%,.5)`; ctx.fillRect(x, random() * 512, w, 14 + random() * 90); }
    for (let i = 0; i < 40; i++) { ctx.fillStyle = 'rgba(40,26,16,.35)'; ctx.fillRect(random() * 512, random() * 512, 1 + random() * 2, 40 + random() * 160); }
    for (let i = 0; i < 90; i++) {   // moss stains along the top (v near 0 / 1 is the top of the trunk)
      const v = (random() < .5 ? random() * .22 : 1 - random() * .22) * 512, r = 8 + random() * 26;
      ctx.fillStyle = `hsla(${88 + random() * 22},${44 + random() * 20}%,${26 + random() * 20}%,.55)`; ctx.beginPath(); ctx.arc(random() * 512, v, r, 0, 7); ctx.fill(); }
  });
  barkMap.colorSpace = T.SRGBColorSpace; barkMap.wrapS = barkMap.wrapT = T.RepeatWrapping; barkMap.repeat.set(14, 1); barkMap.anisotropy = 4;
  const ring = [];                    // per-ring centre (x, y) and in-plane normal
  const radiusAt = (u, f) => TRUNK_R * (1 - .22 * Math.abs(u - .5)) * (1 + .1 * Math.sin(f * 3 + u * 9) + .06 * Math.sin(f * 5 - u * 21 + 1.3) + .05 * Math.sin(u * 37 + f * 2));
  const base = new Float32Array((NU + 1) * (NV + 1) * 3), live = new Float32Array(base.length), uv = new Float32Array((NU + 1) * (NV + 1) * 2), idx = [];
  for (let i = 0; i <= NU; i++) {
    const u = i / NU, c = curve.getPointAt(u), t = curve.getTangentAt(u), n = new T.Vector3(-t.y, t.x, 0).normalize();
    ring.push({ cx: c.x, cy: c.y, nx: n.x, ny: n.y });
    for (let j = 0; j <= NV; j++) {
      const f = (j / NV) * Math.PI * 2, r = radiusAt(u, f), k = (i * (NV + 1) + j) * 3;
      base[k] = c.x + n.x * Math.cos(f) * r; base[k + 1] = c.y + n.y * Math.cos(f) * r; base[k + 2] = Math.sin(f) * r;
      uv[(i * (NV + 1) + j) * 2] = u; uv[(i * (NV + 1) + j) * 2 + 1] = j / NV;
    }
  }
  for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const a = i * (NV + 1) + j, b = a + NV + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const trunkGeo = new T.BufferGeometry();
  trunkGeo.setAttribute('position', new T.BufferAttribute(live, 3)); trunkGeo.setAttribute('uv', new T.BufferAttribute(uv, 2)); trunkGeo.setIndex(idx);
  const trunk = new T.Mesh(trunkGeo, new T.MeshStandardMaterial({ map: barkMap, bumpMap: barkMap, bumpScale: 2.2, roughness: .95 }));
  trunk.castShadow = true; trunk.receiveShadow = true; trunk.frustumCulled = false; scene.add(trunk);

  // moss: little clumps over the top of the trunk, riding on its surface
  const MOSS = 1500, mossGeo = new T.IcosahedronGeometry(.062, 0);
  const moss = new T.InstancedMesh(mossGeo, new T.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true }), MOSS);
  moss.castShadow = true; moss.receiveShadow = true; moss.frustumCulled = false; scene.add(moss);
  const clumps = [];
  for (let m = 0; m < MOSS; m++) {
    const u = .08 + random() * .84, f = (random() - .5) * Math.PI * (.5 + .5 * random()), i = Math.round(u * NU);
    clumps.push({ i, f, s: .6 + random() * 1.2, lift: .02 + random() * .05, rot: random() * 6 });
    const col = new T.Color().setHSL(.26 + random() * .07, .55 + random() * .25, .13 + random() * .15); moss.setColorAt(m, col);
  }

  // squeeze the trunk where the person lands: bends down, flattens and spreads, like a sponge
  let iL = 0; ring.forEach((r, i) => { if (Math.abs(r.cx - .45) < Math.abs(ring[iL].cx - .45)) iL = i; });
  const LAND_X = ring[iL].cx, SIGMA = 1.5;
  const squeezeAt = (x, y, z, cy, S) => {
    const g = Math.exp(-Math.pow((x - LAND_X) / SIGMA, 2)), q = S * g;
    return [x + (x - LAND_X) * .26 * q, cy + (y - cy) * (1 - .5 * q) - .62 * q, z * (1 + .5 * q)];
  };
  let squeezeNow = 99;
  function deform(S) {
    if (Math.abs(S - squeezeNow) < 1e-4) return;
    squeezeNow = S;
    for (let i = 0; i <= NU; i++) {
      const cy = ring[i].cy;
      for (let j = 0; j <= NV; j++) {
        const k = (i * (NV + 1) + j) * 3, r = squeezeAt(base[k], base[k + 1], base[k + 2], cy, S);
        live[k] = r[0]; live[k + 1] = r[1]; live[k + 2] = r[2];
      }
    }
    trunkGeo.attributes.position.needsUpdate = true; trunkGeo.computeVertexNormals();
    const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), sc = new T.Vector3(), pos = new T.Vector3();
    clumps.forEach((c, n) => {
      const rg = ring[c.i], r = radiusAt(c.i / NU, c.f) + c.lift;
      const bx = rg.cx + rg.nx * Math.cos(c.f) * r, by = rg.cy + rg.ny * Math.cos(c.f) * r, bz = Math.sin(c.f) * r;
      const s = squeezeAt(bx, by, bz, rg.cy, S);
      pos.set(s[0], s[1], s[2]); e.set(c.rot, c.rot * 1.7, c.rot * .6); q.setFromEuler(e); sc.set(c.s * 1.25, c.s * (1 - .25 * Math.max(0, S) * Math.exp(-Math.pow((bx - LAND_X) / SIGMA, 2))), c.s * 1.25);
      m4.compose(pos, q, sc); moss.setMatrixAt(n, m4);
    });
    moss.instanceMatrix.needsUpdate = true;
  }
  // where the trunk's top and underside are at the landing spot, for the feet and the droplet
  const topY = (S) => squeezeAt(LAND_X, ring[iL].cy + radiusAt(iL / NU, 0), 0, ring[iL].cy, S)[1] + .02;
  const bottomY = (S) => squeezeAt(LAND_X, ring[iL].cy - radiusAt(iL / NU, Math.PI), 0, ring[iL].cy, S)[1];

  // ---- the person: a smooth figure in a green polo, cream shorts and white shoes, built from capsules
  const skin = new T.MeshStandardMaterial({ color: '#d8a07a', roughness: .62 }), hairM = new T.MeshStandardMaterial({ color: '#2b2019', roughness: .8 });
  const polo = new T.MeshStandardMaterial({ color: '#1f8a3f', roughness: .7 }), shorts = new T.MeshStandardMaterial({ color: '#efe7d3', roughness: .75 }), shoe = new T.MeshStandardMaterial({ color: '#f7f7f4', roughness: .5 });
  const cap = (len, r, mat, sz = 1) => { const m = new T.Mesh(new T.CapsuleGeometry(r, Math.max(.001, len - 2 * r), 6, 14), mat); m.scale.z = sz; m.castShadow = true; return m; };
  const person = new T.Group(); scene.add(person);
  const pelvis = new T.Group(); person.add(pelvis);
  const torsoG = new T.Group(); pelvis.add(torsoG);
  const torsoM = cap(.62, .17, polo, .78); torsoM.position.y = .3; torsoG.add(torsoM);
  const hipsM = cap(.26, .165, shorts, .78); hipsM.position.y = .0; pelvis.add(hipsM);
  const neckG = new T.Group(); neckG.position.y = .6; torsoG.add(neckG);
  const headM = new T.Mesh(new T.SphereGeometry(.118, 28, 20), skin); headM.position.y = .13; headM.scale.set(1, 1.08, .92); headM.castShadow = true; neckG.add(headM);
  const hairMesh = new T.Mesh(new T.SphereGeometry(.126, 28, 16, 0, Math.PI * 2, 0, Math.PI * .58), hairM); hairMesh.position.set(-.012, .146, 0); hairMesh.rotation.z = rad(12); hairMesh.scale.set(1, 1.04, .95); neckG.add(hairMesh);
  const neckM = cap(.14, .05, skin); neckM.position.y = .03; neckG.add(neckM);
  function limb(parent, x, z, up, lo, ur, lr, upMat, loMat, footMat) {
    const joint = new T.Group(); joint.position.set(x, up.y, z); parent.add(joint);
    const a = cap(up.len, ur, upMat); a.position.y = -up.len / 2; joint.add(a);
    const mid = new T.Group(); mid.position.y = -up.len; joint.add(mid);
    const b = cap(lo.len, lr, loMat); b.position.y = -lo.len / 2; mid.add(b);
    let foot = null;
    if (footMat) { const end = new T.Group(); end.position.y = -lo.len; mid.add(end); const f = cap(.27, .062, footMat, 1.15); f.rotation.z = Math.PI / 2; f.position.set(.07, -.045, 0); end.add(f); foot = end; }
    return { joint, mid, foot };
  }
  const armL = limb(torsoG, 0, .21, { y: .53, len: .3 }, { len: .29 }, .062, .05, polo, skin, null), armR = limb(torsoG, 0, -.21, { y: .53, len: .3 }, { len: .29 }, .062, .05, polo, skin, null);
  const legL = limb(pelvis, 0, .105, { y: -.02, len: .45 }, { len: .46 }, .085, .058, shorts, skin, shoe), legR = limb(pelvis, 0, -.105, { y: -.02, len: .45 }, { len: .46 }, .085, .058, shorts, skin, shoe);
  // forearm hands
  for (const a of [armL, armR]) { const h = new T.Mesh(new T.SphereGeometry(.052, 12, 10), skin); h.position.y = -.31; h.castShadow = true; a.mid.add(h); }
  const legReach = (h, k) => Math.min(.45 * Math.cos(rad(h)) + .46 * Math.cos(rad(h + k)));

  // ---- the droplet squeezed out of the trunk
  const dropMat = new T.MeshPhysicalMaterial({ color: '#8fcc4e', roughness: .03, transmission: .55, thickness: .45, ior: 1.4, clearcoat: 1, emissive: new T.Color('#3f7a1a'), emissiveIntensity: .35, envMapIntensity: 1.8, attenuationColor: new T.Color('#5f9a28'), attenuationDistance: .3 });
  const dropPts = [[0, .22], [.025, .14], [.08, .065], [.125, -.015], [.12, -.085], [.075, -.14], [0, -.16]];
  const drop = new T.Mesh(new T.LatheGeometry(dropPts.map(([x, y]) => new T.Vector2(x, y)), 40), dropMat); drop.castShadow = true; scene.add(drop);

  let width = 0, height = 0;
  function layout() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return false;
    if (w !== width || h !== height) { width = w; height = h; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
    return true;
  }

  function draw(p) {
    if (!layout()) return;
    p = clamp(p);
    // trunk squeeze: a quick press at the landing, then it springs back and settles
    const since = p - LAND, tau = Math.max(0, since) / .03;
    const S = since < 0 ? 0 : smooth(since / .012) * Math.exp(-.42 * tau) * Math.cos(3.1 * tau);
    deform(S);
    // the person
    const q = pose(p), pr = (k) => rad(q[k]);
    torsoG.rotation.z = pr('torso'); neckG.rotation.z = pr('head') - pr('torso') * .6;
    armL.joint.rotation.z = pr('sL'); armL.mid.rotation.z = pr('eL'); armR.joint.rotation.z = pr('sR'); armR.mid.rotation.z = pr('eR');
    legL.joint.rotation.z = pr('hL'); legL.mid.rotation.z = pr('kL'); legR.joint.rotation.z = pr('hR'); legR.mid.rotation.z = pr('kR');
    const air = p > TAKEOFF && p < LAND;
    const flat = (leg, h, k) => { leg.foot.rotation.z = air ? -(h + k) * .45 + rad(-14) : -(h + k); };
    flat(legL, pr('hL'), pr('kL')); flat(legR, pr('hR'), pr('kR'));
    const reachNow = Math.min(legReach(q.hL, q.kL), legReach(q.hR, q.kR)) + .1;
    const x0 = -4.5, y0 = groundY(x0), standY = y0 + .1 + legReach(0, 0);
    let x = x0 - .0, y = y0 + reachNow, spin = 0;
    if (p >= TAKEOFF && p < LAND) {
      const s = (p - TAKEOFF) / (LAND - TAKEOFF), landQ = pose(LAND);
      const yLand = topY(0) + Math.min(legReach(landQ.hL, landQ.kL), legReach(landQ.hR, landQ.kR)) + .1;
      const yTake = standY;
      x = lerp(x0, LAND_X - .1, s);
      y = lerp(yTake, yLand, s) + 3.2 * 4 * s * (1 - s);
      spin = -Math.PI * 2 * smoother((p - (TAKEOFF + .03)) / (LAND - .05 - TAKEOFF));
    } else if (p >= LAND) {
      x = LAND_X - .1 + Math.min(.3, (p - LAND) * 5) * .3;
      y = topY(S) + reachNow;
    }
    person.position.set(x, y, 0); person.rotation.z = spin;
    // the droplet: grows on the underside of the trunk, lets go, and falls
    const growK = smooth((p - DROP_GROW) / (DROP_FALL - DROP_GROW)), fallT = Math.max(0, p - DROP_FALL) / (1 - DROP_FALL);
    drop.visible = p >= DROP_GROW;
    const sz = .3 + growK * 1.5;
    drop.scale.set(sz * (1 - .1 * fallT), sz * (1 + .45 * Math.min(1, fallT * 3)), sz);
    drop.position.set(LAND_X + .1, bottomY(S) - .17 * sz - fallT * fallT * 14, .1);
    // camera
    const c = camera(p), portrait = Math.max(1, 1.45 / cam.aspect) ** .9;
    const dist = c.d * (cam.aspect < 1 ? portrait : 1);
    cam.position.set(c.x + Math.sin(p * 2.2) * .35, c.y + 0.35, dist); cam.lookAt(c.x, c.y, 0);
    clouds.position.x = -p * 3.2;
    renderer.render(scene, cam);
  }
  canvas.addEventListener('webglcontextlost', (e) => e.preventDefault());
  return { draw, canvas };
}
