import * as T from './vendor/three/three.module.min.js';

// The home banner's living hill: a soft grassy mound on the off-white page, a seedling on its top that grows and opens its two
// leaves, and wildflowers that bloom across the slope from the bottom right upwards. It loops: grow, hold in full bloom, a quick
// reset, again. Thousands of grass blades and flowers are drawn in one go each (instancing) and sway in the shader, so it stays light.
const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const smooth = (n) => { n = clamp(n); return n * n * (3 - 2 * n); };
const easeOutBack = (n) => { n = clamp(n); const c = 1.7; return 1 + (c + 1) * Math.pow(n - 1, 3) + c * Math.pow(n - 1, 2); };

// the loop, in seconds: the seedling and flowers grow, hold in bloom, then reset quickly
const CYCLE = 13, GROW = 5.2, RESET_AT = 11.4, RESET_LEN = .8;

// the hill: a broad mound whose top sits right of centre, falling to low meadow
const PEAK_X = 3.5;
// the meadow's footprint: 0 under the hill, rising past 1 at its edges, where the grass thins out and the ground fades into the page
const field = (x, z) => ((x - .5) / 9.5) ** 4 + ((z - 1.75) / 4.75) ** 4;
const hill = (x, z) => { const dx = x - PEAK_X, sx = dx < 0 ? 3.1 : 3.8; return 2.3 * Math.exp(-((dx / sx) ** 2 + (z / 2.7) ** 2)) + .3 * Math.exp(-(((x - 2.5) / 6) ** 2 + ((z - .5) / 4) ** 2)); };

