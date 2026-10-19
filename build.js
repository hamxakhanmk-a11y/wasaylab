#!/usr/bin/env node
/**
 * Wasay Laboratories — static site build.
 *
 * Renders every templates/*.html against content/<name>.json (the page) plus
 * content/site.json (shared header and footer), and writes the
 * result along with everything in static/ to dist/.
 *
 * Deliberately dependency-free: `node build.js` is the whole build, so Vercel
 * needs no install step.
 *
 * Template syntax
 * ---------------
 *   {{ a.b }}                 HTML-escaped value
 *   {{& a.b }}                escaped, but newlines become <br />
 *   {{{ a.b }}}               raw (trusted HTML only)
 *   {{> name }}               include templates/partials/name.html
 *   {{#if a.b}}…{{else}}…{{/if}}
 *   {{#each a.list}}…{{/each}}
 *   {{#with a.obj}}…{{/with}}
 *
 * Inside #each / #with the item is the innermost scope, so its fields are
 * addressed directly ({{ label }}); anything not found there falls back
 * outward to the page and then the shared context. Also available in #each:
 *   {{ . }}        the item itself, for lists of plain strings
 *   {{ @index }}   0-based position
 *   {{ @n }}       1-based position (1, 2, 3, …)
 *   {{ @num }}     1-based, zero-padded ("01", "02", …)
 *
 * A value token that resolves to nothing is a build error rather than a silent
 * blank, so a typo fails the deploy instead of shipping an empty page. (#if is
 * exempt — it is a presence test.)
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, copyFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const CONTENT = join(root, 'content');
const TEMPLATES = join(root, 'templates');
const PARTIALS = join(TEMPLATES, 'partials');
const STATIC = join(root, 'static');
const DIST = join(root, 'dist');

/* ---------------- content ---------------- */

function readJson(path, shown) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    throw new Error(`${shown} is not valid JSON: ${err.message}`);
  }
}

function loadContent() {
  const content = {};
  for (const entry of readdirSync(CONTENT, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      // A folder of JSON files becomes a list: content/catalog/*.json is content.catalog (one file per product).
      content[entry.name] = readdirSync(join(CONTENT, entry.name)).filter((f) => extname(f) === '.json').sort()
        .map((f) => readJson(join(CONTENT, entry.name, f), `content/${entry.name}/${f}`));
      continue;
    }
    if (extname(entry.name) !== '.json') continue;
    content[basename(entry.name, '.json')] = readJson(join(CONTENT, entry.name), `content/${entry.name}`);
  }
  deriveCatalog(content);
  return content;
}

/* The product catalogue. Each product is its own file in content/catalog/ and says which tab it belongs to (tab), so moving a product
   between tabs is changing one field. content/home_products.json lists, in order, the products the home page ring shows. From these
   the build replaces content.catalog (the list of files) with:
     content.catalog.all       all products, sorted by order then name, each with a few computed fields (jar, large, ring_image, turn, photos_json)
     content.catalog.<tab>     the products of one tab (tablets, tonics, syrups, ointments, pastes), in order
     content.home_ring         the products chosen for the home page, in the chosen order */
