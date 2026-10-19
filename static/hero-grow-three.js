import * as T from './vendor/three/three.module.min.js';
import { autoQuality } from './gl-quality.js';
import { createHerbs } from './hero-herbs.js';

// The home banner's living hill: a soft grassy mound on the off-white page, a seedling on its top that grows and opens its two
// leaves, and wildflowers that bloom across the slope from the bottom right upwards. It loops: grow, hold in full bloom, a quick
// reset, again. Thousands of grass blades and flowers are drawn in one go each (instancing) and sway in the shader, so it stays light.
// It is also Who we are: as the page scrolls (story, 0 to 1) the camera comes in close to the seedling, a bottle rises out of the
// grass under its right leaf, a drop of medicine forms on that leaf's tip, and it falls into the bottle.
const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const smooth = (n) => { n = clamp(n); return n * n * (3 - 2 * n); };
const easeOutBack = (n) => { n = clamp(n); const c = 1.7; return 1 + (c + 1) * Math.pow(n - 1, 3) + c * Math.pow(n - 1, 2); };

// the seedling, the herbs and the flowers grow once, over GROW seconds when the page opens, and then stay in bloom
const GROW = 5.2;

// the hill: a broad mound whose top sits right of centre, falling to low meadow
const PEAK_X = 3.5;
// the meadow's footprint: 0 under the hill, rising past 1 at its edges, where the grass thins out and the ground fades into the page
const field = (x, z) => ((x - .5) / 9.5) ** 4 + ((z - 1.75) / 4.75) ** 4;
const hill = (x, z) => { const dx = x - PEAK_X, sx = dx < 0 ? 3.1 : 3.8; return 2.3 * Math.exp(-((dx / sx) ** 2 + (z / 2.7) ** 2)) + .3 * Math.exp(-(((x - 2.5) / 6) ** 2 + ((z - .5) / 4) ** 2)); };
// folds: shallow ridges and hollows running down the slopes from the top (none on the top itself, where the seedling stands)
const folds = (x, z) => {
  const dx = x - PEAK_X, r = Math.hypot(dx, z * 1.2), a = Math.atan2(z * 1.2, dx);
  return (.085 * Math.sin(a * 7 + Math.sin(r * 1.1) * 1.1) + .035 * Math.sin(x * 2.3 + z * 1.7) * Math.cos(z * 2.9 - x * .7)) * smooth((r - .45) / 1.3) * Math.exp(-r * .2);
};
const land = (x, z) => { const h = hill(x, z); return h + folds(x, z) * Math.min(1, h / .5); };
// sunlight on the land: from the upper left and in front, so the crest and the left-facing folds glow and the hollows sit in shade
const SUN = (() => { const v = [-.55, .78, .42], l = Math.hypot(...v); return v.map((c) => c / l); })();
const light = (x, z) => {
  const e = .05, nx = land(x - e, z) - land(x + e, z), nz = land(x, z - e) - land(x, z + e), ny = 2 * e, l = Math.hypot(nx, ny, nz);
  const lit = Math.max(0, (nx * SUN[0] + ny * SUN[1] + nz * SUN[2]) / l);
  return clamp((.24 + .92 * lit) * (1 + folds(x, z) * 3.2), .18, 1.28);
};

