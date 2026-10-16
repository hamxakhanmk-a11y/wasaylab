# Botanical scroll story

Original scene authored for Wasay Laboratories, inspired by the leaf-to-bottle concept at https://www.istockphoto.com/en/video/speed-ramp-droplet-drips-over-a-green-leaf-into-a-small-bottle-gm1387581235-445422133 . No iStock media is included.

Who we are spans 300svh. The scene pins below the header, with three chapters using existing company copy. Scroll progress controls drop formation, elongation, fall and impact; reverse scrolling reverses the scene. Chapter buttons are keyboard accessible. There is no timed playback.

The WebGL scene has a curved, procedurally textured leaf; double-wall amber glass; threaded bottle neck; liquid volume; a transmissive droplet; reflected studio lighting; and a ripple. It is a rendered 3D scene, not filmed footage. Mild pointer parallax is disabled under reduced motion.

Three.js 0.180.0 is bundled locally from the official npm package. Its MIT license is preserved at static/vendor/three/LICENSE. No runtime CDN or external models/textures are needed. The renderer loads near the section and draws on demand. The original SVG remains a scroll-controlled fallback for unsupported WebGL. Reduced motion displays every text chapter in normal flow and a static scene.

Files: static/botanical-motion.js (story control), static/botanical-three.js (renderer), static/botanical-motion.css, templates/partials/botanical-motion.html and the Who we are block in templates/index.html.
