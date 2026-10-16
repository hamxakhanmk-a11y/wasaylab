/**
 * Renders the product pictures used by the home-page ring and the product view, from the 3D models the product pages build.
 *
 *   node scripts/render-cutouts.mjs              (every jar and every carton)
 *   node scripts/render-cutouts.mjs jars         (the nine paste jars only)
 *   node scripts/render-cutouts.mjs cartons      (the carton products only)
 *   node scripts/render-cutouts.mjs hasnat       (one product, by its slug)
 *   node scripts/render-cutouts.mjs fit          (only measure each product's fit in its tile, no pictures)
 *   node scripts/render-cutouts.mjs stills       (only the 640px ring picture of each carton)
 *
 * It builds the site, serves dist/, opens each product page in a headless Chrome or Edge (software WebGL), waits for each 3D model
 * to be built by static/pastes.js or static/tablets.js, draws it again at high resolution, crops it to its outline and writes:
 *   static/images/wasay/ring/<slug>.webp            jar, front view, for the ring
 *   static/images/wasay/ring/<slug>-large.webp      jar, front view, for the product view
 *   static/images/wasay/ring/<slug>-turn.webp       jar, 21 frames turning left to right in one strip, which the ring plays as the mouse moves
 *   static/images/wasay/products/<slug>.webp        carton, front view, for the home ring (any product can be chosen for it)
 *   static/images/wasay/products/<slug>-large.webp  carton, front view, for the product view
 * Every run also measures where each model sits in its tile and stores the result as "fit" ([trim, drop] in px) in
 * static/tablets-data.json and static/pastes-data.json, so the tabs know each tile's height before its 3D model is built.
 * Run it again whenever a product is added or its photos or measurements change.
 * Needs Node 22+ and Chrome or Edge (set CHROME to a browser path if it is not found).
 */
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const RING = join(root, 'static', 'images', 'wasay', 'ring'), PRODUCTS = join(root, 'static', 'images', 'wasay', 'products');
const PORT = 4619, DEBUG = 9339;
const SIZES = [['', 640, 0.92], ['-large', 1000, 0.9]];   // jars: file suffix, height in px, WebP quality
const CARTON = [['', 640, 0.9], ['-large', 900, 0.88]];   // a carton gets a ring picture as well, because any product can be shown on the home ring
const TURN = { frames: 21, swing: 0.82, height: 480, quality: 0.8 };   // the same swing as the jars on the Pastes page
const only = process.argv.slice(2);
const KEYWORDS = ['jars', 'cartons', 'fit', 'stills'], fitOnly = only.includes('fit'), stillsOnly = only.includes('stills');
const kindArg = only.filter((a) => a === 'jars' || a === 'cartons'), slugArg = only.filter((a) => !KEYWORDS.includes(a));
const doJars = !stillsOnly && (!kindArg.length || kindArg.includes('jars')), doCartons = stillsOnly || !kindArg.length || kindArg.includes('cartons');

