import * as T from './vendor/three/three.module.min.js';
import { autoQuality } from './gl-quality.js';
import { createHands } from './glance-hands.js';

// Wasay at a glance: a thick grassy trunk arcs across the page like a smile, coming nearer in the middle. Tens of thousands of fine
// blades (one blade drawn many times, instancing) grow out of it, combed one way like fur, and sway in the breeze; a few small daisies
// poke out along its top, and where the pointer rests the grass parts, leaving a soft dark hollow. As the page scrolls on (morph, 0 to
// 1) the trunk squeezes into a small ball of grass above an open glass capsule, pours in through the top and fills it from the bottom
// up as a mound of moss; the top of the capsule then comes down and closes, and tiny white flowers open on the moss. After a
// photograph the owner showed: a clear pill with a little garden inside.
const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const smooth = (n) => { n = clamp(n); return n * n * (3 - 2 * n); };

// the capsule, centred on its own origin: two halves, the top one a touch wider so it slides over the bottom one at the seam
const CAP = { r: 1, top: 1.04, half: 1, inner: .95, lipBottom: .22, lipTop: -.3, wall: .035 };
// the moss inside it: a mound standing in the lower half, rounded on top
const MOSS = { r: .7, bottom: -1.86, top: .32 };
const mossRadius = (y) => {
  let r = MOSS.r;
  const dome = MOSS.top - MOSS.r * .8;
  if (y > dome) { const k = (y - dome) / (MOSS.r * .8); r *= Math.sqrt(Math.max(0, 1 - k * k)); }
  if (y < -CAP.half) r = Math.min(r, Math.sqrt(Math.max(0, CAP.inner * CAP.inner - (y + CAP.half) ** 2)) - .1);
  return Math.max(0, r);
};
// the moments of the change (morph): squeezed by SQUEEZE; poured from POUR over POUR_LEN (the lowest moss first); closed by CLOSE
const SQUEEZE = .3, POUR = .38, POUR_LEN = .42, CLOSE = [.85, .96];

