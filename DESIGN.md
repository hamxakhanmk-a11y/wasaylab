---
version: alpha
name: Wasay-Laboratories-design-system
description: A calm, paper-white editorial system for Wasay Laboratories, a Pakistani manufacturer of natural health products. The canvas is white and warm off-white paper; type is a geometric grotesk display over Inter body; the only strong colour is the logo's forest green, used sparingly as an accent, with the logo's lime as a second quiet note. The product photographs are the brand. They are always shown whole, never cropped or zoomed, and every effect on the site is a quiet "glass" treatment: frosted menu, glass buttons, a loupe over photos, ice-white glows.

colors:
  canvas: "#ffffff"
  surface: "#ffffff"
  surface-alt: "#f6f5f2"
  paper: "#faf8f4"
  paper-deep: "#f3efe7"
  kraft: "#f1e9dd"
  ink: "#1b1c1f"
  muted: "#616369"
  accent: "#01652f"
  accent-dark: "#014a22"
  accent-soft: "rgba(1, 101, 47, .12)"
  lime: "#a3cf3c"
  border: "#e7e5e0"
  line: "#e7e1d6"
  on-accent: "#ffffff"
  glow-ice: "rgba(242, 248, 255, .5)"
  shadow-warm: "rgba(60, 45, 30, .5)"
  glass-rim: "rgba(255, 255, 255, .75)"

typography:
  display-xl:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: clamp(2.6rem, 4.8vw, 4.4rem)
    fontWeight: 700
    lineHeight: 1
    letterSpacing: -0.01em
  display-md:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: clamp(1.9rem, 3.6vw, 2.8rem)
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: 0
  title-md:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: 1.35rem
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0
  title-sm:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: 1.15rem
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: 0
  lead:
    fontFamily: "Source Sans 3, sans-serif"
    fontSize: 1.12rem
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: 0
  body-md:
    fontFamily: "Source Sans 3, sans-serif"
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: 0
  body-sm:
    fontFamily: "Source Sans 3, sans-serif"
    fontSize: 0.93rem
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: 0
  eyebrow:
    fontFamily: "Source Sans 3, sans-serif"
    fontSize: 0.72rem
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0.22em
  button:
    fontFamily: "Source Sans 3, sans-serif"
    fontSize: 1rem
    fontWeight: 600
    lineHeight: 1
    letterSpacing: 0

rounded:
  sm: 10px
  lg: 16px
  pill: 999px
  full: 50%

spacing:
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  section: 96px

components:
  top-nav:
    backgroundColor: "rgba(255, 255, 255, .9)"
    textColor: "{colors.muted}"
    height: 68px
    blur: 10px
  button-accent:
    backgroundColor: "linear-gradient(115deg, rgba(2, 124, 58, .93), rgba(1, 82, 38, .88))"
    textColor: "{colors.on-accent}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: 12px 18px
    minHeight: 48px
    border: "1px solid {colors.glass-rim}"
  button-ghost:
    backgroundColor: "linear-gradient(115deg, #ffffff1f, #f2f8ff12)"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: 12px 18px
    minHeight: 48px
    border: "1px solid rgba(60, 45, 30, .28)"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.title-sm}"
    rounded: "{rounded.lg}"
    padding: 28px
    border: "1px solid {colors.border}"
  hero:
    backgroundColor: "linear-gradient(180deg, {colors.paper} 0%, {colors.paper-deep} 100%)"
    textColor: "{colors.ink}"
    typography: "{typography.display-xl}"
  cta-band:
    backgroundColor: "{colors.kraft}"
    textColor: "{colors.ink}"
    typography: "{typography.display-md}"
    border: "inset 0 2px 0 {colors.lime}"
  footer:
    backgroundColor: "{colors.surface-alt}"
    textColor: "{colors.muted}"
    typography: "{typography.body-sm}"
    padding: 56px 0 28px
    border: "1px solid {colors.border}"
---

## Overview

Wasay Laboratories makes natural health products in Pakistan. The site has to feel like what it sells: clean, honest and
natural. So the whole system is paper. White and warm off-white surfaces, dark ink, a hairline here and there, and one
strong colour, the forest green of the logo wordmark, used the way a printer uses a spot colour: rarely, and only where
it means something. The lime from the logo's leaf is an even quieter second note, and only ever a small rule or dash.

Three things carry the brand:

1. **The product photographs.** The carton and bottle of each syrup, and the lifestyle photograph. They are shown whole, at
   their natural proportions, never cropped to a shape and never zoomed as decoration. The layout fits itself to the photo.
