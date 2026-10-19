// Builds the hand used by the Wasay at a glance scene (static/glance-hands.js): one right hand in the pose of Michelangelo's Creation of
// Adam (the index finger reaching forward, the other fingers loosely curled under, the thumb alongside), from a few dozen smoothly
// blended rounded shapes (a signed distance field), turned into a mesh with surface nets and smoothed. The scene mirrors it for the
// other hand. Run once: node scripts/build-hands.mjs  ->  static/hands/hand.bin
//
// Coordinates: x along the hand (wrist at about 0, the index fingertip at about 0.9; the forearm runs back to -2.6, off screen), y up
// (the back of the hand), z towards the thumb.
// File: 'HND2' | vertex count (u32) | index count (u32) | scale (f32) | index fingertip x, y, z (f32) | positions (i16 x3, times scale) |
// normals (i8 x3) | padding | indices (u16, or u32 above 65535 vertices).
import { writeFileSync, mkdirSync } from 'node:fs';

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const smin = (a, b, k) => { if (!isFinite(a)) return b; if (!isFinite(b)) return a; const h = clamp(.5 + .5 * (b - a) / k, 0, 1); return b * (1 - h) + a * h - k * h * (1 - h); };
// a capsule whose radius runs from ra at a to rb at b
function roundCone(p, a, b, ra, rb) {
  const ba = sub(b, a), pa = sub(p, a), t = clamp(dot(pa, ba) / dot(ba, ba), 0, 1);
  const q = [pa[0] - ba[0] * t, pa[1] - ba[1] * t, pa[2] - ba[2] * t];
  return len(q) - (ra + (rb - ra) * t);
}
function roundBox(p, c, h, r) {
  const q = [Math.abs(p[0] - c[0]) - h[0], Math.abs(p[1] - c[1]) - h[1], Math.abs(p[2] - c[2]) - h[2]];
  return len([Math.max(q[0], 0), Math.max(q[1], 0), Math.max(q[2], 0)]) + Math.min(Math.max(q[0], Math.max(q[1], q[2])), 0) - r;
}

// an ellipsoid (approximate distance, exact sign), and a capsule flattened top to bottom (its depth is its width divided by squash)
const ellipsoid = (p, c, r) => { const q = [(p[0] - c[0]) / r[0], (p[1] - c[1]) / r[1], (p[2] - c[2]) / r[2]]; return (len(q) - 1) * Math.min(r[0], r[1], r[2]); };
const flatCone = (p, a, b, ra, rb, squash) => roundCone([p[0], a[1] + (p[1] - a[1]) * squash, p[2]], a, b, ra, rb) / squash;

