import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');
const data = JSON.parse(read('content/product_details.json'));
const records = new Map();
for (const p of data.products) {
  assert(!records.has(p.slug), `Duplicate product copy: ${p.slug}`);
  records.set(p.slug, p);
  for (const key of ['about', 'composition_note', 'evidence']) assert(p[key]?.trim(), `${p.slug}: empty ${key}`);
  assert(Array.isArray(p.uses) && Array.isArray(p.ingredients), `${p.slug}: lists required`);
  assert(p.uses.length || p.uses_note?.trim(), `${p.slug}: unconfirmed uses must be explained`);
  assert(['listed', 'partial', 'unreadable', 'not-visible'].includes(p.composition_status), `${p.slug}: invalid composition status`);
  assert.equal(Boolean(p.ingredients.length), ['listed', 'partial'].includes(p.composition_status), `${p.slug}: composition status conflicts with ingredient list`);
  assert.equal(p.sources.length, 3, `${p.slug}: front/left/right evidence required`);
  for (const source of p.sources) assert(existsSync(resolve(root, 'static' + source.path)), `${p.slug}: missing evidence photo`);
}
const actual = new Set();
for (const category of ['tablets', 'tonics', 'syrups', 'ointments', 'pastes']) {
  for (const product of JSON.parse(read(`content/${category}.json`))[category]) {
    actual.add(product.slug);
    assert(records.has(product.slug), `Missing copy: ${category}/${product.slug}`);
    assert.equal(records.get(product.slug).category, category);
  }
}
assert.equal(actual.size, records.size, 'Orphan or missing records');
for (const page of ['index', 'products', 'tablets', 'tonics', 'syrups', 'ointments', 'pastes']) {
  const html = read(`dist/${page}.html`);
  assert(!html.includes('data-detail-photos'), `${page}: old gallery remains`);
  assert(!html.includes('wz-detail__specs'), `${page}: old specifications remain`);
  const copies = [...html.matchAll(/data-pv-copy="([^"]+)"/g)].map((m) => m[1]);
  const items = [...html.matchAll(/data-pv-item[^>]+data-slug="([^"]+)"/g)].map((m) => m[1]);
  for (const slug of items) assert(copies.includes(slug), `${page}: no rendered copy for ${slug}`);
  assert(html.includes('data-detail-copy'), `${page}: no shared description container`);
}
console.log(`PASS: ${records.size} sourced records; every product mapped across seven pages; old specifications and galleries removed.`);
console.log(`${data.products.filter((p) => p.ingredients.length).length} records include readable ingredients; ${data.products.filter((p) => !p.uses.length).length} use statements still need confirmation.`);
