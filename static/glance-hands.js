import * as T from './vendor/three/three.module.min.js';

// The two hands at the end of Wasay at a glance (glance-three.js), after the reference of Michelangelo's Creation of Adam the owner
// showed: from the left a bare human forearm with a blue nitrile medical glove on the hand (Wasay Lab); from the right a
// hand of nature, the same hand mirrored and grown over with grass all the way up its forearm.
// They reach in from the sides until their index fingers touch the two ends of the capsule between them. The hand's shape comes from scripts/build-hands.mjs (static/hands/hand.bin): x along the hand (wrist about 0,
// fingertip 0.96), y the back of the hand, z towards the thumb.
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

export function createHands(scene, { density = 1 } = {}) {
  const group = new T.Group(); group.visible = false; scene.add(group);
  const human = new T.Group(), nature = new T.Group(); group.add(human, nature);
  let seed = 5303;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const time = { value: 0 };
  let ready = false;

  const front = new T.DirectionalLight('#ffffff', 1.6); front.position.set(-1, 2, 8); group.add(front);

  // the hand mesh split in two along the wrist: the triangles in front of x = at, and the rest
  function split(geometry, at) {
    const P = geometry.attributes.position, I = geometry.index.array, near = [], far = [];
    for (let t = 0; t < I.length; t += 3) ((P.getX(I[t]) + P.getX(I[t + 1]) + P.getX(I[t + 2])) / 3 > at ? near : far).push(I[t], I[t + 1], I[t + 2]);
    const part = (list) => { const g = new T.BufferGeometry(); g.setAttribute('position', P); g.setAttribute('normal', geometry.attributes.normal); g.setIndex(list); return g; };
    return [part(near), part(far)];
  }

  loadHand('/hands/hand.bin').then((hand) => {
    // ---- the human hand: a bare forearm, and on the hand a blue nitrile glove, softly glossy, ending in a rolled cuff at the wrist
    const WRIST = -.3;
    const [gloveGeo, armGeo] = split(geometryOf(hand, false), WRIST);
    const nitrile = new T.MeshPhysicalMaterial({ color: '#4f9be8', roughness: .42, clearcoat: .3, clearcoatRoughness: .35, sheen: .45, sheenColor: new T.Color('#d6ecff'), emissive: new T.Color('#0f3a6e'), emissiveIntensity: .22 });
    const skin = new T.MeshPhysicalMaterial({ color: '#c58e6a', roughness: .62, sheen: .35, sheenColor: new T.Color('#ffd8c2'), sheenRoughness: .6, clearcoat: .06, emissive: new T.Color('#3a160c'), emissiveIntensity: .22 });
    human.add(new T.Mesh(gloveGeo, nitrile), new T.Mesh(armGeo, skin));
    // the rolled cuff hugs the oval wrist (wider than it is deep)
    const cuff = new T.Mesh(new T.TorusGeometry(.145, .019, 12, 56), nitrile); cuff.rotation.y = Math.PI / 2; cuff.scale.set(1, .68, 1); cuff.position.set(WRIST, -.012, .012); human.add(cuff);

    // ---- the hand of nature: the same hand mirrored, dark soil-green under a dense coat of grass
    const natureGeo = geometryOf(hand, true);
    nature.add(new T.Mesh(natureGeo, new T.MeshStandardMaterial({ color: '#163212', roughness: 1 })));
    // grass over the whole hand and forearm: blades of mixed length standing out from the surface, many to a patch
    const P = natureGeo.attributes.position, Nn = natureGeo.attributes.normal, I = natureGeo.index.array;
    const tris = [], areas = []; let total = 0;
    const A = new T.Vector3(), B = new T.Vector3(), C = new T.Vector3(), e1 = new T.Vector3(), e2 = new T.Vector3();
    for (let t = 0; t < I.length; t += 3) {
      A.fromBufferAttribute(P, I[t]); B.fromBufferAttribute(P, I[t + 1]); C.fromBufferAttribute(P, I[t + 2]);
      const area = e1.subVectors(B, A).cross(e2.subVectors(C, A)).length() / 2; total += area; tris.push(t); areas.push(total);
    }
    const BLADES = Math.round(72000 * Math.max(.45, density)), base = new Float32Array(BLADES * 3), norm = new Float32Array(BLADES * 3), shape = new Float32Array(BLADES * 4);
    for (let b = 0; b < BLADES; b++) {
      const r = random() * total; let lo = 0, hi = areas.length - 1; while (lo < hi) { const mid = (lo + hi) >> 1; if (areas[mid] < r) lo = mid + 1; else hi = mid; }
      const t = tris[lo]; let u = random(), v = random(); if (u + v > 1) { u = 1 - u; v = 1 - v; }
      A.fromBufferAttribute(P, I[t]); B.fromBufferAttribute(P, I[t + 1]); C.fromBufferAttribute(P, I[t + 2]);
      const pt = A.multiplyScalar(1 - u - v).add(B.multiplyScalar(u)).add(C.multiplyScalar(v)).clone();
      A.fromBufferAttribute(Nn, I[t]); B.fromBufferAttribute(Nn, I[t + 1]); C.fromBufferAttribute(Nn, I[t + 2]);
      const nn = A.multiplyScalar(1 - u - v).add(B.multiplyScalar(u)).add(C.multiplyScalar(v)).normalize();
      base.set([pt.x, pt.y, pt.z], b * 3); norm.set([nn.x, nn.y, nn.z], b * 3);
      // turn, length (mostly short with some long ones, so the outline is ragged, not combed), tone, and lean
      shape.set([random() * Math.PI * 2, .03 + Math.pow(random(), 2.2) * .07, random(), .2 + random() * .6], b * 4);
    }
    const blade = new T.BufferGeometry();
    { const pos = [], at = [], idx = [];
      for (let i = 0; i <= 3; i++) { const v = i / 3, w = .5 * (1 - v * .92); pos.push(-w, v, 0, w, v, 0); at.push(v, v); }
      for (let i = 0; i < 3; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      blade.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); blade.setAttribute('aT', new T.Float32BufferAttribute(at, 1)); blade.setIndex(idx); }
    const grass = new T.InstancedBufferGeometry(); grass.index = blade.index;
    grass.setAttribute('position', blade.attributes.position); grass.setAttribute('aT', blade.attributes.aT);
    grass.setAttribute('iBase', new T.InstancedBufferAttribute(base, 3)); grass.setAttribute('iN', new T.InstancedBufferAttribute(norm, 3)); grass.setAttribute('iShape', new T.InstancedBufferAttribute(shape, 4));
    grass.instanceCount = BLADES;
    const grassMesh = new T.Mesh(grass, new T.ShaderMaterial({
      side: T.DoubleSide, uniforms: { uTime: time },
      vertexShader: `
        attribute float aT; attribute vec3 iBase; attribute vec3 iN; attribute vec4 iShape; uniform float uTime;
        varying float vT; varying float vTone; varying float vLight; varying float vSun;
        void main() {
          vec3 up = normalize(iN), side = normalize(cross(up, abs(up.y) < .9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
          side = cos(iShape.x) * side + sin(iShape.x) * cross(up, side);
          float h = iShape.y, w = sin(uTime * 1.2 + iBase.x * 5.0 + iBase.z * 3.0) * .1;
          // each blade bends over a little under its own weight
          vec3 p = iBase + side * position.x * .0055 + up * position.y * h + (cross(side, up) * iShape.w + side * w - up * .15) * aT * aT * h;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
          // lit by a sun from the upper left and in front; the undersides and the hollows between the fingers fall into shade
          vec3 wn = normalize(mat3(modelMatrix) * up), sun = normalize(vec3(-.5, .75, .45));
          float lit = max(0.0, dot(wn, sun));
          vT = aT; vTone = iShape.z; vSun = lit;
          vLight = (.22 + .95 * lit) * mix(.5, 1.0, smoothstep(-.7, .35, wn.y));
        }`,
      fragmentShader: `
        varying float vT; varying float vTone; varying float vLight; varying float vSun;
        void main() {
          vec3 tip = mix(mix(vec3(.36, .62, .16), vec3(.55, .76, .22), vTone), vec3(.82, .9, .45), smoothstep(.6, .95, vSun) * .6);
          vec3 col = mix(vec3(.03, .1, .02), tip, smoothstep(0.0, 1.0, vT));
          gl_FragColor = vec4(col * vLight * (.8 + vTone * .35), 1.0);
          #include <colorspace_fragment>
        }`,
    }));
    grassMesh.frustumCulled = false; nature.add(grassMesh);
    ready = true;
  }).catch((error) => console.warn('Hands unavailable.', error));

  // ---- where they meet: the capsule's middle, the half-length to each fingertip, and the hands' size; set from the framing
  const meet = new T.Vector3(), layout = { gap: .55, scale: 2, drop: 1 };
  function setLayout(point, gap, scale) { meet.copy(point); layout.gap = gap; layout.scale = scale; }

  // progress 0 to 1: they slide in from off screen, slowing as they come, and settle with their fingertips at the capsule's ends
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
  }
  return { update, setLayout, get ready() { return ready; } };
}
