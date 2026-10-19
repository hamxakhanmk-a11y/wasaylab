// Builds the hand used by the Wasay at a glance scene (static/glance-hands.js) from a real hand model: the "generic hand" of the
// Immersive Web working group's WebXR input profiles (scripts/assets/generic-hand-right.glb, MIT licence, generic-hand-LICENSE.md),
// a right hand modelled and rigged with 25 joints. Its fingers are bent at their joints into the pose of Michelangelo's Creation of
// Adam (the index finger reaching out, the others relaxed and curled, the thumb drawn in), the mesh is smoothed with one round of
// subdivision, a forearm is added behind the wrist, and the result is turned to the scene's frame and written compactly. The scene
// mirrors it for the other hand. Run once: node scripts/build-hands.mjs  ->  static/hands/hand.bin
//
// Coordinates: x along the hand (the wrist at 0, the index fingertip at about 0.89; the forearm runs back to -2.6, off screen), y the
// back of the hand, z = x cross y.
// File: 'HND2' | vertex count (u32) | index count (u32) | scale (f32) | index fingertip x, y, z (f32) | positions (i16 x3, times scale) |
// normals (i8 x3) | padding | indices (u16, or u32 above 65535 vertices).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

// ---- small vector helpers
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => mul(a, 1 / (Math.hypot(...a) || 1));
// a rotation by an angle about an axis, as a 3x3 matrix
const rotation = (axis, angle) => { const [x, y, z] = norm(axis), c = Math.cos(angle), s = Math.sin(angle), t = 1 - c;
  return [[t * x * x + c, t * x * y - s * z, t * x * z + s * y], [t * x * y + s * z, t * y * y + c, t * y * z - s * x], [t * x * z - s * y, t * y * z + s * x, t * z * z + c]]; };
const apply = (m, v) => [dot(m[0], v), dot(m[1], v), dot(m[2], v)];

// ---- read the model
const glb = readFileSync('scripts/assets/generic-hand-right.glb');
const jsonLen = glb.readUInt32LE(12), gltf = JSON.parse(glb.slice(20, 20 + jsonLen).toString()), bin = glb.slice(20 + jsonLen + 8);
const read = (i) => {
  const a = gltf.accessors[i], v = gltf.bufferViews[a.bufferView], off = (v.byteOffset || 0) + (a.byteOffset || 0);
  const n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[a.type], T = { 5126: Float32Array, 5123: Uint16Array, 5121: Uint8Array, 5125: Uint32Array }[a.componentType];
  return Array.from(new T(bin.buffer.slice(bin.byteOffset + off, bin.byteOffset + off + a.count * n * T.BYTES_PER_ELEMENT)));
};
const prim = gltf.meshes[0].primitives[0];
const pos = read(prim.attributes.POSITION), joints = read(prim.attributes.JOINTS_0), weights = read(prim.attributes.WEIGHTS_0), index = read(prim.indices);
const skin = gltf.skins[0].joints, names = skin.map((j) => gltf.nodes[j].name);
// joint positions in the model's space (the joints are siblings, each placed directly)
const at = Object.fromEntries(skin.map((j) => [gltf.nodes[j].name, gltf.nodes[j].translation]));
const V0 = pos.length / 3;

