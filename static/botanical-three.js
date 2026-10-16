import * as T from './vendor/three/three.module.min.js';

// Who we are, as one 3D scene driven by the page scroll: a huge twisted, mossy tree trunk crosses the sky; a droplet grows on its
// underside while the camera swoops, closes in and pulls back (green, gold, then amber as it mixes), then falls down into the amber
// glass bottle with the Wasay label standing on a pedestal in the clouds. draw(p, pointer) shows the moment p (0 to 1).
const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const smooth = (n) => { n = clamp(n); return n * n * (3 - 2 * n); };
const lerp = (a, b, t) => a + (b - a) * t;

// the droplet's moments
const GROW_END = .6, FALL_FROM = .62, FALL_TO = .82, RIPPLE_END = .95;

// camera: position (x, y, z), the point it looks at (lx, ly) and a little roll (degrees). The stages are held around p = .06 (wide),
// .40 (macro on the drip point), .6 (pulled back and turned, the droplet ready) and .88 (down at the bottle).
const CAM = [
  { t: 0,    x: -3.4, y: .4,   z: 15,   lx: .8,   ly: 2.7,  r: -3 },
  { t: .14,  x: -2.4, y: .7,   z: 13.2, lx: .6,   ly: 2.7,  r: -2 },
  { t: .26,  x: -4.6, y: 2.1,  z: 6.6,  lx: -3.4, ly: 1.2,  r: 6 },
  { t: .40,  x: 2.2,  y: .9,   z: 5.6,  lx: .5,   ly: 1.9,  r: 3 },
  { t: .52,  x: 6.8,  y: 2.6,  z: 11.5, lx: 1.6,  ly: 2.0,  r: -3 },
  { t: .62,  x: 5.6,  y: 1.5,  z: 9.8,  lx: 1.7,  ly: .5,   r: -1 },
  { t: .72,  x: 2.4,  y: -2.6, z: 9.6,  lx: .8,   ly: -1.9, r: 0 },
  { t: .84,  x: .5,   y: -3.7, z: 8.8,  lx: .5,   ly: -4.5, r: 0 },
  { t: 1,    x: .5,   y: -3.3, z: 10.8, lx: .5,   ly: -4.6, r: 0 },
];
function camAt(p) {
  let i = 0;
  while (i < CAM.length - 2 && p > CAM[i + 1].t) i++;
  const a = CAM[i], b = CAM[i + 1], pa = CAM[Math.max(0, i - 1)], pb = CAM[Math.min(CAM.length - 1, i + 2)], u = clamp((p - a.t) / (b.t - a.t));
  const out = {};
  for (const k of ['x', 'y', 'z', 'lx', 'ly', 'r']) {   // Catmull-Rom through the keys: no jerks as the camera passes a stage
    const p0 = pa[k], p1 = a[k], p2 = b[k], p3 = pb[k];
    out[k] = .5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u);
  }
  return out;
}

