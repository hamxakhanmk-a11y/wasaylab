import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');
// Every product is its own file in content/catalog/ (see README, "The product catalogue"). Run after `node build.js`.
const TABS = ['tablets', 'tonics', 'syrups', 'ointments', 'pastes'];
const list = readdirSync(resolve(root, 'content/catalog')).filter((n) => n.endsWith('.json')).map((n) => JSON.parse(read('content/catalog/' + n)));
const data = { products: list };
const cartonData = new Set(JSON.parse(read('static/tablets-data.json')).map((p) => p.slug));
const jarData = new Set(JSON.parse(read('static/pastes-data.json')).map((p) => p.slug));
const records = new Map();
for (const p of data.products) {
  assert(!records.has(p.slug), `Duplicate product: ${p.slug}`);
  records.set(p.slug, p);
  assert(TABS.includes(p.tab), `${p.slug}: tab must be one of ${TABS.join(', ')}`);
  assert(['jar', 'carton'].includes(p.kind), `${p.slug}: kind must be jar or carton`);
  assert((p.kind === 'jar' ? jarData : cartonData).has(p.slug), `${p.slug}: no 3D model data for a ${p.kind}`);
  assert(p.name?.trim() && p.detail?.trim(), `${p.slug}: name and detail are required`);
  assert(existsSync(resolve(root, 'static' + p.image)), `${p.slug}: missing tile photo`);
  const dir = p.kind === 'jar' ? 'ring' : 'products';
  for (const suffix of ['', '-large']) assert(existsSync(resolve(root, `static/images/wasay/${dir}/${p.slug}${suffix}.webp`)), `${p.slug}: missing picture ${dir}/${p.slug}${suffix}.webp (run node scripts/render-cutouts.mjs)`);
  for (const key of ['about', 'composition_note', 'evidence']) assert(p[key]?.trim(), `${p.slug}: empty ${key}`);
  assert(Array.isArray(p.uses) && Array.isArray(p.ingredients), `${p.slug}: lists required`);
  assert(p.uses.length || p.uses_note?.trim(), `${p.slug}: unconfirmed uses must be explained`);
  assert(['listed', 'partial', 'unreadable', 'not-visible'].includes(p.composition_status), `${p.slug}: invalid composition status`);
  assert.equal(Boolean(p.ingredients.length), ['listed', 'partial'].includes(p.composition_status), `${p.slug}: composition status conflicts with ingredient list`);
  assert.equal(p.sources.length, 3, `${p.slug}: front/left/right evidence required`);
  for (const source of p.sources) assert(existsSync(resolve(root, 'static' + source.path)), `${p.slug}: missing evidence photo`);
}
for (const slug of new Set([...cartonData, ...jarData])) assert(records.has(slug), `${slug} has 3D data but no product file in content/catalog`);
const home = JSON.parse(read('content/home_products.json')).products;
assert(home.length >= 3, 'Choose at least 3 products for the home page');
for (const slug of home) assert(records.has(slug), `Home page product "${slug}" does not exist`);
assert.equal(new Set(home).size, home.length, 'A product is chosen twice for the home page');
for (const page of ['index', 'products', 'tablets', 'tonics', 'syrups', 'ointments', 'pastes']) {
  const html = read(`dist/${page}.html`);
  const productCopy = [...html.matchAll(/<template data-pv-copy="[^"]+">([\s\S]*?)<\/template>/g)].map((m) => m[1]).join('');
  assert(!/Urdu|photographs|transcrib|as printed|wraps out of view|not visible|not clear enough/.test(productCopy), `${page}: research commentary leaked into customer-facing copy`);
  assert(!html.includes('data-detail-photos'), `${page}: old gallery remains`);
  assert(!html.includes('wz-detail__specs'), `${page}: old specifications remain`);
  const copies = [...html.matchAll(/data-pv-copy="([^"]+)"/g)].map((m) => m[1]);
  const items = [...html.matchAll(/data-pv-item[^>]+data-slug="([^"]+)"/g)].map((m) => m[1]);
  for (const slug of items) assert(copies.includes(slug), `${page}: no rendered copy for ${slug}`);
  assert(html.includes('data-detail-copy'), `${page}: no shared description container`);
}
console.log(`PASS: ${records.size} sourced records; every product mapped across seven pages; old specifications and galleries removed.`);
console.log(`${data.products.filter((p) => p.ingredients.length).length} records include readable ingredients; ${data.products.filter((p) => !p.uses.length).length} use statements still need confirmation.`);