// ---- the pose: each finger bends at its joints towards the palm, the outer joints carried by the inner ones
const palm = (() => { // the side the palm faces: the thumb tip lies on it
  const n = norm(cross(sub(at['index-finger-phalanx-proximal'], at.wrist), sub(at['pinky-finger-phalanx-proximal'], at.wrist)));
  return dot(sub(at['thumb-tip'], at.wrist), n) > 0 ? n : mul(n, -1);
})();
const BEND = { // degrees at the three joints, from the knuckle out
  index: [4, 5, 4], middle: [28, 42, 24], ring: [38, 52, 30], pinky: [48, 58, 34],
};
const moves = names.map(() => []);   // per joint, the rotations (about pivots) that carry it, innermost first
const chains = {
  index: ['index-finger-phalanx-proximal', 'index-finger-phalanx-intermediate', 'index-finger-phalanx-distal', 'index-finger-tip'],
  middle: ['middle-finger-phalanx-proximal', 'middle-finger-phalanx-intermediate', 'middle-finger-phalanx-distal', 'middle-finger-tip'],
  ring: ['ring-finger-phalanx-proximal', 'ring-finger-phalanx-intermediate', 'ring-finger-phalanx-distal', 'ring-finger-tip'],
  pinky: ['pinky-finger-phalanx-proximal', 'pinky-finger-phalanx-intermediate', 'pinky-finger-phalanx-distal', 'pinky-finger-tip'],
  thumb: ['thumb-phalanx-proximal', 'thumb-phalanx-distal', 'thumb-tip'],
};
const posed = Object.fromEntries(names.map((n) => [n, at[n].slice()]));
function bend(chain, angles) {
  for (let k = 0; k < angles.length; k++) {
    const pivot = posed[chain[k]].slice(), dir = norm(sub(posed[chain[k + 1]], pivot)), axis = norm(cross(dir, palm));
    const m = rotation(axis, angles[k] * Math.PI / 180);
    for (let j = k; j < chain.length; j++) {
      // everything from this joint outwards turns about it
      moves[names.indexOf(chain[j])].push({ pivot, m });
      if (j > k) posed[chain[j]] = add(pivot, apply(m, sub(posed[chain[j]], pivot)));
    }
  }
}
for (const [finger, angles] of Object.entries(BEND)) bend(chains[finger], angles);
bend(chains.thumb, [12, 14]);
// a vertex follows its joints, each by its weight
const movePoint = (p, j) => moves[j].reduce((q, { pivot, m }) => add(pivot, apply(m, sub(q, pivot))), p);
const out = [];
for (let v = 0; v < V0; v++) {
  const p = [pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]]; let q = [0, 0, 0], wsum = 0;
  for (let k = 0; k < 4; k++) { const w = weights[v * 4 + k]; if (!w) continue; q = add(q, mul(movePoint(p, joints[v * 4 + k]), w)); wsum += w; }
  out.push(...mul(q, 1 / (wsum || 1)));
}

// ---- turn it to the scene's frame: the wrist at the origin, x along the hand, y the back of the hand
const W = at.wrist, X = norm(sub(at['middle-finger-phalanx-proximal'], W)), Y = norm(sub(mul(palm, -1), mul(X, dot(mul(palm, -1), X)))), Z = cross(X, Y);
const toFrame = (p) => { const d = sub(p, W); return [dot(d, X), dot(d, Y), dot(d, Z)]; };
const tipRaw = toFrame(add(posed['index-finger-tip'], mul(norm(sub(posed['index-finger-tip'], posed['index-finger-phalanx-distal'])), .002)));
const SIZE = .89 / tipRaw[0];
let verts = []; for (let v = 0; v < V0; v++) verts.push(...mul(toFrame([out[v * 3], out[v * 3 + 1], out[v * 3 + 2]]), SIZE));
let tris = index.slice();
const TIP = mul(tipRaw, SIZE);

// ---- one round of subdivision (each triangle into four), then a gentle smoothing, so the outline stays round when shown large
function subdivide() {
  const mid = new Map(), key = (a, b) => (a < b ? a + ',' + b : b + ',' + a), next = [];
  const midpoint = (a, b) => { const k = key(a, b); if (mid.has(k)) return mid.get(k); const i = verts.length / 3;
    verts.push((verts[a * 3] + verts[b * 3]) / 2, (verts[a * 3 + 1] + verts[b * 3 + 1]) / 2, (verts[a * 3 + 2] + verts[b * 3 + 2]) / 2); mid.set(k, i); return i; };
  for (let t = 0; t < tris.length; t += 3) {
    const [a, b, c] = [tris[t], tris[t + 1], tris[t + 2]], ab = midpoint(a, b), bc = midpoint(b, c), ca = midpoint(c, a);
    next.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca);
  }
  tris = next;
}
function smooth(passes, amount) {
  const V = verts.length / 3, nbr = Array.from({ length: V }, () => new Set());
  for (let t = 0; t < tris.length; t += 3) { const [a, b, c] = [tris[t], tris[t + 1], tris[t + 2]]; nbr[a].add(b).add(c); nbr[b].add(a).add(c); nbr[c].add(a).add(b); }
  for (let p = 0; p < passes; p++) {
    const nv = verts.slice();
    for (let i = 0; i < V; i++) { if (!nbr[i].size) continue; let s = [0, 0, 0]; for (const n of nbr[i]) s = add(s, [verts[n * 3], verts[n * 3 + 1], verts[n * 3 + 2]]);
      s = mul(s, 1 / nbr[i].size); for (let k = 0; k < 3; k++) nv[i * 3 + k] = verts[i * 3 + k] * (1 - amount) + s[k] * amount; }
    verts = nv;
  }
}
subdivide(); smooth(2, .35);