export function createGrowScene(canvas, { bg = '#f7f9f2', density = 1 } = {}) {
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new T.Scene();
  const bgColor = new T.Color(bg);
  scene.background = bgColor;
  const camera = new T.PerspectiveCamera(30, 1, .1, 120);
  let seed = 4021;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const texture = (w, h, paint) => { const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), c); const t = new T.CanvasTexture(c); return t; };
  const time = { value: 0 }, wind = { value: .085 }, fogColor = { value: bgColor.clone() }, fogNear = { value: 14 }, fogFar = { value: 30 };

  scene.add(new T.HemisphereLight('#fbfff2', '#4d7a2c', 1.5));
  const key = new T.DirectionalLight('#fff8e6', 2.4); key.position.set(-4, 8, 6); scene.add(key);

  // ---- the ground under the grass, so no gaps show between blades
  const groundGeo = new T.PlaneGeometry(40, 26, 200, 130); groundGeo.rotateX(-Math.PI / 2);
  { const p = groundGeo.attributes.position, fade = new Float32Array(p.count * 4);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i); p.setY(i, hill(x, z) - .02);
      fade.set([1, 1, 1, 1 - smooth((field(x, z) - .5) / .4)], i * 4);
    }
    groundGeo.setAttribute('color', new T.Float32BufferAttribute(fade, 4)); groundGeo.computeVertexNormals(); }
  const ground = new T.Mesh(groundGeo, new T.MeshStandardMaterial({ color: '#2f6b1f', roughness: 1, vertexColors: true, transparent: true }));
  ground.position.z = 2; scene.add(ground);

  // ---- grass: one tapered, curved blade, drawn many thousands of times with a position, turn, size and tone each
  const SEG = 4, blade = new T.BufferGeometry();
  { const pos = [], t = [];
    for (let i = 0; i <= SEG; i++) {
      const v = i / SEG, w = .5 * (1 - v * .92);
      pos.push(-w, v, 0, w, v, 0); t.push(v, v);
    }
    const idx = [];
    for (let i = 0; i < SEG; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    blade.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); blade.setAttribute('aT', new T.Float32BufferAttribute(t, 1)); blade.setIndex(idx);
  }
  const BLADES = Math.round(95000 * density);
  const grass = new T.InstancedBufferGeometry(); grass.index = blade.index;
  grass.setAttribute('position', blade.attributes.position); grass.setAttribute('aT', blade.attributes.aT);
  const gOff = new Float32Array(BLADES * 3), gYaw = new Float32Array(BLADES), gScale = new Float32Array(BLADES * 2), gTone = new Float32Array(BLADES), gBend = new Float32Array(BLADES);
  for (let i = 0, n = 0; n < BLADES && i < BLADES * 6; i++) {
    const x = -9 + random() * 19, z = -3 + random() * 9.5;
    // denser where it is seen up close, sparse far behind the hill, thinning out at the meadow's edge
    const keep = (z > -.8 ? 1 : .35) * (1 - smooth((field(x, z) - .6) / .45)); if (random() > keep) continue;
    gOff.set([x, hill(x, z) + 2 * 0, z + 2], n * 3);
    gYaw[n] = random() * Math.PI * 2;
    const tall = .26 + random() * .24 + (hill(x, z) > 1.6 ? .04 : 0);
    gScale.set([.045 + random() * .03, tall], n * 2);
    gTone[n] = random(); gBend[n] = .15 + random() * .35;
    n++;
  }
  // the hill mesh sits 2 forward (ground.position.z = 2): blades use the same offset
  for (let n = 0; n < BLADES; n++) gOff[n * 3 + 1] = hill(gOff[n * 3], gOff[n * 3 + 2] - 2);
  grass.setAttribute('iOffset', new T.InstancedBufferAttribute(gOff, 3)); grass.setAttribute('iYaw', new T.InstancedBufferAttribute(gYaw, 1));
  grass.setAttribute('iScale', new T.InstancedBufferAttribute(gScale, 2)); grass.setAttribute('iTone', new T.InstancedBufferAttribute(gTone, 1));
  grass.setAttribute('iBend', new T.InstancedBufferAttribute(gBend, 1));
  grass.instanceCount = BLADES;
  const grassMat = new T.ShaderMaterial({
    side: T.DoubleSide,
    uniforms: { uTime: time, uWind: wind, uBase: { value: new T.Color('#1d4a15') }, uTip: { value: new T.Color('#86c23d') }, uFogColor: fogColor, uFogNear: fogNear, uFogFar: fogFar },
    vertexShader: `
      attribute float aT; attribute vec3 iOffset; attribute float iYaw; attribute vec2 iScale; attribute float iTone; attribute float iBend;
      uniform float uTime; uniform float uWind;
      varying float vT; varying float vTone; varying float vDepth;
      void main() {
        vec3 p = position; float t = aT;
        p.x *= iScale.x; p.y *= iScale.y;
        p.z = iBend * t * t * iScale.y;
        float c = cos(iYaw), s = sin(iYaw);
        vec3 r = vec3(c * p.x - s * p.z, p.y, s * p.x + c * p.z);
        float w = sin(uTime * 1.6 + iOffset.x * .8 + iOffset.z * .6) * .6 + sin(uTime * 2.7 + iOffset.x * 2.3 - iOffset.z) * .3;
        r.x += w * uWind * t * t * iScale.y * 6.0;
        r.z += w * uWind * .5 * t * t * iScale.y * 6.0;
        vec4 mv = viewMatrix * modelMatrix * vec4(r + iOffset, 1.0);
        gl_Position = projectionMatrix * mv;
        vT = t; vTone = iTone; vDepth = -mv.z;
      }`,
    fragmentShader: `
      uniform vec3 uBase; uniform vec3 uTip; uniform vec3 uFogColor; uniform float uFogNear; uniform float uFogFar;
      varying float vT; varying float vTone; varying float vDepth;
      void main() {
        vec3 col = mix(uBase, uTip, smoothstep(0.0, 1.0, vT));
        col *= .8 + vTone * .38;
        col *= mix(.5, 1.0, smoothstep(0.0, .55, vT));
        gl_FragColor = vec4(mix(col, uFogColor, smoothstep(uFogNear, uFogFar, vDepth)), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const grassMesh = new T.Mesh(grass, grassMat); grassMesh.frustumCulled = false; scene.add(grassMesh);

  // ---- the seedling on the hilltop: a stem that grows and two leaves that open
  const top = new T.Vector3(PEAK_X, hill(PEAK_X, 0), 2);
  const sprout = new T.Group(); sprout.position.copy(top).add(new T.Vector3(0, -.05, 0)); scene.add(sprout);
  const stemCurve = new T.CatmullRomCurve3([new T.Vector3(0, 0, 0), new T.Vector3(.03, .35, .01), new T.Vector3(-.02, .7, 0), new T.Vector3(.02, 1, 0)]);
  const stemMat = new T.MeshStandardMaterial({ color: '#86c94a', roughness: .45 });
  const stem = new T.Mesh(new T.TubeGeometry(stemCurve, 24, .038, 10, false), stemMat); sprout.add(stem);
  const leafMap = texture(256, 256, (ctx) => {
    const g = ctx.createLinearGradient(0, 256, 0, 0); g.addColorStop(0, '#4f9a2c'); g.addColorStop(.55, '#6cc33a'); g.addColorStop(1, '#8fd85a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = 'rgba(214,240,170,.55)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(128, 256); ctx.quadraticCurveTo(134, 130, 128, 10); ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(200,232,150,.35)';
    for (let i = 0; i < 6; i++) { const y = 210 - i * 32; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(129, y); ctx.quadraticCurveTo(128 + s * 40, y - 22, 128 + s * 80, y - 50); ctx.stroke(); } }
  });
  leafMap.colorSpace = T.SRGBColorSpace;
  const leafShape = new T.Shape(); leafShape.moveTo(0, 0); leafShape.bezierCurveTo(.42, .12, .44, .78, 0, 1.12); leafShape.bezierCurveTo(-.44, .78, -.42, .12, 0, 0);
  const leafGeo = new T.ShapeGeometry(leafShape, 24);
  { const p = leafGeo.attributes.position, uv = leafGeo.attributes.uv;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, x * x * .7 - y * .12 + Math.sin(y * 2.6) * .05); uv.setXY(i, x / .9 + .5, y / 1.12); }
    leafGeo.computeVertexNormals(); }
  const leafMat = new T.MeshStandardMaterial({ map: leafMap, roughness: .38, side: T.DoubleSide });
  const leafPivot = new T.Group(); leafPivot.position.y = 1; sprout.add(leafPivot);
  const leaves = [-1, 1].map((s) => { const g = new T.Group(); const m = new T.Mesh(leafGeo, leafMat); m.scale.setScalar(.62); g.add(m); leafPivot.add(g); return { g, m, s }; });

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
  const FLOWERS = Math.round(1150 * Math.max(.6, density)), FAR = 5;
  const fGeo = new T.InstancedBufferGeometry(); const plane = new T.PlaneGeometry(1, 1);
  fGeo.index = plane.index; fGeo.setAttribute('position', plane.attributes.position); fGeo.setAttribute('uv', plane.attributes.uv);
  const fOff = [], fPetal = [], fCenter = [], fSize = [], fBloom = [], fType = [], fTilt = [];
  const petals = ['#5a7fe6', '#6f8ff2', '#4b6bd8', '#9a6ad8', '#7f57c9', '#b58ae6', '#f6f6ef', '#f4f2e8', '#f3cf36', '#f08bb0', '#e86f9c', '#c9a0f0'];
  const centres = { daisy: ['#f2c12e', '#e8a91c'], corn: ['#3b2a72', '#2e2160'] };
  const place = (x, z, size, type, bloom) => {
    const y = hill(x, z - 2);
    const col = new T.Color(petals[Math.floor(random() * petals.length)]);
    const isCorn = type % 2 === 1;
    if (isCorn && random() < .7) col.set(random() < .6 ? '#5a7fe6' : '#8a5fd4');
    const cen = new T.Color((isCorn ? centres.corn : centres.daisy)[Math.floor(random() * 2)]);
    fOff.push(x, y + .2 + random() * .14, z); fPetal.push(col.r, col.g, col.b); fCenter.push(cen.r, cen.g, cen.b);
    fSize.push(size); fBloom.push(bloom); fType.push(type); fTilt.push(.75 + random() * .5, random() * Math.PI * 2);
  };
  for (let i = 0, n = 0; n < FLOWERS && i < FLOWERS * 30; i++) {
    const x = -1.4 + random() * 10.5, z = 2.2 + random() * 4.4;
    const h = hill(x, z - 2);
    if (h < .25 || (Math.abs(x - PEAK_X) < 1.1 && z < 3.4)) continue;          // only on the slope, and the top stays grass
    const fromCorner = Math.hypot((x - 8.5) / 9, (z - 6.6) / 5);                  // the bottom right blooms first
    if (random() > .35 + .65 * (1 - fromCorner * .7)) continue;
    place(x, z, .36 + random() * .26, random() < .55 ? 0 : 1, clamp(.18 + fromCorner * .62 + (random() - .5) * .12, .1, .95));
    n++;
  }
  // a few large, soft flowers right in front of the camera
  for (let i = 0; i < FAR; i++) place(3.6 + i * 1.4 + random() * .6, 7.2 + random() * .6, 1.25 + random() * .5, 2 + (i % 2), .3 + i * .05);
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

  // ---- camera framing: the hill on the right with the left side free for the words; on a tall screen it sits lower and smaller
  let width = 0, height = 0, clearX = .45, laid = '';
  function frame() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return false;
    if (w !== width || h !== height) { width = w; height = h; renderer.setSize(w, h, false); }
    if (laid !== `${w}x${h}:${clearX}`) {
      laid = `${w}x${h}:${clearX}`; camera.aspect = w / h; camera.clearViewOffset();
      const portrait = camera.aspect < 1;
      camera.fov = portrait ? 38 : 30; camera.updateProjectionMatrix();
      if (portrait) { camera.position.set(3.2, 2.6, 16.5); camera.lookAt(3.4, 4.3, 0); }
      else {
        camera.position.set(-.3, 2.0, 13.4); camera.lookAt(1.7, 2.35, 0); camera.updateMatrixWorld();
        // clearX is where the words end (a fraction of the width); the hilltop goes well to the right of it
        const at = (top.clone().project(camera).x + 1) / 2, want = clamp(clearX + .25, .64, .8);
        camera.setViewOffset(w, h, -(want - at) * w, 0, w, h);
      }
    }
    return true;
  }

  // the moment in the loop: the seedling and the flowers' growth (0 to 1)
  function state(seconds) {
    const t = seconds % CYCLE;
    let g;
    if (t < GROW) g = t / GROW;
    else if (t < RESET_AT) g = 1;
    else g = 1 - clamp((t - RESET_AT) / RESET_LEN);
    return { g, t };
  }
  function draw(seconds, { still = false } = {}) {
    if (!frame()) return;
    const { g } = still ? { g: 1 } : state(seconds);
    time.value = still ? 0 : seconds;
    growth.value = g;
    // seedling: the stem rises and the leaves grow and open; at the reset it shrinks back to a small shoot
    const stemG = .55 + .45 * smooth(g / .55), leafG = .5 + .5 * smooth((g - .08) / .55), openG = smooth((g - .12) / .55);
    stem.scale.set(1, stemG, 1); leafPivot.position.y = stemG;
    leafPivot.scale.setScalar(leafG);
    const sway = still ? 0 : Math.sin(seconds * 1.3) * .04;
    // each leaf faces the viewer and leans out to its side as it opens (from nearly upright to about 70 degrees), cupped a little forward
    leaves.forEach(({ g: grp, s }) => { grp.rotation.set(.28, s * .32, -s * (.12 + 1.08 * openG) + sway * s); });
    sprout.rotation.z = still ? 0 : Math.sin(seconds * .9) * .025;
    renderer.render(scene, camera);
  }
  canvas.addEventListener('webglcontextlost', (e) => e.preventDefault());
  // the page tells the scene where its words end, so the hill keeps clear of them
  const setClear = (fraction) => { clearX = Math.round(clamp(fraction) * 100) / 100; };
  return { draw, setClear, flowers: fN, blades: BLADES };
}
