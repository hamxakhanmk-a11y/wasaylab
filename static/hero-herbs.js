import * as T from './vendor/three/three.module.min.js';

// Herbs on the banner's hill (hero-grow-three.js), seven kinds scattered over the slope away from the top: chamomile (white daisies),
// lavender (purple spikes, narrow grey leaves), mint (broad paired leaves, a small lilac tip), tulsi or holy basil (oval leaves, a
// slim dark purple spike), calendula (orange flowers), dandelion (a low rosette of long toothed leaves, yellow flowers and white seed
// clocks) and yarrow (feathery leaves under a flat cluster of tiny white flowers). They grow up with the seedling when the page opens
// (growth, 0 to 1) and then stay, swaying a little. Each kind of part is one instanced mesh (stems, leaves, each kind of flower face,
// buds), so a few hundred parts cost a handful of draws.
const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const smooth = (n) => { n = clamp(n); return n * n * (3 - 2 * n); };

// a small leaf, length 1 along +y from its stalk, folded along the midrib and curling back a little at the tip; a toothed edge if asked
function leafGeometry(toothed) {
  const U = 12, V = 4, pos = [], uv = [], idx = [];
  for (let i = 0; i <= U; i++) for (let j = 0; j <= V; j++) {
    const u = i / U, v = j / V * 2 - 1;
    let w = .28 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.05)), .75) * (1 - .25 * u);
    if (toothed) w *= .7 + .55 * Math.abs((u * 6) % 1 - .5);
    pos.push(v * w, u, Math.abs(v) * w * .35 - u * u * .12); uv.push(v * .5 + .5, u);
  }
  for (let i = 0; i < U; i++) for (let j = 0; j < V; j++) { const a = i * (V + 1) + j, b = a + V + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
// a flower face drawn on a small canvas
function face(draw) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const ctx = c.getContext('2d'); draw(ctx);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}
const petals = (ctx, n, len, wide, color) => { ctx.fillStyle = color; for (let i = 0; i < n; i++) { ctx.save(); ctx.translate(64, 64); ctx.rotate(i / n * Math.PI * 2); ctx.beginPath(); ctx.ellipse(0, -len, wide, len - 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); } };
const disc = (ctx, r, inner, outer) => { const g = ctx.createRadialGradient(58, 58, 2, 64, 64, r); g.addColorStop(0, inner); g.addColorStop(1, outer); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(64, 64, r, 0, Math.PI * 2); ctx.fill(); };

// each kind: how tall, what its stem and leaves look like, and what it flowers with
const KINDS = {
  chamomile: { share: 3, height: [.4, .58], stem: '#5f8f36', leaf: '#6aaa3c', leaves: 5, leafSize: .12, leafShape: [.45, 1.1], heads: 'chamomile', headCount: [1, 3], headSize: .1 },
  lavender: { share: 3, height: [.5, .7], stem: '#7d9a6a', leaf: '#9ab886', leaves: 6, leafSize: .15, leafShape: [.35, 1.3], buds: '#8667c4', spike: [.32, 13, .028] },
  mint: { share: 2, height: [.3, .42], stem: '#4f7d2c', leaf: '#4f9a34', leaves: 8, leafSize: .13, leafShape: [1.45, .95], pairs: true, buds: '#cdb6e6', spike: [.12, 6, .016] },
  tulsi: { share: 2, height: [.38, .52], stem: '#5b5a2c', leaf: '#3f8a2a', leaves: 6, leafSize: .12, leafShape: [1.15, 1], pairs: true, buds: '#5d2f6b', spike: [.24, 11, .018] },
  calendula: { share: 2, height: [.34, .48], stem: '#5f8f36', leaf: '#77ad45', leaves: 5, leafSize: .14, leafShape: [.6, 1.25], heads: 'calendula', headCount: [1, 2], headSize: .13 },
  dandelion: { share: 2, height: [.24, .36], stem: '#7aa04a', leaf: '#5a9a32', leaves: 7, leafSize: .2, leafShape: [.55, 1.7], rosette: true, toothed: true, heads: 'dandelion', headCount: [1, 2], headSize: .1, clocks: .4 },
  yarrow: { share: 2, height: [.48, .66], stem: '#6b9040', leaf: '#6f9e48', leaves: 6, leafSize: .13, leafShape: [.28, 1.3], toothed: true, umbel: '#f6f4ea' },
};