// a finger as a chain of three tapering bones from its knuckle: each joint bends it further down (towards the palm), the whole finger
// fanned out sideways by spread; returns the joints [x, y, z, radius] from the knuckle to the tip
function chain(knuckle, lengths, bends, radii, spread, start = 0) {
  const joints = [[...knuckle, radii[0]]]; let angle = start, [x, y, z] = knuckle;
  lengths.forEach((l, i) => {
    angle += bends[i];
    x += Math.cos(angle) * Math.cos(spread) * l; y -= Math.sin(angle) * l; z += Math.cos(angle) * Math.sin(spread) * l;
    joints.push([x, y, z, radii[i + 1]]);
  });
  return joints;
}
// the pose of the Creation of Adam: the index finger reaching out almost straight, the others relaxed and curling a little more each,
// the thumb lying alongside, below the index finger. Real proportions: the middle finger longest, the little finger shortest.
const FINGERS = {
  index: chain([.43, .012, .14], [.2, .13, .105], [.03, .05, .05], [.043, .039, .035, .031], .045),
  middle: chain([.45, .015, .048], [.215, .145, .115], [.3, .5, .32], [.045, .041, .037, .032], .0),
  ring: chain([.44, .01, -.038], [.2, .135, .11], [.42, .6, .38], [.042, .038, .034, .03], -.05),
  pinky: chain([.41, .0, -.115], [.16, .1, .085], [.52, .66, .42], [.036, .032, .029, .026], -.12),
  thumb: chain([.08, -.03, .13], [.17, .14, .11], [.0, .06, .1], [.062, .053, .046, .04], .5, .12),
};
export const TIP = (() => { const t = FINGERS.index[3]; return [t[0] + t[3] * .9, t[1], t[2]]; })();
function hand(p) {
  // the palm: a gently domed back, the fleshy pad below the thumb and the narrower one on the little finger's side
  let d = roundBox(p, [.22, -.005, .012], [.2, .026, .135], .04);
  d = smin(d, ellipsoid(p, [.22, .0, .01], [.21, .05, .15]), .04);
  d = smin(d, ellipsoid(p, [.15, -.045, .125], [.13, .055, .08]), .05);
  d = smin(d, ellipsoid(p, [.19, -.038, -.105], [.14, .042, .05]), .04);
  // the wrist, oval (wider than it is deep), and the forearm thickening towards the elbow, off screen
  d = smin(d, flatCone(p, [.02, -.008, .012], [-2.6, -.012, .012], .14, .175, 1.55), .08);
  for (const joints of Object.values(FINGERS)) {
    let f = Infinity;
    for (let i = 0; i < joints.length - 1; i++) {
      const [a, b] = [joints[i], joints[i + 1]];
      f = smin(f, roundCone(p, a, b, a[3], b[3]), .01);
    }
    // a knuckle bump on the back of each finger's base
    const k = joints[0];
    if (joints !== FINGERS.thumb) f = smin(f, len(sub(p, [k[0], k[1] + .03, k[2]])) - k[3] * .62, .018);
    d = smin(d, f, joints === FINGERS.thumb ? .055 : .03);
  }
  return d;
}

// ---- surface nets over the hand's box
const STEP = .0095, MIN = [-2.62, -.4, -.24], MAX = [.98, .14, .42];
const NX = Math.ceil((MAX[0] - MIN[0]) / STEP) + 1, NY = Math.ceil((MAX[1] - MIN[1]) / STEP) + 1, NZ = Math.ceil((MAX[2] - MIN[2]) / STEP) + 1;
const field = new Float32Array(NX * NY * NZ);
const at = (i, j, k) => (k * NY + j) * NX + i;
for (let k = 0; k < NZ; k++) for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) field[at(i, j, k)] = hand([MIN[0] + i * STEP, MIN[1] + j * STEP, MIN[2] + k * STEP]);
const vertexOf = new Int32Array((NX - 1) * (NY - 1) * (NZ - 1)).fill(-1);
const cell = (i, j, k) => (k * (NY - 1) + j) * (NX - 1) + i;
const verts = [];
const corners = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
for (let k = 0; k < NZ - 1; k++) for (let j = 0; j < NY - 1; j++) for (let i = 0; i < NX - 1; i++) {
  const v = corners.map(([a, b, c]) => field[at(i + a, j + b, k + c)]);
  let inside = 0; for (const x of v) if (x < 0) inside++;
  if (inside === 0 || inside === 8) continue;
  let sx = 0, sy = 0, sz = 0, n = 0;
  for (const [a, b] of edges) {
    if ((v[a] < 0) === (v[b] < 0)) continue;
    const t = v[a] / (v[a] - v[b]), A = corners[a], B = corners[b];
    sx += A[0] + (B[0] - A[0]) * t; sy += A[1] + (B[1] - A[1]) * t; sz += A[2] + (B[2] - A[2]) * t; n++;
  }
  vertexOf[cell(i, j, k)] = verts.length / 3;
  verts.push(MIN[0] + (i + sx / n) * STEP, MIN[1] + (j + sy / n) * STEP, MIN[2] + (k + sz / n) * STEP);
}
const tris = [];
const quad = (a, b, c, d, flip) => { if (a < 0 || b < 0 || c < 0 || d < 0) return; if (flip) tris.push(a, c, b, a, d, c); else tris.push(a, b, c, a, c, d); };
for (let k = 1; k < NZ - 1; k++) for (let j = 1; j < NY - 1; j++) for (let i = 1; i < NX - 1; i++) {
  const s0 = field[at(i, j, k)] < 0;
  if (i < NX - 1 && s0 !== (field[at(i + 1, j, k)] < 0)) quad(vertexOf[cell(i, j - 1, k - 1)], vertexOf[cell(i, j, k - 1)], vertexOf[cell(i, j, k)], vertexOf[cell(i, j - 1, k)], s0);
  if (j < NY - 1 && s0 !== (field[at(i, j + 1, k)] < 0)) quad(vertexOf[cell(i - 1, j, k - 1)], vertexOf[cell(i - 1, j, k)], vertexOf[cell(i, j, k)], vertexOf[cell(i, j, k - 1)], s0);
  if (k < NZ - 1 && s0 !== (field[at(i, j, k + 1)] < 0)) quad(vertexOf[cell(i - 1, j - 1, k)], vertexOf[cell(i, j - 1, k)], vertexOf[cell(i, j, k)], vertexOf[cell(i - 1, j, k)], s0);
}

