import * as T from './vendor/three/three.module.min.js';
import { autoQuality } from './gl-quality.js';

// Wasay at a glance: a thick grassy trunk that arcs across the page like a smile, coming nearer in the middle. As the page scrolls on
// (zoom, 0 to 1) the camera dives into the bottom of the arc until its grass fills the whole screen, the ground the products stand on. Tens of thousands of
// long blades (one blade drawn many times, instancing) grow out of it all round and sway in the breeze; a few small daisies poke out
// along its top. Where the pointer rests on it, the grass parts outwards and flattens, leaving a soft dark hollow that follows it.
const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));

export function createGlanceScene(canvas, { density = 1 } = {}) {
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  const quality = autoQuality(renderer);
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(32, 1, .1, 120);
  let seed = 913;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

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

  // ---- grass: tapered, curved blades, long and soft, all round the side that faces the viewer and over the top
  const SEG = 5, blade = new T.BufferGeometry();
  { const pos = [], t = [], idx = [];
    for (let i = 0; i <= SEG; i++) { const v = i / SEG, w = .5 * (1 - v * .9); pos.push(-w, v, 0, w, v, 0); t.push(v, v); }
    for (let i = 0; i < SEG; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    blade.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); blade.setAttribute('aT', new T.Float32BufferAttribute(t, 1)); blade.setIndex(idx); }
  const BLADES = Math.round(130000 * density);
  const gBase = new Float32Array(BLADES * 3), gN = new Float32Array(BLADES * 3), gT = new Float32Array(BLADES * 3), gShape = new Float32Array(BLADES * 4);
  const view = new T.Vector3(0, .35, 1).normalize();
  let n = 0;
  for (let tries = 0; n < BLADES && tries < BLADES * 4; tries++) {
    const u = random(), angle = random() * Math.PI * 2;
    const p = surface(u, angle);
    if (N.dot(view) < -.3) continue;                                       // the far side is never seen
    gBase.set([p.x, p.y, p.z], n * 3); gN.set([N.x, N.y, N.z], n * 3); gT.set([tangent.x, tangent.y, tangent.z], n * 3);
    // yaw round the normal, width, length, tone (and how far it bends, packed into the tone's fraction)
    gShape.set([random() * Math.PI * 2, .018 + random() * .014, .17 + random() * .1, Math.floor(random() * 100) + .2 + random() * .5], n * 4);
    n++;
  }
  const grass = new T.InstancedBufferGeometry(); grass.index = blade.index;
  grass.setAttribute('position', blade.attributes.position); grass.setAttribute('aT', blade.attributes.aT);
  grass.setAttribute('iBase', new T.InstancedBufferAttribute(gBase, 3)); grass.setAttribute('iN', new T.InstancedBufferAttribute(gN, 3));
  grass.setAttribute('iT', new T.InstancedBufferAttribute(gT, 3)); grass.setAttribute('iShape', new T.InstancedBufferAttribute(gShape, 4));
  grass.instanceCount = n;
  const time = { value: 0 }, wind = { value: .07 }, push = { value: new T.Vector4(0, 0, 0, 0) }, pushR = { value: 1.15 };
  const grassMat = new T.ShaderMaterial({
    side: T.DoubleSide,
    uniforms: { uTime: time, uWind: wind, uPush: push, uPushR: pushR, uBase: { value: new T.Color('#0b2a07') }, uTip: { value: new T.Color('#7fc03a') }, uSun: { value: new T.Color('#cfe46e') } },
    vertexShader: `
      attribute float aT; attribute vec3 iBase; attribute vec3 iN; attribute vec3 iT; attribute vec4 iShape;
      uniform float uTime; uniform float uWind; uniform vec4 uPush; uniform float uPushR;
      varying float vT; varying float vTone; varying float vLight; varying float vFlat;
      void main() {
        float t = aT, yaw = iShape.x, tone = floor(iShape.w) / 100.0, bend = fract(iShape.w);
        vec3 up = iN, along = normalize(iT - dot(iT, up) * up), across = cross(up, along);
        vec3 side = cos(yaw) * along + sin(yaw) * across, lean = cross(side, up);
        // combed: the blades lean mostly the same way along the trunk, like brushed fur
        vec3 comb = normalize(mix(lean, along, .72));
        // the pointer: blades near it lie down outwards, away from it
        vec3 away = iBase - uPush.xyz; away -= dot(away, up) * up;
        float f = uPush.w * (1.0 - smoothstep(0.0, uPushR, length(iBase - uPush.xyz)));
        float h = iShape.z * (1.0 - .92 * f);
        // grass hangs a little under its own weight, more on the underside
        float droop = max(0.0, -up.y);
        float w = sin(uTime * 1.5 + iBase.x * .7 + iBase.y * .5) * .6 + sin(uTime * 2.6 + iBase.x * 2.1 - iBase.z) * .3;
        vec3 p = iBase + side * position.x * iShape.y + up * position.y * h;
        p += comb * bend * t * t * h + vec3(0.0, -1.0, 0.0) * droop * t * t * h * .45;
        p += (along * w * uWind * 6.0 + vec3(0.0, 0.0, 1.0) * w * uWind * 2.0) * t * t * h;
        p += normalize(away + 1e-4) * f * t * t * h * 1.6;
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(p, 1.0);
        vT = t; vTone = tone; vLight = .36 + .86 * max(0.0, up.y) - .34 * droop + .08 * up.z; vFlat = f;
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

  // ---- a few small daisies on stems poking out along the top
  const daisyMap = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 12; i++) { ctx.save(); ctx.translate(64, 64); ctx.rotate(i / 12 * Math.PI * 2); ctx.beginPath(); ctx.ellipse(0, -34, 9, 28, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    ctx.fillStyle = '#f2c12e'; ctx.beginPath(); ctx.arc(64, 64, 14, 0, Math.PI * 2); ctx.fill();
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
  })();
  const DAISIES = Math.round(70 * Math.max(.6, density)), dBase = [], dSize = [];
  for (let i = 0, tries = 0; i < DAISIES && tries < 4000; tries++) {
    const p = surface(random(), random() * Math.PI * 2);
    if (N.y < .55 || N.z < -.2) continue;
    dBase.push(p.x + N.x * .22, p.y + N.y * .25, p.z + N.z * .22); dSize.push(.045 + random() * .03); i++;
  }
  const dGeo = new T.InstancedBufferGeometry(), quad = new T.PlaneGeometry(1, 1);
  dGeo.index = quad.index; dGeo.setAttribute('position', quad.attributes.position); dGeo.setAttribute('uv', quad.attributes.uv);
  dGeo.setAttribute('iBase', new T.InstancedBufferAttribute(new Float32Array(dBase), 3)); dGeo.setAttribute('iSize', new T.InstancedBufferAttribute(new Float32Array(dSize), 1));
  dGeo.instanceCount = dSize.length;
  const daisies = new T.Mesh(dGeo, new T.ShaderMaterial({
    uniforms: { uMap: { value: daisyMap }, uTime: time, uWind: wind, uPush: push, uPushR: pushR },
    vertexShader: `
      attribute vec3 iBase; attribute float iSize; uniform float uTime; uniform float uWind; uniform vec4 uPush; uniform float uPushR;
      varying vec2 vUv;
      void main() {
        float w = sin(uTime * 1.5 + iBase.x * .7 + iBase.y * .5) * .6;
        float f = uPush.w * (1.0 - smoothstep(0.0, uPushR, length(iBase - uPush.xyz)));
        vec3 c = iBase + vec3(w * uWind * 3.0, 0.0, 0.0) + normalize(iBase - uPush.xyz + 1e-4) * f * .5 - vec3(0.0, f * .3, 0.0);
        vec4 mv = viewMatrix * vec4(c, 1.0);
        mv.xy += position.xy * iSize * (1.0 - .5 * f);                       // always faces the viewer
        gl_Position = projectionMatrix * mv; vUv = uv;
      }`,
    fragmentShader: `
      uniform sampler2D uMap; varying vec2 vUv;
      void main() { vec4 c = texture2D(uMap, vUv); if (c.a < .5) discard; gl_FragColor = vec4(c.rgb, 1.0);
        #include <colorspace_fragment>
      }`,
  }));
  daisies.frustumCulled = false; scene.add(daisies);

  // ---- framing: the whole arc across a wide screen; on a tall one the camera stands back so the curve still crosses it
  let width = 0, height = 0, zoom = 0;
  const wide = { pos: new T.Vector3(), look: new T.Vector3() };
  // the dive ends close in front of the lowest point of the arc, so its grass runs past every edge of the screen
  const low = (() => { let best = null; for (let i = 0; i <= 200; i++) { const p = curve.getPointAt(.25 + i / 200 * .5); if (!best || p.y < best.y) best = p; } return best; })();
  const near = { look: low.clone().add(new T.Vector3(0, .02, R * .55)), pos: low.clone().add(new T.Vector3(0, .1, R + 1.25)) };
  const look = new T.Vector3(), dir = new T.Vector3(), wideDir = new T.Vector3(), nearDir = new T.Vector3();
  function frame() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return false;
    if (w !== width || h !== height) {
      width = w; height = h; renderer.setSize(w, h, false); camera.aspect = w / h;
      const across = camera.aspect < 1 ? 5.2 : 13.6, half = Math.tan(T.MathUtils.degToRad(camera.fov / 2));
      const z = clamp(across / 2 / (half * camera.aspect), 12.5, 30);
      const y = camera.aspect < 1 ? -1 : .35;              // on a tall screen the arc sits higher, between the title and the figures
      wide.pos.set(0, y, z); wide.look.set(0, y, 0);
      camera.updateProjectionMatrix(); width = w; place(zoom, true);
    }
    return true;
  }
  // the camera between the whole arc (0) and the grass filling the screen (1): it closes the distance evenly to the eye, not the ruler
  function place(z, force = false) {
    if (!force && z === zoom) return;
    zoom = z;
    const e = z * z * (3 - 2 * z);
    look.lerpVectors(wide.look, near.look, e);
    wideDir.subVectors(wide.pos, wide.look); nearDir.subVectors(near.pos, near.look);
    const dist = wideDir.length() * Math.pow(nearDir.length() / wideDir.length(), e);
    dir.copy(wideDir).normalize().lerp(nearDir.normalize(), e).normalize();
    camera.position.copy(look).addScaledVector(dir, dist); camera.lookAt(look); camera.updateMatrixWorld();
    pushR.value = 1.15 + (.32 - 1.15) * e;
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
  function draw(seconds, { still = false, zoom: dive = 0 } = {}) {
    if (!frame()) return;
    place(clamp(dive));
    const dt = lastT ? Math.min(.1, Math.abs(seconds - lastT)) : 0; lastT = seconds;
    time.value = still ? 0 : seconds;
    // the hollow glides after the pointer and closes softly when the pointer leaves
    const k = 1 - Math.exp(-dt * 10);
    aimAt += ((onTrunk ? 1 : 0) - aimAt) * (still ? 1 : 1 - Math.exp(-dt * 5));
    push.value.x += (target.x - push.value.x) * (still ? 1 : k); push.value.y += (target.y - push.value.y) * (still ? 1 : k); push.value.z += (target.z - push.value.z) * (still ? 1 : k);
    push.value.w = aimAt;
    quality();
    renderer.render(scene, camera);
  }
  canvas.addEventListener('webglcontextlost', (e) => e.preventDefault());
  return { draw, point, leave, get settled() { return Math.abs(aimAt - (onTrunk ? 1 : 0)) < .002; }, blades: n };
}
