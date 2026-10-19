import * as T from './vendor/three/three.module.min.js';
import { autoQuality } from './gl-quality.js';

// Wasay at a glance: a thick grassy trunk arcs across the page like a smile, coming nearer in the middle. Tens of thousands of fine
// blades (one blade drawn many times, instancing) grow out of it, combed one way like fur, and sway in the breeze; a few small daisies
// poke out along its top, and where the pointer rests the grass parts, leaving a soft dark hollow. As the page scrolls on (morph, 0 to
// 1) the grass gathers in from both ends and stands up as a mound of moss, a clear glass capsule closes round it (its two halves
// sliding together) and tiny white flowers open on top, after a photograph the owner showed: a pill with a little garden inside.
const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const smooth = (n) => { n = clamp(n); return n * n * (3 - 2 * n); };

// the capsule, centred on its own origin: two halves, the top one a touch wider so it slides over the bottom one at the seam
const CAP = { r: 1, top: 1.04, half: 1, inner: .95 };
// the moss inside it: a mound standing in the lower half, rounded on top
const MOSS = { r: .8, bottom: -1.86, top: .32 };
const mossRadius = (y) => {
  let r = MOSS.r;
  const dome = MOSS.top - MOSS.r * .8;
  if (y > dome) { const k = (y - dome) / (MOSS.r * .8); r *= Math.sqrt(Math.max(0, 1 - k * k)); }
  if (y < -CAP.half) r = Math.min(r, Math.sqrt(Math.max(0, CAP.inner * CAP.inner - (y + CAP.half) ** 2)) - .1);
  return Math.max(0, r);
};

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

  // ---- where the capsule stands (set with the framing) and how far the change has gone
  const center = { value: new T.Vector3() }, morph = { value: 0 }, spin = { value: 0 };
  const mossShape = { value: new T.Vector4(MOSS.r, MOSS.bottom, MOSS.top, CAP.inner) };

  // ---- grass: tapered, curved blades all round the side that faces the viewer and over the top
  const SEG = 5, blade = new T.BufferGeometry();
  { const pos = [], t = [], idx = [];
    for (let i = 0; i <= SEG; i++) { const v = i / SEG, w = .5 * (1 - v * .9); pos.push(-w, v, 0, w, v, 0); t.push(v, v); }
    for (let i = 0; i < SEG; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    blade.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); blade.setAttribute('aT', new T.Float32BufferAttribute(t, 1)); blade.setIndex(idx); }
  const BLADES = Math.round(130000 * density);
  const gBase = new Float32Array(BLADES * 3), gN = new Float32Array(BLADES * 3), gT = new Float32Array(BLADES * 3), gShape = new Float32Array(BLADES * 4), gU = new Float32Array(BLADES);
  const view = new T.Vector3(0, .35, 1).normalize();
  let n = 0;
  for (let tries = 0; n < BLADES && tries < BLADES * 4; tries++) {
    const u = random(), angle = random() * Math.PI * 2;
    const p = surface(u, angle);
    if (N.dot(view) < -.3) continue;                                       // the far side is never seen
    gBase.set([p.x, p.y, p.z], n * 3); gN.set([N.x, N.y, N.z], n * 3); gT.set([tangent.x, tangent.y, tangent.z], n * 3); gU[n] = u;
    // yaw round the normal, width, length, tone (and how far it bends, packed into the tone's fraction)
    gShape.set([random() * Math.PI * 2, .018 + random() * .014, .17 + random() * .1, Math.floor(random() * 100) + .2 + random() * .5], n * 4);
    n++;
  }
  const grass = new T.InstancedBufferGeometry(); grass.index = blade.index;
  grass.setAttribute('position', blade.attributes.position); grass.setAttribute('aT', blade.attributes.aT);
  grass.setAttribute('iBase', new T.InstancedBufferAttribute(gBase, 3)); grass.setAttribute('iN', new T.InstancedBufferAttribute(gN, 3));
  grass.setAttribute('iT', new T.InstancedBufferAttribute(gT, 3)); grass.setAttribute('iShape', new T.InstancedBufferAttribute(gShape, 4));
  grass.setAttribute('iU', new T.InstancedBufferAttribute(gU, 1));
  grass.instanceCount = n;
  const time = { value: 0 }, wind = { value: .07 }, push = { value: new T.Vector4(0, 0, 0, 0) }, pushR = { value: 1.15 };
  const SPIN = `vec3 spinY(vec3 v, float a) { float c = cos(a), s = sin(a); return vec3(c * v.x + s * v.z, v.y, -s * v.x + c * v.z); }`;
  const grassMat = new T.ShaderMaterial({
    side: T.DoubleSide,
    uniforms: { uTime: time, uWind: wind, uPush: push, uPushR: pushR, uMorph: morph, uSpin: spin, uCenter: center, uMoss: mossShape,
      uBase: { value: new T.Color('#0b2a07') }, uTip: { value: new T.Color('#7fc03a') }, uSun: { value: new T.Color('#cfe46e') } },
    vertexShader: `
      attribute float aT; attribute vec3 iBase; attribute vec3 iN; attribute vec3 iT; attribute vec4 iShape; attribute float iU;
      uniform float uTime; uniform float uWind; uniform vec4 uPush; uniform float uPushR; uniform float uMorph; uniform float uSpin;
      uniform vec3 uCenter; uniform vec4 uMoss;
      varying float vT; varying float vTone; varying float vLight; varying float vFlat;
      ${SPIN}
      void main() {
        float t = aT, yaw = iShape.x, tone = floor(iShape.w) / 100.0, bend = fract(iShape.w);
        // this blade's own moment in the change: the middle of the trunk gathers first, its ends sweep in after
        float m = clamp(uMorph * 1.55 - abs(iU - .5) * 1.1, 0.0, 1.0); m = m * m * (3.0 - 2.0 * m);
        // its place in the moss: up the mound with u, round the front and sides with its yaw, rounded on top and in the capsule's base
        float y = mix(uMoss.y, uMoss.z, iU), phi = (yaw / 3.14159 - 1.0) * 1.8;
        float dome = uMoss.z - uMoss.x * .8, r = uMoss.x, ny = 0.0;
        if (y > dome) { float k = (y - dome) / (uMoss.x * .8); r *= sqrt(max(0.0, 1.0 - k * k)); ny = k; }
        if (y < -1.0) r = min(r, sqrt(max(0.0, uMoss.w * uMoss.w - (y + 1.0) * (y + 1.0))) - .1);
        vec3 baseB = uCenter + spinY(vec3(sin(phi) * r, y, cos(phi) * r), uSpin);
        vec3 nB = spinY(normalize(vec3(sin(phi), ny * 1.6 + .15, cos(phi))), uSpin);
        vec3 base = mix(iBase, baseB, m);
        base.z += sin(m * 3.14159) * abs(iU - .5) * 2.2;                      // the ends swing forward on their way in
        vec3 up = normalize(mix(iN, nB, m)), tt = normalize(mix(iT, vec3(0.0, 1.0, 0.0), m));
        vec3 along = normalize(tt - dot(tt, up) * up + vec3(1e-3, 0.0, 1e-3)), across = cross(up, along);
        vec3 side = cos(yaw) * along + sin(yaw) * across, lean = cross(side, up);
        // combed: the blades lean mostly the same way along the trunk, like brushed fur
        vec3 comb = normalize(mix(lean, along, .72));
        // the pointer: blades near it lie down outwards, away from it
        vec3 away = base - uPush.xyz; away -= dot(away, up) * up;
        float f = uPush.w * (1.0 - smoothstep(0.0, uPushR, length(base - uPush.xyz)));
        // the small mound needs only some of the blades: the rest shrink away as they arrive
        float keep = tone < .38 ? 1.0 : 1.0 - m;
        float h = iShape.z * keep * (1.0 - .92 * f) * (1.0 - .12 * m);
        // grass hangs a little under its own weight, more on the underside; inside the glass there is no breeze
        float droop = max(0.0, -up.y) * (1.0 - m);
        float w = (sin(uTime * 1.5 + base.x * .7 + base.y * .5) * .6 + sin(uTime * 2.6 + base.x * 2.1 - base.z) * .3) * (1.0 - m);
        vec3 p = base + side * position.x * iShape.y + up * position.y * h;
        p += comb * bend * t * t * h + vec3(0.0, -1.0, 0.0) * droop * t * t * h * .45;
        p += (along * w * uWind * 6.0 + vec3(0.0, 0.0, 1.0) * w * uWind * 2.0) * t * t * h;
        p += normalize(away + 1e-4) * f * t * t * h * 1.6;
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(p, 1.0);
        vT = t; vTone = tone; vFlat = f;
        vLight = .36 + .86 * max(0.0, up.y) - .34 * droop + .08 * up.z + m * .34 * max(0.0, up.z);
      }`,
    fragmentShader: `
      uniform vec3 uBase; uniform vec3 uTip; uniform vec3 uSun;
      varying float vT; varying float vTone; varying float vLight; varying float vFlat;
      void main() {
        // tips catch the sun on top of the trunk; the parted grass shows its dark roots
        vec3 tip = mix(uTip, uSun, smoothstep(.85, 1.2, vLight) * .75);
        vec3 col = mix(uBase, tip, smoothstep(0.0, 1.0, vT));
        col *= (.82 + vTone * .32) * vLight;
        col *= mix(.4, 1.0, smoothstep(0.0, .6, vT));
        col *= 1.0 - .9 * vFlat;
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const grassMesh = new T.Mesh(grass, grassMat); grassMesh.frustumCulled = false; scene.add(grassMesh);

  // ---- the dark heart of the moss, seen between the blades once they have gathered
  const heartProfile = [];
  for (let i = 0; i <= 40; i++) { const y = MOSS.bottom + (MOSS.top - MOSS.bottom) * i / 40; heartProfile.push(new T.Vector2(mossRadius(y) * .92, y)); }
  const heart = new T.Mesh(new T.LatheGeometry(heartProfile, 40), new T.MeshBasicMaterial({ color: '#13340c' }));
  heart.visible = false; scene.add(heart);

  // ---- flowers: a daisy drawn once, shown as small faces that always turn to the viewer
  const daisyMap = texture(128, 128, (ctx) => {
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 12; i++) { ctx.save(); ctx.translate(64, 64); ctx.rotate(i / 12 * Math.PI * 2); ctx.beginPath(); ctx.ellipse(0, -34, 9, 28, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    ctx.fillStyle = '#f2c12e'; ctx.beginPath(); ctx.arc(64, 64, 14, 0, Math.PI * 2); ctx.fill();
  });
  // a few on the trunk's top; many tiny ones on the moss's top, like a spray of baby's breath (relative to the capsule)
  const trunkFlowers = [], mossFlowers = [];
  for (let i = 0, tries = 0; i < Math.round(70 * Math.max(.6, density)) && tries < 4000; tries++) {
    const p = surface(random(), random() * Math.PI * 2);
    if (N.y < .55 || N.z < -.2) continue;
    trunkFlowers.push([p.x + N.x * .22, p.y + N.y * .25, p.z + N.z * .22, .045 + random() * .03, 0]); i++;
  }
  const dome = MOSS.top - MOSS.r * .8;
  for (let i = 0; i < Math.round(240 * Math.max(.6, density)); i++) {
    const phi = (random() * 2 - 1) * 1.9, y = dome + Math.pow(random(), .7) * (MOSS.top - dome) + .08 + random() * .3, r = mossRadius(Math.min(y, MOSS.top)) + .05 + random() * .12;
    mossFlowers.push([Math.sin(phi) * r, Math.min(y, MOSS.top + .42), Math.cos(phi) * r, .03 + random() * .03, .55 + random() * .25]);
  }
  function flowerMesh(list, inCapsule) {
    const g = new T.InstancedBufferGeometry(), quad = new T.PlaneGeometry(1, 1);
    g.index = quad.index; g.setAttribute('position', quad.attributes.position); g.setAttribute('uv', quad.attributes.uv);
    // position, then the size (fraction) and the moment it opens (hundredths) packed into one number
    const flat = list.map((f) => [f[0], f[1], f[2], f[3] + Math.floor(f[4] * 100)]);
    g.setAttribute('iFlower', new T.InstancedBufferAttribute(new Float32Array(flat.flat()), 4)); g.instanceCount = list.length;
    const mesh = new T.Mesh(g, new T.ShaderMaterial({
      uniforms: { uMap: { value: daisyMap }, uTime: time, uWind: wind, uPush: push, uPushR: pushR, uMorph: morph, uSpin: spin, uCenter: center },
      defines: inCapsule ? { IN_CAPSULE: 1 } : {},
      vertexShader: `
        attribute vec4 iFlower; uniform float uTime; uniform float uWind; uniform vec4 uPush; uniform float uPushR; uniform float uMorph; uniform float uSpin; uniform vec3 uCenter;
        varying vec2 vUv;
        ${SPIN}
        void main() {
          float size = fract(iFlower.w), at = floor(iFlower.w) / 100.0;
          #ifdef IN_CAPSULE
            // they open once the moss has settled, each in its own moment
            float open = clamp((uMorph - at) / .2, 0.0, 1.0); open = open * open * (3.0 - 2.0 * open);
            vec3 c = uCenter + spinY(iFlower.xyz, uSpin);
          #else
            float open = 1.0 - clamp(uMorph / .3, 0.0, 1.0);
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

  // ---- the capsule: clear glass, bright along its edges with long window reflections down its sides, as on the photograph
  const glass = new T.ShaderMaterial({
    transparent: true, depthWrite: false, side: T.DoubleSide, uniforms: { uOpacity: { value: 0 } },
    vertexShader: `
      varying vec3 vN; varying vec3 vV;
      void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `
      uniform float uOpacity; varying vec3 vN; varying vec3 vV;
      void main() {
        vec3 n = normalize(vN);
        float rim = pow(1.0 - abs(dot(n, normalize(vV))), 2.4);
        float x = gl_FrontFacing ? n.x : -n.x;
        float streak = smoothstep(-.8, -.68, x) * (1.0 - smoothstep(-.52, -.4, x)) * .6 + smoothstep(.6, .68, x) * (1.0 - smoothstep(.74, .8, x)) * .28;
        float a = (.03 + .55 * rim + streak) * uOpacity;
        gl_FragColor = vec4(mix(vec3(.86, .9, .88), vec3(1.0), clamp(streak * 1.6 + rim * .4, 0.0, 1.0)), a);
      }`,
  });
  const halfShape = (radius, up) => {
    const pts = [];
    for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI / 2; pts.push(new T.Vector2(Math.sin(a) * radius, (CAP.half + Math.cos(a) * radius) * (up ? 1 : -1))); }
    pts.push(new T.Vector2(radius, up ? -.3 : .22));
    if (!up) pts.reverse();
    return new T.LatheGeometry(pts, 64);
  };
  const capsule = new T.Group(); scene.add(capsule);
  const topHalf = new T.Group(), bottomHalf = new T.Group(); capsule.add(topHalf, bottomHalf);
  const topGlass = new T.Mesh(halfShape(CAP.top, true), glass), bottomGlass = new T.Mesh(halfShape(CAP.r, false), glass);
  topGlass.renderOrder = bottomGlass.renderOrder = 10;
  topHalf.add(topGlass); bottomHalf.add(bottomGlass);
  // the word on the glass, where the photograph's pill carries one: the name, Wasay
  const font = (getComputedStyle(document.documentElement).getPropertyValue('--display') || 'Georgia, serif').trim();
  const word = texture(512, 192, (ctx) => {
    ctx.fillStyle = '#ffffff'; ctx.font = `500 112px ${font}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(20, 40, 20, .25)'; ctx.shadowBlur = 8; ctx.fillText('Wasay', 256, 100);
  });
  const arc = .95;
  const label = new T.Mesh(new T.CylinderGeometry(CAP.top + .01, CAP.top + .01, .48, 32, 1, true, -arc / 2, arc),
    new T.MeshBasicMaterial({ map: word, transparent: true, depthWrite: false, opacity: 0, toneMapped: false }));
  label.position.y = 1.18; label.renderOrder = 11; topHalf.add(label);
  capsule.visible = false;

  // ---- framing: the whole arc across a wide screen; on a tall one the camera stands back so the curve still crosses it.
  // The capsule stands in the middle, a little low, so the title above stays clear
  let width = 0, height = 0;
  function frame() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return false;
    if (w !== width || h !== height) {
      width = w; height = h; renderer.setSize(w, h, false); camera.aspect = w / h;
      const across = camera.aspect < 1 ? 5.2 : 13.6, half = Math.tan(T.MathUtils.degToRad(camera.fov / 2));
      const z = clamp(across / 2 / (half * camera.aspect), 12.5, 30);
      const y = camera.aspect < 1 ? -1 : .35;              // on a tall screen the arc sits higher, between the title and the figures
      camera.position.set(0, y, z); camera.lookAt(0, y, 0);
      camera.updateProjectionMatrix(); camera.updateMatrixWorld();
      center.value.set(0, y - .3, 0);
      capsule.position.copy(center.value); heart.position.copy(center.value);
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
  function draw(seconds, { still = false, morph: change = 0 } = {}) {
    if (!frame()) return;
    const m = clamp(change);
    const dt = lastT ? Math.min(.1, Math.abs(seconds - lastT)) : 0; lastT = seconds;
    time.value = still ? 0 : seconds;
    morph.value = m;
    // the trunk's dark core goes as the grass leaves it; the moss's appears as the grass gathers
    core.visible = m < .2;
    heart.visible = m > .45; heart.scale.set(1, smooth((m - .45) / .4) * .999 + .001, 1);
    // the capsule's halves slide together round the moss, the glass clearing into view as they come
    const close = smooth((m - .35) / .45), seen = smooth((m - .25) / .3);
    capsule.visible = seen > 0;
    topHalf.position.y = (1 - close) * 3.4; bottomHalf.position.y = -(1 - close) * 3.4;
    glass.uniforms.uOpacity.value = seen; label.material.opacity = seen * smooth((m - .7) / .25) * .95;
    // once closed it turns a little to and fro, so the glass and the garden inside read as round
    spin.value = still ? 0 : Math.sin(seconds * .35) * .2 * smooth((m - .8) / .2);
    capsule.rotation.y = spin.value;
    // the hollow glides after the pointer and closes softly when the pointer leaves (no hollow once the moss is in the glass)
    const k = 1 - Math.exp(-dt * 10), want = onTrunk && m < .2 ? 1 : 0;
    aimAt += (want - aimAt) * (still ? 1 : 1 - Math.exp(-dt * 5));
    push.value.x += (target.x - push.value.x) * (still ? 1 : k); push.value.y += (target.y - push.value.y) * (still ? 1 : k); push.value.z += (target.z - push.value.z) * (still ? 1 : k);
    push.value.w = aimAt;
    quality();
    renderer.render(scene, camera);
  }
  canvas.addEventListener('webglcontextlost', (e) => e.preventDefault());
  return { draw, point, leave, get settled() { return Math.abs(aimAt - (onTrunk ? 1 : 0)) < .002; }, blades: n };
}
