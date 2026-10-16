# Botanical story, photographic revision

The supplied website recordings were inspected as motion and layout references: the hillside video hero, the richly textured mossy limb, and the DNA site's changes in camera composition. No frames from those third-party websites are shipped.

Implementation: a hybrid 2.5D scene using a transparent generated trunk on shallow curved geometry, a transparent generated bottle with the existing Wasay logo, and a real-time 3D droplet. The photographic assets are illustrative brand imagery, not documentary photographs of Wasay ingredients or a marketed product. Shallow camera travel preserves their front-facing perspective. The four scroll chapters reuse the existing company copy without new claims.

Assets were generated with the built-in image-generation tool on 2026-10-16. Original generated PNGs were copied to:
- static/images/botanical/trunk.png
- static/images/botanical/bottle.png

The images retain their original alpha channels. No new runtime dependencies or remote image requests are required. Three.js remains locally bundled with its existing license.

## Trunk generation prompt

Create a photorealistic isolated botanical asset for a premium website, wide landscape 3:2 image. A single ancient weathered gnarled tree limb spans the entire width left to right, irregular gently undulating S shape rising from lower left to upper right. It is thick, sculptural, with deeply eroded gray-brown bark and exposed wood grain, longitudinal twisted fibrous ridges, cracks, knots, tiny splinters and patchy delicate real forest moss gathered on the upper-facing crevices. Moss is muted natural olive and fern green with microscopic fronds, not rounded balls. Exact composition: limb enters left edge at 60 percent image height, sweeps down toward 68 percent at one quarter width, rises into a pronounced knot at 50 percent width and 42 percent height, then curves to exit right edge at 28 percent height. Limb thickness approximately 22 percent of image height with very irregular silhouette. A small pointed wooden tip protrudes downward underneath the central knot, a natural place a water droplet could hang. No droplet, no bottle, no leaves, no text, no background, no ground, no additional props. Transparent background with actual alpha. Soft overcast daylight from upper left, exceptionally realistic neutral color and tactile surface detail like a high resolution macro photograph or photogrammetry scan. Edge-to-edge sharp focus across wood, no blur. Avoid cartoon, illustration, stylized CGI, plastic, shiny wood, saturated green, smooth rope geometry. This is a photographic cutout for compositing, preserve clean intricate moss silhouette.

## Bottle generation prompt

Photorealistic studio product photograph for a botanical website composite. One uncapped cylindrical amber brown glass apothecary bottle, completely isolated on actual transparent background. Full bottle visible, straight-on front view with camera slightly above so the dark open mouth and three fine screw threads are clearly visible. No cap anywhere. Bottle proportions: body moderately broad, total height 2.1 times width, gently rounded shoulder tapering to short narrow neck. Real thick translucent amber glass with dark brown edge absorption, bright narrow softbox reflections at the left and right edges, realistic transparent glass at shoulder, containing transparent golden amber liquid to 60 percent height with subtle meniscus. A completely blank off-white paper label wrapped smoothly around the lower middle half of the bottle, no letters, no graphics, no borders. Tactile matte paper, very slight fine fibers. Soft daylight studio photograph, premium natural skincare packaging photography, no CGI, no illustration, no cartoon, no plastic, no yellow opaque liquid. Bottle fills 80 percent image height, centered, generous transparent margin, entire bottom visible. No pedestal, no ground, no horizon, no scenery, no shadow beyond small contact shadow directly underneath. Transparent alpha background. High resolution square image.

## Behavior

Desktop scroll dwell: 380svh; phone: 340svh. Native scroll is never intercepted. Numbered buttons jump to chapter compositions. Reverse scrolling restores the growing drop. Under reduced motion, the scene stays still and the four chapters become a readable vertical sequence. If WebGL or a required asset fails, the still remains with all chapters in normal flow. A no-JavaScript style fallback provides the same text access.
