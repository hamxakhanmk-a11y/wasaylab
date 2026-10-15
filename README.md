# Wasay Laboratories — Website

Static site for Wasay Laboratories (Pvt.) Ltd., built from the Supreme Art site
design and filled with the content of https://wasaylabs.com/. The online shop
(cart, checkout, accounts) stays on wasaylabs.com; this site links to it with
"Order online" buttons.

## Pages

| Page | Template | Content |
| --- | --- | --- |
| Home | `templates/index.html` | `content/index.json` |
| Products | `templates/products.html` | `content/products.json` |
| About us | `templates/about.html` | `content/about.json` |

`content/site.json` holds what appears on every page: company name, logo, menu,
"Order online" button and footer. The five best sellers are written once, in
`content/products.json`, and shown on both the Products page and the home page.

## Structure

```
content/            the words on the site, as JSON — what the CMS edits
templates/          page templates with {{ placeholders }}
  partials/           header, footer, banner, call to action
static/             files copied to the site as-is
  wasay.css           styles for the Wasay home hero, tiles and product cards
  styles.css          the shared design system (see DESIGN.md)
  admin/              the CMS (Sveltia) and its config
  images/wasay/       logo, product photos and category icons
api/                GitHub sign-in for the CMS (Vercel serverless functions)
build.js            merges content into the templates → dist/
dist/               build output; generated, not committed
```

`build.js` has no dependencies — the whole build is `node build.js`.

## Local development

```sh
npm run dev      # builds, then serves dist/ at http://localhost:3000
npm run build    # build only
```

Edit files in `content/` and `templates/`, then rebuild. **Don't edit anything in
`dist/`** — it is deleted and regenerated on every build.

A misspelled placeholder fails the build with a message naming the file and the
token, rather than quietly shipping a page with a blank section.

### Template syntax

| | |
| --- | --- |
| `{{ a.b }}` | insert a value (HTML-escaped) |
| `{{& a.b }}` | same, but line breaks become `<br />` |
| `{{{ a.b }}}` | insert raw HTML |
| `{{> name }}` | include `templates/partials/name.html` |
| `{{#if x}}…{{else}}…{{/if}}` | conditional |
| `{{#each list}}…{{/each}}` | repeat for each item |
| `{{#with obj}}…{{/with}}` | work inside an object |

Inside `#each`, `{{ . }}` is the item itself, `{{ @n }}` its 1-based position and
`{{ @num }}` the same zero-padded (`01`, `02`).

Each `templates/<name>.html` is rendered against `content/<name>.json` (available
as `page`) plus `content/site.json` (available as `site`).

## Adding a paste jar

Jars live in `static/pastes-data.json` (the jar and its measurements) and `content/pastes.json` (the name, detail line and fallback photo). `static/pastes.js` builds each jar in WebGL from photographs, so a new jar needs measuring once:

- `photos`: front, left and right photos of the jar, 1280 x 960.
- `bounds`: `[left, top, right, bottom, label top]` of the jar in the front photo, in photo pixels.
- `side`: the same five numbers for the left photo, then the right photo.
- `measured.label`: `[label top, label bottom, top curve, bottom curve]` in the front photo (the curves are how far the label edges rise at the sides).
- `measured.cap`: `[centre x, centre y, radius x, radius y, ribs top, ribs bottom]` of the cap in the front photo.
- `cam` (optional): `[left, right]`, how far the jar was turned (in radians) for the left and right photos. Typically about 1.0 (60 degrees). It decides where the front photo hands over to each side photo; without it the older default of 0.70 is used. It is best found by registering the side photos against the front one rather than by eye.
- `top` (optional): `{ "photo": ..., "ellipse": [centre x, centre y, radius x, radius y] }`, a photo from above for the lid.
- `animation` (optional): `"showcase"` for the wide, draggable motion with a highlight; leave it out for the gentle sway.

`side` and `measured` are required for every jar; there are no shared tables to fall back on.

### The home page ring

The ring under the home hero shows every jar in `content/pastes.json` as a transparent front-view image from `static/images/wasay/ring/<slug>.webp`, and the product view shows every product from a larger picture. These are rendered from the 3D models the product pages build, so after adding a product or changing its photos or measurements run:

```sh
node scripts/render-cutouts.mjs            # every jar and carton
node scripts/render-cutouts.mjs jars       # the paste jars only
node scripts/render-cutouts.mjs cartons    # the carton products only
node scripts/render-cutouts.mjs hasnat     # one product, by its slug
```

It builds the site, draws each product in a headless Chrome or Edge (set `CHROME` to a browser path if it is not found), and writes the images: for a jar a 640px picture for the ring (`ring/<slug>.webp`), a 1000px one for the product view (`ring/<slug>-large.webp`) and a strip of 21 turn frames (`ring/<slug>-turn.webp`) that the ring plays when the mouse moves over the jar; for a carton a 900px picture (`products/<slug>-large.webp`) for the product view. A jar without its pictures shows as a gap in the ring, and a product without its large picture opens an empty view. The arch colour is `--ring-arch` in `static/wasay-ring.css`.

Clicking any product, in the ring or on a tab, opens the product view. Its text, specification rows and per-range wording (range name, pack, photo caption, link back to the range) are in `content/site.json` under `product_view`; add a row such as composition there once the real wording is known. The tiles carry the product's details as `data-pv-*` attributes, so a new product on a tab only needs its item in that tab's content file and its pictures.

## Publishing and the editor

Not yet set up. When the site has an address:

1. Deploy to Vercel (it runs `node build.js` and serves `dist/`, see `vercel.json`).
2. In `static/admin/config.yml` replace both `REPLACE-WITH-SITE-DOMAIN` values with the deployed address.
3. Create a GitHub OAuth app (GitHub → Settings → Developer settings → OAuth Apps) with callback `https://<site address>/api/callback`.
4. Set these Vercel environment variables:

| Variable | Value |
| --- | --- |
| `GITHUB_CLIENT_ID` | From the GitHub OAuth app |
| `GITHUB_CLIENT_SECRET` | From the GitHub OAuth app |
| `ALLOWED_DOMAINS` | The site's hostname (comma-separated; controls which origins may receive a sign-in token) |

The editor is then at `https://<site address>/admin` and commits changes to `main`.

No analytics are installed. Add a tracking snippet to `templates/partials/head.html` when Wasay has an account.