2. **The green accent.** `{colors.accent}` (#01652f) on eyebrows, the nav pill, the primary button, a focus ring, a link.
   Never a background band. Never a tint over a photo.
3. **Glass.** Every interactive effect is a piece of clear glass: the frosted menu bar, the pill buttons that expand with a
   white rim and ice-white glow, the round loupe over a photo, the lift-and-glow of a card. Nothing bounces, nothing slides
   in one by one, nothing fades up on scroll.

The tone is calm and plain. Copy is short and factual. Headlines are a geometric grotesk set tight, body is Inter.

## Colors

| Token | Value | Use |
|---|---|---|
| `{colors.canvas}` | #ffffff | Page background, cards |
| `{colors.surface-alt}` | #f6f5f2 | Alternate section band, footer |
| `{colors.paper}` | #faf8f4 | Hero, "Who we are" window, closing statement, banners |
| `{colors.paper-deep}` | #f3efe7 | Bottom of the hero and banner gradient |
| `{colors.kraft}` | #f1e9dd | Call-to-action band, the one warmer surface |
| `{colors.ink}` | #1b1c1f | Headlines and body |
| `{colors.muted}` | #616369 | Card copy, captions, nav links at rest, footer |
| `{colors.accent}` | #01652f | Eyebrows, nav pill, accent button, focus rings, links |
| `{colors.accent-dark}` | #014a22 | Hover state of green fills |
| `{colors.lime}` | #a3cf3c | Decorative only: a 2px dash, an underline, the line above the CTA band. Never text. |

Sections alternate between white and one of the off-whites. There is no dark band, no grey band and no black section.
If a page needs contrast, it comes from a photo, not from a coloured surface. All drop shadows are warm brown, never
neutral grey or black; glows are ice white.

### Never

Blue is not in the palette: not as an accent, a link colour or a tint. Product packaging contains its own colours;
they are never reused in the interface.

## Typography

- **Display:** Newsreader, a warm editorial serif (400 to 700, variable with optical sizes). All h1, h2, h3 (weight 600 unless a component says otherwise). It replaced Space Grotesk, which read as generic "tech"; the serif suits a herbal medicine maker and keeps the pages calm.
- **Poster:** Barlow Condensed 700 in capitals, for the huge product name behind the product in the product view and for the lettering round the ring's arch. Sturdy and close in spirit to the WASAY logo lettering. Used nowhere else.
- **Body:** Source Sans 3 400 to 700, 17px base. Everything else.
- All three are self-hosted in `static/fonts` (SIL Open Font License, Latin subset) and declared in `static/wasay-fonts.css`; the head partial preloads the first two. Do not add a Google Fonts link. The variables are `--display`, `--poster` and `--font` in `styles.css`.
- Headlines are tight but not squeezed: serif tracking stays between -.015em and 0, line height at or under 1.1.
- Eyebrows are the one uppercase element.
- Body copy sits in a measure (46 to 62ch), never full width.
- Urdu text appears only inside photographs of the packaging. Keep it there; do not set Urdu in the UI without a proper Urdu face.

## Layout

`.container` is 1140px max with 24px gutters. Card grids are `auto-fit` with a 20px gap. `{spacing.section}` (96px)
separates ordinary sections.

**The quality window** (`.qc-window`): a full-height section clipped with `clip-path: inset(0)` holding a fixed photo, so
the photo appears to be seen through a window as the page scrolls past. Used for "Who we are". The photo inside is whole
and still.

**Product cards** (`.wz-products`): a six-column grid. The first three cards span two columns each; the rest span three
and set the photo beside the text. On phones they stack.

## Elevation & Depth

- Cards at rest: 1px `{colors.border}`, no shadow.
- Cards and tiles on hover: lift 6px, scale 1.04, border turns green at 35%, a 4px white ring, a 28px ice-white glow, and a
  warm brown shadow, eased with `cubic-bezier(.22, 1, .36, 1)` over 350ms.
- The menu bar: white at 90% with a 10px backdrop blur and a hairline below. Over an inner-page banner it becomes a frosted pill.

## Components

- **top-nav**: 68px sticky bar. Logo left, links in muted turning ink, a green pill marking the current page. The last
  item ("Order online") opens the shop on wasaylabs.com in a new tab.
- **Buttons**: every `.btn` is a glass pill, 48px tall. Accent is green glass with a white rim; ghost is clear glass with a
  warm-brown border. On hover or focus they expand their side padding. They never bounce and never darken to black.
- **hero** (`.wz-hero`): the live site's green banner photo, shown whole at its own proportions in a 10px frame on a paper
  gradient, with a square version swapped in on phones. The headline, one line and two buttons are real text laid over the
  photo's empty green side. This is the one place text sits on a photo, and no overlay is added. On the banner the primary
  button turns white and the ghost button turns white-on-glass, because green on green would not read.
- **card**: white, 1px border, 16px corners. Present on load; never staggered in.
- **featured card** (`.wz-featured__card`): a card with the category photo shown whole above its name and a green "Shop now" link. A category without a photo shows only the name and link.
- **product ring** (`.wz-ring`, home page, under the hero): a row of paste jars drifts past in front of a big green arch with the words "Power of Natural Healing" curved along it in lime. The arch is the one saturated surface on the site, and it is a shape on a white page, not a band; its colour is the `--ring-arch` variable (with `--ring-text`) at the top of `static/wasay-ring.css`. The jars are transparent front-view cutouts rendered ahead of time by `scripts/render-cutouts.mjs`, so nothing is built in the browser. Jars sit in a line and leave through the screen edges; the jar in the middle pops up large (the one at its side is about three quarters of its size, the next about half), and the further out, the higher they sit. They lean the way they are being carried, up to about 26 degrees. The ring drifts on its own (one jar in five seconds), follows a drag with a glide after a flick, a horizontal wheel, the page scroll while it is on screen, and the arrow keys. Moving the mouse over a jar turns it as it does on the Pastes tab (the front jar also sways a little once it has been touched): the jar is swapped for a strip of 21 pre-rendered turn frames, `<slug>-turn.webp`, fetched the first time the mouse reaches that jar, and the frame follows the pointer across it. A click on any jar opens its product view (below); a drag never does. Under reduced motion it stays still, a hovered jar turns without easing and the keys step the ring at once.
- **product view** (`.wz-detail`, one partial `templates/partials/product-view.html`, opens from the home ring and from every tile on the Tablets, Multi Tonics, Syrups, Ointments, Pastes and Products pages): a full-screen paper page in a native dialog. The product flies from its tile to low in the middle with only its top showing, a huge name in Wasay green rises from behind it (two lines, one word each), and small captions (the range at the left, the details at the right) fade in beside it. Scrolling pins this opening page while the product rises through the name and tilts up to 22 degrees; then a white sheet slides over with About the product, Uses and Composition, followed by previous / next within the page. Back, Escape and the browser's back button close it, and each product has its own address (`#product-hasnat`). A product is any element with `data-pv-item` plus `data-slug`, `data-name`, `data-detail`, `data-kind`, `data-img` (its large cutout) and `data-photos` (the data file that lists its photographs); `data-kind` picks the range, pack and wording from `product_view.kinds` in `content/site.json`. Wide cartons are sized by their shape (`--pv-ar`) so they never cover the whole name. Specifications hold only what is certain (name, range, details, pack, maker); real descriptions and composition are added as rows in the content once Wasay supplies them. Under reduced motion nothing animates and the product stays put. While it is open the 3D tiles and the ring stop drawing.
- **category tile** (`.wz-tile`): a card holding one Wasay icon and a name.
- **chip** (`.wz-chip`): a clear glass pill for shop-by-category links.
- **cta-band**: kraft paper with a 2px lime line along the top.
- **photo loupe** (`.glass-photo`): a round 170px lens follows the cursor over a photo at 2.2x. Off on touch and reduced motion.
- **paste jar** (`.paste-view`): a real WebGL jar built from three photos of the pack (front, left, right), with the label wrapped round a cylinder. A jar marked `"animation": "showcase"` also takes a top-down photo for the lid, a soft specular highlight, and the showcase motion: an eased sweep of about 47 degrees each way that gives way to hover, mouse or finger drag (with inertia) and the arrow keys, then resumes from where the jar was left. A little roll and sideways drift sell the turn, and the ground shadow follows. Reduced motion holds the jar still until it is turned by hand. Each jar starts at its own point in the sweep, so a row of jars never moves in step, and after being handled a jar picks the sweep up from where it was left, from either side. The jar turns at a limited speed, so moving the cursor onto it never whips it round. While a jar is still being built its tile shows "Preparing jar…" and a soft shadow, never the raw photograph (which has the office behind it); the photograph returns only if the jar cannot be built. Jars are built one at a time, the one nearest the middle of the screen first, starting about 700px before they scroll into view.
- **product tabs** (Tablets, Multi Tonics, Syrups, Ointments, Pastes): the photograph of a product is never shown while its 3D model is being built, because it has the office behind it and the swap to the clean model is jarring. The tile shows "Preparing carton…" (or "Preparing jar…") and a soft shadow instead. The photograph comes back only if the model cannot be built. Models are built one at a time, nearest the middle of the screen first, starting about 700px before they scroll into view.
- **footer**: off-white, hairline top, three columns, never dark.

## Do's and Don'ts

### Do
- Keep every surface white or warm off-white.
- Show product photos whole.
- Use green for one or two small things per view.
- Keep every effect "glass": frosted, rimmed, glowing ice-white, warm-shadowed.
- Write short, factual copy that the live site (wasaylabs.com) actually supports.

### Don't
- Don't add a black, grey or dark band, a dark footer or a dark overlay on a photo.
- Don't use blue anywhere.
- Don't crop, zoom, tilt or "cover" a product photo.
- Don't animate cards in one by one, fade sections up on scroll, or add parallax.
- Don't set body text in Space Grotesk, or add a second display face.
- Don't use neutral grey shadows.
- Don't state health claims, prices or certifications that are not on the live site.

## Responsive Behavior

| Name | Width | Key Changes |
|---|---|---|
| Phone | < 600px | Hamburger nav; product cards and category tiles go to one or two columns |
| Tablet | 600 to 1024px | Hero stacks above the products; product cards two across |
| Desktop | > 1024px | Full nav, two-column hero, six-column product grid |

Buttons are 48px tall minimum. The loupe, hover lift and button expansion are off on `hover: none` and
`prefers-reduced-motion`.

## Iteration Guide

When adding a page or section:

1. Start on `{colors.paper}` or white. Put the photo in whole.
2. Eyebrow in green, headline in Space Grotesk, copy in Inter at 46 to 62ch.
3. Reuse `.btn.btn--accent` or `.btn.btn--ghost`, and `.card` for anything tile-shaped.
4. Check that nothing new is blue, black, grey, cropped or staggered.

## Known Gaps

- `static/styles.css` still carries rules from the earlier site (hero stepper, process chapters, carton scenes,
  clients wall) that no Wasay page uses. They are inert and can be deleted in a cleanup pass.
- The product photos are 2560px square WebP (about 250 KB each); resize to about 1000px before launch.
- "Digestive Care" reuses the Consumer Products icon, as the live site does.

## Interactive tablet cartons
User-requested exception: photographed front, sides and top form floating 3D cartons. Turn range is limited to photographed faces. Native touch browsing, buttons and keyboard turning; reduced motion disables float and automatic turning.

Products now use vertical grids: three columns on desktop, two on tablets, one on phones. Tablet and Multi Tonic categories share measured carton dimensions, native-resolution face sampling and eased manual/automatic turning. Source photographs remain unmodified.

The Products page has three peer category tabs: Tablets, Multi Tonics, Syrups. Each owns a vertical grid. Tab buttons support keyboard arrows, Home/End, and category URL hashes. Source photos remain unchanged; drops and suspensions retain their packaging labels within the requested Syrups category.

Paste jars use cylindrical canvas projection with photographed lids and label sectors. The main navigation exposes Tablets, Multi Tonics, Syrups, Ointments and Pastes as dedicated pages after Home. Source photographs are preserved unchanged.

Cartons now use one depth-buffered WebGL canvas per product, replacing separately composited CSS faces. Paste jars use a closed lathed body with a rounded heel, continuous shoulder and screw cap, and photographed label and cap textures.


## Video-based product view

Mother Tonic uses 73 transparent WebP frames extracted from the supplied handheld video (6–12 seconds), with its real packaging retained. This user-requested animation uses gentle floating and a small lean. The home page features it; Pastes and Products replace only this jar’s synthetic rendering. Pointer movement, touch drag and a keyboard-accessible range control explore the filmed partial turn. Pause and Front controls are always available once loaded. Reduced motion starts with a still image; offscreen and background views stop animating. The complete sequence loads only when the view enters the viewport. Other products keep their existing renderers.

## Landscape homepage banner

The requested Zenith-style hero uses actual locally hosted H.264 footage of a person hiking across a grassy hillside. The clip is slowed down and its final second crossfades toward the opening for a softer loop. There is no CSS zoom standing in for walking. White text over the natural sky and a green Order online button follow the reference; the text sits left of the walker so her movement stays visible throughout the clip. A paper panel below links to the five ranges. The sky is a user-requested exception to the no-blue imagery rule; interface accents remain Wasay green. A poster from the actual footage is shown while loading, if playback is unavailable, and under reduced motion. Pause/play works on desktop and phones; offscreen and background-tab playback pauses. Explicitly pressing Play can start it under reduced motion. The product ring and detail views follow unchanged. Source and license are recorded in BANNER-ASSET.md.

## Product motion refinement

The home jars follow a continuous shallow arc, with gradual size changes and a stronger side lean like the supplied product reference. Dragging retains its original pointer anchor; releases use recent velocity only. Scroll input eases into the ring and product view, and keyboard targets keep a continuous index through the loop. The opening flight captures the visible jar before loading or locking page scroll, and old title/pack animations are cancelled when switching products. Existing reduced-motion behavior remains.

## Product information

The shared product view now replaces the generic specifications and pack-photo gallery with About the product, Uses and Composition. All 55 products share the slug-based records in content/product_details.json, so Home and category views use identical copy. The animated opening is retained. Paper-white editorial rows pair headings with readable text; phones stack the columns. Only readable Wasay label wording is transcribed or conservatively paraphrased. Missing and partial ingredient lists remain explicit; no other manufacturer’s traditional formula, dosage or efficacy guarantee is inferred. See PRODUCT-CONTENT-AUDIT.md for source checks and outstanding labels.

Customer-facing product descriptions use direct product language. Photo angles, label languages, transcription notes and missing-data explanations belong only in the editorial audit and content metadata. Unverified Uses or Composition sections are omitted. Verified partial ingredient lists use the heading Key ingredients, so they do not imply a complete formula.

## Page turn

Every page scrolls as a stack of pages (`static/wasay-stack.css` and `.js`, loaded by the head partial). Each direct child of `<main>` (banner, ring, content sections, closing band) is a page: once it has been read it pins, and the next one slides up over it, with a soft shadow along the sliding edge and the covered page dimming a little as it goes (`--cover`, up to about one fifth darker). A page taller than the screen is read to its end before it pins, so nothing is hidden before it has been seen. The footer is outside `<main>` and scrolls normally after the last page. Nothing fades or slides in by itself: the only motion is a page being covered, which is the scroll doing it. Under reduced motion nothing pins and the sections scroll normally. A section opts out with `data-stack-skip`. Pages need an opaque background (they default to paper; any section background set by class wins). Chapters pin at the top of the screen under the header, so give each one enough top padding to clear it.

## Botanical company introduction

Who we are is one scene that holds its place while the page scrolls past it (`.botanical-story`, 100svh plus a 260svh hold, a section of the page turn). It is deliberately not a set of sliding pages. Scrolling forms a droplet on the leaf, lets it fall into the bottle and lands it with a ripple; scrolling up reverses it. The three texts rise in from the bottom one after another as the droplet does (the first until the droplet is full, the second while it falls, the third once it has landed): the text on show leaves upward while the next comes up from below, so it reads as turning through pages while the scene keeps moving. The droplet is amber like the liquid in the bottle, so it reads as medicine, not water; only the dew beads on the leaf are clear. The bottle carries a cream paper label with the real Wasay Laboratories logo (`/logo.png`, which already includes the name); nothing else is printed on it. The numbered buttons jump to each text; Scroll to explore is the hint. The scene is a locally bundled Three.js renderer drawn on an off-screen canvas and copied into the section's canvas: curved, textured leaf geometry, double-wall transmissive amber glass, reflections and ripples. Mouse movement adds a small camera parallax. Rendering is demand-driven and stops offscreen or in a background tab. WebGL failure keeps the drawn SVG scene (same label and amber droplet), animated by the same progress. Reduced motion removes the hold, shows the three texts in normal flow and holds the scene still. Phones use the same layout with the copy above the scene. The previous tea photograph remains whole in Why customers love Wasay. No new product claims or stock footage are introduced.

## Product tiles on the tabs

A product stands near the bottom of its tile and its name sits right under it (about 10px of gap, no more). The 3D canvas has empty space round the model, so each tile is trimmed to the product: `--trim` shortens the tile and `--drop` moves the canvas, and rows are bottom-aligned so the names stay on one line. The two numbers are measured ahead of time for every product by `node scripts/render-cutouts.mjs fit` and stored as `fit` in `static/tablets-data.json` and `static/pastes-data.json`, so a tile has its final height before its 3D model is built and nothing jumps when models finish. Run it again after adding a product or changing its model (a normal run of the script does it too). A product without a stored fit is measured live as a fallback.