// ---- the forearm: an oval tube from just inside the wrist back off screen, as wide and deep as the wrist itself, widening a little
const wristRing = []; for (let i = 0; i < verts.length; i += 3) if (verts[i] < .06) wristRing.push([verts[i], verts[i + 1], verts[i + 2]]);
const back = Math.min(...wristRing.map((p) => p[0]));
const near = wristRing.filter((p) => p[0] < back + .05), cy = near.reduce((s, p) => s + p[1], 0) / near.length, cz = near.reduce((s, p) => s + p[2], 0) / near.length;
const ry = Math.max(...near.map((p) => Math.abs(p[1] - cy))) * .98, rz = Math.max(...near.map((p) => Math.abs(p[2] - cz))) * .98;
{ const RING = 40, STEPS = 60, start = verts.length / 3, x0 = back + .045, x1 = -2.6;
  for (let s = 0; s <= STEPS; s++) { const u = s / STEPS, x = x0 + (x1 - x0) * u, g = 1 + .28 * Math.sin(Math.min(1, u * 3) * Math.PI / 2);
    for (let r = 0; r < RING; r++) { const a = r / RING * Math.PI * 2; verts.push(x, cy + Math.cos(a) * ry * g, cz + Math.sin(a) * rz * g); } }
  for (let s = 0; s < STEPS; s++) for (let r = 0; r < RING; r++) {
    const a = start + s * RING + r, b = start + s * RING + (r + 1) % RING, c = a + RING, d = b + RING;
    tris.push(a, c, b, b, c, d);
  }
  // the model's faces are wound outward (glTF's way); turn the forearm's the same way
  const t0 = (start * 0) + tris.length - 6, A = [verts[tris[t0] * 3], verts[tris[t0] * 3 + 1], verts[tris[t0] * 3 + 2]];
  const B = [verts[tris[t0 + 1] * 3], verts[tris[t0 + 1] * 3 + 1], verts[tris[t0 + 1] * 3 + 2]], C = [verts[tris[t0 + 2] * 3], verts[tris[t0 + 2] * 3 + 1], verts[tris[t0 + 2] * 3 + 2]];
  const n = cross(sub(B, A), sub(C, A)), out = sub(mul(add(add(A, B), C), 1 / 3), [A[0], cy, cz]);
  if (dot(n, out) < 0) for (let t = tris.length - STEPS * RING * 6; t < tris.length; t += 3) { const q = tris[t + 1]; tris[t + 1] = tris[t + 2]; tris[t + 2] = q; }
}

// ---- normals from the faces round each vertex
const V = verts.length / 3, normals = new Float32Array(V * 3);
for (let t = 0; t < tris.length; t += 3) {
  const [a, b, c] = [tris[t], tris[t + 1], tris[t + 2]].map((i) => [verts[i * 3], verts[i * 3 + 1], verts[i * 3 + 2]]);
  const n = cross(sub(b, a), sub(c, a));
  for (const i of [tris[t], tris[t + 1], tris[t + 2]]) for (let k = 0; k < 3; k++) normals[i * 3 + k] += n[k];
}
for (let i = 0; i < V; i++) normals.set(norm([normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2]]), i * 3);
// the scene expects faces wound inward (it turns them for the unmirrored hand, and mirroring turns the other), so flip them here
for (let t = 0; t < tris.length; t += 3) { const q = tris[t + 1]; tris[t + 1] = tris[t + 2]; tris[t + 2] = q; }

// ---- write it compactly
const SCALE = 2.7 / 32767;
const head = Buffer.alloc(28); head.write('HND2', 0); head.writeUInt32LE(V, 4); head.writeUInt32LE(tris.length, 8); head.writeFloatLE(SCALE, 12);
head.writeFloatLE(TIP[0], 16); head.writeFloatLE(TIP[1], 20); head.writeFloatLE(TIP[2], 24);
const P16 = new Int16Array(V * 3); for (let i = 0; i < V * 3; i++) P16[i] = Math.round(verts[i] / SCALE);
const N8 = new Int8Array(V * 3); for (let i = 0; i < V * 3; i++) N8[i] = Math.round(normals[i] * 127);
const wide = V > 65535, used = 28 + P16.byteLength + N8.byteLength, pad = Buffer.alloc((wide ? 4 - used % 4 : used % 2) % (wide ? 4 : 2));
const idx = wide ? new Uint32Array(tris) : new Uint16Array(tris);
mkdirSync('static/hands', { recursive: true });
writeFileSync('static/hands/hand.bin', Buffer.concat([head, Buffer.from(P16.buffer), Buffer.from(N8.buffer), pad, Buffer.from(idx.buffer)]));
console.log(`hand: ${V} vertices, ${tris.length / 3} triangles, ${(used + pad.length + idx.byteLength) / 1024 | 0} KB; index fingertip ${TIP.map((n) => n.toFixed(3))}; wrist ${ry.toFixed(3)} x ${rz.toFixed(3)}; size ${SIZE.toFixed(2)}`);
