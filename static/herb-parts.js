import * as T from './vendor/three/three.module.min.js';

// Small sprigs of herbs and flowers, grown from a list of anchor points, after the owner's references (a capsule full of herbs, a
// hand of moss and herbs): mint (crinkled, veined leaves in pairs), chamomile (white daisies), lavender (purple spikes), thyme (fine
// stems of tiny leaves), white flower clusters (like yarrow or baby's breath), and vine leaves (pairs of small leaves, no stem).
// Each kind of part is one instanced mesh (stems, leaves, daisy faces, buds), so a few hundred sprigs cost four draws. grow (0 to 1)
// brings them up one by one, each at its own moment.
const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const smooth = (n) => { n = clamp(n); return n * n * (3 - 2 * n); };

// a leaf as a fine grid, length 1 along +y from its stalk: cupped along the midrib and curling back a little at the tip
function leafGeometry() {
  const U = 12, V = 6, pos = [], uv = [], idx = [];
  for (let i = 0; i <= U; i++) for (let j = 0; j <= V; j++) {
    const u = i / U, v = j / V * 2 - 1, w = .36 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.03)), .7) * (1 - .2 * u);
    pos.push(v * w, u, Math.abs(v) * w * .4 - u * u * .14 + Math.sin(u * 9 + v * 3) * .012); uv.push(v * .5 + .5, u);
  }
  for (let i = 0; i < U; i++) for (let j = 0; j < V; j++) { const a = i * (V + 1) + j, b = a + V + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
const canvasTexture = (size, draw) => { const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t; };
// a mint-like leaf: a deep midrib, side veins and the puckered net between them (also used as the bump map)
const leafTexture = () => canvasTexture(256, (ctx, s) => {
  const g = ctx.createLinearGradient(0, s, 0, 0); g.addColorStop(0, '#9c9c9c'); g.addColorStop(1, '#ffffff');
  ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 900; i++) { ctx.fillStyle = `rgba(0,0,0,${Math.random() * .08})`; ctx.beginPath(); ctx.arc(Math.random() * s, Math.random() * s, 2 + Math.random() * 4, 0, Math.PI * 2); ctx.fill(); }
  ctx.strokeStyle = 'rgba(40,60,20,.55)'; ctx.lineCap = 'round';
  ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(s / 2, s); ctx.lineTo(s / 2, 8); ctx.stroke();
  for (let i = 0; i < 7; i++) { const y = s - 30 - i * 32; for (const d of [-1, 1]) { ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(s / 2, y); ctx.quadraticCurveTo(s / 2 + d * 50, y - 26, s / 2 + d * 110, y - 60); ctx.stroke(); } }
});
const daisyTexture = () => canvasTexture(128, (ctx) => {
  ctx.fillStyle = '#fbfbf5';
  for (let i = 0; i < 18; i++) { ctx.save(); ctx.translate(64, 64); ctx.rotate(i / 18 * Math.PI * 2); ctx.beginPath(); ctx.ellipse(0, -36, 7, 25, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  const g = ctx.createRadialGradient(58, 58, 2, 64, 64, 18); g.addColorStop(0, '#ffe36a'); g.addColorStop(1, '#e0a012');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(64, 64, 17, 0, Math.PI * 2); ctx.fill();
});

const KINDS = ['mint', 'mint', 'chamomile', 'lavender', 'thyme', 'flowers'];
const GREENS = ['#4f9a34', '#5ea83c', '#3f8a2a', '#6aae44', '#7bb24e'];

// anchors: [{ p: Vector3, n: Vector3 (the way it grows), at: 0..1 (its moment), kind?, size? }] in the parent's space
export function createSprigs(parent, anchors, { seed = 11, size = 1, facing = new T.Vector3(0, 0, 1) } = {}) {
  let s = seed;
  const random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const sprigs = anchors.map((a) => {
    const kind = a.kind || KINDS[Math.floor(random() * KINDS.length)], k = (a.size || 1) * size;
    const height = { mint: .38, chamomile: .55, lavender: .6, thyme: .42, flowers: .5, vine: 0 }[kind] * k * (.75 + random() * .5);
    const leaves = [];
    if (kind === 'mint') for (let i = 0; i < 6; i++) leaves.push({ at: .25 + Math.floor(i / 2) * .3, spin: Math.floor(i / 2) * Math.PI / 2 + (i % 2) * Math.PI, size: (.2 - Math.floor(i / 2) * .035) * k, tilt: 1.05, wide: 1.25 });
    else if (kind === 'thyme') for (let i = 0; i < 10; i++) leaves.push({ at: .15 + i * .08, spin: i * 2.4, size: .05 * k, tilt: .9, wide: .8 });
    else if (kind === 'vine') for (let i = 0; i < 2; i++) leaves.push({ at: 0, spin: i * Math.PI + random() * .5, size: .1 * k * (.8 + random() * .4), tilt: 1.2, wide: 1.1 });
    else for (let i = 0; i < 3; i++) leaves.push({ at: .1 + i * .15, spin: i * 2.1 + random(), size: (kind === 'lavender' ? .12 : .1) * k, tilt: .8, wide: kind === 'lavender' ? .35 : .6 });
    return { ...a, kind, height, leaves, spin: random() * Math.PI * 2, tone: GREENS[Math.floor(random() * GREENS.length)], k, heads: kind === 'chamomile' ? 1 + Math.floor(random() * 2) : 0, jitter: random() };
  });

  // ---- the parts
  const stemGeo = new T.CylinderGeometry(.5, .7, 1, 5, 1); stemGeo.translate(0, .5, 0);
  const n = (fn) => Math.max(1, sprigs.reduce((t, sp) => t + fn(sp), 0));
  const stems = new T.InstancedMesh(stemGeo, new T.MeshStandardMaterial({ color: '#5d8a34', roughness: .7 }), n((sp) => sp.kind === 'vine' ? 0 : 1));
  const leafMap = leafTexture();
  const leaves = new T.InstancedMesh(leafGeometry(), new T.MeshStandardMaterial({ color: '#ffffff', map: leafMap, bumpMap: leafMap, bumpScale: 2, roughness: .55, side: T.DoubleSide }), n((sp) => sp.leaves.length));
  const daisies = new T.InstancedMesh(new T.PlaneGeometry(1, 1), new T.MeshStandardMaterial({ map: daisyTexture(), alphaTest: .45, side: T.DoubleSide, roughness: .8, emissive: new T.Color('#ffffff'), emissiveIntensity: .15 }), n((sp) => sp.heads));
  const BUDS = { lavender: 14, flowers: 16 };
  const buds = new T.InstancedMesh(new T.SphereGeometry(.5, 8, 6), new T.MeshStandardMaterial({ color: '#ffffff', roughness: .6 }), n((sp) => BUDS[sp.kind] || 0));
  const meshes = [stems, leaves, daisies, buds];
  const empty = new T.Matrix4().makeScale(0, 0, 0);
  { const c = new T.Color(); let iL = 0, iB = 0;
    for (const sp of sprigs) {
      for (const _ of sp.leaves) leaves.setColorAt(iL++, c.set(sp.tone));
      for (let b = 0; b < (BUDS[sp.kind] || 0); b++) buds.setColorAt(iB++, sp.kind === 'lavender' ? c.set(b % 3 ? '#8a6ac8' : '#a58ad8') : c.set(b % 4 ? '#f8f6ee' : '#efe6c8'));
    }
    for (const m of [leaves, buds]) if (m.instanceColor) m.instanceColor.needsUpdate = true; }
  for (const m of meshes) { for (let i = 0; i < m.count; i++) m.setMatrixAt(i, empty); m.frustumCulled = false; parent.add(m); }

  const up = new T.Vector3(0, 1, 0), base = new T.Quaternion(), turn = new T.Quaternion(), q = new T.Quaternion(), e = new T.Euler(), v = new T.Vector3(), sc = new T.Vector3();
  const A = new T.Matrix4(), L = new T.Matrix4(), face = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 0, 1), facing.clone().normalize());
  let last = -1;
  function update(grow, sway = 0) {
    if (grow === last && !sway) return;
    last = grow;
    let iS = 0, iL = 0, iD = 0, iB = 0;
    for (const sp of sprigs) {
      const g = smooth((grow - sp.at) / .3);
      // the sprig's own frame: at its anchor, growing along n, turned about it at random, with a little sway
      base.setFromUnitVectors(up, sp.n); turn.setFromAxisAngle(up, sp.spin + Math.sin(sway + sp.jitter * 6) * .04);
      q.copy(base).multiply(turn);
      A.compose(sp.p, q, sc.set(1, 1, 1));
      const H = sp.height * g;
      if (sp.kind !== 'vine') { L.compose(v.set(0, 0, 0), q.identity(), sc.set(.012 * sp.k, Math.max(H, 1e-4), .012 * sp.k)); stems.setMatrixAt(iS++, g > 0 ? L.premultiply(A) : empty); }
      for (const leaf of sp.leaves) {
        const show = smooth((g - leaf.at * .6) / .4);
        e.set(leaf.tilt, leaf.spin, 0, 'YXZ'); q.setFromEuler(e);
        L.compose(v.set(0, H * leaf.at, 0), q, sc.set(leaf.size * leaf.wide * show + 1e-4, leaf.size * show + 1e-4, leaf.size * show + 1e-4));
        leaves.setMatrixAt(iL++, show > 0 ? L.premultiply(A) : empty);
      }
      const bloom = smooth((g - .7) / .3);
      for (let h = 0; h < sp.heads; h++) {
        v.set(h ? (sp.jitter - .5) * .12 * sp.k : 0, H - h * .07 * sp.k, h ? .02 : 0).applyMatrix4(A);
        L.compose(v, face, sc.setScalar(.15 * sp.k * bloom + 1e-4));
        daisies.setMatrixAt(iD++, bloom > 0 ? L : empty);
      }
      const nb = BUDS[sp.kind] || 0;
      for (let b = 0; b < nb; b++) {
        const t = b / (nb - 1);
        if (sp.kind === 'lavender') {
          // a spike of buds over the top third, smaller towards the tip
          const r = (.03 - t * .014) * sp.k * bloom + 1e-4;
          L.compose(v.set(Math.sin(b * 2.4) * .014 * sp.k, H * (.66 + t * .34), Math.cos(b * 2.4) * .014 * sp.k), q.identity(), sc.set(r, r * 1.5, r));
        } else {
          // a loose dome of tiny white flowers
          const a = b * 2.39996, rad = Math.sqrt(t) * .1 * sp.k, r = .02 * sp.k * bloom + 1e-4;
          L.compose(v.set(Math.cos(a) * rad, H + .02 * sp.k - rad * rad * 3, Math.sin(a) * rad), q.identity(), sc.setScalar(r));
        }
        buds.setMatrixAt(iB++, bloom > 0 ? L.premultiply(A) : empty);
      }
    }
    for (const m of meshes) m.instanceMatrix.needsUpdate = true;
  }
  return { update, meshes };
}
