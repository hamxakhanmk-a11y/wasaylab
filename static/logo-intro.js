// The home page's opening (the owner's idea): leaves blow in from the edges and swirl round the middle of the screen with a dust of
// golden sparkles, then peel off one by one and fly to their places in the Wasay mark, shrinking and taking on its colours as they
// land, so the leaves become the logo. Two larger leaves loop in last and settle exactly on the mark's two small leaves. The logo
// itself then shows through, its lettering rises in underneath, and the opening fades away into the page.
// It plays when the home page is opened or reloaded, not when coming to it from another tab of the site; a click, a key, the wheel
// or a touch skips it; under reduced motion it is not played at all. It draws on one 2D canvas.
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

  // ---- the logo, in its own pixels (407 x 409): the mark is above row 224, the lettering below; its two small leaves, base to tip
  const LOGO = { w: 407, h: 409, mark: 224 };
  const SMALL = [{ base: [152, 147], tip: [124, 108] }, { base: [254, 147], tip: [284, 110] }];
  const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
  const smooth = (n) => { n = clamp(n); return n * n * (3 - 2 * n); };
  const mix = (a, b, t) => a + (b - a) * t;
  let s = 7; const random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const PALETTE = [[31, 107, 42], [52, 140, 50], [92, 166, 58], [141, 198, 63], [24, 88, 38]];
  // a leaf, 2 long (tip at -1, stalk at +1) and about .8 wide
  const leaf = new Path2D(); leaf.moveTo(0, -1); leaf.bezierCurveTo(.56, -.55, .5, .45, 0, 1); leaf.bezierCurveTo(-.5, .45, -.56, -.55, 0, -1);

  let W = 0, H = 0, dpr = 1, size = 0, ox = 0, oy = 0, leaves = [], heroes = [], sparks = [], start = 0, frame = 0;
  // where the logo sits on screen: centred, as large as fits comfortably
  function layout() {
    W = innerWidth; H = innerHeight; dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    size = Math.min(H * .5, W * .6, 380);                      // the logo's height on screen
    ox = W / 2 - size * LOGO.w / LOGO.h / 2; oy = H / 2 - size / 2;
  }
  const toScreen = (x, y) => [ox + x / LOGO.h * size, oy + y / LOGO.h * size];

  // ---- where each leaf lands: points over the mark, with the mark's colour there (not in the two small leaves, which the heroes take)
  function build() {
    const k = size / LOGO.h, c = document.createElement('canvas'); c.width = Math.ceil(LOGO.w * k); c.height = Math.ceil(LOGO.h * k);
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(logo, 0, 0, c.width, c.height);
    const d = x.getImageData(0, 0, c.width, Math.ceil(LOGO.mark * k)).data, mw = c.width, mh = Math.ceil(LOGO.mark * k);
    let area = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 140) area++;
    const COUNT = W < 700 ? 170 : 260, step = Math.max(3, Math.sqrt(area / COUNT));
    const inSmall = (px, py) => SMALL.some(({ base, tip }) => { const cx = (base[0] + tip[0]) / 2 * k, cy = (base[1] + tip[1]) / 2 * k; return Math.hypot(px - cx, py - cy) < 27 * k; });
    const targets = [];
    for (let y = step / 2; y < mh; y += step) for (let xx = step / 2; xx < mw; xx += step) {
      const px = Math.round(xx + (random() - .5) * step * .5), py = Math.round(y + (random() - .5) * step * .5);
      if (px < 0 || py < 0 || px >= mw || py >= mh) continue;
      const i = (py * mw + px) * 4;
      if (d[i + 3] > 140 && !inSmall(px, py)) targets.push({ x: ox + px, y: oy + py, rgb: [d[i], d[i + 1], d[i + 2]] });
    }
    const cx = ox + mw / 2, cy = oy + mh * .55, far = Math.hypot(W, H) * .62;
    leaves = targets.map((t) => {
      // the order they peel off in: round the mark, so it fills in a sweep
      const around = (Math.atan2(t.y - cy, t.x - cx) + Math.PI) / (Math.PI * 2), band = random();
      // three spiral arms: each leaf starts on one, and the inner ones turn faster, so the arms curl as they come in
      return { ...t, cx, cy, a0: Math.floor(random() * 3) * 2.094 + (random() - .5) * .5, r0: far * (.85 + random() * .6), ring: size * (.42 + band * .7), spin: 1.5 + (1 - band) * 1.9,
        go: 1.2 + ((around + .15) % 1) * .85 + random() * .12, fly: .6 + random() * .25, len: 10 + random() * 14, flip: random() * 6.28, flipRate: 5 + random() * 7,
        own: PALETTE[Math.floor(random() * PALETTE.length)], cell: step * .62 };
    });
    // the two heroes: larger leaves that swirl with the rest and loop in last onto the mark's small leaves, matching their size and lean
    heroes = SMALL.map(({ base, tip }, i) => {
      const [bx, by] = toScreen(...base), [tx, ty] = toScreen(...tip), half = Math.hypot(tx - bx, ty - by) / 2;
      return { cx, cy, x: (bx + tx) / 2, y: (by + ty) / 2, half, angle: Math.atan2(tx - bx, by - ty), side: i ? 1 : -1,
        a0: i ? .4 : 3.5, r0: far, ring: size * .8, spin: 2.3, go: 2.0 + i * .12, fly: .9 };
    });
    sparks = Array.from({ length: 70 }, () => ({ a0: random() * 6.28, r0: far * (.7 + random() * .6), ring: size * (.45 + random() * .6), spin: 1.6 + random() * 1.6, tw: 4 + random() * 7, big: .6 + random() * 1.4, cx, cy }));
  }

  // where a swirling leaf is at time t: spiralling in from far out to its ring round the logo
  const swirl = (p, t) => { const a = p.a0 + p.spin * t, r = p.ring + (p.r0 - p.ring) * Math.exp(-t * 2.1); return [p.cx + Math.cos(a) * r, p.cy + Math.sin(a) * r * .72]; };
  const swirlV = (p, t) => { const a = p.a0 + p.spin * t, r = p.ring + (p.r0 - p.ring) * Math.exp(-t * 2.1), dr = -2.1 * (p.r0 - p.ring) * Math.exp(-t * 2.1);
    return [Math.cos(a) * dr - Math.sin(a) * r * p.spin, (Math.sin(a) * dr + Math.cos(a) * r * p.spin) * .72]; };
  // a smooth curve from the swirl, carrying on the way it was going, to its place
  function flight(p, t, out) {
    const u = clamp((t - p.go) / p.fly), e = smooth(u), [sx, sy] = swirl(p, p.go), [vx, vy] = swirlV(p, p.go), lead = p.fly * .35;
    const h10 = (u ** 3 - 2 * u * u + u), h00 = 2 * u ** 3 - 3 * u * u + 1, h01 = -2 * u ** 3 + 3 * u * u;
    out[0] = h00 * sx + h10 * vx * lead + h01 * p.x; out[1] = h00 * sy + h10 * vy * lead + h01 * p.y; return e;
  }

  const T_LOGO = 2.55, T_LEAVES = 3.1, T_TEXT = 3.35, T_END = 4.35;
  let bare = null;
  function cutLeaves() {
    bare = document.createElement('canvas'); bare.width = LOGO.w; bare.height = LOGO.mark;
    const x = bare.getContext('2d'); x.drawImage(logo, 0, 0, LOGO.w, LOGO.mark, 0, 0, LOGO.w, LOGO.mark);
    x.globalCompositeOperation = 'destination-out';
    for (const { base, tip } of SMALL) { x.save(); x.translate((base[0] + tip[0]) / 2, (base[1] + tip[1]) / 2); x.rotate(Math.atan2(tip[0] - base[0], base[1] - tip[1])); x.beginPath(); x.ellipse(0, 0, 21, 28, 0, 0, Math.PI * 2); x.fill(); x.restore(); }
  }
  const pos = [0, 0];
  function draw(now) {
    frame = 0;
    if (intro.classList.contains('done')) return;
    const t = (now - start) / 1000;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
    const logoIn = smooth((t - T_LOGO) / .55), textIn = smooth((t - T_TEXT) / .5);
    // the logo shows through as the leaves settle; its lettering rises in underneath
    if (logoIn > 0) {
      const k = size / LOGO.h;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const leavesIn = smooth((t - T_LEAVES) / .35);
      ctx.globalAlpha = logoIn; ctx.drawImage(bare, 0, 0, LOGO.w, LOGO.mark, ox, oy, LOGO.w * k, LOGO.mark * k);
      if (leavesIn > 0) { ctx.globalAlpha = leavesIn; ctx.drawImage(logo, 0, 0, LOGO.w, LOGO.mark, ox, oy, LOGO.w * k, LOGO.mark * k); }
      if (textIn > 0) { ctx.globalAlpha = textIn; ctx.drawImage(logo, 0, LOGO.mark, LOGO.w, LOGO.h - LOGO.mark, ox, oy + LOGO.mark * k + (1 - textIn) * 16, LOGO.w * k, (LOGO.h - LOGO.mark) * k); }
      ctx.globalAlpha = 1;
    }
    // the sparkle dust, swirling with the leaves and gone once the logo is there
    for (const p of sparks) {
      const [x, y] = swirl(p, t), a = (.35 + .65 * Math.abs(Math.sin(t * p.tw + p.a0))) * smooth(t / .5) * (1 - smooth((t - 2.2) / .8));
      if (a <= .01) continue;
      const r = 1.6 * p.big;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalAlpha = a;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3); g.addColorStop(0, 'rgba(255, 250, 220, 1)'); g.addColorStop(.35, 'rgba(240, 196, 80, .8)'); g.addColorStop(1, 'rgba(240, 196, 80, 0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // the leaves: swirling, then flying to their places, shrinking and taking the mark's colour; they melt into the logo as it shows
    for (const p of leaves) {
      let x, y, e = 0;
      if (t < p.go) [x, y] = swirl(p, t); else { e = flight(p, t, pos); [x, y] = pos; }
      const fade = 1 - logoIn;
      if (fade <= .01) continue;
      const settle = smooth((t - p.go - p.fly * .7) / (p.fly * .3));
      const len = mix(p.len, p.cell, e), flip = Math.cos(p.flip + t * p.flipRate * (1 - e)), spinA = (1 - e) * (p.a0 + t * 3) + e * p.a0 * .2;
      const r = Math.round(mix(p.own[0], p.rgb[0], e)), g = Math.round(mix(p.own[1], p.rgb[1], e)), b = Math.round(mix(p.own[2], p.rgb[2], e));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.translate(x, y); ctx.rotate(spinA);
      ctx.scale(len / 2 * mix(Math.max(.25, Math.abs(flip)), 1, settle) * .8, len / 2);
      ctx.globalAlpha = fade * smooth(t / .35);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`; ctx.fill(leaf);
      if (e < .8) { ctx.strokeStyle = `rgba(255, 255, 255, ${.28 * (1 - e)})`; ctx.lineWidth = .1; ctx.beginPath(); ctx.moveTo(0, -.8); ctx.lineTo(0, .9); ctx.stroke(); }
    }
    // the two heroes: they swirl, then loop up and settle exactly on the mark's small leaves, and stay a moment as the logo comes in
    for (const p of heroes) {
      let x, y, angle, half, e = 0;
      if (t < p.go) { [x, y] = swirl(p, t); angle = p.a0 + t * 2.6; half = p.half * 1.35; }
      else {
        e = flight(p, t, pos); [x, y] = pos;
        // a loop on the way in: out to the side and over the top
        const loop = Math.sin(Math.PI * e);
        x += p.side * loop * size * .22; y -= loop * size * .28;
        angle = mix(p.a0 + p.go * 2.6, p.angle + p.side * Math.PI * 2, smooth(e)); half = mix(p.half * 1.35, p.half, smooth(e));
      }
      const fade = 1 - smooth((t - T_LEAVES - .1) / .35);
      if (fade <= .01) continue;
      const flip = e >= 1 ? 1 : Math.cos(t * 6 + p.a0) * (1 - e) + e;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(half * 1.25 * Math.max(.3, Math.abs(flip)), half);
      ctx.globalAlpha = fade * smooth(t / .35);
      const g = ctx.createLinearGradient(0, -1, 0, 1); g.addColorStop(0, '#1d6a2c'); g.addColorStop(.5, '#3f9a3a'); g.addColorStop(1, '#9ccf45');
      ctx.fillStyle = g; ctx.fill(leaf);
      ctx.strokeStyle = 'rgba(236, 248, 214, .55)'; ctx.lineWidth = .07; ctx.beginPath(); ctx.moveTo(0, -.75); ctx.lineTo(0, .85); ctx.stroke();
      // a little burst of light as it lands
      const land = clamp((t - p.go - p.fly) / .5);
      if (land > 0 && land < 1) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalAlpha = (1 - land) * .9;
        ctx.strokeStyle = 'rgba(240, 200, 90, 1)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(p.x, p.y, p.half * (.6 + land * 1.6), 0, Math.PI * 2); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    if (t >= T_END) { finish(); return; }
    frame = requestAnimationFrame(draw);
  }

  logo.onload = () => {
    clearTimeout(giveUp);
    if (intro.classList.contains('done')) return;
    layout(); build(); cutLeaves();
    start = performance.now();
    frame = requestAnimationFrame(draw);
  };
  logo.onerror = finish;
  logo.src = intro.dataset.logo;
  addEventListener('resize', () => { if (!intro.classList.contains('done')) { layout(); build(); } });
  // for checking: draw one moment of the opening (seconds)
  window.WasayIntro = { at: (seconds) => { if (frame) cancelAnimationFrame(frame); start = performance.now() - seconds * 1000; draw(performance.now()); cancelAnimationFrame(frame); frame = 0; } };
})();
