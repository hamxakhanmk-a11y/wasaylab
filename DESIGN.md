---
version: alpha
name: Wasay-Laboratories-design-system
description: A calm, paper-white editorial system for Wasay Laboratories, a Pakistani manufacturer of natural health products. The canvas is Tender Pastel paper with green-black type; Wasay green from the logo is the brand colour, with Pink Love, Beautiful Orange and Twilight Sparkle as soft notes (the owner's palette). The product photographs are the brand. They are always shown whole, never cropped or zoomed, and every effect on the site is a quiet "glass" treatment: frosted menu, glass buttons, a loupe over photos, ice-white glows.

colors:
  canvas: "#f2e8db"
  surface: "#fbf7f1"
  surface-alt: "#eaddcb"
  paper: "#f6efe5"
  paper-deep: "#eadfcf"
  kraft: "#efe3d2"
  ink: "#1e2b22"
  muted: "#5a5f57"
  accent: "#1f6b3a"
  accent-dark: "#17552d"
  accent-soft: "rgba(31, 107, 58, .12)"
  lime: "#8fb87a"
  forest: "#173f27"
  pink: "#ffb4ce"
  orange: "#f4a846"
  violet: "#c68fd4"
  border: "#e0d3c1"
  line: "#e0d3c1"
  on-accent: "#fbf7f1"
  glow-ice: "rgba(242, 248, 255, .5)"
  shadow-warm: "rgba(23, 63, 39, .5)"
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
    backgroundColor: "linear-gradient(115deg, rgba(36, 122, 67, .96), rgba(27, 95, 52, .93))"
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
natural. So the whole system is paper: Tender Pastel surfaces, green-black ink, a hairline here and there, Wasay green from the
logo as the brand colour, and pink, orange and violet as soft notes (see Colors).

Three things carry the brand:

1. **The product photographs.** The carton and bottle of each syrup, and the lifestyle photograph. They are shown whole, at
   their natural proportions, never cropped to a shape and never zoomed as decoration. The layout fits itself to the photo.
2. **Wasay green.** `{colors.accent}` sets the big titles, eyebrows, links and focus rings and fills the primary button and
   the closing band; `{colors.forest}` is its deep shade for the strong bands. Never a tint over a photo.
3. **Glass.** Every interactive effect is a piece of clear glass: the frosted menu bar, the pill buttons that expand with a
   white rim and ice-white glow, the round loupe over a photo, the lift-and-glow of a card. Nothing bounces, nothing slides
   in one by one, nothing fades up on scroll.

The tone is calm and plain. Copy is short and factual. Headlines are a geometric grotesk set tight, body is Inter.

## Colors

The owner's palette (October 2026), from a palette card the owner sent, with two changes the owner asked for: no Pastel Black and no Wild Lime, but a green that matches the logo instead. So: Tender Pastel #F2E8DB, Wasay green, Pink Love #FFB4CE, Beautiful Orange #F4A846 and Twilight Sparkle #C68FD4. The values live in `static/wasay-theme.css`, loaded after the other stylesheets.

| Token | Value | Use |
|---|---|---|
| `--bg` | #f2e8db | Page background: Tender Pastel. It also matches the wall in the hands photo |
| `--surface` | #fbf7f1 | Cards |
| `--surface-alt` | #eaddcb | Alternate section band (a deeper pastel) |
| `--paper` / `--paper-deep` | #f6efe5 / #eadfcf | Story panels, product view, gradients |
| `--sage` / `--mint` | #e4ebd8 / #d6e8cc | Tinted chips and facts, the Tablets range card: a breath of green on the pastel |
| `--text` / `--ink` | #1e2b22 | A green-black for headlines and body (never a neutral black) |
| `--muted` | #5a5f57 | Card copy, captions |
| `--accent` / `--accent-dark` | #1f6b3a / #17552d | Wasay green, the logo wordmark's green a touch softer for the pastel: the big titles, eyebrows, links, focus rings, the accent buttons (pastel type) and the closing band |
| `--forest` / `--forest-2` | #173f27 / #1f5233 | Deep forest of the same green: each inner page's banner and the footer, with pastel type |
| `--lime` | #8fb87a | Leaf green, after the logo's leaf: small accents only (the line along a banner's or the closing band's edge, the first numbered circle, text selection) |
| `--pink` / `--orange` / `--violet` | #ffb4ce / #f4a846 / #c68fd4 | Soft accents only: the tints at the top of the range cards (Tablets green, Multi Tonics orange, Syrups pink, Ointments violet, Pastes peach) and the numbered circles, in turn |

Pages are Tender Pastel with green-black type and Wasay green titles. Each inner page opens on a deep forest banner with pastel type and a leaf-green edge, where the logo sits on a small pastel pill so it keeps its colours; the footer is deep forest too. The closing band is Wasay green with pastel type, a pastel button and a ghost button. Drop shadows are green-tinted (rgba 23, 63, 39). Photographs and the 3D scenes keep their own natural colours (the grass, the flowers, the hands photo).

### Never

No black and no Wild Lime (the owner turned both down). Blue is not in the palette: not as an accent, a link colour or a tint (the hollow under the pointer on the grass trunk and the shirt cuff in the hands photo are the owner's own requests; the product packs are photographs). No colours outside the ones above and their tints.

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
  item ("Contact") is an ordinary tab like the others. The site has no online ordering; every call to action leads to the Contact page.
- **Buttons**: every `.btn` is a glass pill, 48px tall. Accent is green glass with a white rim; ghost is clear glass with a
  warm-brown border. On hover or focus they expand their side padding. They never bounce and never darken to black.
- **hero** (`.wz-hero`): the live site's green banner photo, shown whole at its own proportions in a 10px frame on a paper
  gradient, with a square version swapped in on phones. The headline, one line and two buttons are real text laid over the
  photo's empty green side. This is the one place text sits on a photo, and no overlay is added. On the banner the primary
  button turns white and the ghost button turns white-on-glass, because green on green would not read.
- **card**: white, 1px border, 16px corners. Present on load; never staggered in.
- **featured card** (`.wz-featured__card`): a card with the category photo shown whole above its name and a green "Shop now" link. A category without a photo shows only the name and link.
- **products** (`.wz-ring`, home page, the page after Wasay at a glance): a page of its own on pale sage that slides up like the others. As it arrives the home products sweep in from beyond the right edge, the leftmost first, each fading in and leaning as it comes, with the heading (Our products) and a pale pill with the product in the middle and the See all products button. Then they drift past slowly on their own (about one product in five seconds). The product in the middle is large (the one at its side about three quarters of its size, the next about half), and the further out, the higher they sit, so they read as a ring seen from the front. They follow a drag or swipe with the hand (through a very quick spring, so a touchpad or touch screen that sends fewer events than frames still glides evenly); letting go carries them on by the speed of the hand and settles one in the middle in one continuous spring (a slow drag settles back on the nearest product without running on first). They also follow a sideways wheel, the page scroll while they are on screen and the arrow keys; a hover, touch, key or wheel stops the drift for a while. Everything moves on a critically damped spring (quick to follow, no overshoot); the products lean the way they travel (up to about 14 degrees), bob gently, and whenever they come to rest the nearest one settles into the middle. Each carries a soft shadow (a drawn ellipse, not a filter, so moving them stays cheap). The products are transparent front-view cutouts rendered ahead of time by `scripts/render-cutouts.mjs`. Moving the mouse over a product turns it as it does on the product tabs (the middle one also sways a little once it has been touched): it is swapped for a strip of 21 pre-rendered turn frames, `<slug>-turn.webp`, fetched the first time the mouse reaches it, and the frame follows the pointer across it. A click opens its product view (below); a drag never does. Under reduced motion they arrive in one step, nothing drifts, bobs or eases, and the keys step at once. The earlier green arch behind the products was removed.
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
- Don't set body text in the serif, or add a fourth typeface.
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
2. Eyebrow in green, headline in Newsreader, copy in Source Sans 3 at 46 to 62ch.
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

Mother Tonic uses 73 transparent WebP frames extracted from the supplied handheld video (6–12 seconds), with its real packaging retained. This user-requested animation uses gentle floating and a small lean. The home page features it; Pastes and Products replace only this jar’s synthetic rendering. Pointer movement, touch drag and a keyboard-accessible range control explore the filmed partial turn. On the product tabs every jar and carton can be turned with the mouse (by where it is over it), by dragging or with a finger (a press becomes a drag only once it moves, so a click still opens the product; a flick keeps it turning and slowing, but a pause or a scroll does not), and with the arrow keys; left alone each one sways on its own timing. Motion is measured in time, not frames, and nothing is drawn while no tile is on screen. Pause and Front controls are always available once loaded. Reduced motion starts with a still image; offscreen and background views stop animating. The complete sequence loads only when the view enters the viewport. Other products keep their existing renderers.

## Opening banner: the growing hill

The home banner is a living hill drawn by the site itself in 3D (`static/hero-grow-three.js`, run by `hero-grow.js`, styled in `hero-grow.css`), after a reference the owner showed (a seedling on a flowering hill). On the off-white page, a soft grassy mound rises from the bottom left to a rounded top right of centre. The hill is velvet turf, after the reference: about 125,000 short, fine blades (fewer on phones) over a ground painted in the same light, with soft folds running down the slopes from the top. The sun comes from the upper left, so the crest and the folds facing it glow yellow-green while the hollows between them sit in deep green shade; the blades sway in a light breeze. The wildflowers are few, small and scattered, each on its own thin stem, as in the reference, not a carpet. On the top stands a seedling, a thin stem with two bright leaves. The scene grows once, over about five seconds when the page opens, and then stays in full bloom (the owner asked that nothing shrink or disappear and come back): the seedling grows taller and its leaves open out, and wildflowers (blue cornflowers, purple, white daisies, a few yellow and pink) bloom across the slope from the bottom right up towards the top, with a few large soft flowers close to the viewer. The seedling is drawn to look real: a tapered stem, woody pink-brown at the soil turning to fresh green, two seed leaves with a pale midrib, arching side veins and a fine net between them (bumped and with a soft sheen), and two small toothed true leaves unfolding between them as it grows. Herbs of seven kinds grow up with it across the slope (`static/hero-herbs.js`), each with its own leaves and flowers: chamomile (white daisies), lavender (purple spikes, narrow grey leaves), mint (broad paired leaves, a small lilac tip), tulsi or holy basil (oval leaves, a slim dark purple spike), calendula (orange flowers), dandelion (a low rosette of long toothed leaves, yellow flowers and white seed clocks) and yarrow (feathery leaves under a domed cluster of tiny white flowers). Their flower faces always turn to the viewer; they sway a little; none stand on the hilltop. The banner fills the whole screen and the site header lies over it with no bar of its own (clear background, no border), so the logo, the menu and the hill read as one opening; it stays clear over every section after it too, so on every page the logo and the menu float over the page rather than sitting in a strip of their own. The words sit at the top left on the off-white page: the heading in Wasay green, one line under it, and the site's own buttons (`btn btn--accent` and `btn btn--ghost`, with the glass tap animation). The page measures where the words end and the scene slides the hill to the right of them, so the slope never runs under the text. The meadow has no flat field around it: the ground and the grass fade out softly into the page at the meadow's edges, so no dark green band shows at the sides. A button at the bottom right pauses and resumes the motion. Scrolling on turns the banner into Who we are (see below). Rendering stops when the banner is off screen or the tab is hidden, and holds its last picture while the next page slides over it. Both 3D scenes (the banner and the trunk) watch their own frame times (`static/gl-quality.js`) and draw at a lower resolution while a device cannot keep up, raising it again when there is room, so scrolling stays smooth; the trunk draws only while it is actually on screen. Under reduced motion the hill is shown still, in full bloom. Without WebGL a drawn hill shape stands in. The earlier walking-footage banner and its video were removed.

## Product motion refinement

The home jars follow a continuous shallow arc, with gradual size changes and a stronger side lean like the supplied product reference. Dragging retains its original pointer anchor; releases use recent velocity only. Scroll input eases into the ring and product view, and keyboard targets keep a continuous index through the loop. The opening flight captures the visible jar before loading or locking page scroll, and old title/pack animations are cancelled when switching products. Existing reduced-motion behavior remains.

## Product information

The shared product view now replaces the generic specifications and pack-photo gallery with About the product, Uses and Composition. All 55 products share the slug-based records in content/product_details.json, so Home and category views use identical copy. The animated opening is retained. Paper-white editorial rows pair headings with readable text; phones stack the columns. Only readable Wasay label wording is transcribed or conservatively paraphrased. Missing and partial ingredient lists remain explicit; no other manufacturer’s traditional formula, dosage or efficacy guarantee is inferred. See PRODUCT-CONTENT-AUDIT.md for source checks and outstanding labels.

Customer-facing product descriptions use direct product language. Photo angles, label languages, transcription notes and missing-data explanations belong only in the editorial audit and content metadata. Unverified Uses or Composition sections are omitted. Verified partial ingredient lists use the heading Key ingredients, so they do not imply a complete formula.

## Page turn

Every page scrolls as a stack of pages (`static/wasay-stack.css` and `.js`, loaded by the head partial). Each direct child of `<main>` (banner, ring, content sections, closing band) is a page: once it has been read it pins, and the next one slides up over it, with a soft shadow along the sliding edge and the covered page dimming a little as it goes (`--cover`, up to about one fifth darker; the dimming layer exists only while a page is being covered, `.is-covering`, since a page-tall layer kept for nothing makes every frame on the page dearer). A page taller than the screen is read to its end before it pins, so nothing is hidden before it has been seen. The footer is outside `<main>` and scrolls normally after the last page. Nothing fades or slides in by itself: the only motion is a page being covered, which is the scroll doing it. Under reduced motion nothing pins and the sections scroll normally. A section opts out with `data-stack-skip`. Pages need an opaque background (they default to paper; any section background set by class wins). Chapters pin at the top of the screen under the header, so give each one enough top padding to clear it.

## Who we are, inside the banner

Who we are is not a section of its own: it is told by the banner scene as the page scrolls (`.wz-grow` is a screen tall plus a 300svh hold, `--dwell`; its stage stays in place through the hold, then the next section slides over it as in the page turn). First the banner words leave upward and the camera comes in close on the seedling while the first text (Who we are, the aspiration and the commitment) rises in from below. Next a bottle rises out of the grass under the seedling's right leaf (the grass around it parts short so the bottle and its label show), a drop of medicine forms on that leaf's tip and the leaf bends under it, with the second text. Last the drop falls into the bottle, the leaf springs back and a golden ring spreads from the mouth, with the third text and the More about us button. Scrolling up reverses it. On a wide screen the words stay on the left and the plant and bottle sit to their right; on a phone the words sit at the top and the plant and bottle low in the frame. The drop is amber, so it reads as medicine, not water; the bottle is amber glass with a cream paper label carrying the real Wasay Laboratories logo (`/logo.png`, which already includes the name), and nothing else is printed on it. Under reduced motion the hill is still and each part of the scroll shows its moment without the camera move; the texts swap without sliding. The separate botanical scene (`botanical-three.js`, `botanical-motion.*` and its partials) was removed. No new product claims are introduced.

## Wasay at a glance: the grassy trunk

Right after the banner comes one screen-tall page on the off-white paper (`.wz-glance`, `static/glance-three.js` run by `glance.js`, styled in `glance.css`), after a reference the owner showed. A thick trunk covered in long grass arcs across the page like a smile: it enters at the left, dips low and nearer in the middle and leaves at the top right. Its grass (about 130,000 short, fine blades, fewer on phones, combed mostly one way along the trunk like brushed fur) grows out all round, lighter and yellow-green on top, darker and hanging a little underneath, and sways in a light breeze; a few small white daisies poke out along the top. Where the pointer rests on the trunk the grass parts outwards and lies down, leaving a hollow in cool blue tones (the owner's choice; deep blue at the roots, light at the tips) that glides after the pointer and closes when it leaves. The breeze is broad and slow, so neighbouring blades move together rather than flickering. The title (Wasay at a glance) sits large in Wasay green above the arc; below it sit the figures (the number of products and of ranges, counted from the catalogue, and Peshawar, the address printed on every pack) on the left and Wasay's own description of itself on the right. On a phone the camera stands closer so the trunk crosses the screen between the title and the figures. The reference was on a blue sky; here it stays on the site's paper. Blue appears only where the owner asked for it: the hollow under the pointer and the shirt cuff in the hands photo below. Rendering stops when the page is off screen or covered; under reduced motion the grass is still. Scrolling on turns the trunk into a capsule, after a photograph the owner showed (a clear pill with a little garden inside, without the hand). The figures step aside and the title stays. First the whole trunk squeezes into a small ball of grass, smaller than the capsule, hanging just above the open bottom half of the capsule. Then the grass pours down from the ball through the open top and fills the capsule from the bottom up as a mound of moss (the ball shrinks as it empties, the moss rising inside), and the top half comes down and closes over it, a touch wider so it overlaps at the seam. Tiny white flowers open on top of the moss, like a spray of baby's breath; inside the capsule there is only the moss and these flowers (herbs were tried there and taken out at the owner's request). The word Wasay appears on the upper half in Wasay green (white would vanish on the pale page). The glass has a wall of real thickness (an inner and an outer surface, with the cut lips of the two halves visible), reflects a studio round it (a tall soft light to the left, a narrow one to the right, a light overhead) so its highlights wrap round the curves, brightens where it is seen edge-on and shows grey-green edges, and casts a soft shadow on the page; once closed it turns a little to and fro. There is no breeze once the grass is squeezed and the pointer no longer parts it; inside the glass no blade is longer than the room between its root and the wall, so none shows outside the capsule. The scene holds its place for the change (`--dwell` in `glance.css`), then the products page slides up over it as usual. After the capsule closes, scrolling on brings two hands in from the sides, after Michelangelo's Creation of Adam. They are the owner's own photograph (`static/hands/`, supplied by the owner for the site after three rounds of 3D hands could not look real enough): from the left a real human hand coming out of a light blue shirt cuff under a white lab coat (Wasay Lab), from the right a hand of moss with mint, white flowers, lavender and trailing vines, on a warm cream wall with soft leaf shadows. The photo is cut in two at the gap between the fingertips (`hands-human.webp`, `hands-nature.webp`); `glance.js` sizes the halves to cover the stage as the whole photo would (on a tall screen they are enlarged so the hands stay a good size, the sleeve and the arm running off the sides), puts the meeting point in the middle a little below centre, and stands them apart just enough to hold the capsule. Behind them a plate (`hands-plate.png`, the photo's background column at the cut, with the fingertips bridged over) fills the gap with the same wall, and above and below the photo the stage takes the average colours of its top and bottom edge; the halves and the plate fade into those at their top and bottom, so no edge shows. As the hands come the wall fades up over the paper and the halves glide in from the sides, stopping with the capsule between the fingertips. The capsule (still 3D) shrinks, moves to the meeting point the page gives it and lies on its side there (there is no ring or glow behind it, at the owner's request); the title gives way to the words for the hands (Nature and Wasay Lab, `hands_heading` in the content). This replaced the earlier forest-green figures band.

## Product tiles on the tabs

A product stands near the bottom of its tile and its name sits right under it (about 10px of gap, no more). The 3D canvas has empty space round the model, so each tile is trimmed to the product: `--trim` shortens the tile and `--drop` moves the canvas, and rows are bottom-aligned so the names stay on one line. The two numbers are measured ahead of time for every product by `node scripts/render-cutouts.mjs fit` and stored as `fit` in `static/tablets-data.json` and `static/pastes-data.json`, so a tile has its final height before its 3D model is built and nothing jumps when models finish. Run it again after adding a product or changing its model (a normal run of the script does it too). A product without a stored fit is measured live as a fallback.

## Contact page and the product catalogue

The menu is Home, the five product tabs, About us and Contact; there is no "Order online" button, shop catalogue, shop-category chips or shop column in the footer, and every closing band and the banner button lead to Contact. The Contact page (`templates/contact.html`, `content/contact.json`) is a banner, a short introduction and one card per detail: the company name always, then whichever of address, phone, email, opening hours and extra details are filled in, then optional links. A detail left empty is simply not drawn, so nothing is invented while a detail is unconfirmed; only the address printed on the packs is filled in.

Products are data, not templates: one file each in `content/catalog/` with a `tab`, so a product can be moved between tabs, and `content/home_products.json` picks the home ring from any of them. A jar is drawn as a jar and a carton as a carton wherever it sits. On the ring a carton is held inside the jar's height and width (`.wz-ring__item--carton`) so it never dwarfs a jar, and it does not turn with the mouse (there is no turn strip for cartons).

## Company profile, About page and contact details

The About page carries Wasay's own company profile (`content/about.json`, from the owner's Organization Profile document): after Who we are, **Our story** (a leading herbal medicine company in Khyber Pakhtunkhwa for 75 years, grown from a humble dawakhana into a modern facility in the Industrial Area, Hayatabad, Peshawar, making herbal and nutraceutical medicines), **Mission and vision** (two cards under the Urdu motto اعلی معیار، مؤثر علاج, set large and right to left), **Objectives** (four numbered cards) and **Keys to success** (a row of pills); the quality section names ISO 9001:2008 and ISO 14001:2004, as the profile does. The home page's at-a-glance figures add 75 years. The contact details are the owner's: phone +92 331 9131176, contact@wasaylabs.com and wasaylab@hotmail.com, 148-Industrial Estate, Jamrud Road, Peshawar. They are entered once, on the Contact page (`content/contact.json`, with a second email field), and the footer of every page shows them in a Contact column read from there.

## Home page sections and product information

The home page runs: banner (which also tells Who we are as the page scrolls), **Wasay at a glance** (the grassy trunk, below, which turns into a capsule), **Our products** (the products drifting past), **Our ranges** (one card per tab with three of its products, how many there are and their names; counted from the catalogue, so a card follows products moved between tabs), **Why choose Wasay** (four numbered cards), and the mint closing band. The ticker and "I'm looking for" linked to the online shop and were removed with it.

Each product view opens with **At a glance** (range, size, pack, maker) and ends with **More from <range>** (the next four products of its tab, with a link to the whole range); the "On the pack" photographs were taken out at the owner's request (the photos stay, as the 3D cartons and jars are built from them). A product from "More from" opens in place when it is on the page and otherwise opens on its own tab. Each tab shows how many products it has and their sizes under its heading. Nothing here is new wording about the products: it is the catalogue's own facts and Wasay's photographs.