// ---- smooth it (pull each vertex towards its neighbours, twice) and take normals from the field's gradient
const V = verts.length / 3, nbr = Array.from({ length: V }, () => new Set());
for (let t = 0; t < tris.length; t += 3) { const [a, b, c] = [tris[t], tris[t + 1], tris[t + 2]]; nbr[a].add(b).add(c); nbr[b].add(a).add(c); nbr[c].add(a).add(b); }
for (let pass = 0; pass < 2; pass++) {
  const next = verts.slice();
  for (let i = 0; i < V; i++) {
    if (!nbr[i].size) continue;
    let x = 0, y = 0, z = 0; for (const n of nbr[i]) { x += verts[n * 3]; y += verts[n * 3 + 1]; z += verts[n * 3 + 2]; }
    const s = nbr[i].size;
    next[i * 3] = verts[i * 3] * .5 + x / s * .5; next[i * 3 + 1] = verts[i * 3 + 1] * .5 + y / s * .5; next[i * 3 + 2] = verts[i * 3 + 2] * .5 + z / s * .5;
  }
  for (let i = 0; i < next.length; i++) verts[i] = next[i];
}
const normals = new Float32Array(V * 3), e = .002;
for (let i = 0; i < V; i++) {
  const p = [verts[i * 3], verts[i * 3 + 1], verts[i * 3 + 2]];
  const n = [hand([p[0] + e, p[1], p[2]]) - hand([p[0] - e, p[1], p[2]]), hand([p[0], p[1] + e, p[2]]) - hand([p[0], p[1] - e, p[2]]), hand([p[0], p[1], p[2] + e]) - hand([p[0], p[1], p[2] - e])];
  const l = len(n) || 1; normals.set([n[0] / l, n[1] / l, n[2] / l], i * 3);
}

// ---- write it compactly
const SCALE = 2.7 / 32767;
const head = Buffer.alloc(28); head.write('HND2', 0); head.writeUInt32LE(V, 4); head.writeUInt32LE(tris.length, 8); head.writeFloatLE(SCALE, 12);
head.writeFloatLE(TIP[0], 16); head.writeFloatLE(TIP[1], 20); head.writeFloatLE(TIP[2], 24);
const pos = new Int16Array(V * 3); for (let i = 0; i < V * 3; i++) pos[i] = Math.round(verts[i] / SCALE);
const nor = new Int8Array(V * 3); for (let i = 0; i < V * 3; i++) nor[i] = Math.round(normals[i] * 127);
// indices are 16-bit when there are few enough vertices (the reader knows from the vertex count), else 32-bit
const wide = V > 65535, used = 28 + pos.byteLength + nor.byteLength, pad = Buffer.alloc((wide ? 4 - used % 4 : used % 2) % (wide ? 4 : 2));
const idx = wide ? new Uint32Array(tris) : new Uint16Array(tris);
mkdirSync('static/hands', { recursive: true });
writeFileSync('static/hands/hand.bin', Buffer.concat([head, Buffer.from(pos.buffer), Buffer.from(nor.buffer), pad, Buffer.from(idx.buffer)]));
console.log(`hand: ${V} vertices, ${tris.length / 3} triangles, ${(used + pad.length + idx.byteLength) / 1024 | 0} KB; index fingertip ${TIP.map((n) => n.toFixed(3))}`);