export function createStoryScene(canvas, { onChange = () => {} } = {}) {
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(36, 1, .1, 160);
  let seed = 97;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const texture = (w, h, paint) => { const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), c); return new T.CanvasTexture(c); };

  // ---- sky, clouds, reflections, light
  const sky = texture(8, 512, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, '#2169cf'); g.addColorStop(.4, '#4f9be8'); g.addColorStop(.78, '#9ccaf3'); g.addColorStop(1, '#dcecf8');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 8, 512);
  });
  sky.colorSpace = T.SRGBColorSpace; scene.background = sky;
  const env = texture(512, 256, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#4f8fe0'); g.addColorStop(.5, '#d6e8f8'); g.addColorStop(.52, '#eef3f6'); g.addColorStop(1, '#c4d4e2');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = '#fff6d8'; ctx.beginPath(); ctx.arc(150, 70, 30, 0, 7); ctx.fill();
  });
  env.colorSpace = T.SRGBColorSpace; env.mapping = T.EquirectangularReflectionMapping;
  const pmrem = new T.PMREMGenerator(renderer); scene.environment = pmrem.fromEquirectangular(env).texture; env.dispose(); pmrem.dispose();
  scene.add(new T.HemisphereLight('#d9ebff', '#a7b36d', 1.25));
  const sun = new T.DirectionalLight('#fff1d2', 3.4); sun.position.set(-6, 9, 8); scene.add(sun);
  const rim = new T.DirectionalLight('#cfe6ff', 1.6); rim.position.set(7, 3, -6); scene.add(rim);
  const glow = new T.PointLight('#ffd9a0', 90, 14); glow.position.set(1.8, -3.2, -3); scene.add(glow);   // a warm light behind the bottle
  const cloudMap = texture(128, 128, (ctx) => { const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(.5, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128); });
  const clouds = new T.Group(); scene.add(clouds);
  for (let i = 0; i < 46; i++) {
    const s = new T.Sprite(new T.SpriteMaterial({ map: cloudMap, transparent: true, opacity: .3 + random() * .45, depthWrite: false, fog: false }));
    const w = 8 + random() * 12; s.scale.set(w, w * (.38 + random() * .22), 1);
    s.position.set(-22 + random() * 46, -12 + random() * 26, -22 - random() * 16); clouds.add(s);
  }

  // ---- the trunk: a thick, twisted, gnarled mossy trunk running up across the sky from lower left to upper right
  const trunkG = new T.Group(); scene.add(trunkG);
  const curve = new T.CatmullRomCurve3([[-10, -1.6, -.4], [-6, -.1, .4], [-2.6, 1.2, -.3], [.4, 3.0, .2], [3.4, 3.6, -.4], [6.8, 5.4, .4], [11, 7.6, 0]].map(([x, y, z]) => new T.Vector3(x, y, z)));
  const NU = 240, NV = 40, R0 = 1.15, TWIST = 6.5;
  const barkMap = texture(1024, 1024, (ctx) => {
    ctx.fillStyle = '#5c4129'; ctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 1500; i++) { const x = random() * 1024, w = 4 + random() * 22; ctx.fillStyle = `hsla(${20 + random() * 12},${26 + random() * 24}%,${12 + random() * 34}%,.6)`; ctx.fillRect(x, random() * 1024, w, 24 + random() * 150); }
    for (let i = 0; i < 260; i++) { ctx.fillStyle = 'rgba(24,16,10,.5)'; ctx.fillRect(random() * 1024, random() * 1024, 2 + random() * 5, 30 + random() * 120); }
    for (let i = 0; i < 90; i++) { ctx.fillStyle = 'rgba(30,20,12,.45)'; ctx.fillRect(random() * 1024, random() * 1024, 1 + random() * 3, 60 + random() * 260); }
    for (let i = 0; i < 160; i++) { ctx.fillStyle = `rgba(190,180,150,${.08 + random() * .12})`; ctx.beginPath(); ctx.arc(random() * 1024, random() * 1024, 2 + random() * 9, 0, 7); ctx.fill(); }
  });
  barkMap.colorSpace = T.SRGBColorSpace; barkMap.wrapS = barkMap.wrapT = T.RepeatWrapping; barkMap.repeat.set(9, 1); barkMap.anisotropy = 8;
  const radiusAt = (u, f) => R0 * (1 - .3 * Math.abs(u - .5)) * (1 + .24 * Math.sin(3 * f + 8 * u) + .14 * Math.sin(5 * f - 17 * u + 1.3) + .09 * Math.sin(9 * f + 31 * u) + .05 * Math.sin(2 * f - 40 * u) + .12 * Math.sin(2 * f + 5 * u) * Math.sin(u * 13));
  const ring = [];
  const pos = new Float32Array((NU + 1) * (NV + 1) * 3), uv = new Float32Array((NU + 1) * (NV + 1) * 2), idx = [];
  for (let i = 0; i <= NU; i++) {
    const u = i / NU, c = curve.getPointAt(u), t = curve.getTangentAt(u), n = new T.Vector3(-t.y, t.x, 0).normalize();
    ring.push({ cx: c.x, cy: c.y, nx: n.x, ny: n.y });
    for (let j = 0; j <= NV; j++) {
      const f = (j / NV) * Math.PI * 2, a = f + u * TWIST, r = radiusAt(u, f), k = (i * (NV + 1) + j) * 3;
      pos[k] = c.x + n.x * Math.cos(a) * r; pos[k + 1] = c.y + n.y * Math.cos(a) * r; pos[k + 2] = Math.sin(a) * r;
      uv[(i * (NV + 1) + j) * 2] = u; uv[(i * (NV + 1) + j) * 2 + 1] = j / NV;
    }
  }
  for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const a = i * (NV + 1) + j, b = a + NV + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const trunkGeo = new T.BufferGeometry();
  trunkGeo.setAttribute('position', new T.BufferAttribute(pos, 3)); trunkGeo.setAttribute('uv', new T.BufferAttribute(uv, 2)); trunkGeo.setIndex(idx); trunkGeo.computeVertexNormals();
  const trunk = new T.Mesh(trunkGeo, new T.MeshStandardMaterial({ map: barkMap, bumpMap: barkMap, bumpScale: 5, roughness: .96 }));
  trunk.frustumCulled = false; trunkG.add(trunk);

  // moss: clumps gathered in patches over the upper side of the trunk (the patch under the mouse swells)
  const MOSS = 3200, mossGeo = new T.IcosahedronGeometry(.05, 1);
  const moss = new T.InstancedMesh(mossGeo, new T.MeshStandardMaterial({ color: '#ffffff', roughness: 1 }), MOSS);
  moss.frustumCulled = false; trunkG.add(moss);
  const clumps = [];
  const patch = (u, a) => .5 + .5 * Math.sin(u * 11 + a * 1.7) * Math.cos(u * 5.3 - a * 2.3) + .25 * Math.sin(u * 29 + a * 3.1);
  for (let tries = 0; clumps.length < MOSS && tries < MOSS * 12; tries++) {
    const u = .04 + random() * .92, a = (random() - .5) * 2 * 1.55, f = a - u * TWIST;   // a: angle from the top of the trunk (world)
    if (patch(u, a) * (1 - Math.abs(a) / 2.1) < .3 + random() * .22) continue;
    const i = Math.round(u * NU), rg = ring[i], r = radiusAt(i / NU, f) + .01 + random() * .035;
    const p = new T.Vector3(rg.cx + rg.nx * Math.cos(a) * r, rg.cy + rg.ny * Math.cos(a) * r, Math.sin(a) * r);
    clumps.push({ p, s: .55 + random() * 1.5, rot: random() * 6, hue: .24 + random() * .08, sat: .55 + random() * .3, lit: .12 + random() * .2 });
  }
  const m4 = new T.Matrix4(), qq = new T.Quaternion(), ee = new T.Euler(), sc = new T.Vector3(), color = new T.Color();
  clumps.forEach((c, n) => { color.setHSL(c.hue, c.sat, c.lit); moss.setColorAt(n, color); });
  moss.count = clumps.length;
  let swellKey = '';
  function placeMoss(local, strength) {
    const key = local ? `${local.x.toFixed(2)},${local.y.toFixed(2)},${strength.toFixed(2)}` : 'none';
    if (key === swellKey) return;
    swellKey = key;
    clumps.forEach((c, n) => {
      const w = local ? Math.exp(-(c.p.distanceToSquared(local)) / 1.1) * strength : 0, s = c.s * (1 + 1.1 * w);
      ee.set(c.rot, c.rot * 1.7, c.rot * .6); qq.setFromEuler(ee); sc.set(s * 1.2, s, s * 1.2); m4.compose(c.p, qq, sc); moss.setMatrixAt(n, m4);
    });
    moss.instanceMatrix.needsUpdate = true;
  }
  placeMoss(null, 0);
  // the droplet hangs from the underside of the trunk here (trunk space)
  const iD = ring.reduce((best, r, i) => (Math.abs(r.cx - .4) < Math.abs(ring[best].cx - .4) ? i : best), 0);
  const rD = radiusAt(iD / NU, Math.PI - (iD / NU) * TWIST);
  const dripLocal = new T.Vector3(ring[iD].cx - ring[iD].nx * rD, ring[iD].cy - ring[iD].ny * rD, 0);

  // ---- the bottle on its pedestal, below the drip
  const BX = .5, BS = 1.35, BY = -3.7;
  const rig = new T.Group(); rig.position.set(BX, BY, 0); rig.scale.setScalar(BS); scene.add(rig);
  const glass = new T.MeshPhysicalMaterial({ color: '#c9772c', metalness: 0, roughness: .1, transmission: .94, thickness: .4, ior: 1.5, attenuationColor: new T.Color('#c0711f'),
    attenuationDistance: .8, envMapIntensity: 1.5, clearcoat: 1, clearcoatRoughness: .05, emissive: new T.Color('#8a4c0e'), emissiveIntensity: .1 });
  const profile = [[0,-2],[.67,-2],[.78,-1.98],[.84,-1.89],[.85,-1.74],[.85,-.56],[.83,-.41],[.76,-.28],[.59,-.15],[.45,-.04],[.40,.07],[.40,.31],[.43,.35],
    [.43,.4],[.40,.43],[.33,.43],[.32,.38],[.32,.1],[.37,-.08],[.54,-.23],[.70,-.38],[.76,-.55],[.76,-1.75],[.69,-1.87],[0,-1.87]];
  rig.add(new T.Mesh(new T.LatheGeometry(profile.map(([x, y]) => new T.Vector2(x, y)), 96), glass));
  // paper label with the real logo (the logo already carries the name Wasay Laboratories)
  const labelMap = texture(1536, 512, (ctx, c) => {
    ctx.fillStyle = '#f6f1e3'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = '#0b5c33'; ctx.lineWidth = 5; ctx.strokeRect(764 - 330, 26, 660, 460);
    ctx.fillStyle = '#a3cf3c'; ctx.fillRect(764 - 330, 26, 660, 7);
  });
  labelMap.colorSpace = T.SRGBColorSpace; labelMap.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const logo = new Image();
  logo.onload = () => { const ctx = labelMap.image.getContext('2d'), h = 400, w = h * logo.naturalWidth / logo.naturalHeight; ctx.drawImage(logo, 768 - w / 2, 56, w, h); labelMap.needsUpdate = true; onChange(); };
  logo.src = '/logo.png';
  const arc = Math.PI * 1.1;
  const label = new T.Mesh(new T.CylinderGeometry(.858, .858, .95, 72, 1, true, -arc / 2, arc), new T.MeshStandardMaterial({ map: labelMap, roughness: .62, metalness: 0, envMapIntensity: .55 }));
  label.position.y = -1.16; rig.add(label);
  for (const y of [.12, .23, .34]) { const th = new T.Mesh(new T.TorusGeometry(.405, .018, 10, 80), glass); th.rotation.x = Math.PI / 2; th.position.y = y; rig.add(th); }
  const liquid = new T.MeshPhysicalMaterial({ color: '#d29a33', roughness: .08, transmission: .8, thickness: .7, ior: 1.46, attenuationColor: new T.Color('#d09a3a'), attenuationDistance: 1.5, emissive: new T.Color('#b8741a'), emissiveIntensity: .28 });
  rig.add(new T.Mesh(new T.LatheGeometry([[0, -1.85], [.66, -1.85], [.74, -1.72], [.74, -.67], [0, -.67]].map(([x, y]) => new T.Vector2(x, y)), 64), liquid));
  const baseY = BY - 2 * BS, mouthY = BY + .43 * BS;
  const podium = new T.Mesh(new T.CylinderGeometry(1.9, 2.1, .4, 72), new T.MeshStandardMaterial({ color: '#f3ecdc', roughness: .55, envMapIntensity: .6 }));
  podium.position.set(BX, baseY - .2, 0); scene.add(podium);
  const shadowMap = texture(128, 128, (ctx) => { const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 63); g.addColorStop(0, 'rgba(70,52,26,.4)'); g.addColorStop(.5, 'rgba(70,52,26,.18)'); g.addColorStop(1, 'rgba(70,52,26,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128); });
  const contact = new T.Mesh(new T.PlaneGeometry(3.4, 2.4), new T.MeshBasicMaterial({ map: shadowMap, transparent: true, depthWrite: false }));
  contact.rotation.x = -Math.PI / 2; contact.position.set(BX, baseY + .005, 0); scene.add(contact);

  // ---- the droplet: green to gold to amber while it grows (a marbled texture of the three colours slides through it)
  const GREEN = new T.Color('#79b83a'), GOLD = new T.Color('#e8b628'), AMBER = new T.Color('#d4800f');
  const mix = (c, out) => { const k = clamp(c); return k < .5 ? out.copy(GREEN).lerp(GOLD, smooth(k / .5)) : out.copy(GOLD).lerp(AMBER, smooth((k - .5) / .5)); };
  const swirl = texture(128, 256, (ctx) => {
    const g = ctx.createLinearGradient(0, 256, 0, 0);
    g.addColorStop(0, '#79b83a'); g.addColorStop(.5, '#e8b628'); g.addColorStop(1, '#d4800f');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 256);
    for (let i = 0; i < 46; i++) {
      const y = random() * 256, cs = ['#79b83a', '#e8b628', '#d4800f', '#f6d86a'][Math.floor(random() * 4)];
      const r = ctx.createRadialGradient(random() * 128, y, 2, random() * 128, y, 26 + random() * 40);
      r.addColorStop(0, cs + 'cc'); r.addColorStop(1, cs + '00'); ctx.fillStyle = r; ctx.fillRect(0, 0, 128, 256);
    }
  });
  swirl.colorSpace = T.SRGBColorSpace; swirl.repeat.set(1, .5);
  const medicine = new T.MeshPhysicalMaterial({ color: '#e9a41f', roughness: .04, transmission: .35, thickness: .5, ior: 1.45, attenuationColor: new T.Color('#c4720a'), attenuationDistance: .22,
    clearcoat: 1, clearcoatRoughness: .03, emissive: new T.Color('#ffffff'), emissiveMap: swirl, emissiveIntensity: .7, envMapIntensity: 1.8 });
  const dropPoints = [[0, .22], [.025, .14], [.08, .065], [.125, -.015], [.12, -.085], [.075, -.14], [0, -.16]];
  const drop = new T.Mesh(new T.LatheGeometry(dropPoints.map(([x, y]) => new T.Vector2(x, y)), 48), medicine); scene.add(drop);
  const rippleMat = new T.MeshBasicMaterial({ color: '#f4c04e', transparent: true, opacity: 0, depthWrite: false });
  const ripple = new T.Mesh(new T.TorusGeometry(.3 * BS, .01, 8, 64), rippleMat); ripple.rotation.x = Math.PI / 2; scene.add(ripple);
  const tmp = new T.Color(), dripWorld = new T.Vector3(), localPointer = new T.Vector3(), ray = new T.Raycaster(), plane = new T.Plane(new T.Vector3(0, 0, 1), 0), hit = new T.Vector3();

  let width = 0, height = 0;
  function draw(progress, pointer = { x: 0, y: 0 }) {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    if (w !== width || h !== height) { width = w; height = h; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
    const p = clamp(progress);
    // the trunk moves a little with the scroll: it turns and sways while the camera works
    trunkG.rotation.y = .18 * Math.sin(p * 5.2) + .22 * p; trunkG.rotation.z = -.035 * Math.sin(p * 3.4); trunkG.position.set(-p * .6, .12 * Math.sin(p * 7), 0);
    trunkG.updateMatrixWorld(true);
    // camera
    const c = camAt(p), portrait = camera.aspect < 1 ? Math.min(1.5, 1 + (1 - camera.aspect) * .9) : 1;
    camera.position.set(lerp(c.lx, c.x, portrait) + pointer.x * .35, lerp(c.ly, c.y, portrait) - pointer.y * .22, c.z * portrait);
    const roll = c.r * Math.PI / 180; camera.up.set(Math.sin(roll), Math.cos(roll), 0); camera.lookAt(c.lx, c.ly, 0);
    camera.updateMatrixWorld(true);
    clouds.position.x = camera.position.x * .85; clouds.position.y = camera.position.y * .5;
    // the bottle and its pedestal are out of sight until the camera comes down to them (a tall phone screen would show them early)
    rig.visible = podium.visible = contact.visible = p > .56;
    // moss swells under the mouse
    const active = (pointer.x !== 0 || pointer.y !== 0) && p < .6;
    if (active) { ray.setFromCamera(new T.Vector2(pointer.x, -pointer.y), camera); if (ray.ray.intersectPlane(plane, hit)) { localPointer.copy(hit); trunkG.worldToLocal(localPointer); placeMoss(localPointer, 1); } }
    else placeMoss(null, 0);
    // the droplet
    const grow = clamp(p / GROW_END), fall = smooth((p - FALL_FROM) / (FALL_TO - FALL_FROM)), size = .5 + grow * 1.7;
    dripWorld.copy(dripLocal); trunkG.localToWorld(dripWorld);
    const yHang = dripWorld.y - .22 * size, yEnd = mouthY + .05;
    drop.visible = p < FALL_TO + .005;
    drop.scale.set(size * (1 - .16 * Math.sin(fall * Math.PI)), size * (1 + .6 * Math.sin(fall * Math.PI)), size);
    drop.position.set(lerp(dripWorld.x, BX, smooth(fall * 1.1)), lerp(yHang, yEnd, fall * fall), lerp(dripWorld.z, 0, fall) + .02);
    mix(grow, tmp); medicine.color.copy(tmp); medicine.attenuationColor.copy(tmp).multiplyScalar(.7); swirl.offset.y = grow * .5;
    const impact = clamp((p - FALL_TO) / (RIPPLE_END - FALL_TO));
    ripple.visible = p >= FALL_TO && p < RIPPLE_END + .02; ripple.position.set(BX, mouthY - .02, 0); ripple.scale.setScalar(.1 + impact * 1.1); rippleMat.opacity = (1 - impact) * .7; mix(1, rippleMat.color);
    renderer.render(scene, camera);
    canvas.parentElement.classList.add('is-three-ready');
  }
  return { draw, canvas };
}