const TABS = ['tablets', 'tonics', 'syrups', 'ointments', 'pastes'];
function deriveCatalog(content) {
  const products = (content.catalog || []).slice();
  const seen = new Set();
  for (const p of products) {
    const where = `content/catalog (${p.slug || p.name || 'unnamed'})`;
    if (!p.slug || !p.name) throw new Error(`${where}: every product needs a name and a slug`);
    if (seen.has(p.slug)) throw new Error(`${where}: two products share the slug "${p.slug}"`);
    seen.add(p.slug);
    if (!TABS.includes(p.tab)) throw new Error(`${where}: tab must be one of ${TABS.join(', ')}, not "${p.tab}"`);
    if (p.kind !== 'jar' && p.kind !== 'carton') throw new Error(`${where}: kind must be jar or carton`);
    p.jar = p.kind === 'jar';
    // pictures made by scripts/render-cutouts.mjs, and the data file that lists the product's photographs
    p.large = p.jar ? `/images/wasay/ring/${p.slug}-large.webp` : `/images/wasay/products/${p.slug}-large.webp`;
    p.ring_image = p.jar ? `/images/wasay/ring/${p.slug}.webp` : `/images/wasay/products/${p.slug}.webp`;
    p.turn = p.jar ? `/images/wasay/ring/${p.slug}-turn.webp` : '';
    p.photos_json = p.jar ? '/pastes-data.json' : '/tablets-data.json';
  }
  products.sort((a, b) => (Number(a.order) || 1e6) - (Number(b.order) || 1e6) || a.name.localeCompare(b.name));
  content.catalog = { all: products, ...Object.fromEntries(TABS.map((t) => [t, products.filter((p) => p.tab === t)])) };

  // What each product view shows besides its own text: its range name and a few more products from its tab.
  const kinds = Object.fromEntries(((content.site && content.site.product_view && content.site.product_view.kinds) || []).map((k) => [k.key, k]));
  for (const p of products) {
    p.range = (kinds[p.tab] && kinds[p.tab].range) || p.tab;
    p.range_href = `${p.tab}.html`;
    const mates = content.catalog[p.tab], at = mates.indexOf(p);
    p.related = mates.length > 1 ? Array.from({ length: Math.min(4, mates.length - 1) }, (_, i) => mates[(at + 1 + i) % mates.length]) : [];
  }
  // The home page "ranges" cards and figures, counted from the catalogue so they stay right when products move between tabs.
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  content.home_ranges = TABS.filter((t) => content.catalog[t].length).map((t) => {
    const list = content.catalog[t];
    const names = list.slice(0, 3).map((p) => p.name);
    return {
      key: t, label: (kinds[t] && kinds[t].range) || t, href: `${t}.html`, count: list.length, count_label: plural(list.length, 'product'),
      pics: list.slice(0, 3).map((p) => ({ image: p.ring_image, name: p.name, jar: p.jar })),
      names: list.length > 3 ? `${names.join(', ')} and ${list.length - 3} more` : names.join(', '),
      sizes: [...new Set(list.map((p) => p.detail))].slice(0, 4).join(' · '),
    };
  });
  content.range_info = Object.fromEntries(content.home_ranges.map((r) => [r.key, r]));
  content.stats = { products: products.length, ranges: content.home_ranges.length };
  const chosen = (content.home_products && content.home_products.products) || [];
  content.home_ring = chosen.map((slug) => {
    const p = products.find((x) => x.slug === slug);
    if (!p) throw new Error(`content/home_products.json: no product with the slug "${slug}"`);
    return p;
  });
  if (content.home_ring.length < 3) throw new Error('content/home_products.json: choose at least 3 products for the home page');
}

/* ---------------- parser ---------------- */

// {{{ raw }}} or {{ anything else }}
const TAG = /\{\{(\{)?\s*([^{}]*?)\s*(\})?\}\}/g;