export function createHerbs(scene, { land, density = 1, seed = 77 }) {
  let s = seed;
  const random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const pick = () => { const total = Object.values(KINDS).reduce((n, k) => n + k.share, 0); let r = random() * total; for (const [name, k] of Object.entries(KINDS)) { r -= k.share; if (r <= 0) return name; } return 'chamomile'; };
  const faces = {
    chamomile: face((ctx) => { petals(ctx, 16, 36, 8, '#fbfbf4'); disc(ctx, 18, '#ffe46a', '#e2a614'); }),
    calendula: face((ctx) => { petals(ctx, 22, 38, 9, '#f39a1c'); petals(ctx, 16, 28, 7, '#f7b733'); disc(ctx, 15, '#b46a10', '#7a3f08'); }),
    dandelion: face((ctx) => { for (let r = 40; r > 8; r -= 7) petals(ctx, 30, r, 4, r > 30 ? '#f7d21c' : '#f3c312'); }),
    clock: face((ctx) => { ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.4; for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2, r = 50 + Math.random() * 8; ctx.beginPath(); ctx.moveTo(64, 64); ctx.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 2.6, 0, Math.PI * 2); ctx.fill(); } }),
  };

  // ---- where the herbs stand: on the slope, more of them near the viewer, none on the hilltop where the seedling and the bottle are
  const herbs = [];
  const WANT = Math.round(46 * Math.max(.45, density));
  for (let tries = 0; herbs.length < WANT && tries < 3000; tries++) {
    const x = -1.2 + random() * 9.6, z = 1.1 + random() * 4.6;
    if (land(x, z) < .18 || (Math.abs(x - 3.5) < 1.5 && z < 2.2)) continue;
    if (herbs.some((h) => Math.hypot(h.x - x, h.z - z) < .42)) continue;
    const kind = pick(), k = KINDS[kind];
    const leaves = Array.from({ length: k.leaves }, (_, i) => k.rosette
      ? { at: .02, side: 1, spin: i / k.leaves * Math.PI * 2 + random() * .4, size: k.leafSize * (.8 + random() * .4), tilt: 1.2 + random() * .2 }
      : { at: k.pairs ? .1 + Math.floor(i / 2) * (.75 / Math.ceil(k.leaves / 2)) : .08 + i * (.7 / k.leaves), side: i % 2 ? 1 : -1, spin: k.pairs ? (Math.floor(i / 2) % 2) * Math.PI / 2 : random() * 6.28, size: k.leafSize * (1 - i * .05) * (.85 + random() * .3), tilt: .9 });
    const heads = k.heads ? Array.from({ length: k.headCount[0] + Math.floor(random() * (k.headCount[1] - k.headCount[0] + 1)) }, (_, i) => ({
      dx: i ? (random() - .5) * .16 : 0, dy: i ? -.04 - random() * .07 : 0, dz: i ? (random() - .5) * .08 : 0, size: k.headSize * (.85 + random() * .35), clock: k.clocks && random() < k.clocks })) : [];
    herbs.push({ x, z, kind, k, height: k.height[0] + random() * (k.height[1] - k.height[0]), lean: (random() - .5) * .35, turn: random() * Math.PI * 2, delay: .15 + random() * .45, phase: random() * 6.28, leaves, heads });
  }

  // ---- the parts, one instanced mesh per kind of part
  const stemGeo = new T.CylinderGeometry(.5, .7, 1, 6, 1); stemGeo.translate(0, .5, 0);
  const count = (fn) => Math.max(1, herbs.reduce((n, h) => n + fn(h), 0));
  const leafMat = () => new T.MeshStandardMaterial({ color: '#ffffff', roughness: .55, side: T.DoubleSide, emissive: new T.Color('#1d3a10'), emissiveIntensity: .45 });
  const stems = new T.InstancedMesh(stemGeo, new T.MeshStandardMaterial({ color: '#ffffff', roughness: .7 }), count(() => 1));
  const leaves = new T.InstancedMesh(leafGeometry(false), leafMat(), count((h) => h.k.toothed ? 0 : h.leaves.length));
  const toothed = new T.InstancedMesh(leafGeometry(true), leafMat(), count((h) => h.k.toothed ? h.leaves.length : 0));
  const headGeo = new T.PlaneGeometry(1, 1);
  const headMat = (map) => new T.MeshStandardMaterial({ map, alphaTest: .45, transparent: false, side: T.DoubleSide, roughness: .8, emissive: new T.Color('#ffffff'), emissiveMap: map, emissiveIntensity: .18 });
  const headMeshes = Object.fromEntries(Object.entries(faces).map(([name, map]) => [name, new T.InstancedMesh(headGeo, headMat(map), count((h) => h.heads.filter((d) => (d.clock ? 'clock' : h.k.heads) === name).length))]));
  const buds = new T.InstancedMesh(new T.SphereGeometry(.5, 8, 6), new T.MeshStandardMaterial({ color: '#ffffff', roughness: .6, emissive: new T.Color('#241634'), emissiveIntensity: .35 }), count((h) => h.k.spike ? h.k.spike[1] : h.k.umbel ? 22 : 0));
  // colours per instance, set once
  { const c = new T.Color(); let iS = 0, iL = 0, iT = 0, iB = 0;
    for (const h of herbs) {
      stems.setColorAt(iS++, c.set(h.k.stem));
      for (const _ of h.leaves) (h.k.toothed ? toothed : leaves).setColorAt(h.k.toothed ? iT++ : iL++, c.set(h.k.leaf));
      const n = h.k.spike ? h.k.spike[1] : h.k.umbel ? 22 : 0;
      for (let b = 0; b < n; b++) buds.setColorAt(iB++, c.set(h.k.umbel || h.k.buds).multiplyScalar(.88 + (b % 3) * .06));
    }
    for (const m of [stems, leaves, toothed, buds]) if (m.instanceColor) m.instanceColor.needsUpdate = true; }
  const meshes = [stems, leaves, toothed, buds, ...Object.values(headMeshes)];
  // every slot starts empty (an unused slot would otherwise sit at the scene's origin)
  const empty = new T.Matrix4().makeScale(0, 0, 0);
  for (const mesh of meshes) { for (let i = 0; i < mesh.count; i++) mesh.setMatrixAt(i, empty); mesh.frustumCulled = false; scene.add(mesh); }

  const M = new T.Matrix4(), L = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), v = new T.Vector3(), sc = new T.Vector3(), zero = new T.Matrix4().makeScale(0, 0, 0);
  // flower faces always turn to the viewer (tipped back a little, as a flower looks up), whichever way their plant is turned
  const facing = new T.Quaternion().setFromEuler(new T.Euler(-.35, 0, 0));
  let lastG = -1;
  function update(g, seconds, still) {
    if (still && g === lastG) return;
    lastG = g;
    let iStem = 0, iLeaf = 0, iTooth = 0, iBud = 0;
    const iHead = Object.fromEntries(Object.keys(headMeshes).map((k) => [k, 0]));
    for (const h of herbs) {
      const k = h.k, grow = smooth((g - h.delay) / .4);
      const sway = still ? 0 : Math.sin(seconds * 1.4 + h.phase) * .05;
      // the herb's own frame: standing on the land, leaning a little, turned at random, swaying in the breeze
      e.set(0, h.turn, h.lean + sway); q.setFromEuler(e);
      M.compose(v.set(h.x, land(h.x, h.z) - .02, h.z + 2), q, sc.set(1, 1, 1));
      const H = h.height * grow;
      L.compose(v.set(0, 0, 0), q.identity(), sc.set(k.rosette ? .009 : .012, Math.max(H, .0001), k.rosette ? .009 : .012));
      stems.setMatrixAt(iStem++, grow > 0 ? L.premultiply(M) : zero);
      for (const leaf of h.leaves) {
        const show = smooth((grow - leaf.at) / .3);
        e.set(leaf.tilt * leaf.side, leaf.spin, .5 * leaf.side * (k.rosette ? 0 : 1)); q.setFromEuler(e);
        L.compose(v.set(0, k.rosette ? .015 : H * leaf.at * 1.1, 0), q, sc.set(leaf.size * k.leafShape[0] * show + .0001, leaf.size * k.leafShape[1] * show + .0001, leaf.size * show + .0001));
        const mesh = k.toothed ? toothed : leaves;
        mesh.setMatrixAt(k.toothed ? iTooth++ : iLeaf++, show > 0 ? L.premultiply(M) : zero);
      }
      const bloom = smooth((grow - .72) / .28);
      for (const head of h.heads) {
        const name = head.clock ? 'clock' : k.heads;
        v.set(head.dx, H + head.dy, head.dz).applyMatrix4(M);
        L.compose(v, facing, sc.setScalar(head.size * (head.clock ? 1.25 : 1) * bloom + .0001));
        headMeshes[name].setMatrixAt(iHead[name]++, bloom > 0 ? L : zero);
      }
      if (k.spike) {
        // a spike of buds along the top of the stem, smaller towards the tip
        const [length, n, size] = k.spike;
        for (let b = 0; b < n; b++) {
          const t = b / (n - 1), r = (size - t * size * .45) * bloom + .0001;
          L.compose(v.set(Math.sin(b * 2.4) * .012, H * (1 - length + t * length), Math.cos(b * 2.4) * .012), q.identity(), sc.set(r, r * 1.5, r));
          buds.setMatrixAt(iBud++, bloom > 0 ? L.premultiply(M) : zero);
        }
      } else if (k.umbel) {
        // a flat, slightly domed cluster of tiny flowers on top
        for (let b = 0; b < 22; b++) {
          const a = b * 2.39996, rad = Math.sqrt(b / 22) * .09, r = .021 * bloom + .0001;
          L.compose(v.set(Math.cos(a) * rad, H + .03 - rad * rad * 4, Math.sin(a) * rad), q.identity(), sc.set(r, r, r));
          buds.setMatrixAt(iBud++, bloom > 0 ? L.premultiply(M) : zero);
        }
      }
    }
    for (const mesh of meshes) mesh.instanceMatrix.needsUpdate = true;
  }
  return { update, count: herbs.length };
}
