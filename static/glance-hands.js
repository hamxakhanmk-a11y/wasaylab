import * as T from './vendor/three/three.module.min.js';
import { createSprigs } from './herb-parts.js';

// The two hands at the end of Wasay at a glance (glance-three.js), after the owner's reference (Michelangelo's Creation of Adam, as
// a photograph): from the left a bare human hand out of a white lab coat with a light blue shirt cuff showing (Wasay Lab); from the
// right a hand of nature, the same hand mirrored, covered in moss with mint, small white flowers and lavender growing from it and
// vines trailing down. They reach in from the sides until their index fingers touch the two ends of the capsule between them.
// The hand's shape comes from scripts/build-hands.mjs (static/hands/hand.bin, a real modelled hand): x along the hand (the wrist at
// 0, the fingertip at about 0.89; the forearm runs back off screen), y the back of the hand.
const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const smooth = (n) => { n = clamp(n); return n * n * (3 - 2 * n); };
const TIP = new T.Vector3();   // the index fingertip, in the hand's own units (read from the file)

async function loadHand(url) {
  const buf = await (await fetch(url)).arrayBuffer();
  const view = new DataView(buf), V = view.getUint32(4, true), I = view.getUint32(8, true), scale = view.getFloat32(12, true), wide = V > 65535;
  TIP.set(view.getFloat32(16, true), view.getFloat32(20, true), view.getFloat32(24, true));
  let o = 28;
  const pos = new Int16Array(buf, o, V * 3); o += V * 6;
  const nor = new Int8Array(buf, o, V * 3); o += V * 3; o += wide ? (4 - o % 4) % 4 : o % 2;
  const idx = wide ? new Uint32Array(buf, o, I) : new Uint16Array(buf, o, I);
  const p = new Float32Array(V * 3), n = new Float32Array(V * 3);
  for (let i = 0; i < V * 3; i++) { p[i] = pos[i] * scale; n[i] = nor[i] / 127; }
  return { p, n, idx: wide ? new Uint32Array(idx) : new Uint16Array(idx) };
}
function geometryOf({ p, n, idx }, mirror) {
  const g = new T.BufferGeometry(), P = p.slice(), Nn = n.slice(), I = idx.slice();
  // the mesh's triangles are wound inward as built; mirroring turns them outward, so only the unmirrored hand needs them turned
  if (mirror) for (let i = 0; i < P.length; i += 3) { P[i] = -P[i]; Nn[i] = -Nn[i]; }
  else for (let i = 0; i < I.length; i += 3) { const t = I[i + 1]; I[i + 1] = I[i + 2]; I[i + 2] = t; }
  g.setAttribute('position', new T.BufferAttribute(P, 3)); g.setAttribute('normal', new T.BufferAttribute(Nn, 3)); g.setIndex(new T.BufferAttribute(I, 1));
  return g;
}
// the forearm's middle and its half-width and half-depth at x, measured from the mesh
function section({ p }, x) {
  let cy = 0, cz = 0, n = 0, ry = 0, rz = 0;
  for (let i = 0; i < p.length; i += 3) if (Math.abs(p[i] - x) < .02) { cy += p[i + 1]; cz += p[i + 2]; n++; }
  cy /= n || 1; cz /= n || 1;
  for (let i = 0; i < p.length; i += 3) if (Math.abs(p[i] - x) < .02) { ry = Math.max(ry, Math.abs(p[i + 1] - cy)); rz = Math.max(rz, Math.abs(p[i + 2] - cz)); }
  return { cy, cz, ry, rz };
}
// an open sleeve along -x from x0 to x1, oval, with soft folds in the cloth
function sleeveGeometry({ cy, cz, ry, rz }, x0, x1, grow, folds) {
  const g = new T.CylinderGeometry(1, 1, 1, 48, 36, true); g.rotateZ(Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i) + .5, x = x0 + (x1 - x0) * u, a = Math.atan2(p.getZ(i), p.getY(i)), k = 1 + grow * u;
    const f = 1 + folds * (Math.sin(a * 5 + x * 6) * Math.sin(x * 4.5) * .7 + Math.sin(a * 11 - x * 9) * .3);
    p.setXYZ(i, x, cy + Math.cos(a) * ry * k * f, cz + Math.sin(a) * rz * k * f);
  }
  g.computeVertexNormals();
  return g;
}

