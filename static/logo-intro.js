// The home page's opening (the owner's idea): leaves blow in and swirl round the middle of the screen with a dust of golden sparkles,
// then build the Wasay mark part by part, each part made of leaves that turn into it:
//   the belt   leaves line up along the circle like a garland, then a band of green sweeps along it and they melt into it like cloth;
//   the W      leaves gather into two V's, one each side; the two slide together into the W and fill in as the leaves melt into it;
//   the centre a few leaves spiral into the middle and the diamond and the lime square grow out of them;
//   the leaves two larger leaves loop in last and settle exactly on the mark's two small leaves.
// Then the lettering rises in underneath and the opening fades away into the page (about nine seconds in all).
// It plays when the home page is opened or reloaded, not when coming to it from another tab of the site; a tap, a click, a key, the
// wheel or a touch skips it; under reduced motion it is not played at all. It draws on one 2D canvas, from the site's own logo.
(() => {
  const intro = document.querySelector('.logo-intro');
  if (!intro) return;
  const root = document.documentElement;
  const finish = () => {
    if (intro.classList.contains('done')) return;
    intro.classList.add('done');
    root.classList.remove('intro-on');
    dispatchEvent(new Event('wasay:intro-done'));
  };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || root.classList.contains('tab-navigation')) { finish(); return; }
  root.classList.add('intro-on');
  const canvas = intro.querySelector('canvas'), ctx = canvas.getContext('2d'), logo = new Image();
  for (const type of ['click', 'keydown', 'wheel', 'touchstart']) addEventListener(type, finish, { once: true, passive: true });
  const giveUp = setTimeout(finish, 4000);                 // if the logo is slow to arrive, the page is not held back

  // ---- the logo, in its own pixels (407 x 409): the mark above row 224, the lettering below. Its parts: the belt (an arc round C),
  // the centre (diamond and lime square), the W (two swooshes and the bowl, split into its left and right halves) and two small leaves
  const LOGO = { w: 407, h: 409, mark: 224 }, C = [206, 100], BELT = { r: 83, from: 175, to: 365 };
  const SMALL = [{ base: [152, 147], tip: [124, 108] }, { base: [254, 147], tip: [284, 110] }];
  const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
  const smooth = (n) => { n = clamp(n); return n * n * (3 - 2 * n); };
  const mix = (a, b, t) => a + (b - a) * t;
  const rad = (d) => d * Math.PI / 180;
  let seed = 7; const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const inSmall = (x, y) => SMALL.some(({ base, tip }) => {
    const cx = (base[0] + tip[0]) / 2, cy = (base[1] + tip[1]) / 2, a = Math.atan2(tip[0] - base[0], base[1] - tip[1]), dx = x - cx, dy = y - cy;
    const u = dx * Math.cos(a) + dy * Math.sin(a), v = -dx * Math.sin(a) + dy * Math.cos(a);
    return (u / 21) ** 2 + (v / 28) ** 2 < 1;
  });
  const partOf = (x, y) => {
    if (inSmall(x, y)) return 'small';
    const d = Math.hypot(x - C[0], y - C[1]);
    if (d > 64 && d < 102 && y < 113) return 'belt';
    if (y < 163 && x > 136 && x < 274) return 'centre';
    return x < C[0] ? 'wl' : 'wr';
  };

  // ---- the timeline (seconds)
  const T = { beltGo: [1.8, 2.9], beltSweep: [3.5, 4.5], wGo: [3.0, 4.0], wSlide: [4.9, 5.7], wFill: [5.3, 6.0],
    centreGo: [4.6, 5.0], centreGrow: [5.7, 6.4], heroGo: 6.0, heroFly: 1.0, smallIn: [7.15, 7.5], text: [7.6, 8.2], end: 9.3 };

  const PALETTE = [[31, 107, 42], [52, 140, 50], [92, 166, 58], [141, 198, 63], [24, 88, 38]];
  // a leaf, 2 long (tip at -1, stalk at +1) and about .8 wide
  const leafPath = new Path2D(); leafPath.moveTo(0, -1); leafPath.bezierCurveTo(.56, -.55, .5, .45, 0, 1); leafPath.bezierCurveTo(-.5, .45, -.56, -.55, 0, -1);

  let W = 0, H = 0, dpr = 1, size = 0, k = 1, ox = 0, oy = 0, start = 0, frame = 0;
  let parts = {}, leaves = [], heroes = [], sparks = [];
  const S = (x, y) => [ox + x * k, oy + y * k];                // logo pixels to the screen
  function layout() {
    W = innerWidth; H = innerHeight; dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    size = Math.min(H * .52, W * .66, 400); k = size / LOGO.h;
    ox = W / 2 - LOGO.w * k / 2; oy = H / 2 - size / 2;
  }

  // ---- the logo cut into its parts (each its own picture, at the logo's own size), and the leaves that will become them
  function build() {
    const src = document.createElement('canvas'); src.width = LOGO.w; src.height = LOGO.mark;
    const sx = src.getContext('2d', { willReadFrequently: true }); sx.drawImage(logo, 0, 0, LOGO.w, LOGO.mark, 0, 0, LOGO.w, LOGO.mark);
    const all = sx.getImageData(0, 0, LOGO.w, LOGO.mark);
    parts = {};
    for (const name of ['belt', 'centre', 'wl', 'wr', 'small', 'body']) {
      const c = document.createElement('canvas'); c.width = LOGO.w; c.height = LOGO.mark;
      const x = c.getContext('2d'), img = x.createImageData(LOGO.w, LOGO.mark);
      for (let y = 0; y < LOGO.mark; y++) for (let xx = 0; xx < LOGO.w; xx++) {
        const i = (y * LOGO.w + xx) * 4;
        if (all.data[i + 3] > 0 && (name === 'body' ? partOf(xx, y) !== 'small' : partOf(xx, y) === name)) for (let q = 0; q < 4; q++) img.data[i + q] = all.data[i + q];
      }
      x.putImageData(img, 0, 0); parts[name] = c;
    }
    const colourAt = (x, y) => {
      for (let r = 0; r <= 10; r += 2) for (let a = 0; a < 6.28; a += r ? .8 : 7) {
        const i = (Math.round(clamp(y + Math.sin(a) * r, 0, LOGO.mark - 1)) * LOGO.w + Math.round(clamp(x + Math.cos(a) * r, 0, LOGO.w - 1))) * 4;
        if (all.data[i + 3] > 160) return [all.data[i], all.data[i + 1], all.data[i + 2]];
      }
      return PALETTE[1];
    };
    const opaque = (x, y) => all.data[(Math.round(y) * LOGO.w + Math.round(x)) * 4 + 3] > 140;
    const far = Math.hypot(W, H) * .62, cx = W / 2, cy = oy + LOGO.mark * k * .5;
    const fitIn = Math.min(1, W * .46 / (size * 1.05));
    const swirlOf = () => { const band = random(); return { cx, cy, a0: Math.floor(random() * 3) * 2.094 + (random() - .5) * .6, r0: far * (.85 + random() * .5), ring: size * (.5 + band * .55) * fitIn, spin: 1.2 + (1 - band) * 1.3,
      own: PALETTE[Math.floor(random() * PALETTE.length)], len: 22 + random() * 14, flip: random() * 6.28, flipRate: 4 + random() * 5 }; };
    leaves = [];
    // the belt: a garland of leaves along the circle, tip to tail, from its left end over the top to its right end
    const BELT_N = W < 700 ? 18 : 24;
    for (let i = 0; i < BELT_N; i++) {
      const deg = BELT.from + (BELT.to - BELT.from) * (i + .5) / BELT_N, x = C[0] + Math.cos(rad(deg)) * BELT.r, y = C[1] + Math.sin(rad(deg)) * BELT.r;
      leaves.push({ ...swirlOf(), part: 'belt', tx: x, ty: y, deg, angle: rad(deg) + Math.PI, size: (BELT.to - BELT.from) / BELT_N * Math.PI / 180 * BELT.r * .95, rgb: colourAt(x, y),
        go: mix(T.beltGo[0], T.beltGo[1], i / (BELT_N - 1)), fly: .95 });
    }
    // the W: leaves over each half (points on the shape, lying along the arm or round the bowl), gathered as two V's
    for (const side of ['wl', 'wr']) {
      const pts = [];
      for (let y = 116; y < LOGO.mark - 4; y += 15) for (let x = side === 'wl' ? 40 : C[0] + 4; x < (side === 'wl' ? C[0] - 4 : 370); x += 15) {
        const jx = x + (random() - .5) * 6, jy = y + (random() - .5) * 6;
        if (opaque(jx, jy) && partOf(jx, jy) === side) pts.push([jx, jy]);
      }
      pts.sort((a, b) => a[1] - b[1]);
      pts.forEach(([x, y], i) => {
        const arm = y < 160, dir = side === 'wl' ? 1 : -1;
        const angle = arm ? Math.atan2(.58, dir) + Math.PI / 2 : Math.atan2(y - C[1], x - C[0]);
        leaves.push({ ...swirlOf(), part: side, tx: x, ty: y, angle, size: 13, rgb: colourAt(x, y), go: mix(T.wGo[0], T.wGo[1], i / Math.max(1, pts.length - 1)) + (side === 'wr' ? .1 : 0), fly: 1, melt: random() * .3 });
      });
    }
    // the centre: a few leaves spiral in over the diamond and the lime square
    const cpts = [];
    for (let y = 60; y < 160; y += 18) for (let x = 140; x < 272; x += 18) { const jx = x + (random() - .5) * 8, jy = y + (random() - .5) * 8; if (opaque(jx, jy) && partOf(jx, jy) === 'centre') cpts.push([jx, jy]); }
    cpts.forEach(([x, y], i) => leaves.push({ ...swirlOf(), part: 'centre', tx: x, ty: y, angle: random() * 6.28, size: 13, rgb: colourAt(x, y), go: mix(T.centreGo[0], T.centreGo[1], i / Math.max(1, cpts.length - 1)), fly: .9, melt: random() * .25 }));
    // the two heroes, matching the mark's small leaves in place, size and lean
    heroes = SMALL.map(({ base, tip }, i) => {
      const [bx, by] = S(...base), [tx, ty] = S(...tip);
      return { ...swirlOf(), x: (bx + tx) / 2, y: (by + ty) / 2, half: Math.hypot(tx - bx, ty - by) / 2, angle: Math.atan2(tx - bx, by - ty), side: i ? 1 : -1, a0: i ? .4 : 3.5, go: T.heroGo + i * .14, fly: T.heroFly };
    });
    sparks = Array.from({ length: 80 }, () => ({ ...swirlOf(), tw: 3 + random() * 6, big: .7 + random() * 1.5 }));
  }

  // where a swirling leaf is at time t: spiralling in from far out to its ring round the logo, in three curling arms
  const swirl = (p, t) => { const a = p.a0 + p.spin * t, r = p.ring + (p.r0 - p.ring) * Math.exp(-t * 1.6); return [p.cx + Math.cos(a) * r, p.cy + Math.sin(a) * r * .72]; };
  const swirlV = (p, t) => { const a = p.a0 + p.spin * t, e = Math.exp(-t * 1.6), r = p.ring + (p.r0 - p.ring) * e, dr = -1.6 * (p.r0 - p.ring) * e;
    return [Math.cos(a) * dr - Math.sin(a) * r * p.spin, (Math.sin(a) * dr + Math.cos(a) * r * p.spin) * .72]; };
  // a smooth curve from the swirl, carrying on the way it was going, to where it is going (which may itself be moving)
  function flight(p, t, gx, gy, out) {
    const u = clamp((t - p.go) / p.fly), [sx, sy] = swirl(p, p.go), [vx, vy] = swirlV(p, p.go), lead = p.fly * .3;
    const h00 = 2 * u ** 3 - 3 * u * u + 1, h10 = u ** 3 - 2 * u * u + u, h01 = -2 * u ** 3 + 3 * u * u;
    out[0] = h00 * sx + h10 * vx * lead + h01 * gx; out[1] = h00 * sy + h10 * vy * lead + h01 * gy; return u;
  }
  // how far apart the two V's are (they gather apart, then slide together into the W)
  const vApart = (t) => (1 - smooth((t - T.wSlide[0]) / (T.wSlide[1] - T.wSlide[0]))) * size * .26;

  function drawLeaf(x, y, angle, len, width, alpha, rgb, rib) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(len / 2 * width, len / 2);
    ctx.globalAlpha = alpha;
    const g = ctx.createLinearGradient(0, -1, 0, 1);
    g.addColorStop(0, `rgb(${Math.round(rgb[0] * .75)}, ${Math.round(rgb[1] * .8)}, ${Math.round(rgb[2] * .75)})`); g.addColorStop(1, `rgb(${Math.min(255, rgb[0] + 40)}, ${Math.min(255, rgb[1] + 35)}, ${Math.min(255, rgb[2] + 20)})`);
    ctx.fillStyle = g; ctx.fill(leafPath);
    if (rib > 0) { ctx.strokeStyle = `rgba(240, 250, 225, ${rib})`; ctx.lineWidth = .06 / Math.max(.2, width); ctx.beginPath(); ctx.moveTo(0, -.8); ctx.lineTo(0, .9); ctx.stroke(); }
  }
  // a part of the logo, drawn where it sits (shifted by dx, scaled about a point of the logo)
  function drawPart(name, alpha, dx = 0, scale = 1, about = C) {
    if (alpha <= 0) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalAlpha = alpha;
    const [ax, ay] = S(...about);
    ctx.translate(ax + dx, ay); ctx.scale(scale, scale); ctx.translate(-ax, -ay);
    ctx.drawImage(parts[name], 0, 0, LOGO.w, LOGO.mark, ox, oy, LOGO.w * k, LOGO.mark * k);
  }

  const pos = [0, 0];
  function draw(now) {
    frame = 0;
    if (intro.classList.contains('done')) return;
    const t = (now - start) / 1000;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);

    // ---- the parts of the logo, as the leaves turn into them (once all are in, the mark is drawn whole, so no seams show between them)
    const whole = smooth((t - T.centreGrow[1]) / .3), grow = smooth((t - T.centreGrow[0]) / (T.centreGrow[1] - T.centreGrow[0]));
    // the belt: a band of green sweeping along the circle from its left end to its right end, soft at its leading edge
    const sweep = BELT.from + (BELT.to - BELT.from) * smooth((t - T.beltSweep[0]) / (T.beltSweep[1] - T.beltSweep[0]));
    if (whole >= 1) drawPart('body', 1);
    else {
      if (t > T.beltSweep[0]) {
        const [cx, cy] = S(...C);
        // solid behind the leading edge, and a softer edge just ahead of it
        for (const [back, alpha] of [[14, 1], [7, .55], [0, .3]]) {
          const to = Math.min(BELT.to + 12, sweep + (sweep >= BELT.to ? 12 : 0) - back); if (to <= BELT.from) continue;
          ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, 130 * k, rad(BELT.from - 12), rad(to)); ctx.closePath(); ctx.clip();
          drawPart('belt', alpha); ctx.restore();
        }
      }
      // the W: its two halves fill in once they have slid together; the centre grows out of its leaves
      const wFill = smooth((t - T.wFill[0]) / (T.wFill[1] - T.wFill[0])), apart = vApart(t);
      const ghost = .2 * smooth((t - T.wGo[0] - .6) / .8) * (1 - wFill);
      drawPart('wl', Math.max(wFill, ghost), -apart); drawPart('wr', Math.max(wFill, ghost), apart);
      drawPart('centre', grow, 0, .6 + .4 * grow, [205, 110]);
      if (whole > 0) drawPart('body', whole);
    }
    drawPart('small', smooth((t - T.smallIn[0]) / (T.smallIn[1] - T.smallIn[0])));
    // the lettering rises in underneath
    const textIn = smooth((t - T.text[0]) / (T.text[1] - T.text[0]));
    if (textIn > 0) { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalAlpha = textIn; ctx.drawImage(logo, 0, LOGO.mark, LOGO.w, LOGO.h - LOGO.mark, ox, oy + LOGO.mark * k + (1 - textIn) * 18, LOGO.w * k, (LOGO.h - LOGO.mark) * k); }

    // ---- the sparkle dust, swirling with the leaves
    for (const p of sparks) {
      const [x, y] = swirl(p, t), a = (.35 + .65 * Math.abs(Math.sin(t * p.tw + p.a0))) * smooth(t / .6) * (1 - smooth((t - 5.5) / 1.2));
      if (a <= .01) continue;
      const r = 1.7 * p.big;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalAlpha = a;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3); g.addColorStop(0, 'rgba(255, 250, 220, 1)'); g.addColorStop(.35, 'rgba(240, 196, 80, .8)'); g.addColorStop(1, 'rgba(240, 196, 80, 0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 3, 0, Math.PI * 2); ctx.fill();
    }

    // ---- the leaves
    for (const p of leaves) {
      let [gx, gy] = S(p.tx, p.ty);
      if (p.part === 'wl') gx -= vApart(t); else if (p.part === 'wr') gx += vApart(t);
      let x, y, u = 0;
      if (t < p.go) [x, y] = swirl(p, t); else { u = flight(p, t, gx, gy, pos); [x, y] = pos; }
      const landed = smooth(u), flip = mix(Math.cos(p.flip + t * p.flipRate), 1, landed);
      const angle = mix(p.a0 + t * 2.2 + p.flip, p.angle, landed);
      let len = mix(p.len, p.size * 2 * k * 1.15, landed), width = mix(Math.max(.25, Math.abs(flip)), 1, landed) * .85, alpha = smooth(t / .5);
      const rgb = [0, 1, 2].map((q) => Math.round(mix(p.own[q], p.rgb[q], landed)));
      // turning into the part: the belt's leaves stretch along the circle and thin into the sweeping band; the others melt in
      if (p.part === 'belt') { const m = Math.max(smooth((sweep - p.deg) / 22), smooth((t - T.beltSweep[1]) / .3)); len *= 1 + .7 * m; width *= 1 - .85 * m; alpha *= 1 - m; }
      else if (p.part === 'centre') { const m = smooth((t - T.centreGrow[0] - p.melt) / .4); len *= 1 - .5 * m; alpha *= 1 - m; }
      else { const m = smooth((t - T.wFill[0] - p.melt) / .45); len *= 1 - .4 * m; alpha *= 1 - m; }
      if (alpha <= .01) continue;
      drawLeaf(x, y, angle, len, width, alpha, rgb, .45 * (1 - landed * .6));
    }
    // ---- the two heroes: they swirl, then loop up and settle exactly on the mark's small leaves, and stay as those come in
    for (const p of heroes) {
      let x, y, angle, half;
      if (t < p.go) { [x, y] = swirl(p, t); angle = p.a0 + t * 2.2; half = p.half * 1.45; }
      else {
        const u = flight(p, t, p.x, p.y, pos), e = smooth(u); [x, y] = pos;
        const loop = Math.sin(Math.PI * u); x += p.side * loop * size * .2; y -= loop * size * .26;
        angle = mix(p.a0 + p.go * 2.2, p.angle + p.side * Math.PI * 2, e); half = mix(p.half * 1.45, p.half, e);
      }
      const alpha = smooth(t / .5) * (1 - smooth((t - T.smallIn[0] - .15) / .35));
      if (alpha <= .01) continue;
      const flip = t < p.go ? Math.cos(t * 5 + p.a0) : 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(half * 1.25 * Math.max(.3, Math.abs(flip)), half);
      ctx.globalAlpha = alpha;
      const g = ctx.createLinearGradient(0, -1, 0, 1); g.addColorStop(0, '#1d6a2c'); g.addColorStop(.5, '#3f9a3a'); g.addColorStop(1, '#9ccf45');
      ctx.fillStyle = g; ctx.fill(leafPath);
      ctx.strokeStyle = 'rgba(236, 248, 214, .55)'; ctx.lineWidth = .07; ctx.beginPath(); ctx.moveTo(0, -.75); ctx.lineTo(0, .85); ctx.stroke();
      const land = clamp((t - p.go - p.fly) / .5);
      if (land > 0 && land < 1) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalAlpha = (1 - land) * .9;
        ctx.strokeStyle = 'rgba(240, 200, 90, 1)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(p.x, p.y, p.half * (.6 + land * 1.6), 0, Math.PI * 2); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    if (t >= T.end) { finish(); return; }
    frame = requestAnimationFrame(draw);
  }

  logo.onload = () => {
    clearTimeout(giveUp);
    if (intro.classList.contains('done')) return;
    layout(); build();
    start = performance.now();
    frame = requestAnimationFrame(draw);
  };
  logo.onerror = finish;
  logo.src = intro.dataset.logo;
  addEventListener('resize', () => { if (!intro.classList.contains('done')) { layout(); build(); } });
  // for checking: draw one moment of the opening (seconds)
  window.WasayIntro = { at: (seconds) => { if (frame) cancelAnimationFrame(frame); start = performance.now() - seconds * 1000; draw(performance.now()); cancelAnimationFrame(frame); frame = 0; } };
})();
