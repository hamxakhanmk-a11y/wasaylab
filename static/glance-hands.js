import * as T from './vendor/three/three.module.min.js';

// The two hands at the end of Wasay at a glance (glance-three.js), after the reference of Michelangelo's Creation of Adam the owner
// showed: from the left a human hand in a blue nitrile medical glove, out of a white lab-coat sleeve (Wasay Lab); from the right a
// hand of nature, the same hand mirrored and grown over with grass all the way up its forearm.
// They reach in from the sides until their index fingers touch the two ends of the capsule between them, in front of a soft
// rainbow ring. The hand's shape comes from scripts/build-hands.mjs (static/hands/hand.bin): x along the hand (wrist about 0,
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

  // ---- the soft rainbow ring behind the meeting point
  const ring = new T.Mesh(new T.PlaneGeometry(1, 1), new T.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { uOpacity: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform float uOpacity; varying vec2 vUv;
      void main() {
        vec2 c = vUv - .5; float r = length(c) * 2.0, a = atan(c.y, c.x);
        float band = exp(-pow((r - .82) / .035, 2.0)) + .35 * exp(-pow((r - .82) / .12, 2.0));
        // warm at the top, green to the lower left, blue to the right, like the reference's ring
        vec3 col = mix(vec3(.55, .82, .55), vec3(.98, .66, .38), smoothstep(-.2, .6, sin(a)));
        col = mix(col, vec3(.55, .72, .98), smoothstep(.2, .9, cos(a)) * .7);
        gl_FragColor = vec4(col, band * uOpacity * .55);
      }`,
  }));
  ring.renderOrder = -1; group.add(ring);
  const front = new T.DirectionalLight('#ffffff', 1.6); front.position.set(-1, 2, 8); group.add(front);

  loadHand('/hands/hand.bin').then((hand) => {
    // ---- the human hand: blue nitrile, softly glossy, with a rolled cuff, coming out of a white lab-coat sleeve
    const glove = new T.Mesh(geometryOf(hand, false), new T.MeshPhysicalMaterial({ color: '#5aa6f2', roughness: .38, clearcoat: .45, clearcoatRoughness: .3, sheen: .5, sheenColor: new T.Color('#d6ecff'), emissive: new T.Color('#0f3a6e'), emissiveIntensity: .35 }));
    human.add(glove);
    const cuff = new T.Mesh(new T.TorusGeometry(.142, .02, 12, 48), glove.material); cuff.rotation.y = Math.PI / 2; cuff.position.set(-.34, -.012, .01); human.add(cuff);
    const sleeveGeo = new T.CylinderGeometry(.205, .23, 4.2, 40, 30, true); sleeveGeo.rotateZ(Math.PI / 2); sleeveGeo.translate(-2.5, -.01, .01);
    { const p = sleeveGeo.attributes.position;     // soft folds in the cloth
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z - .01, y + .01), f = 1 + .045 * Math.sin(a * 5 + x * 3.1) * Math.sin(x * 2.2) + .02 * Math.sin(a * 11 - x * 5);
        p.setY(i, -.01 + (y + .01) * f); p.setZ(i, .01 + (z - .01) * f); }
      sleeveGeo.computeVertexNormals(); }
    const coat = new T.MeshStandardMaterial({ color: '#f7f8f4', roughness: .8, side: T.DoubleSide, emissive: new T.Color('#3a3d38'), emissiveIntensity: .25 });
    human.add(new T.Mesh(sleeveGeo, coat));
    const hem = new T.Mesh(new T.TorusGeometry(.212, .022, 10, 48), coat); hem.rotation.y = Math.PI / 2; hem.position.set(-.4, -.01, .01); human.add(hem);

    // ---- the hand of nature: the same hand mirrored, a deep moss green under its grass
    const natureGeo = geometryOf(hand, true);
    nature.add(new T.Mesh(natureGeo, new T.MeshStandardMaterial({ color: '#2a5a1c', roughness: .95 })));
    // grass over the whole hand and forearm: short blades standing out from the surface, many to a patch
    const P = natureGeo.attributes.position, Nn = natureGeo.attributes.normal, I = natureGeo.index.array;
    const tris = [], areas = []; let total = 0;
    const A = new T.Vector3(), B = new T.Vector3(), C = new T.Vector3(), e1 = new T.Vector3(), e2 = new T.Vector3();
    for (let t = 0; t < I.length; t += 3) {
      A.fromBufferAttribute(P, I[t]); B.fromBufferAttribute(P, I[t + 1]); C.fromBufferAttribute(P, I[t + 2]);
      const area = e1.subVectors(B, A).cross(e2.subVectors(C, A)).length() / 2; total += area; tris.push(t); areas.push(total);
    }
    const BLADES = Math.round(56000 * Math.max(.45, density)), base = new Float32Array(BLADES * 3), norm = new Float32Array(BLADES * 3), shape = new Float32Array(BLADES * 3);
    for (let b = 0; b < BLADES; b++) {
      const r = random() * total; let lo = 0, hi = areas.length - 1; while (lo < hi) { const mid = (lo + hi) >> 1; if (areas[mid] < r) lo = mid + 1; else hi = mid; }
      const t = tris[lo]; let u = random(), v = random(); if (u + v > 1) { u = 1 - u; v = 1 - v; }
      A.fromBufferAttribute(P, I[t]); B.fromBufferAttribute(P, I[t + 1]); C.fromBufferAttribute(P, I[t + 2]);
      const pt = A.multiplyScalar(1 - u - v).add(B.multiplyScalar(u)).add(C.multiplyScalar(v)).clone();
      A.fromBufferAttribute(Nn, I[t]); B.fromBufferAttribute(Nn, I[t + 1]); C.fromBufferAttribute(Nn, I[t + 2]);
      const nn = A.multiplyScalar(1 - u - v).add(B.multiplyScalar(u)).add(C.multiplyScalar(v)).normalize();
      base.set([pt.x, pt.y, pt.z], b * 3); norm.set([nn.x, nn.y, nn.z], b * 3);
      shape.set([random() * Math.PI * 2, .03 + random() * .028, random()], b * 3);
    }
    const blade = new T.BufferGeometry();
    { const pos = [], at = [], idx = [];
      for (let i = 0; i <= 3; i++) { const v = i / 3, w = .5 * (1 - v * .9); pos.push(-w, v, 0, w, v, 0); at.push(v, v); }
      for (let i = 0; i < 3; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      blade.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); blade.setAttribute('aT', new T.Float32BufferAttribute(at, 1)); blade.setIndex(idx); }
    const grass = new T.InstancedBufferGeometry(); grass.index = blade.index;
    grass.setAttribute('position', blade.attributes.position); grass.setAttribute('aT', blade.attributes.aT);
    grass.setAttribute('iBase', new T.InstancedBufferAttribute(base, 3)); grass.setAttribute('iN', new T.InstancedBufferAttribute(norm, 3)); grass.setAttribute('iShape', new T.InstancedBufferAttribute(shape, 3));
    grass.instanceCount = BLADES;
    const grassMesh = new T.Mesh(grass, new T.ShaderMaterial({
      side: T.DoubleSide, uniforms: { uTime: time },
      vertexShader: `
        attribute float aT; attribute vec3 iBase; attribute vec3 iN; attribute vec3 iShape; uniform float uTime;
        varying float vT; varying float vTone; varying float vLight;
        void main() {
          vec3 up = normalize(iN), side = normalize(cross(up, abs(up.y) < .9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
          side = cos(iShape.x) * side + sin(iShape.x) * cross(up, side);
          float h = iShape.y, w = sin(uTime * 1.3 + iBase.x * 6.0 + iBase.z * 4.0) * .12;
          vec3 p = iBase + side * position.x * .006 + up * position.y * h + (cross(side, up) * .35 + side * w) * aT * aT * h;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
          vec3 wn = normalize(mat3(modelMatrix) * up);
          vT = aT; vTone = iShape.z; vLight = .45 + .55 * max(0.0, wn.y) + .25 * max(0.0, wn.z);
        }`,
      fragmentShader: `
        varying float vT; varying float vTone; varying float vLight;
        void main() {
          vec3 col = mix(vec3(.05, .17, .04), mix(vec3(.47, .75, .22), vec3(.78, .88, .38), vTone * .5), smoothstep(0.0, 1.0, vT));
          gl_FragColor = vec4(col * vLight * (.85 + vTone * .3), 1.0);
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
    ring.position.set(meet.x, meet.y, meet.z - 1.4);
    ring.scale.setScalar(3.6 * S);
    ring.material.uniforms.uOpacity.value = smooth((progress - .35) / .5);
  }
  return { update, setLayout, get ready() { return ready; } };
}