export function createGlanceScene(canvas, { density = 1 } = {}) {
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  const quality = autoQuality(renderer);
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(32, 1, .1, 120);
  let seed = 913;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const texture = (w, h, paint) => { const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), c); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t; };

  // ---- the trunk: a smooth curve that enters at the left, dips low and near in the middle and leaves at the top right
  const curve = new T.CatmullRomCurve3([
    new T.Vector3(-11, 2.7, -2.4), new T.Vector3(-6, 1.05, -.4), new T.Vector3(-.2, -.15, 1),
    new T.Vector3(5.2, 1.3, -.4), new T.Vector3(8.6, 3.9, -1.8), new T.Vector3(11.5, 6.4, -3.2)], false, 'centripetal');
  const R = .42, frames = curve.computeFrenetFrames(600, false);
  const core = new T.Mesh(new T.TubeGeometry(curve, 600, R * .94, 28, false), new T.MeshStandardMaterial({ color: '#0c2607', roughness: 1 }));
  scene.add(core);
  scene.add(new T.HemisphereLight('#f4ffe6', '#1a3310', 1.4));
  const sun = new T.DirectionalLight('#fff6dc', 1.6); sun.position.set(-3, 8, 6); scene.add(sun);

  // a point on the trunk's surface: along it (u, 0 to 1) and round it (angle)
  const P = new T.Vector3(), N = new T.Vector3(), tangent = new T.Vector3();
  function surface(u, angle) {
    const i = Math.min(599, Math.round(u * 599));
    curve.getPointAt(u, P); tangent.copy(frames.tangents[i]);
    N.copy(frames.normals[i]).multiplyScalar(Math.cos(angle)).addScaledVector(frames.binormals[i], Math.sin(angle)).normalize();
    return P.addScaledVector(N, R * .9);
  }

  // ---- where the capsule stands and how big it is (set with the framing), the ball of grass above it, and how far the change has gone
  const center = { value: new T.Vector3() }, ball = { value: new T.Vector3() }, ballR = { value: .5 }, size = { value: 1 }, tilt = { value: 0 };
  const morph = { value: 0 }, spin = { value: 0 };
  const mossShape = { value: new T.Vector4(MOSS.r, MOSS.bottom, MOSS.top, CAP.inner) };

  // ---- grass: tapered, curved blades all round the side that faces the viewer and over the top
  const SEG = 5, blade = new T.BufferGeometry();
  { const pos = [], t = [], idx = [];
    for (let i = 0; i <= SEG; i++) { const v = i / SEG, w = .5 * (1 - v * .9); pos.push(-w, v, 0, w, v, 0); t.push(v, v); }
    for (let i = 0; i < SEG; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    blade.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); blade.setAttribute('aT', new T.Float32BufferAttribute(t, 1)); blade.setIndex(idx); }
  const BLADES = Math.round(130000 * density);
  const gBase = new Float32Array(BLADES * 3), gN = new Float32Array(BLADES * 3), gT = new Float32Array(BLADES * 3), gShape = new Float32Array(BLADES * 4), gU = new Float32Array(BLADES * 3);
  const view = new T.Vector3(0, .35, 1).normalize();
  let n = 0;
  for (let tries = 0; n < BLADES && tries < BLADES * 4; tries++) {
    const u = random(), angle = random() * Math.PI * 2;
    const p = surface(u, angle);
    if (N.dot(view) < -.3) continue;                                       // the far side is never seen
    gBase.set([p.x, p.y, p.z], n * 3); gN.set([N.x, N.y, N.z], n * 3); gT.set([tangent.x, tangent.y, tangent.z], n * 3);
    // along the trunk, then two free numbers: where it sits in the ball and round the moss
    gU.set([u, random(), random()], n * 3);
    // yaw round the normal, width, length, tone (and how far it bends, packed into the tone's fraction)
    gShape.set([random() * Math.PI * 2, .018 + random() * .014, .17 + random() * .1, Math.floor(random() * 100) + .2 + random() * .5], n * 4);
    n++;
  }
  const grass = new T.InstancedBufferGeometry(); grass.index = blade.index;
  grass.setAttribute('position', blade.attributes.position); grass.setAttribute('aT', blade.attributes.aT);
  grass.setAttribute('iBase', new T.InstancedBufferAttribute(gBase, 3)); grass.setAttribute('iN', new T.InstancedBufferAttribute(gN, 3));
  grass.setAttribute('iT', new T.InstancedBufferAttribute(gT, 3)); grass.setAttribute('iShape', new T.InstancedBufferAttribute(gShape, 4));
  grass.setAttribute('iU', new T.InstancedBufferAttribute(gU, 3));
  grass.instanceCount = n;
  const time = { value: 0 }, wind = { value: .055 }, push = { value: new T.Vector4(0, 0, 0, 0) }, pushR = { value: 1.15 };
  const SPIN = `vec3 spinY(vec3 v, float a) { float c = cos(a), s = sin(a); return vec3(c * v.x + s * v.z, v.y, -s * v.x + c * v.z); }
  vec3 tiltZ(vec3 v, float a) { float c = cos(a), s = sin(a); return vec3(c * v.x - s * v.y, s * v.x + c * v.y, v.z); }`;
  const grassMat = new T.ShaderMaterial({
    side: T.DoubleSide,
    uniforms: { uTime: time, uWind: wind, uPush: push, uPushR: pushR, uMorph: morph, uSpin: spin, uCenter: center, uMoss: mossShape, uScale: size, uTilt: tilt,
      uBall: ball, uBallR: ballR, uBase: { value: new T.Color('#0b2a07') }, uTip: { value: new T.Color('#7fc03a') }, uSun: { value: new T.Color('#cfe46e') },
      uMossTip: { value: new T.Color('#5d9a2a') } },
    vertexShader: `
      attribute float aT; attribute vec3 iBase; attribute vec3 iN; attribute vec3 iT; attribute vec4 iShape; attribute vec3 iU;
      uniform float uTime; uniform float uWind; uniform vec4 uPush; uniform float uPushR; uniform float uMorph; uniform float uSpin;
      uniform vec3 uCenter; uniform vec4 uMoss; uniform float uScale; uniform vec3 uBall; uniform float uBallR; uniform float uTilt;
      varying float vT; varying float vTone; varying float vLight; varying float vFlat; varying float vMoss;
      ${SPIN}
      float ease(float x) { x = clamp(x, 0.0, 1.0); return x * x * (3.0 - 2.0 * x); }
      void main() {
        float t = aT, u = iU.x, yaw = iShape.x, tone = floor(iShape.w) / 100.0, bend = fract(iShape.w);
        // 1. the trunk squeezes into a small ball of grass above the open capsule, its ends swinging forward on the way
        float sq = ease((uMorph - abs(u - .5) * .1) / ${SQUEEZE});
        float a = iU.y * 6.28318, b = iU.z * 2.0 - 1.0;
        vec3 nQ = normalize(vec3(sqrt(1.0 - b * b) * cos(a), b, sqrt(1.0 - b * b) * sin(a)) + vec3(0.0, 0.0, .3));
        vec3 pQ = uBall + nQ * uBallR;
        // 2. its place in the moss: up the mound with u (so the lowest moss pours in first), round the front and sides, rounded on top
        float y = mix(uMoss.y, uMoss.z, u), phi = (fract(iU.y * 3.7 + iU.z * 1.3) * 2.0 - 1.0) * 1.85;
        float dome = uMoss.z - uMoss.x * .8, r = uMoss.x, ny = 0.0;
        if (y > dome) { float k = (y - dome) / (uMoss.x * .8); r *= sqrt(max(0.0, 1.0 - k * k)); ny = k; }
        if (y < -1.0) r = min(r, sqrt(max(0.0, uMoss.w * uMoss.w - (y + 1.0) * (y + 1.0))) - .1);
        vec3 local = vec3(sin(phi) * r, y, cos(phi) * r);
        vec3 pB = uCenter + tiltZ(spinY(local, uSpin), uTilt) * uScale;
        vec3 nB = tiltZ(spinY(normalize(vec3(sin(phi), ny * 1.6 + .15, cos(phi))), uSpin), uTilt);
        // it pours down from the ball through the open top of the capsule, then out to its place
        float fill = ease((uMorph - ${POUR} - u * ${POUR_LEN * .8}) / ${POUR_LEN * .3});
        vec3 mouth = uCenter + vec3(local.x * .3, ${CAP.lipBottom + .1}, local.z * .3) * uScale;
        vec3 pF = mix(mix(pQ, mouth, fill), mix(mouth, pB, fill), fill);
        vec3 base = mix(iBase, pQ, sq);
        base.z += sin(sq * 3.14159) * abs(u - .5) * 1.6;
        if (fill > 0.0) base = pF;
        vec3 up = normalize(mix(mix(iN, nQ, sq), nB, fill));
        float settled = max(sq, fill);
        vec3 tt = normalize(mix(iT, vec3(0.0, 1.0, 0.0), settled));
        vec3 along = normalize(tt - dot(tt, up) * up + vec3(1e-3, 0.0, 1e-3)), across = cross(up, along);
        vec3 side = cos(yaw) * along + sin(yaw) * across, lean = cross(side, up);
        // combed: on the trunk the blades lean mostly the same way along it, like brushed fur; in the ball and the moss, upwards
        vec3 comb = normalize(mix(normalize(mix(lean, along, .72)), along, settled * .85));
        // the pointer: blades near it lie down outwards, away from it
        vec3 away = base - uPush.xyz; away -= dot(away, up) * up;
        float f = uPush.w * (1.0 - smoothstep(0.0, uPushR, length(base - uPush.xyz)));
        // the ball and the moss need only some of the blades: the rest shrink away as the trunk squeezes
        float keep = tone < .38 ? 1.0 : 1.0 - ease((sq - .5) / .5);
        float h = iShape.z * keep * (1.0 - .92 * f) * mix(1.0, .6, sq * (1.0 - fill)) * mix(1.0, uScale * (.7 + .45 * iU.z), fill);
        // inside the glass no blade reaches past the wall: it is only as long as the room between its root and the glass
        float wall = (y < -1.0 ? sqrt(max(0.0, uMoss.w * uMoss.w - (y + 1.0) * (y + 1.0))) : uMoss.w) - .06;
        h = mix(h, min(h, max(.012, (wall - r) * .75) * uScale), fill);
        // grass hangs a little under its own weight, more on the underside; once squeezed there is no breeze
        float droop = max(0.0, -up.y) * (1.0 - sq);
        float w = (sin(uTime * 1.25 + base.x * .42 + base.y * .3) * .72 + sin(uTime * 2.0 + base.x * .85 - base.z * .5) * .12) * (1.0 - sq);
        vec3 p = base + side * position.x * iShape.y + up * position.y * h;
        p += comb * bend * t * t * h + vec3(0.0, -1.0, 0.0) * droop * t * t * h * .45;
        p += (along * w * uWind * 6.0 + vec3(0.0, 0.0, 1.0) * w * uWind * 2.0) * t * t * h;
        p += normalize(away + 1e-4) * f * t * t * h * 1.6;
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(p, 1.0);
        vT = t; vTone = tone; vFlat = f; vMoss = settled;
        vLight = mix(.36 + .86 * max(0.0, up.y) - .34 * droop + .08 * up.z, .5 + .42 * max(0.0, up.y) + .16 * max(0.0, up.z), settled);
      }`,
    fragmentShader: `
      uniform vec3 uBase; uniform vec3 uTip; uniform vec3 uSun; uniform vec3 uMossTip;
      varying float vT; varying float vTone; varying float vLight; varying float vFlat; varying float vMoss;
      void main() {
        // tips catch the sun on top of the trunk; moss is a deeper, more even green; the parted grass shows its dark roots
        vec3 tip = mix(mix(uTip, uSun, smoothstep(.85, 1.2, vLight) * .75), uMossTip, vMoss * .6);
        vec3 col = mix(uBase, tip, smoothstep(0.0, 1.0, vT));
        col *= (.78 + vTone * .4) * vLight;
        col *= mix(.4, 1.0, smoothstep(0.0, .6, vT));
        // where the pointer parts the grass it turns to cool blue tones, deep at the roots and light at the tips
        vec3 blue = mix(vec3(.04, .14, .32), vec3(.38, .64, .94), smoothstep(0.0, 1.0, vT)) * (.82 + vTone * .3);
        col = mix(col * (1.0 - .3 * vFlat), blue, smoothstep(.04, .55, vFlat));
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const grassMesh = new T.Mesh(grass, grassMat); grassMesh.frustumCulled = false; scene.add(grassMesh);

  // ---- the dark heart of the moss, seen between the blades; it rises with the moss as the capsule fills
  const heartProfile = [];
  for (let i = 0; i <= 40; i++) { const y = MOSS.bottom + (MOSS.top - MOSS.bottom) * i / 40; heartProfile.push(new T.Vector2(mossRadius(y) * .92, y - MOSS.bottom)); }
  // it is cut off at the level the moss has reached (a clipping plane), so it never shows before the grass has landed
  const fillLine = new T.Plane(new T.Vector3(0, -1, 0), 0);
  renderer.localClippingEnabled = true;
  const heart = new T.Mesh(new T.LatheGeometry(heartProfile, 40), new T.MeshBasicMaterial({ color: '#13340c', clippingPlanes: [fillLine] }));
  heart.visible = false; heart.position.y = MOSS.bottom;
  // and the ball's, while the grass is squeezed
  const ballHeart = new T.Mesh(new T.SphereGeometry(1, 24, 16), new T.MeshBasicMaterial({ color: '#13340c' }));
  ballHeart.visible = false; scene.add(ballHeart);

  // ---- flowers: a daisy drawn once, shown as small faces that always turn to the viewer
  const daisyMap = texture(128, 128, (ctx) => {
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 12; i++) { ctx.save(); ctx.translate(64, 64); ctx.rotate(i / 12 * Math.PI * 2); ctx.beginPath(); ctx.ellipse(0, -34, 9, 28, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    ctx.fillStyle = '#f2c12e'; ctx.beginPath(); ctx.arc(64, 64, 14, 0, Math.PI * 2); ctx.fill();
  });
  // a few on the trunk's top; many small ones on the moss's top once the capsule has closed, like a spray of baby's breath
  const trunkFlowers = [], mossFlowers = [];
  for (let i = 0, tries = 0; i < Math.round(70 * Math.max(.6, density)) && tries < 4000; tries++) {
    const p = surface(random(), random() * Math.PI * 2);
    if (N.y < .55 || N.z < -.2) continue;
    trunkFlowers.push([p.x + N.x * .22, p.y + N.y * .25, p.z + N.z * .22, .045 + random() * .03, 0]); i++;
  }
  const dome = MOSS.top - MOSS.r * .8;
  for (let i = 0; i < Math.round(240 * Math.max(.6, density)); i++) {
    const phi = (random() * 2 - 1) * 1.9, y = dome + Math.pow(random(), .7) * (MOSS.top - dome) + .1 + random() * .3, r = mossRadius(Math.min(y, MOSS.top)) + .05 + random() * .12;
    mossFlowers.push([Math.sin(phi) * r, Math.min(y, MOSS.top + .44), Math.cos(phi) * r, .07 + random() * .06, CLOSE[0] + random() * .1]);
  }
  function flowerMesh(list, inCapsule) {
    const g = new T.InstancedBufferGeometry(), quad = new T.PlaneGeometry(1, 1);
    g.index = quad.index; g.setAttribute('position', quad.attributes.position); g.setAttribute('uv', quad.attributes.uv);
    // position, then the size (fraction) and the moment it opens (hundredths) packed into one number
    g.setAttribute('iFlower', new T.InstancedBufferAttribute(new Float32Array(list.flatMap((f) => [f[0], f[1], f[2], f[3] + Math.floor(f[4] * 100)])), 4));
    g.instanceCount = list.length;
    const mesh = new T.Mesh(g, new T.ShaderMaterial({
      uniforms: { uMap: { value: daisyMap }, uTime: time, uWind: wind, uPush: push, uPushR: pushR, uMorph: morph, uSpin: spin, uCenter: center, uScale: size, uTilt: tilt },
      defines: inCapsule ? { IN_CAPSULE: 1 } : {},
      vertexShader: `
        attribute vec4 iFlower; uniform float uTime; uniform float uWind; uniform vec4 uPush; uniform float uPushR; uniform float uMorph; uniform float uSpin; uniform vec3 uCenter; uniform float uScale; uniform float uTilt;
        varying vec2 vUv;
        ${SPIN}
        void main() {
          float size = fract(iFlower.w), at = floor(iFlower.w) / 100.0;
          #ifdef IN_CAPSULE
            // they open once the moss is in, each in its own moment
            float open = clamp((uMorph - at) / .1, 0.0, 1.0); open = open * open * (3.0 - 2.0 * open);
            vec3 c = uCenter + tiltZ(spinY(iFlower.xyz, uSpin), uTilt) * uScale; size *= uScale;
          #else
            float open = 1.0 - clamp(uMorph / .15, 0.0, 1.0);
            float w = sin(uTime * 1.5 + iFlower.x * .7 + iFlower.y * .5) * .6;
            float f = uPush.w * (1.0 - smoothstep(0.0, uPushR, length(iFlower.xyz - uPush.xyz)));
            vec3 c = iFlower.xyz + vec3(w * uWind * 3.0, 0.0, 0.0) + normalize(iFlower.xyz - uPush.xyz + 1e-4) * f * .5 - vec3(0.0, f * .3, 0.0);
            size *= 1.0 - .5 * f;
          #endif
          vec4 mv = viewMatrix * vec4(c, 1.0);
          mv.xy += position.xy * size * open;                                 // always faces the viewer
          gl_Position = projectionMatrix * mv; vUv = uv;
        }`,
      fragmentShader: `
        uniform sampler2D uMap; varying vec2 vUv;
        void main() { vec4 c = texture2D(uMap, vUv); if (c.a < .5) discard; gl_FragColor = vec4(c.rgb, 1.0);
          #include <colorspace_fragment>
        }`,
    }));
    mesh.frustumCulled = false; scene.add(mesh);
    return mesh;
  }
  flowerMesh(trunkFlowers, false);
  flowerMesh(mossFlowers, true);

  // ---- the capsule: clear glass with a wall of real thickness. It reflects a studio round it (a tall soft light to the left, a
  // narrow one to the right, a light overhead), so the highlights wrap round its curves; it brightens where it is seen edge-on
  // (Fresnel) and shows grey-green edges, which is how glass reads on a pale page
  const glassMaterial = (strength) => new T.ShaderMaterial({
    transparent: true, depthWrite: false, side: T.DoubleSide, uniforms: { uOpacity: { value: 0 }, uStrength: { value: strength } },
    vertexShader: `
      varying vec3 vN; varying vec3 vV;
      void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `
      uniform float uOpacity; uniform float uStrength; varying vec3 vN; varying vec3 vV;
      void main() {
        vec3 n = normalize(vN) * (gl_FrontFacing ? 1.0 : -1.0), v = normalize(vV);
        float ndv = abs(dot(n, v));
        float fres = .04 + .96 * pow(1.0 - ndv, 5.0);
        vec3 r = reflect(-v, n);
        float left = smoothstep(-.92, -.78, r.x) * (1.0 - smoothstep(-.5, -.36, r.x)) * smoothstep(-.7, -.25, r.y) * (1.0 - smoothstep(.7, .92, r.y));
        float right = smoothstep(.6, .68, r.x) * (1.0 - smoothstep(.76, .84, r.x)) * smoothstep(-.45, -.05, r.y) * (1.0 - smoothstep(.55, .78, r.y));
        float above = smoothstep(.82, .96, r.y);
        float spec = clamp(left + right * .65 + above * .8, 0.0, 1.0) * (gl_FrontFacing ? 1.0 : .45);
        float edge = smoothstep(.55, 1.0, 1.0 - ndv);
        vec3 col = mix(vec3(.62, .69, .65), vec3(.36, .44, .4), edge);
        col = mix(col, vec3(1.0), spec);
        float a = (.035 + fres * .55 + edge * .2 + spec * .8) * uOpacity * uStrength;
        gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
      }`,
  });
  const outerGlass = glassMaterial(1), innerGlass = glassMaterial(.5), lipGlass = glassMaterial(1.8);
  const glasses = [outerGlass, innerGlass, lipGlass];
  // a half: the round end and the straight wall down to its open lip
  const halfShape = (radius, up, lip) => {
    const pts = [];
    for (let i = 0; i <= 28; i++) { const a = i / 28 * Math.PI / 2; pts.push(new T.Vector2(Math.sin(a) * radius, (CAP.half + Math.cos(a) * radius) * (up ? 1 : -1))); }
    pts.push(new T.Vector2(radius, lip));
    return new T.LatheGeometry(pts, 72);
  };
  const capsule = new T.Group(); scene.add(capsule);
  const topHalf = new T.Group(), bottomHalf = new T.Group(); capsule.add(topHalf, bottomHalf);
  for (const [group, radius, up, lip] of [[topHalf, CAP.top, true, CAP.lipTop], [bottomHalf, CAP.r, false, CAP.lipBottom]]) {
    const outer = new T.Mesh(halfShape(radius, up, lip), outerGlass), inner = new T.Mesh(halfShape(radius - CAP.wall, up, lip), innerGlass);
    const ring = new T.Mesh(new T.TorusGeometry(radius - CAP.wall / 2, CAP.wall / 2, 8, 72), lipGlass);
    ring.rotation.x = Math.PI / 2; ring.position.y = lip;
    outer.renderOrder = 12; inner.renderOrder = 11; ring.renderOrder = 13;
    group.add(inner, outer, ring);
  }
  // the word on the glass, where the photograph's pill carries one: the name, Wasay, in Wasay green (white would vanish on the page)
  const font = (getComputedStyle(document.documentElement).getPropertyValue('--display') || 'Georgia, serif').trim();
  const word = texture(512, 192, (ctx) => {
    ctx.fillStyle = '#01652f'; ctx.font = `500 112px ${font}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('Wasay', 256, 100);
  });
  const arc = .95;
  const label = new T.Mesh(new T.CylinderGeometry(CAP.top + .006, CAP.top + .006, .48, 32, 1, true, -arc / 2, arc),
    new T.MeshBasicMaterial({ map: word, transparent: true, depthWrite: false, opacity: 0, toneMapped: false }));
  label.position.y = 1.18; label.renderOrder = 14; topHalf.add(label);
  // a soft shadow on the page under it
  const shadow = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0, toneMapped: false,
    map: texture(128, 128, (ctx) => { const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 63); g.addColorStop(0, 'rgba(24,48,28,.55)'); g.addColorStop(1, 'rgba(24,48,28,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128); }) }));
  shadow.rotation.x = -Math.PI / 2; scene.add(shadow);
  capsule.visible = false; capsule.add(heart); capsule.rotation.order = 'ZYX';

  // ---- the two hands that reach in at the end and meet at the capsule (glance-hands.js)
  const hands = createHands(scene, { density });
  const base = { center: new T.Vector3(), size: 1 }, meet = new T.Vector3();
  let smallSize = .27;

  // ---- framing: the whole arc across a wide screen; on a tall one the camera stands back so the curve still crosses it.
  // The capsule fills most of the height under the title (larger on a tall screen, where there is more room)
  let width = 0, height = 0;
  function frame() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return false;
    if (w !== width || h !== height) {
      width = w; height = h; renderer.setSize(w, h, false); camera.aspect = w / h;
      const tall = camera.aspect < 1, across = tall ? 5.2 : 13.6, half = Math.tan(T.MathUtils.degToRad(camera.fov / 2));
      const z = clamp(across / 2 / (half * camera.aspect), 12.5, 30);
      const y = tall ? -1 : .35;                         // on a tall screen the arc sits higher, between the title and the figures
      camera.position.set(0, y, z); camera.lookAt(0, y, 0);
      camera.updateProjectionMatrix(); camera.updateMatrixWorld();
      size.value = base.size = tall ? 1.4 : 1.12;
      center.value.set(0, y - (tall ? .8 : .85), 0); base.center.copy(center.value);
      capsule.position.copy(center.value); capsule.scale.setScalar(size.value);
      // where the hands meet: the middle of the screen, the capsule small and on its side between their fingertips
      smallSize = tall ? .22 : .34; meet.set(0, y - .15, 0);
      hands.setLayout(meet, (CAP.half + (CAP.r + CAP.top) / 2) * smallSize, tall ? 1.25 : 2.7);
      ball.value.copy(center.value).add(new T.Vector3(0, 1.5 * size.value, 0)); ballR.value = .5 * size.value;
      ballHeart.position.copy(ball.value);
      shadow.position.set(center.value.x, center.value.y - (CAP.half + CAP.r + .25) * size.value, center.value.z);
      shadow.scale.set(2.6 * size.value, 1.3 * size.value, 1);
    }
    return true;
  }

  // ---- the pointer: where the ray under it passes closest to the trunk, on the trunk's surface
  const ray = new T.Raycaster(), samples = curve.getSpacedPoints(400), target = new T.Vector3(), Q = new T.Vector3();
  let aimAt = 0, onTrunk = false, started = false;
  function point(x, y) {
    if (!frame()) return;
    ray.setFromCamera(new T.Vector2(x * 2 - 1, 1 - y * 2), camera);
    let best = Infinity, at = null;
    for (const c of samples) { const d = ray.ray.distanceSqToPoint(c); if (d < best) { best = d; at = c; } }
    onTrunk = Math.sqrt(best) < R * 3;
    if (!onTrunk) return;
    // where the line of sight first meets the grass (the face towards the viewer), not the side of the trunk
    ray.ray.closestPointToPoint(at, Q);
    const across = Q.distanceTo(at), outer = R * 1.45;
    if (across < outer) Q.addScaledVector(ray.ray.direction, -Math.sqrt(outer * outer - across * across));
    target.copy(Q).sub(at).setLength(R * .9).add(at);
    if (!started) { push.value.set(target.x, target.y, target.z, 0); started = true; }
  }
  const leave = () => { onTrunk = false; };

  let lastT = 0;
  function draw(seconds, { still = false, morph: change = 0, hands: reach = 0 } = {}) {
    if (!frame()) return;
    const m = clamp(change), S = size.value, hand = clamp(reach), lie = smooth(hand / .6);
    // once the hands come, the capsule shrinks, moves to the meeting point and lies on its side between their fingertips
    size.value = base.size + (smallSize - base.size) * lie; center.value.lerpVectors(base.center, meet, lie); tilt.value = lie * Math.PI / 2;
    capsule.position.copy(center.value); capsule.scale.setScalar(size.value);
    hands.update(hand, seconds, still);
    const dt = lastT ? Math.min(.1, Math.abs(seconds - lastT)) : 0; lastT = seconds;
    time.value = still ? 0 : seconds;
    morph.value = m;
    // the trunk's dark core goes the moment the grass starts to lift off it; the ball's shows while it is squeezed and shrinks as it pours out
    core.visible = m < .01;
    const poured = clamp((m - POUR) / POUR_LEN);
    ballHeart.visible = m > SQUEEZE * .7 && poured < .95;
    ballHeart.scale.setScalar(ballR.value * .85 * smooth((m - SQUEEZE * .7) / (SQUEEZE * .3)) * (1 - smooth(poured * 1.05)) + .001);
    // the moss's heart rises from the capsule's floor as it fills, a little behind the blades that have landed (a blade at u is in
    // place once the change reaches POUR + u * POUR_LEN * .8 + POUR_LEN * .3)
    const level = clamp((m - POUR - POUR_LEN * .3) / (POUR_LEN * .8)) - .06;
    heart.visible = level > 0;
    // (once the capsule is full the cut is lifted away, so it never clips the heart while the capsule turns)
    fillLine.constant = m >= .999 ? 1e4 : center.value.y + (MOSS.bottom + level * (MOSS.top - MOSS.bottom)) * S;
    // the open bottom half is there to catch the grass; the top half comes down and closes once the moss is in
    const shown = smooth((m - SQUEEZE * .5) / (SQUEEZE * .6)), lid = smooth((m - CLOSE[0] + .04) / .06), close = smooth((m - CLOSE[0]) / (CLOSE[1] - CLOSE[0]));
    capsule.visible = shown > 0;
    bottomHalf.position.y = 0; topHalf.position.y = (1 - close) * 3.2;
    topHalf.visible = lid > 0;
    for (const g of glasses) g.uniforms.uOpacity.value = shown;
    label.material.opacity = smooth((m - CLOSE[1] + .02) / .05) * .95;
    shadow.material.opacity = shown * .5 * (1 - lie);
    // once closed it turns a little to and fro, so the glass and the garden inside read as round
    spin.value = still ? 0 : Math.sin(seconds * .35) * .2 * smooth((m - CLOSE[1]) / .05);
    capsule.rotation.set(0, spin.value, tilt.value);
    // the hollow glides after the pointer and closes softly when the pointer leaves (only while it is a trunk)
    const k = 1 - Math.exp(-dt * 10), want = onTrunk && m < .05 ? 1 : 0;
    aimAt += (want - aimAt) * (still ? 1 : 1 - Math.exp(-dt * 5));
    push.value.x += (target.x - push.value.x) * (still ? 1 : k); push.value.y += (target.y - push.value.y) * (still ? 1 : k); push.value.z += (target.z - push.value.z) * (still ? 1 : k);
    push.value.w = aimAt;
    quality();
    renderer.render(scene, camera);
  }
  canvas.addEventListener('webglcontextlost', (e) => e.preventDefault());
  return { draw, point, leave, get settled() { return Math.abs(aimAt - (onTrunk ? 1 : 0)) < .002; }, blades: n };
}