/** Turn a template string into a tree of text / value / block nodes. */
function parse(tpl, where) {
  const rootNode = { type: 'root', body: [] };
  const stack = [rootNode];
  // A block that has seen {{else}} collects into `alt` instead of `body`.
  const push = (node) => {
    const open = stack[stack.length - 1];
    (open.inAlt ? open.alt : open.body).push(node);
  };
  let last = 0;
  let m;

  while ((m = TAG.exec(tpl)) !== null) {
    const [match, openBrace, inner, closeBrace] = m;
    if (m.index > last) push({ type: 'text', value: tpl.slice(last, m.index) });
    last = m.index + match.length;

    const raw = Boolean(openBrace && closeBrace);
    const block = inner.match(/^#(each|if|with)\s+(\S+)$/);

    if (block) {
      const node = { type: block[1], path: block[2], body: [], alt: null };
      push(node);
      stack.push(node);
    } else if (inner === 'else') {
      const open = stack[stack.length - 1];
      if (!open || !['if', 'each', 'with'].includes(open.type)) {
        throw new Error(`${where}: {{else}} outside of a block`);
      }
      open.alt = [];
      open.inAlt = true;
    } else if (/^\//.test(inner)) {
      const open = stack.pop();
      const name = inner.slice(1).trim();
      if (!open || open.type === 'root' || (name && name !== open.type)) {
        throw new Error(`${where}: unexpected {{${inner}}}`);
      }
    } else if (inner.startsWith('>')) {
      push({ type: 'partial', name: inner.slice(1).trim() });
    } else if (inner.startsWith('&')) {
      push({ type: 'value', path: inner.slice(1).trim(), mode: 'br' });
    } else {
      push({ type: 'value', path: inner, mode: raw ? 'raw' : 'escaped' });
    }
  }

  if (last < tpl.length) push({ type: 'text', value: tpl.slice(last) });
  if (stack.length !== 1) throw new Error(`${where}: unclosed {{#${stack[stack.length - 1].type}}} block`);
  return rootNode;
}

/* ---------------- rendering ---------------- */

const escapeHTML = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const NOT_FOUND = Symbol('not-found');

/** Walk a dotted path through the scope stack, innermost first. */
function resolve(path, scopes) {
  if (path === '.') return scopes[0].value;

  for (const scope of scopes) {
    if (scope.index !== undefined) {
      if (path === '@index') return scope.index;
      if (path === '@n') return scope.index + 1;
      if (path === '@num') return String(scope.index + 1).padStart(2, '0');
    }
    let cur = scope.value;
    let ok = true;
    for (const key of path.split('.')) {
      if (cur !== null && typeof cur === 'object' && key in cur) cur = cur[key];
      else { ok = false; break; }
    }
    if (ok) return cur;
  }
  return NOT_FOUND;
}

const truthy = (v) =>
  v !== NOT_FOUND && v !== undefined && v !== null && v !== false && v !== '' && v !== 0 &&
  !(Array.isArray(v) && v.length === 0);

function render(nodes, scopes, ctx) {
  let out = '';

  for (const node of nodes) {
    switch (node.type) {
      case 'text':
        out += node.value;
        break;

      case 'value': {
        const value = resolve(node.path, scopes);
        if (value === NOT_FOUND || value === undefined || value === null) {
          throw new Error(`${ctx.where}: {{ ${node.path} }} — no such value in content`);
        }
        if (node.mode === 'raw') out += String(value);
        else {
          const escaped = escapeHTML(value);
          out += node.mode === 'br' ? escaped.replace(/\r?\n/g, '<br />') : escaped;
        }
        break;
      }

      case 'partial': {
        const file = join(PARTIALS, `${node.name}.html`);
        if (!existsSync(file)) throw new Error(`${ctx.where}: no partial named "${node.name}"`);
        if (!ctx.partials.has(node.name)) {
          ctx.partials.set(node.name, parse(readFileSync(file, 'utf8'), `partials/${node.name}.html`));
        }
        out += render(ctx.partials.get(node.name).body, scopes, ctx);
        break;
      }

      case 'if': {
        const value = resolve(node.path, scopes);
        out += truthy(value)
          ? render(node.body, scopes, ctx)
          : node.alt ? render(node.alt, scopes, ctx) : '';
        break;
      }

      case 'with': {
        const value = resolve(node.path, scopes);
        out += truthy(value)
          ? render(node.body, [{ value }, ...scopes], ctx)
          : node.alt ? render(node.alt, scopes, ctx) : '';
        break;
      }

      case 'each': {
        const list = resolve(node.path, scopes);
        if (list === NOT_FOUND) throw new Error(`${ctx.where}: {{#each ${node.path}}} — no such list in content`);
        if (!Array.isArray(list)) throw new Error(`${ctx.where}: {{#each ${node.path}}} — not a list`);
        if (list.length === 0 && node.alt) { out += render(node.alt, scopes, ctx); break; }
        out += list
          .map((item, index) => render(node.body, [{ value: item, index }, ...scopes], ctx))
          .join('');
        break;
      }
    }
  }

  return out;
}

/* ---------------- static assets ---------------- */

function copyDir(from, to) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from)) {
    if (entry === '.DS_Store' || entry === '.gitkeep') continue;
    const src = join(from, entry);
    const dest = join(to, entry);
    if (statSync(src).isDirectory()) copyDir(src, dest);
    else copyFileSync(src, dest);
  }
}

/* ---------------- run ---------------- */

const content = loadContent();
const site = content.site;
if (!site) throw new Error('content/site.json is missing — it holds the shared header, footer and contact details.');

rmSync(DIST, { recursive: true, force: true });
copyDir(STATIC, DIST);

const pages = readdirSync(TEMPLATES).filter((f) => extname(f) === '.html');

for (const file of pages) {
  const slug = basename(file, '.html');
  const page = content[slug];
  if (!page) throw new Error(`templates/${file} has no matching content/${slug}.json`);

  // Mark the nav entry for the page being rendered, so the header partial can
  // highlight it without the template needing an equality test.
  const nav = site.nav.links.map((link) => ({ ...link, current: link.slug === slug }));

  const where = `templates/${file}`;
  const tree = parse(readFileSync(join(TEMPLATES, file), 'utf8'), where);
  const html = render(tree.body, [{ value: { site, page, nav, content, slug } }], { where, partials: new Map() });
  writeFileSync(join(DIST, file), html);
}

console.log(`Built ${pages.length} pages from ${Object.keys(content).length} content files → dist/`);