const candidates = [process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const browser = candidates.find(existsSync);
if (!browser) throw new Error('No Chrome or Edge found. Set the CHROME environment variable to its path.');

execFileSync(process.execPath, ['build.js'], { cwd: root, stdio: 'inherit' });
const server = spawn(process.execPath, ['serve.js', String(PORT), 'dist'], { cwd: root, stdio: 'ignore' });
const profile = mkdtempSync(join(tmpdir(), 'wasay-cutouts-'));
const chrome = spawn(browser, ['--headless=new', `--remote-debugging-port=${DEBUG}`, `--user-data-dir=${profile}`, '--no-first-run',
  '--no-default-browser-check', '--hide-scrollbars', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
  '--enable-webgl', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cleanup = () => { chrome.kill(); server.kill(); try { rmSync(profile, { recursive: true, force: true }); } catch {} };

try {
  for (let i = 0; i < 80; i++) { try { if ((await fetch(`http://127.0.0.1:${DEBUG}/json/version`)).ok) break; } catch {} await sleep(250); }
  const target = await (await fetch(`http://127.0.0.1:${DEBUG}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0; const pending = new Map();
  ws.addEventListener('message', (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { const { res, rej } = pending.get(d.id); pending.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); } });
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  const run = async (expression) => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };

  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Network.setBlockedURLs', { urls: ['*fonts.googleapis.com*', '*fonts.gstatic.com*'] });
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  // Reduced motion holds each jar at its front view, so the last draw call is exactly the pose we want.
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  // Remember each jar's renderer and the arguments it was last drawn with.
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => { let real; window.__jars = [];
    Object.defineProperty(window, 'Wasay3D', { configurable: true, get() { return real && ((canvas) => { const r = real(canvas), entry = { canvas, renderer: r, last: null }, d = r.draw;
      r.draw = (...a) => { entry.last = a; return d(...a); }; window.__jars.push(entry); return r; }); }, set(v) { real = v; } }); })();` });
  const readyJar = (sel, attr, slug) => run(`(() => { const j = window.__jars.find((e) => { const v = e.canvas.closest('${sel}'); return v && v.dataset.${attr} === '${slug}'; }); return !!(j && j.last && j.canvas.closest('${sel}').classList.contains('ready')); })()`);
  const save = (dir, name, url) => { mkdirSync(dir, { recursive: true }); const bytes = Buffer.from(url.split(',')[1], 'base64'); writeFileSync(join(dir, name), bytes); return bytes.length; };

  // Draws the model at some turn angles on a big canvas, crops every frame to the same box (the union of their outlines) and
  // returns the requested pictures as data URLs. One shared box keeps the still and every frame of the strip registered.
  const renderModel = (sel, attr, slug, yaws, outputs, strip) => run(`(() => { const j = window.__jars.find((e) => e.canvas.closest('${sel}').dataset.${attr} === '${slug}');
    const c = j.canvas, W = 1500, H = Math.round(1000 * c.height / c.width), keep = [c.width, c.height], yaws = ${JSON.stringify(yaws)};
    c.width = W; c.height = H;
    const grab = (yaw) => { j.renderer.draw(yaw, j.last[1], j.last[2]); const t = document.createElement('canvas'); t.width = W; t.height = H; t.getContext('2d').drawImage(c, 0, 0); return t; };
    // the outline of every frame is measured on a third-size copy for speed
    const sw = W / 3, sh = Math.round(H / 3); let x0 = sw, y0 = sh, x1 = -1, y1 = -1;
    const frames = yaws.map((yaw) => { const t = grab(yaw), m = document.createElement('canvas'); m.width = sw; m.height = sh; const mx = m.getContext('2d', { willReadFrequently: true }); mx.drawImage(t, 0, 0, sw, sh);
      const d = mx.getImageData(0, 0, sw, sh).data;
      for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) if (d[(y * sw + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      return t; });
    const pad = 3; x0 = Math.max(0, (x0 - pad) * 3); y0 = Math.max(0, (y0 - pad) * 3); x1 = Math.min(W - 1, (x1 + pad) * 3 + 2); y1 = Math.min(H - 1, (y1 + pad) * 3 + 2);
    const w = x1 - x0 + 1, h = y1 - y0 + 1, mid = frames[${strip ? (TURN.frames - 1) / 2 : 0}], out = {};
    for (const [suffix, height, quality] of ${JSON.stringify(outputs)}) {
      const k = height / h, o = document.createElement('canvas'); o.width = Math.round(w * k); o.height = height;
      const ctx = o.getContext('2d'); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(mid, x0, y0, w, h, 0, 0, o.width, o.height);
      out[suffix] = { url: o.toDataURL('image/webp', quality), w: o.width, h: o.height };
    }
    if (${strip}) {
      const k = ${TURN.height} / h, fw = Math.round(w * k), o = document.createElement('canvas'); o.width = fw * frames.length; o.height = ${TURN.height};
      const ctx = o.getContext('2d'); ctx.imageSmoothingQuality = 'high';
      frames.forEach((t, i) => ctx.drawImage(t, x0, y0, w, h, i * fw, 0, fw, ${TURN.height}));
      out['-turn'] = { url: o.toDataURL('image/webp', ${TURN.quality}), w: o.width, h: o.height };
    }
    c.width = keep[0]; c.height = keep[1];
    return out; })()`);

  const pageSlugs = async (page, selector, attr) => {
    await send('Page.navigate', { url: `http://localhost:${PORT}/${page}.html` });
    for (let i = 0; i < 80; i++) { if (await run(`document.querySelectorAll('${selector}').length`).catch(() => 0)) break; await sleep(250); }
    return run(`[...document.querySelectorAll('${selector}')].map((v) => v.dataset.${attr})`);
  };
  const build = async (sel, attr, slug) => {
    await run(`[...document.querySelectorAll('${sel}')].find((v) => v.dataset.${attr} === '${slug}').scrollIntoView({ block: 'center', behavior: 'instant' })`);
    let ok = false;
    for (let i = 0; i < 180 && !ok; i++) { ok = await readyJar(sel, attr, slug); if (!ok) await sleep(500); }
    if (!ok) throw new Error('Model did not build: ' + slug);
  };
  const report = (slug, suffix, one, bytes) => console.log(`${(slug + suffix).padEnd(34)} ${one.w} x ${one.h}  ${(bytes / 1024).toFixed(0)} KB`);
  let found = 0;
  const fits = { jars: {}, cartons: {} };
  const measure = async (sel, attr, slug, kind, gap) => {
    const m = await run(`(() => { const j = window.__jars.find((e) => e.canvas.closest('${sel}').dataset.${attr} === '${slug}'); j.renderer.draw(0, j.last[1], j.last[2]); return window.WasayFitMeasure(j.canvas); })()`);
    if (!m) throw new Error('Could not measure ' + slug);
    const [trim, drop] = await run(`WasayFitNumbers(${JSON.stringify(m)}, ${gap}, 320)`);
    fits[kind][slug] = [trim, drop];
    console.log(`${slug.padEnd(34)} fit  trim ${trim}px  drop ${drop}px`);
  };

  if (doJars) {
    const slugs = (await pageSlugs('pastes', '[data-paste]', 'paste')).filter((s) => !slugArg.length || slugArg.includes(s));
    const yaws = Array.from({ length: TURN.frames }, (_, i) => -TURN.swing + (2 * TURN.swing * i) / (TURN.frames - 1));
    for (const slug of slugs) {
      await build('[data-paste]', 'paste', slug);
      await measure('[data-paste]', 'paste', slug, 'jars', 14);
      if (!fitOnly) {
        const shot = await renderModel('[data-paste]', 'paste', slug, yaws, SIZES, true);
        for (const suffix of [...SIZES.map((z) => z[0]), '-turn']) report(slug, suffix, shot[suffix], save(RING, slug + suffix + '.webp', shot[suffix].url));
      }
      found++;
    }
  }
  if (doCartons) {
    for (const page of ['tablets', 'tonics', 'syrups', 'ointments']) {
      const slugs = (await pageSlugs(page, '[data-tablet]', 'tablet')).filter((s) => !slugArg.length || slugArg.includes(s));
      for (const slug of slugs) {
        await build('[data-tablet]', 'tablet', slug);
        if (!stillsOnly) await measure('[data-tablet]', 'tablet', slug, 'cartons', 8);
        if (!fitOnly) {
          const sizes = stillsOnly ? CARTON.slice(0, 1) : CARTON;
          const shot = await renderModel('[data-tablet]', 'tablet', slug, [0], sizes, false);
          for (const [suffix] of sizes) report(slug, suffix, shot[suffix], save(PRODUCTS, slug + suffix + '.webp', shot[suffix].url));
        }
        found++;
      }
    }
  }
  if (!found) throw new Error('No matching product: ' + slugArg.join(', '));
  for (const [kind, file] of [['jars', 'pastes-data.json'], ['cartons', 'tablets-data.json']]) {
    if (!Object.keys(fits[kind]).length) continue;
    const path = join(root, 'static', file), data = JSON.parse(readFileSync(path, 'utf8'));
    for (const item of data) if (fits[kind][item.slug]) item.fit = fits[kind][item.slug];
    writeFileSync(path, JSON.stringify(data, null, 2).replace(/\n/g, '\r\n') + '\r\n');
  }
  ws.close();
} finally { cleanup(); }
process.exit(0);