export function createGrowScene(canvas, { bg = '#f7f9f2', density = 1 } = {}) {
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new T.Scene();
  const bgColor = new T.Color(bg);
  scene.background = bgColor;
  const camera = new T.PerspectiveCamera(30, 1, .1, 120);
  let seed = 4021;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const texture = (w, h, paint) => { const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), c); const t = new T.CanvasTexture(c); return t; };
  const time = { value: 0 }, wind = { value: .085 }, clear = { value: new T.Vector4(0, 0, .5, 0) }, fogColor = { value: bgColor.clone() }, fogNear = { value: 14 }, fogFar = { value: 30 };

  scene.add(new T.HemisphereLight('#fbfff2', '#4d7a2c', 1.5));
  const key = new T.DirectionalLight('#fff8e6', 2.4); key.position.set(-4, 8, 6); scene.add(key);
  const quality = autoQuality(renderer);

  // ---- colours of the turf: deep green in the roots, yellow-green tips, warmer where the sun catches them
  const ROOT = new T.Color('#11360b'), TIP = new T.Color('#73b034'), SUNLIT = new T.Color('#c9df66'), SOIL = new T.Color('#2a5c19');

  // ---- the ground under the grass, painted with the same light, so the turf reads as dense velvet between the blades
  const groundGeo = new T.PlaneGeometry(40, 26, 220, 140); groundGeo.rotateX(-Math.PI / 2);
  { const p = groundGeo.attributes.position, col = new Float32Array(p.count * 4), c = new T.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i); p.setY(i, land(x, z) - .02);
      c.copy(SOIL).multiplyScalar(light(x, z) * .95);
      col.set([c.r, c.g, c.b, 1 - smooth((field(x, z) - .5) / .4)], i * 4);
    }
    groundGeo.setAttribute('color', new T.Float32BufferAttribute(col, 4)); }
  const ground = new T.Mesh(groundGeo, new T.MeshBasicMaterial({ vertexColors: true, transparent: true, toneMapped: false }));
  ground.position.z = 2; scene.add(ground);

  // ---- grass: short, fine blades packed tight (one blade drawn many thousands of times), each lit by the sun where it stands
  const SEG = 3, blade = new T.BufferGeometry();
  { const pos = [], t = [], idx = [];
    for (let i = 0; i <= SEG; i++) { const v = i / SEG, w = .5 * (1 - v * .94); pos.push(-w, v, 0, w, v, 0); t.push(v, v); }
    for (let i = 0; i < SEG; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    blade.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); blade.setAttribute('aT', new T.Float32BufferAttribute(t, 1)); blade.setIndex(idx); }
  const WANT = Math.round(125000 * density);
  const gOff = new Float32Array(WANT * 3), gShape = new Float32Array(WANT * 4), gLight = new Float32Array(WANT);
  let BLADES = 0;
  for (let i = 0; BLADES < WANT && i < WANT * 6; i++) {
    const x = -9 + random() * 19, z = -3 + random() * 9.5;
    // denser where it is seen up close, sparse far behind the hill, thinning out at the meadow's edge
    const keep = (z > -.8 ? 1 : .3) * (1 - smooth((field(x, z) - .6) / .45)); if (random() > keep) continue;
    const n = BLADES++;
    gOff.set([x, land(x, z), z + 2], n * 3);                                          // the land mesh sits 2 forward
    // yaw, width, length (a little longer on the top), and how far it leans (with a tone packed in as the whole part)
    gShape.set([random() * Math.PI * 2, .026 + random() * .02, .13 + random() * .11 + (hill(x, z) > 1.7 ? .03 : 0), Math.floor(random() * 100) + .2 + random() * .55], n * 4);
    gLight[n] = light(x, z);
  }
  const grass = new T.InstancedBufferGeometry(); grass.index = blade.index;
  grass.setAttribute('position', blade.attributes.position); grass.setAttribute('aT', blade.attributes.aT);
  grass.setAttribute('iOffset', new T.InstancedBufferAttribute(gOff, 3)); grass.setAttribute('iShape', new T.InstancedBufferAttribute(gShape, 4));
  grass.setAttribute('iLight', new T.InstancedBufferAttribute(gLight, 1));
  grass.instanceCount = BLADES;
  const grassMat = new T.ShaderMaterial({
    side: T.DoubleSide,
    uniforms: { uTime: time, uWind: wind, uClear: clear, uRoot: { value: ROOT }, uTip: { value: TIP }, uSun: { value: SUNLIT }, uFogColor: fogColor, uFogNear: fogNear, uFogFar: fogFar },
    vertexShader: `
      attribute float aT; attribute vec3 iOffset; attribute vec4 iShape; attribute float iLight;
      uniform float uTime; uniform float uWind; uniform vec4 uClear;
      varying float vT; varying float vTone; varying float vDepth; varying float vLight;
      void main() {
        float t = aT, yaw = iShape.x, bend = fract(iShape.w);
        float cut = 1.0 - uClear.w * .82 * (1.0 - smoothstep(uClear.z * .45, uClear.z, distance(iOffset.xz, uClear.xy)));
        float h = iShape.z * cut;
        vec3 p = vec3(position.x * iShape.y, position.y * h, bend * t * t * h);
        float c = cos(yaw), s = sin(yaw);
        vec3 r = vec3(c * p.x - s * p.z, p.y, s * p.x + c * p.z);
        float w = sin(uTime * 1.6 + iOffset.x * .8 + iOffset.z * .6) * .6 + sin(uTime * 2.7 + iOffset.x * 2.3 - iOffset.z) * .3;
        r.x += w * uWind * t * t * h * 6.0;
        r.z += w * uWind * .5 * t * t * h * 6.0;
        vec4 mv = viewMatrix * modelMatrix * vec4(r + iOffset, 1.0);
        gl_Position = projectionMatrix * mv;
        vT = t; vTone = floor(iShape.w) / 100.0; vDepth = -mv.z; vLight = iLight;
      }`,
    fragmentShader: `
      uniform vec3 uRoot; uniform vec3 uTip; uniform vec3 uSun; uniform vec3 uFogColor; uniform float uFogNear; uniform float uFogFar;
      varying float vT; varying float vTone; varying float vDepth; varying float vLight;
      void main() {
        vec3 tip = mix(uTip, uSun, smoothstep(.9, 1.25, vLight) * .8);
        vec3 col = mix(uRoot, tip, smoothstep(0.0, 1.0, vT)) * vLight;
        col *= .84 + vTone * .3;
        gl_FragColor = vec4(mix(col, uFogColor, smoothstep(uFogNear, uFogFar, vDepth)), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const grassMesh = new T.Mesh(grass, grassMat); grassMesh.frustumCulled = false; scene.add(grassMesh);

  // ---- the seedling on the hilltop: a tapered stem, two seed leaves that open, and two young true leaves unfolding between them
  const top = new T.Vector3(PEAK_X, land(PEAK_X, 0), 2);
  const sprout = new T.Group(); sprout.position.copy(top).add(new T.Vector3(0, -.05, 0)); scene.add(sprout);
  const stemCurve = new T.CatmullRomCurve3([new T.Vector3(0, 0, 0), new T.Vector3(.03, .35, .01), new T.Vector3(-.02, .7, 0), new T.Vector3(.02, 1, 0)]);
  const STEM_SEG = 32, STEM_RAD = 12, stemGeo = new T.TubeGeometry(stemCurve, STEM_SEG, 1, STEM_RAD, false);
  { // thick at the soil and slender at the top; a woody pink-brown at the base turning to fresh green, as on a real seedling
    const p = stemGeo.attributes.position, col = new Float32Array(p.count * 3), c = new T.Color(), at = new T.Vector3();
    const base = new T.Color('#86664a'), mid = new T.Color('#86bd4e'), tip = new T.Color('#b6de78');
    for (let i = 0; i < p.count; i++) {
      const u = Math.floor(i / (STEM_RAD + 1)) / STEM_SEG, r = .054 - .022 * u;
      stemCurve.getPointAt(u, at);
      p.setXYZ(i, at.x + (p.getX(i) - at.x) * r, at.y + (p.getY(i) - at.y) * r, at.z + (p.getZ(i) - at.z) * r);
      c.copy(base).lerp(mid, smooth(u / .3)).lerp(tip, smooth((u - .6) / .4));
      col.set([c.r, c.g, c.b], i * 3);
    }
    stemGeo.setAttribute('color', new T.Float32BufferAttribute(col, 3)); stemGeo.computeVertexNormals(); }
  const stemMat = new T.MeshPhysicalMaterial({ vertexColors: true, roughness: .5, sheen: .4, sheenColor: new T.Color('#e4f7c0'), sheenRoughness: .5 });
  const stem = new T.Mesh(stemGeo, stemMat); sprout.add(stem);
  // the leaf surface: deep green at the stalk to bright yellow-green at the tip, darker at the edges, a pale midrib, arching side
  // veins and a fine net between them, with a little mottling; it doubles as the bump map
  const leafMap = texture(512, 512, (ctx) => {
    const g = ctx.createLinearGradient(0, 512, 0, 0); g.addColorStop(0, '#3c7a20'); g.addColorStop(.5, '#5aa82f'); g.addColorStop(1, '#84c948');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 512);
    const edge = ctx.createRadialGradient(256, 300, 40, 256, 260, 300); edge.addColorStop(0, 'rgba(250,255,215,.14)'); edge.addColorStop(1, 'rgba(18,48,10,.42)');
    ctx.fillStyle = edge; ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2600; i++) { const a = Math.random() * .07; ctx.fillStyle = Math.random() < .5 ? `rgba(255,255,220,${a})` : `rgba(20,50,10,${a})`; ctx.fillRect(Math.random() * 512, Math.random() * 512, 2 + Math.random() * 3, 2 + Math.random() * 3); }
    ctx.lineCap = 'round';
    for (let k = 0; k < 6; k++) { ctx.strokeStyle = `rgba(225,246,178,${.8 - k * .1})`; ctx.lineWidth = 9 - k * 1.3; ctx.beginPath(); ctx.moveTo(256, 512 - k * 80); ctx.quadraticCurveTo(262, 400 - k * 80, 256, Math.max(8, 432 - k * 85)); ctx.stroke(); }
    for (let i = 0; i < 8; i++) {
      const y = 470 - i * 54;
      for (const side of [-1, 1]) {
        ctx.strokeStyle = 'rgba(206,238,156,.5)'; ctx.lineWidth = 3.2 - i * .25;
        ctx.beginPath(); ctx.moveTo(256, y); ctx.bezierCurveTo(256 + side * 60, y - 34, 256 + side * 130, y - 90, 256 + side * 200, y - 150); ctx.stroke();
        ctx.strokeStyle = 'rgba(190,226,140,.22)'; ctx.lineWidth = 1.2;
        for (let j = 1; j < 5; j++) { const sx = 256 + side * j * 36, sy = y - j * 26; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + side * 14, sy - 30, sx + side * 4, sy - 54); ctx.stroke(); }
      }
    }
  });
  leafMap.colorSpace = T.SRGBColorSpace;
  // a leaf as a fine grid (so it bends smoothly all over, not just at its outline): length along +y, cupped, curled back a little at
  // the tip; the true leaves have a toothed edge
  function leafShapeGeometry(len, width, toothed) {
    const U = 30, V = 12, pos = [], uv = [], idx = [];
    for (let i = 0; i <= U; i++) for (let j = 0; j <= V; j++) {
      const u = i / U, v = j / V * 2 - 1;
      let w = width * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.02)), .72) * (1 - .16 * u);
      if (toothed) w *= 1 + .08 * (Math.abs((u * 9) % 1 - .5) * 2 - .5);
      const x = v * w, y = u * len;
      pos.push(x, y, x * x * .7 - y * .12 + Math.sin(y * 2.6) * .05); uv.push(v * .5 + .5, u);
    }
    for (let i = 0; i < U; i++) for (let j = 0; j < V; j++) { const a = i * (V + 1) + j, b = a + V + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }
  const leafGeo = leafShapeGeometry(1.12, .42, false);
  const leafMat = new T.MeshPhysicalMaterial({ map: leafMap, bumpMap: leafMap, bumpScale: .9, roughness: .5, clearcoat: .25, clearcoatRoughness: .4,
    sheen: .45, sheenColor: new T.Color('#d8f59c'), sheenRoughness: .55, side: T.DoubleSide });
  const leafPivot = new T.Group(); leafPivot.position.y = 1; sprout.add(leafPivot);
  const leaves = [-1, 1].map((s) => { const g = new T.Group(); const m = new T.Mesh(leafGeo, leafMat); m.scale.setScalar(.62); g.add(m); leafPivot.add(g); return { g, m, s }; });
  // the first true leaves: smaller, toothed and a deeper green, rising between the seed leaves later in the growth
  const trueMat = leafMat.clone(); trueMat.color = new T.Color('#c4dba6');
  const trueGeo = leafShapeGeometry(1, .34, true);
  const trueLeaves = [-1, 1].map((s) => { const g = new T.Group(); g.add(new T.Mesh(trueGeo, trueMat)); g.position.set(0, .02, .01); leafPivot.add(g); return { g, s }; });

  // ---- wildflowers: a daisy and a cornflower drawn as masks (petals in red, centre in green) and tinted per flower
  const atlas = texture(1024, 256, (ctx) => {
    const daisy = (cx) => {
      ctx.fillStyle = 'rgb(255,0,0)';
      for (let i = 0; i < 14; i++) { ctx.save(); ctx.translate(cx, 128); ctx.rotate(i / 14 * Math.PI * 2); ctx.beginPath(); ctx.ellipse(0, -62, 15, 54, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
      ctx.fillStyle = 'rgb(0,255,0)'; ctx.beginPath(); ctx.arc(cx, 128, 26, 0, Math.PI * 2); ctx.fill();
    };
    const cornflower = (cx) => {
      ctx.fillStyle = 'rgb(255,0,0)';
      for (let i = 0; i < 9; i++) { ctx.save(); ctx.translate(cx, 128); ctx.rotate(i / 9 * Math.PI * 2); ctx.beginPath(); ctx.moveTo(-10, -18);
        ctx.lineTo(-30, -96); ctx.lineTo(-16, -84); ctx.lineTo(-8, -112); ctx.lineTo(0, -92); ctx.lineTo(8, -112); ctx.lineTo(16, -84); ctx.lineTo(30, -96); ctx.lineTo(10, -18); ctx.closePath(); ctx.fill(); ctx.restore(); }
      ctx.fillStyle = 'rgb(0,255,0)'; ctx.beginPath(); ctx.arc(cx, 128, 22, 0, Math.PI * 2); ctx.fill();
    };
    daisy(128); cornflower(384);
    ctx.filter = 'blur(9px)'; daisy(640); cornflower(896); ctx.filter = 'none';
  });
  const FLOWERS = Math.round(170 * Math.max(.6, density)), FAR = 5;
  const fGeo = new T.InstancedBufferGeometry(); const plane = new T.PlaneGeometry(1, 1);
  fGeo.index = plane.index; fGeo.setAttribute('position', plane.attributes.position); fGeo.setAttribute('uv', plane.attributes.uv);
  const fOff = [], fPetal = [], fCenter = [], fSize = [], fBloom = [], fType = [], fTilt = [];
  const petals = ['#5a7fe6', '#6f8ff2', '#4b6bd8', '#9a6ad8', '#7f57c9', '#b58ae6', '#f6f6ef', '#f4f2e8', '#f3cf36', '#f08bb0', '#e86f9c', '#c9a0f0'];
  const centres = { daisy: ['#f2c12e', '#e8a91c'], corn: ['#3b2a72', '#2e2160'] };
  const place = (x, z, size, type, bloom) => {
    const y = land(x, z - 2);
    const col = new T.Color(petals[Math.floor(random() * petals.length)]);
    const isCorn = type % 2 === 1;
    if (isCorn && random() < .7) col.set(random() < .6 ? '#5a7fe6' : '#8a5fd4');
    const cen = new T.Color((isCorn ? centres.corn : centres.daisy)[Math.floor(random() * 2)]);
    fOff.push(x, y + .17 + random() * .1, z); fPetal.push(col.r, col.g, col.b); fCenter.push(cen.r, cen.g, cen.b);
    fSize.push(size); fBloom.push(bloom); fType.push(type); fTilt.push(.75 + random() * .5, random() * Math.PI * 2);
  };
  for (let i = 0, n = 0; n < FLOWERS && i < FLOWERS * 30; i++) {
    const x = -1.4 + random() * 10.5, z = 2.2 + random() * 4.4;
    const h = land(x, z - 2);
    if (h < .25 || (Math.abs(x - PEAK_X) < 1.1 && z < 3.4)) continue;          // only on the slope, and the top stays grass
    const fromCorner = Math.hypot((x - 8.5) / 9, (z - 6.6) / 5);                  // the bottom right blooms first
    if (random() > .3 + .7 * (1 - fromCorner * .7)) continue;
    place(x, z, .11 + random() * .07, random() < .55 ? 0 : 1, clamp(.18 + fromCorner * .62 + (random() - .5) * .12, .1, .95));
    n++;
  }
  // a few large, soft flowers right in front of the camera
  for (let i = 0; i < FAR; i++) place(3.6 + i * 1.4 + random() * .6, 7.2 + random() * .6, .8 + random() * .4, 2 + (i % 2), .3 + i * .05);
  const fN = fSize.length;
  fGeo.setAttribute('iOffset', new T.InstancedBufferAttribute(new Float32Array(fOff), 3)); fGeo.setAttribute('iPetal', new T.InstancedBufferAttribute(new Float32Array(fPetal), 3));
  fGeo.setAttribute('iCenter', new T.InstancedBufferAttribute(new Float32Array(fCenter), 3)); fGeo.setAttribute('iSize', new T.InstancedBufferAttribute(new Float32Array(fSize), 1));
  fGeo.setAttribute('iBloom', new T.InstancedBufferAttribute(new Float32Array(fBloom), 1)); fGeo.setAttribute('iType', new T.InstancedBufferAttribute(new Float32Array(fType), 1));
  fGeo.setAttribute('iTilt', new T.InstancedBufferAttribute(new Float32Array(fTilt), 2));
  fGeo.instanceCount = fN;
  const growth = { value: 0 };
  const flowerMat = new T.ShaderMaterial({
    side: T.DoubleSide, transparent: false,
    uniforms: { uMap: { value: atlas }, uGrow: growth, uTime: time, uWind: wind, uFogColor: fogColor, uFogNear: fogNear, uFogFar: fogFar },
    vertexShader: `
      attribute vec3 iOffset; attribute vec3 iPetal; attribute vec3 iCenter; attribute float iSize; attribute float iBloom; attribute float iType; attribute vec2 iTilt;
      uniform float uGrow; uniform float uTime; uniform float uWind;
      varying vec2 vUv; varying vec3 vPetal; varying vec3 vCenter; varying float vDepth; varying float vOpen;
      float backOut(float n) { n = clamp(n, 0.0, 1.0); float c = 1.7, m = n - 1.0; return 1.0 + (c + 1.0) * m * m * m + c * m * m; }
      void main() {
        float open = backOut((uGrow - iBloom) / .14);
        vec3 p = position * iSize * open;
        // the head faces mostly up and towards the viewer, each a little differently
        float tilt = iTilt.x, yaw = iTilt.y * .25;
        vec3 q = vec3(p.x, p.y * cos(tilt), -p.y * sin(tilt));
        q = vec3(q.x * cos(yaw) - q.z * sin(yaw), q.y, q.x * sin(yaw) + q.z * cos(yaw));
        float w = sin(uTime * 1.6 + iOffset.x * .8 + iOffset.z * .6) * .6;
        vec3 base = iOffset + vec3(w * uWind * .9, 0.0, w * uWind * .45);
        vec4 mv = viewMatrix * modelMatrix * vec4(base + q, 1.0);
        gl_Position = projectionMatrix * mv;
        vUv = vec2((uv.x + iType) / 4.0, uv.y); vPetal = iPetal; vCenter = iCenter; vDepth = -mv.z; vOpen = open;
      }`,
    fragmentShader: `
      uniform sampler2D uMap; uniform vec3 uFogColor; uniform float uFogNear; uniform float uFogFar;
      varying vec2 vUv; varying vec3 vPetal; varying vec3 vCenter; varying float vDepth; varying float vOpen;
      void main() {
        vec4 m = texture2D(uMap, vUv);
        float a = max(m.r, m.g);
        if (a < .45 || vOpen <= .001) discard;
        vec2 local = fract(vUv * vec2(4.0, 1.0)) - .5;
        float shade = mix(.72, 1.05, smoothstep(.05, .45, length(local)));
        vec3 col = vPetal * m.r * shade + vCenter * m.g;
        col /= max(a, .001);
        gl_FragColor = vec4(mix(col, uFogColor, smoothstep(uFogNear, uFogFar, vDepth)), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const flowers = new T.Mesh(fGeo, flowerMat); flowers.frustumCulled = false; scene.add(flowers);
  const herbs = createHerbs(scene, { land, density });
  const sGeo = new T.InstancedBufferGeometry(); sGeo.index = blade.index;
  sGeo.setAttribute('position', blade.attributes.position); sGeo.setAttribute('aT', blade.attributes.aT);
  sGeo.setAttribute('iOffset', fGeo.attributes.iOffset); sGeo.setAttribute('iBloom', fGeo.attributes.iBloom); sGeo.setAttribute('iSize', fGeo.attributes.iSize);
  sGeo.instanceCount = fN - FAR;
  const stems = new T.Mesh(sGeo, new T.ShaderMaterial({
    side: T.DoubleSide, uniforms: { uGrow: growth, uTime: time, uWind: wind, uFogColor: fogColor, uFogNear: fogNear, uFogFar: fogFar },
    vertexShader: `
      attribute float aT; attribute vec3 iOffset; attribute float iBloom; attribute float iSize;
      uniform float uGrow; uniform float uTime; uniform float uWind; varying float vT; varying float vDepth;
      void main() {
        float up = clamp((uGrow - iBloom) / .14 + .25, 0.0, 1.0), len = .2 * up;
        float w = sin(uTime * 1.6 + iOffset.x * .8 + iOffset.z * .6) * .6;
        vec3 p = vec3(position.x * .014, aT * len - .2, 0.0) + iOffset;
        p.x += w * uWind * .9 * aT; p.z += w * uWind * .45 * aT;
        vec4 mv = viewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; vT = aT; vDepth = -mv.z;
      }`,
    fragmentShader: `
      uniform vec3 uFogColor; uniform float uFogNear; uniform float uFogFar; varying float vT; varying float vDepth;
      void main() { vec3 col = mix(vec3(.09, .24, .05), vec3(.36, .58, .17), vT);
        gl_FragColor = vec4(mix(col, uFogColor, smoothstep(uFogNear, uFogFar, vDepth)), 1.0);
        #include <colorspace_fragment>
      }`,
  }));
  stems.frustumCulled = false; scene.add(stems);

  // ---- the seedling's pose: how far it has grown, its sway, and how far the right leaf bends under the drop
  const right = leaves.find((l) => l.s > 0), tipLocal = new T.Vector3(0, 1.12, -1.12 * .12 + Math.sin(1.12 * 2.6) * .05), tip = new T.Vector3();
  function setSprout(g, sway = 0, droop = 0, lean = 0) {
    const stemG = .55 + .45 * smooth(g / .55), leafG = .5 + .5 * smooth((g - .08) / .55), openG = smooth((g - .12) / .55);
    stem.scale.set(1, stemG, 1); leafPivot.position.y = stemG;
    leafPivot.scale.setScalar(leafG);
    const young = smooth((g - .4) / .5);
    trueLeaves.forEach(({ g: grp, s }) => { grp.scale.setScalar(.001 + .3 * young); grp.rotation.set(-.12 - .1 * young, s * .2, -s * (.12 + .32 * young)); });
    // each leaf faces the viewer and leans out to its side as it opens (from nearly upright to about 70 degrees), cupped a little forward
    leaves.forEach(({ g: grp, s }) => { grp.rotation.set(.28, s * .32, -s * (.12 + 1.08 * openG) + sway * s - (s > 0 ? droop : 0)); });
    sprout.rotation.z = lean;
  }
  const tipAt = () => { sprout.updateMatrixWorld(true); return tip.copy(tipLocal).applyMatrix4(right.m.matrixWorld); };

  // ---- the bottle, standing in the grass right under the leaf tip with the drop on it (the leaf bent fully)
  const DROOP = .3, DROP = .5;
  setSprout(1, 0, DROOP);
  const release = tipAt().clone(), groundY = land(release.x, release.z - 2) + .02;
  const S = clamp((release.y - .42 - groundY) / 2.43, .16, .4);                   // the bottle model is 2.43 tall
  const mouth = new T.Vector3(release.x, groundY + 2.43 * S, release.z);
  const reflections = (() => {
    const t = texture(512, 256, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#f7faef'); g.addColorStop(.5, '#fbfbf3'); g.addColorStop(1, '#5f8f38');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 256);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(56, 40, 92, 116); ctx.fillRect(330, 56, 40, 104);
    });
    t.colorSpace = T.SRGBColorSpace; t.mapping = T.EquirectangularReflectionMapping;
    const pm = new T.PMREMGenerator(renderer), map = pm.fromEquirectangular(t).texture; t.dispose(); pm.dispose(); return map;
  })();
  const bottle = new T.Group(); bottle.position.set(release.x, groundY, release.z); bottle.visible = false; scene.add(bottle);
  const glass = new T.MeshPhysicalMaterial({ color: '#8a3c05', roughness: .1, metalness: 0, clearcoat: 1, clearcoatRoughness: .04, envMap: reflections, envMapIntensity: .55 });
  // an amber medicine bottle (outer wall, lip, then the inner wall back down), its base at 0
  const profile = [[0, 0], [.67, 0], [.78, .02], [.84, .11], [.85, .26], [.85, 1.44], [.83, 1.59], [.76, 1.72], [.59, 1.85], [.45, 1.96], [.40, 2.07], [.40, 2.31],
    [.43, 2.35], [.43, 2.4], [.40, 2.43], [.33, 2.43], [.32, 2.38], [.32, 2.1], [.37, 1.92], [.54, 1.77], [.70, 1.62], [.76, 1.45], [.76, .25], [.69, .13], [0, .13]];
  bottle.add(new T.Mesh(new T.LatheGeometry(profile.map(([x, y]) => new T.Vector2(x, y)), 64), glass));
  for (const y of [2.12, 2.23]) { const ring = new T.Mesh(new T.TorusGeometry(.405, .018, 8, 48), glass); ring.rotation.x = Math.PI / 2; ring.position.y = y; bottle.add(ring); }
  // a paper label with the real logo (it already carries the name Wasay Laboratories) round the front
  const labelMap = texture(1024, 384, (ctx, c) => {
    ctx.fillStyle = '#f6f3e6'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = '#0b5c33'; ctx.lineWidth = 5; ctx.strokeRect(512 - 236, 22, 472, 340);
    ctx.fillStyle = '#a3cf3c'; ctx.fillRect(512 - 236, 22, 472, 7);
  });
  labelMap.colorSpace = T.SRGBColorSpace;
  const logo = new Image();
  logo.onload = () => { const ctx = labelMap.image.getContext('2d'), h = 290, w = h * logo.naturalWidth / logo.naturalHeight; ctx.drawImage(logo, 512 - w / 2, 48, w, h); labelMap.needsUpdate = true; };
  logo.src = '/logo.png';
  const arc = Math.PI * 1.1;
  const label = new T.Mesh(new T.CylinderGeometry(.858, .858, .95, 48, 1, true, -arc / 2, arc), new T.MeshStandardMaterial({ map: labelMap, roughness: .62 }));
  label.position.y = .84; bottle.add(label);
  // a soft shadow on the grass under it
  const shade = new T.Mesh(new T.PlaneGeometry(2.6, 2.6), new T.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0,
    map: texture(128, 128, (ctx) => { const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 63); g.addColorStop(0, 'rgba(20,45,12,.55)'); g.addColorStop(1, 'rgba(20,45,12,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128); }) }));
  shade.rotation.x = -Math.PI / 2; shade.position.set(release.x, groundY + .06, release.z); shade.scale.setScalar(S); scene.add(shade);
  // the drop: the medicine, amber like the bottle's contents, not clear water
  const dropShape = [[0, .22], [.025, .14], [.08, .065], [.125, -.015], [.12, -.085], [.075, -.14], [0, -.16]];
  const drop = new T.Mesh(new T.LatheGeometry(dropShape.map(([x, y]) => new T.Vector2(x, y)), 32), new T.MeshPhysicalMaterial({ color: '#e9a41f', roughness: .05,
    clearcoat: 1, clearcoatRoughness: .03, emissive: new T.Color('#8a4a05'), emissiveIntensity: .5, envMap: reflections, envMapIntensity: 1.7 }));
  drop.visible = false; scene.add(drop);
  const ripple = new T.Mesh(new T.TorusGeometry(.4, .025, 8, 48), new T.MeshBasicMaterial({ color: '#f4c04e', transparent: true, opacity: 0, depthWrite: false }));
  ripple.rotation.x = Math.PI / 2; ripple.position.copy(mouth); ripple.visible = false; scene.add(ripple);
  // a little splash of medicine thrown up from the mouth as the drop lands
  const splash = Array.from({ length: 7 }, (_, i) => { const m = new T.Mesh(new T.SphereGeometry(1, 10, 8), drop.material); m.visible = false; scene.add(m); return { m, a: i / 7 * Math.PI * 2 + random() * .6, v: .6 + random() * .5 }; });
  clear.value.set(release.x, release.z + .25, 1.25, 0);
  setSprout(0);

  // ---- camera: the banner shows the whole hill, the hilltop to the right of the words; the story comes in close on the seedling and
  // the bottle, still on the right on a wide screen and low in the frame on a tall one, under the words
  let width = 0, height = 0, clearX = .45, storyX = .45;
  function frame() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return false;
    if (w !== width || h !== height) { width = w; height = h; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = camera.aspect < 1 ? 38 : 30; }
    return true;
  }
  const subject = new T.Vector3((top.x - .62 + release.x + .85 * S) / 2, top.y + .62, 2);
  const shots = {
    wide: { pos: new T.Vector3(-.3, 2.0, 13.4), look: new T.Vector3(1.7, 2.35, 0), near: new T.Vector3(-.75, .42, 4.6) },
    tall: { pos: new T.Vector3(3.2, 2.6, 16.5), look: new T.Vector3(3.4, 4.3, 0), near: new T.Vector3(-.45, .55, 6.4) },
  };
  const pos = new T.Vector3(), look = new T.Vector3(), focus = new T.Vector3(), seen = new T.Vector3();
  function aim(zoom) {
    const tall = camera.aspect < 1, shot = tall ? shots.tall : shots.wide;
    pos.copy(subject).add(shot.near).sub(shot.pos).multiplyScalar(zoom).add(shot.pos);
    look.lerpVectors(shot.look, subject, zoom);
    camera.clearViewOffset(); camera.position.copy(pos); camera.lookAt(look); camera.updateMatrixWorld();
    // slide the picture so what it is about sits where it should: the hilltop right of the banner words, then the seedling and bottle
    focus.lerpVectors(top, subject, zoom); seen.copy(focus).project(camera);
    const fx = (seen.x + 1) / 2, fy = (1 - seen.y) / 2;
    const fromX = tall ? fx : clamp(clearX + .25, .64, .8), toX = tall ? .5 : clamp(storyX + .22, .62, .78), toY = tall ? .73 : .56;
    camera.setViewOffset(width, height, -(fromX + (toX - fromX) * zoom - fx) * width, -zoom * (toY - fy) * height, width, height);
  }

  // the moment in the loop: the seedling and the flowers' growth (0 to 1)
  function state(seconds) { return { g: clamp(seconds / GROW), t: seconds }; }
  // story: 0 is the banner; by .3 the camera is close; the bottle rises from .36, the drop forms from .44 and falls from .7 to .84
  function draw(seconds, { still = false, story = 0 } = {}) {
    if (!frame()) return;
    const p = clamp(story), zoom = smooth(p / .3);
    const g = Math.max(still ? 1 : state(seconds).g, smooth(p / .08));                // once the story starts, everything is grown
    time.value = still ? 0 : seconds;
    growth.value = g;
    herbs.update(g, seconds, still);
    const appear = clamp((p - .36) / .14), form = smooth((p - .44) / .2), fall = clamp((p - .7) / .14), impact = clamp((p - .84) / .13);
    // the leaf bends under the drop and springs back once it lets go
    const droop = DROOP * (p < .7 ? form : Math.exp(-fall * 4) * Math.cos(fall * 14));
    const calm = 1 - zoom * .7;
    setSprout(g, still ? 0 : Math.sin(seconds * 1.3) * .04 * calm, droop, still ? 0 : Math.sin(seconds * .9) * .025 * calm);

    bottle.visible = appear > 0;
    const rise = appear > 0 ? Math.max(.001, easeOutBack(appear)) : .001, squash = Math.sin(impact * Math.PI) * (1 - impact) * .14;
    bottle.scale.set(S * rise * (1 + squash * .5), S * rise * (1 - squash), S * rise * (1 + squash * .5));
    bottle.position.y = groundY - .25 * (1 - smooth(appear));
    shade.material.opacity = smooth(appear) * .6;
    clear.value.w = smooth(appear);

    drop.visible = p > .44 && p < .84;
    const size = .2 + .8 * form, stretch = Math.sin(fall * Math.PI), hang = .22 * DROP * size;
    drop.scale.set(DROP * size * (1 - .15 * stretch), DROP * size * (1 + .35 * stretch), DROP * size * (1 - .15 * stretch));
    if (fall <= 0) { tipAt(); drop.position.set(tip.x, tip.y - hang, tip.z); }
    else drop.position.set(release.x, release.y - hang - fall * fall * (release.y - hang - mouth.y + .04), release.z);
    ripple.visible = impact > 0 && impact < 1;
    ripple.scale.setScalar(S * (.6 + impact * 1.9)); ripple.material.opacity = (1 - impact) * .75;
    const burst = impact / .55;
    splash.forEach(({ m, a, v }) => {
      m.visible = burst > 0 && burst < 1;
      if (!m.visible) return;
      m.position.set(mouth.x + Math.cos(a) * .17 * burst, mouth.y + .02 + burst * .24 * v - burst * burst * .3, mouth.z + Math.sin(a) * .17 * burst);
      m.scale.setScalar(.02 * (1 - burst * .7));
    });

    aim(zoom);
    quality();
    renderer.render(scene, camera);
  }
  canvas.addEventListener('webglcontextlost', (e) => e.preventDefault());
  // the page tells the scene where its words end (fractions of the width), so the hill and the bottle keep clear of them
  const setClear = (banner, story) => { clearX = Math.round(clamp(banner) * 100) / 100; storyX = Math.round(clamp(story) * 100) / 100; };
  return { draw, setClear, flowers: fN, blades: BLADES };
}
