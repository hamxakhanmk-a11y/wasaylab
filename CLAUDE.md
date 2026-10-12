# Wasay Laboratories website

Static site: `node build.js` renders `templates/*.html` (+ `templates/partials`) with `content/*.json` into `dist/`.
Missing template values are build errors. Repo files use CRLF line endings.

Content comes from https://wasaylabs.com/. Do not invent contact details, certifications, prices or health claims:
if the live site does not say it, leave it out and ask.

## Design system

Read `DESIGN.md` before adding or changing any UI. It holds the colour, type, spacing, component and motion rules
for this site (paper-white surfaces, Wasay green as a scarce accent with a little lime, whole uncropped product
photos, glass effects, no blue, no dark bands, no one-by-one card entrances).

## Git

Work on the `hamza` branch. Ask before pushing, and never merge with or push `main` unless the owner asks.
