/**
 * Renders every paste jar to a transparent front-view image for the home-page ring.
 *
 *   node scripts/render-jar-cutouts.mjs          (all jars)
 *   node scripts/render-jar-cutouts.mjs hasnat   (one jar)
 *
 * It builds the site, serves dist/, opens pastes.html in a headless Chrome or Edge (software WebGL), waits for each 3D
 * jar to be built by static/pastes.js, draws it once more at high resolution from the front, crops it to its outline and
 * writes static/images/wasay/ring/<slug>.webp (for the ring) and <slug>-large.webp (for the product view). Run it again whenever a jar is added or its photos or measurements change.
 * Needs Node 22+ and Chrome or Edge (set CHROME to a browser path if it is not found).
 */
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'static', 'images', 'wasay', 'ring');
const PORT = 4619, DEBUG = 9339;
const SIZES = [['', 640, 0.92], ['-large', 1000, 0.9]];   // file suffix, height in px, WebP quality
const only = process.argv.slice(2);

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
  await send('Page.navigate', { url: `http://localhost:${PORT}/pastes.html` });
  for (let i = 0; i < 80; i++) { if (await run(`document.querySelectorAll('[data-paste]').length`).catch(() => 0)) break; await sleep(250); }

  const slugs = await run(`[...document.querySelectorAll('[data-paste]')].map((v) => v.dataset.paste)`);
  const wanted = slugs.filter((s) => !only.length || only.includes(s));
  if (!wanted.length) throw new Error('No matching jar: ' + only.join(', '));
  mkdirSync(OUT, { recursive: true });
  for (const slug of wanted) {
    await run(`document.querySelector('[data-paste="${slug}"]').scrollIntoView({ block: 'center', behavior: 'instant' })`);
    let ok = false;
    for (let i = 0; i < 180 && !ok; i++) { ok = await run(`(() => { const j = window.__jars.find((e) => e.canvas.closest('[data-paste]').dataset.paste === '${slug}'); return !!(j && j.last && j.canvas.closest('[data-paste]').classList.contains('ready')); })()`); if (!ok) await sleep(500); }
    if (!ok) throw new Error('Jar did not build: ' + slug);
    const shot = await run(`(() => { const j = window.__jars.find((e) => e.canvas.closest('[data-paste]').dataset.paste === '${slug}');
      const c = j.canvas, W = 1500, H = Math.round(1000 * c.height / c.width), keep = [c.width, c.height];
      c.width = W; c.height = H; j.renderer.draw(0, j.last[1], j.last[2]);
      const t = document.createElement('canvas'); t.width = W; t.height = H; const x = t.getContext('2d', { willReadFrequently: true }); x.drawImage(c, 0, 0);
      const d = x.getImageData(0, 0, W, H).data; let x0 = W, y0 = H, x1 = -1, y1 = -1;
      for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) if (d[(y * W + xx) * 4 + 3] > 8) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      const pad = 8; x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(W - 1, x1 + pad); y1 = Math.min(H - 1, y1 + pad);
      const w = x1 - x0 + 1, h = y1 - y0 + 1, out = {};
      for (const [suffix, height, quality] of ${JSON.stringify(SIZES)}) {
        const k = height / h, o = document.createElement('canvas'); o.width = Math.round(w * k); o.height = height;
        const ctx = o.getContext('2d'); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(t, x0, y0, w, h, 0, 0, o.width, o.height);
        out[suffix] = { url: o.toDataURL('image/webp', quality), w: o.width, h: o.height };
      }
      c.width = keep[0]; c.height = keep[1];
      return out; })()`);
    for (const [suffix, , ] of SIZES) {
      const one = shot[suffix], bytes = Buffer.from(one.url.split(',')[1], 'base64');
      writeFileSync(join(OUT, slug + suffix + '.webp'), bytes);
      console.log(`${(slug + suffix).padEnd(26)} ${one.w} x ${one.h}  ${(bytes.length / 1024).toFixed(0)} KB`);
    }
  }
  ws.close();
} finally { cleanup(); }
process.exit(0);