export function createHands(scene, { density = 1 } = {}) {
  const group = new T.Group(); group.visible = false; scene.add(group);
  const human = new T.Group(), nature = new T.Group(); group.add(human, nature);
  let seed = 5303;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const time = { value: 0 };
  let ready = false, sprigs = null;
  // warm light from the upper left, as in the reference, and a soft fill from the front
  const sun = new T.DirectionalLight('#fff1dc', 2.2); sun.position.set(-4, 5, 4); group.add(sun);
  const front = new T.DirectionalLight('#ffffff', .9); front.position.set(0, 1, 8); group.add(front);

  loadHand('/hands/hand.bin').then((hand) => {
    // ---- the human hand: bare skin, coming out of a white lab coat with a light blue shirt cuff
    const skin = new T.MeshPhysicalMaterial({ color: '#d29d7c', roughness: .55, sheen: .5, sheenColor: new T.Color('#ffdcc8'), sheenRoughness: .5, clearcoat: .1, clearcoatRoughness: .6, emissive: new T.Color('#4a1c10'), emissiveIntensity: .18 });
    human.add(new T.Mesh(geometryOf(hand, false), skin));
    const wrist = section(hand, -.42);
    const shirt = new T.MeshStandardMaterial({ color: '#b8d2ef', roughness: .8 });
    const coat = new T.MeshStandardMaterial({ color: '#f6f6f2', roughness: .85, side: T.DoubleSide, emissive: new T.Color('#2a2a26'), emissiveIntensity: .2 });
    human.add(new T.Mesh(sleeveGeometry({ ...wrist, ry: wrist.ry * 1.18, rz: wrist.rz * 1.18 }, -.36, -.86, .05, .02), shirt));
    human.add(new T.Mesh(sleeveGeometry({ ...wrist, ry: wrist.ry * 1.55, rz: wrist.rz * 1.5 }, -.74, -4.8, .45, .055), coat));
    // the coat's turned-back hem: a thick soft ring where the sleeve ends
    const hem = new T.Mesh(new T.TorusGeometry(1, .06, 10, 48), coat); hem.rotation.y = Math.PI / 2;
    hem.scale.set(wrist.rz * 1.5, wrist.ry * 1.55, .7); hem.position.set(-.74, wrist.cy, wrist.cz); human.add(hem);

    // ---- the hand of nature: the same hand mirrored, covered in moss
    const natureGeo = geometryOf(hand, true);
    nature.add(new T.Mesh(natureGeo, new T.MeshStandardMaterial({ color: '#33461a', roughness: 1 })));
    const P = natureGeo.attributes.position, Nn = natureGeo.attributes.normal, I = natureGeo.index.array;
    const tris = [], areas = []; let total = 0;
    const A = new T.Vector3(), B = new T.Vector3(), C = new T.Vector3(), e1 = new T.Vector3(), e2 = new T.Vector3();
    for (let t = 0; t < I.length; t += 3) {
      A.fromBufferAttribute(P, I[t]); B.fromBufferAttribute(P, I[t + 1]); C.fromBufferAttribute(P, I[t + 2]);
      if ((A.x + B.x + C.x) / 3 > 3.2) continue;
      const area = e1.subVectors(B, A).cross(e2.subVectors(C, A)).length() / 2; total += area; tris.push(t); areas.push(total);
    }
    const sample = () => {   // a random point on the hand's surface (area-weighted) and its normal
      const r = random() * total; let lo = 0, hi = areas.length - 1; while (lo < hi) { const mid = (lo + hi) >> 1; if (areas[mid] < r) lo = mid + 1; else hi = mid; }
      const t = tris[lo]; let u = random(), v = random(); if (u + v > 1) { u = 1 - u; v = 1 - v; }
      A.fromBufferAttribute(P, I[t]); B.fromBufferAttribute(P, I[t + 1]); C.fromBufferAttribute(P, I[t + 2]);
      const pt = A.multiplyScalar(1 - u - v).add(B.multiplyScalar(u)).add(C.multiplyScalar(v)).clone();
      A.fromBufferAttribute(Nn, I[t]); B.fromBufferAttribute(Nn, I[t + 1]); C.fromBufferAttribute(Nn, I[t + 2]);
      return { p: pt, n: A.multiplyScalar(1 - u - v).add(B.multiplyScalar(u)).add(C.multiplyScalar(v)).normalize().clone() };
    };
    // moss: short, thick, curling tufts packed close, olive to yellow-green with dark hollows
    const TUFTS = Math.round(90000 * Math.max(.45, density)), base = new Float32Array(TUFTS * 3), norm = new Float32Array(TUFTS * 3), shape = new Float32Array(TUFTS * 4);
    for (let b = 0; b < TUFTS; b++) {
      const { p, n } = sample();
      base.set([p.x, p.y, p.z], b * 3); norm.set([n.x, n.y, n.z], b * 3);
      shape.set([random() * Math.PI * 2, .012 + Math.pow(random(), 2) * .03, random(), .5 + random() * .9], b * 4);
    }
    const tuft = new T.BufferGeometry();
    { const pos = [], at = [], idx = [];
      for (let i = 0; i <= 3; i++) { const v = i / 3, w = .5 * (1 - v * .6); pos.push(-w, v, 0, w, v, 0); at.push(v, v); }
      for (let i = 0; i < 3; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      tuft.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); tuft.setAttribute('aT', new T.Float32BufferAttribute(at, 1)); tuft.setIndex(idx); }
    const moss = new T.InstancedBufferGeometry(); moss.index = tuft.index;
    moss.setAttribute('position', tuft.attributes.position); moss.setAttribute('aT', tuft.attributes.aT);
    moss.setAttribute('iBase', new T.InstancedBufferAttribute(base, 3)); moss.setAttribute('iN', new T.InstancedBufferAttribute(norm, 3)); moss.setAttribute('iShape', new T.InstancedBufferAttribute(shape, 4));
    moss.instanceCount = TUFTS;
    const mossMesh = new T.Mesh(moss, new T.ShaderMaterial({
      side: T.DoubleSide, uniforms: { uTime: time },
      vertexShader: `
        attribute float aT; attribute vec3 iBase; attribute vec3 iN; attribute vec4 iShape; uniform float uTime;
        varying float vT; varying float vTone; varying float vLight; varying float vSun;
        void main() {
          vec3 up = normalize(iN), side = normalize(cross(up, abs(up.y) < .9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
          side = cos(iShape.x) * side + sin(iShape.x) * cross(up, side);
          float h = iShape.y;
          // a tuft curls over sideways as it grows, so the surface reads as springy moss, not grass
          vec3 curl = cross(side, up);
          vec3 p = iBase + side * position.x * .009 + up * position.y * h * .8 + curl * iShape.w * aT * aT * h * .9;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
          vec3 wn = normalize(mat3(modelMatrix) * up), sun = normalize(vec3(-.55, .65, .5));
          float lit = max(0.0, dot(wn, sun));
          vT = aT; vTone = iShape.z; vSun = lit;
          vLight = (.25 + .95 * lit) * mix(.45, 1.0, smoothstep(-.7, .35, wn.y));
        }`,
      fragmentShader: `
        varying float vT; varying float vTone; varying float vLight; varying float vSun;
        void main() {
          vec3 tip = mix(mix(vec3(.4, .5, .16), vec3(.55, .66, .2), vTone), vec3(.78, .82, .38), smoothstep(.55, .95, vSun) * .55);
          vec3 col = mix(vec3(.08, .12, .03), tip, smoothstep(0.0, .8, vT));
          gl_FragColor = vec4(col * vLight * (.8 + vTone * .35), 1.0);
          #include <colorspace_fragment>
        }`,
    }));
    mossMesh.frustumCulled = false; nature.add(mossMesh);

    // herbs growing from the moss: mint, chamomile, lavender, thyme and white flowers, more on the back of the hand and the forearm
    const anchors = [];
    for (let tries = 0; anchors.length < Math.round(120 * Math.max(.5, density)) && tries < 4000; tries++) {
      const { p, n } = sample();
      if (n.y < .15 || p.x < -.38) continue;                      // on top, on the back of the hand and the forearm, not the fingers
      anchors.push({ p: p.add(n.clone().multiplyScalar(.012)), n: n.clone().lerp(new T.Vector3(.5, .5, .3), .25).normalize(), at: random() * .6, size: .45 + Math.min(1, p.x / 2) * .35 });
    }
    // vines trailing down from under the forearm, with pairs of small leaves along them
    const vineMat = new T.MeshStandardMaterial({ color: '#4d6a26', roughness: .8 });
    const under = section(hand, -1.4);  // the forearm's section a little way back from the wrist (mirroring leaves y and z alone)
    for (let k = 0; k < 8; k++) {
      const x = .7 + random() * 2.2, z0 = under.cz + (random() - .5) * under.rz, y0 = under.cy - under.ry * .9, pts = [new T.Vector3(x, y0, z0)];
      for (let s = 1; s <= 6; s++) pts.push(new T.Vector3(x + (random() - .3) * .15 * s, y0 - s * (.1 + random() * .06), z0 + Math.sin(s * 1.3 + k) * .06));
      const curve = new T.CatmullRomCurve3(pts), tube = new T.TubeGeometry(curve, 40, .006, 5, false);
      nature.add(new T.Mesh(tube, vineMat));
      for (let s = 1; s < 9; s++) { const at = curve.getPointAt(s / 9), dir = curve.getTangentAt(s / 9); anchors.push({ p: at, n: new T.Vector3(-dir.y, dir.x, .3).normalize(), at: .3 + s * .05, kind: 'vine', size: .55 }); }
    }
    sprigs = createSprigs(nature, anchors, { seed: 29, size: .62, facing: new T.Vector3(0, .2, 1) });
    ready = true;
  }).catch((error) => console.warn('Hands unavailable.', error));

  // ---- where they meet: the capsule's middle, the half-length to each fingertip, and the hands' size; set from the framing
  const meet = new T.Vector3(), layout = { gap: .55, scale: 2 };
  function setLayout(point, gap, scale) { meet.copy(point); layout.gap = gap; layout.scale = scale; }

  // progress 0 to 1: they slide in from off screen, slowing as they come, and settle with their fingertips at the capsule's ends;
  // the herbs on the hand of nature open as it arrives
  function update(progress, seconds, still) {
    time.value = still ? 0 : seconds;
    group.visible = ready && progress > 0;
    if (!group.visible) return;
    const e = 1 - Math.pow(1 - smooth(progress / .85), 3), S = layout.scale;
    const float = still ? 0 : Math.sin(seconds * .9) * .03 * e;
    for (const [hand, side] of [[human, -1], [nature, 1]]) {
      hand.scale.setScalar(S);
      hand.rotation.set(.42, 0, side * -.04 * (1 - e));
      // the fingertip, once rotated and scaled, lands on the capsule's end
      const tip = TIP.clone(); if (side > 0) tip.x = -tip.x;
      tip.applyEuler(hand.rotation).multiplyScalar(S);
      const reach = (1 - e) * (7 + 2 * S);
      hand.position.set(meet.x + side * (layout.gap + reach) - tip.x, meet.y - tip.y + float * side, meet.z - tip.z);
    }
    if (sprigs) sprigs.update(smooth((progress - .2) / .7), still ? 0 : seconds * .8);
  }
  return { update, setLayout, get ready() { return ready; } };
}
