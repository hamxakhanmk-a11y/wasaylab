import * as T from './vendor/three/three.module.min.js';

// Small herbs on the banner's hill (hero-grow-three.js): chamomile with white flowers and lavender with purple spikes, scattered over
// the slope away from the top. They grow up with the seedling when the page opens (growth, 0 to 1) and then stay, swaying a little.
// Each kind of part (stems, leaves, chamomile heads, lavender buds) is one instanced mesh, so a few hundred parts cost four draws.
const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const smooth = (n) => { n = clamp(n); return n * n * (3 - 2 * n); };

// a small leaf, length 1 along +y from its stalk, folded along the midrib and curling back a little at the tip
function leafGeometry() {
  const U = 10, V = 4, pos = [], uv = [], idx = [];
  for (let i = 0; i <= U; i++) for (let j = 0; j <= V; j++) {
    const u = i / U, v = j / V * 2 - 1, w = .28 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.05)), .75) * (1 - .25 * u);
    pos.push(v * w, u, Math.abs(v) * w * .35 - u * u * .12); uv.push(v * .5 + .5, u);
  }
  for (let i = 0; i < U; i++) for (let j = 0; j < V; j++) { const a = i * (V + 1) + j, b = a + V + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function createHerbs(scene, { land, density = 1, seed = 77 }) {
  let s = seed;
  const random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const chamomile = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const ctx = c.getContext('2d');
    ctx.fillStyle = '#fbfbf4';
    for (let i = 0; i < 16; i++) { ctx.save(); ctx.translate(64, 64); ctx.rotate(i / 16 * Math.PI * 2); ctx.beginPath(); ctx.ellipse(0, -36, 8, 26, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    const g = ctx.createRadialGradient(58, 58, 2, 64, 64, 20); g.addColorStop(0, '#ffe46a'); g.addColorStop(1, '#e2a614');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(64, 64, 18, 0, Math.PI * 2); ctx.fill();
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
  })();

  // ---- where the herbs stand: on the slope, more of them near the viewer, none on the hilltop where the seedling and the bottle are
  const herbs = [];
  const WANT = Math.round(38 * Math.max(.45, density));
  for (let tries = 0; herbs.length < WANT && tries < 2000; tries++) {
    const x = -1.2 + random() * 9.6, z = 1.1 + random() * 4.6;
    if (land(x, z) < .18 || (Math.abs(x - 3.5) < 1.5 && z < 2.2)) continue;
    if (herbs.some((h) => Math.hypot(h.x - x, h.z - z) < .45)) continue;
    const lavender = random() < .4;
    herbs.push({ x, z, lavender, height: (lavender ? .5 : .42) + random() * .2, lean: (random() - .5) * .35, turn: random() * Math.PI * 2,
      delay: .15 + random() * .45, phase: random() * 6.28,
      leaves: Array.from({ length: lavender ? 6 : 5 }, (_, i) => ({ at: .08 + i * (lavender ? .07 : .13), side: i % 2 ? 1 : -1, spin: random() * 6.28, size: (lavender ? .15 : .14) * (1 - i * .06) * (.85 + random() * .3) })),
      heads: lavender ? [] : Array.from({ length: 1 + Math.floor(random() * 3) }, (_, i) => ({ dx: i ? (random() - .5) * .14 : 0, dy: i ? -.04 - random() * .06 : 0, dz: i ? (random() - .5) * .08 : 0, size: .1 + random() * .035 })) });
  }

  // ---- the parts, one instanced mesh each
  const stemGeo = new T.CylinderGeometry(.5, .7, 1, 6, 1); stemGeo.translate(0, .5, 0);
  const counts = { stems: herbs.length, leaves: herbs.reduce((n, h) => n + h.leaves.length, 0), heads: herbs.reduce((n, h) => n + h.heads.length, 0), buds: herbs.filter((h) => h.lavender).length * 11 };
  const stems = new T.InstancedMesh(stemGeo, new T.MeshStandardMaterial({ color: '#5f8f36', roughness: .7 }), counts.stems);
  const leaves = new T.InstancedMesh(leafGeometry(), new T.MeshStandardMaterial({ color: '#ffffff', roughness: .55, side: T.DoubleSide, emissive: new T.Color('#1d3a10'), emissiveIntensity: .5 }), counts.leaves);
  const headGeo = new T.PlaneGeometry(1, 1);
  const heads = new T.InstancedMesh(headGeo, new T.MeshStandardMaterial({ map: chamomile, alphaTest: .5, side: T.DoubleSide, roughness: .8, emissive: new T.Color('#ffffff'), emissiveIntensity: .22 }), Math.max(1, counts.heads));
  const buds = new T.InstancedMesh(new T.SphereGeometry(.5, 8, 6), new T.MeshStandardMaterial({ color: '#8667c4', roughness: .6, emissive: new T.Color('#2a1c48'), emissiveIntensity: .4 }), Math.max(1, counts.buds));
  // lavender's leaves are a softer grey-green
  const grey = new T.Color('#9ab886'), green = new T.Color('#6aaa3c');
  { let k = 0; herbs.forEach((h) => h.leaves.forEach(() => leaves.setColorAt(k++, h.lavender ? grey : green))); leaves.instanceColor.needsUpdate = true; }
  for (const mesh of [stems, leaves, heads, buds]) { mesh.frustumCulled = false; scene.add(mesh); }

  const M = new T.Matrix4(), L = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), v = new T.Vector3(), sc = new T.Vector3(), zero = new T.Matrix4().makeScale(0, 0, 0);
  let lastG = -1;
  function update(g, seconds, still) {
    if (still && g === lastG) return;
    lastG = g;
    let iStem = 0, iLeaf = 0, iHead = 0, iBud = 0;
    for (const h of herbs) {
      const grow = smooth((g - h.delay) / .4);
      const sway = still ? 0 : Math.sin(seconds * 1.4 + h.phase) * .05;
      // the herb's own frame: standing on the land, leaning a little, turned at random, swaying in the breeze
      e.set(0, h.turn, h.lean + sway); q.setFromEuler(e);
      M.compose(v.set(h.x, land(h.x, h.z) - .02, h.z + 2), q, sc.set(1, 1, 1));
      const H = h.height * grow;
      L.compose(v.set(0, 0, 0), q.identity(), sc.set(.012, Math.max(H, .0001), .012));
      stems.setMatrixAt(iStem++, grow > 0 ? L.premultiply(M) : zero);
      for (const leaf of h.leaves) {
        const show = smooth((grow - leaf.at) / .3);
        e.set(.9 * leaf.side, leaf.spin, .55 * leaf.side); q.setFromEuler(e);
        L.compose(v.set(0, H * leaf.at * 1.1, 0), q, sc.setScalar(leaf.size * show + .0001));
        leaves.setMatrixAt(iLeaf++, show > 0 ? L.premultiply(M) : zero);
      }
      const bloom = smooth((grow - .72) / .28);
      for (const head of h.heads) {
        e.set(-.55, 0, 0); q.setFromEuler(e);
        L.compose(v.set(head.dx, H + head.dy, head.dz), q, sc.setScalar(head.size * bloom + .0001));
        heads.setMatrixAt(iHead++, bloom > 0 ? L.premultiply(M) : zero);
      }
      if (h.lavender) for (let b = 0; b < 11; b++) {
        // a spike of buds along the top third of the stem, smaller towards the tip
        const t = b / 10, r = (.03 - t * .014) * bloom + .0001;
        L.compose(v.set(Math.sin(b * 2.4) * .012, H * (.68 + t * .34), Math.cos(b * 2.4) * .012), q.identity(), sc.set(r, r * 1.5, r));
        buds.setMatrixAt(iBud++, bloom > 0 ? L.premultiply(M) : zero);
      }
    }
    for (const mesh of [stems, leaves, heads, buds]) mesh.instanceMatrix.needsUpdate = true;
  }
  return { update, count: herbs.length };
}
