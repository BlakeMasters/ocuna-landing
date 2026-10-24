# Image-driven hatching and colored ASCII

Run the existing local Vite server and open `/art-study.html` for the interactive study. This is a standalone entry; the normal site build uses `index.html`, so its controls are not included in the website. The reusable renderer is also used for the field-note raccoon, as described below.

```sh
npm run dev -- --port 4173
node --test tests/imageMarks.test.mjs
```

Open `http://127.0.0.1:4173/art-study.html` after the server starts.

The two screenshots suggest image-space filters. This code reconstructs their visible mechanism; it is not recovered source code, and the exact original algorithm and animation cannot be determined from still images.

## The rendering pipeline

1. Draw the input into a canvas with `contain` sizing, retaining its transparency.
2. Downsample to a grid: one RGBA sample per mark. Character cells are taller than they are wide to preserve the image's proportions.
3. Measure brightness with `0.2126 * red + 0.7152 * green + 0.0722 * blue`. Derive local edge direction from neighboring samples.
4. In hatching mode, brightness controls line length and opacity. The image gradient selects one of two diagonal directions; smooth areas use a coherent field so adjacent tiles produce chevrons rather than independent random scratches.
5. In ASCII mode, brightness selects from `.,:;+=xX08#@`. Each glyph retains its sample's RGB color. Slow, seeded substitutions within adjacent density levels keep the silhouette legible.
6. Composite a faint source image, a blurred copy of the marks for glow, and sharp marks. A brightness control lifts the mark layer independently of the original.

On dark backgrounds, light areas receive denser marks and black is empty. On paper, dark areas receive denser marks and white is empty. Transparent samples are skipped in both modes. The source's colors stay intact in the mark data; the compositing brightness adjustment can lift or clip their displayed values.

The comparison slider clips the processed canvas over the identically sized original image. It is a real range input and supports keyboard and touch. Saving a PNG exports the complete processed canvas, regardless of the comparison slider position. Opened files use local blob URLs and are not uploaded.

## Code

- `src/lib/imageMarks.js`: DOM-independent mark-field construction and drawing. `buildMarkField` accepts sampled RGBA data; `drawMarkField` paints the cached field. Time is in seconds.
- `src/components/ImageMarks.jsx`: image decoding, sampling, resizing, comparison slider, compositing, motion policy, and canvas cleanup.
- `src/art-study/ArtStudy.jsx`: controls, three existing image presets, local image selection, and PNG export.
- `tests/imageMarks.test.mjs`: tone mapping, transparency, geometry, source colors, deterministic animation, and canvas-state preservation.

No packages were added. Sampling only repeats when the image, mark size, rendering mode, tone, or canvas size changes. Animation paints at up to 15 updates per second, uses a maximum device-pixel ratio of two, pauses when hidden or offscreen, and uses a stable frame when `prefers-reduced-motion` is enabled. Pause freezes the current animation phase. This is a bounded Canvas 2D prototype, not a measured production performance result.

## Field-note image integration

The `trail` illustration (`raccoon-field-note.png`) starts at a clean 45% split on the research index thumbnail and `/research/experiments-need-a-memory` article cover. The original image appears first; once the ASCII is ready it fades over the right side after a short hold, leaving the original faintly visible at 16% underneath. The article image supports dragging anywhere across it, touch, and keyboard adjustment through a transparent native range input. Its focus outline appears during keyboard use; there is no centered handle, comparison line, or label over the artwork. The linked thumbnail keeps a fixed split and no nested controls. Existing link behavior and article-cover size are preserved. Reduced motion shows the settled split without the fade.

The standalone art study retains its visible comparison handle. Dragging either comparison changes only the canvas's CSS clipping boundary; it does not decode the image, rebuild the grid, or repaint the canvas in response to the slider. The website's image reveal uses CSS opacity over that cached canvas. The faint blurred image is cached between resize/underlay changes, and the animation continues at up to 15 updates per second. Development builds expose CPU canvas-paint submission timings and a sample-revision counter as data attributes for local verification; those timing measurements are omitted from production builds. These timings do not measure the browser's complete GPU/compositing pipeline.

The index's existing animation button also pauses its ASCII thumbnail. Both views retain reduced-motion handling and suspend when hidden or offscreen. The original image remains the static prerendered, no-JavaScript, and social-preview fallback. The standalone study remains a development entry; the normal site build includes the Field Notes integration.

## Home-page artwork window

The home hero reuses the featured 404 artwork, Jacques de Sève's 1756 *Le Raton*. Its crop is a view of the existing image, not a new raster asset. `src/content/homeArtwork.js` owns the shared crop and tonal adjustment. Responsive sources reuse the existing 800px and 1600px WebP files. The original loads before the effect runtime, which is dynamically imported after decoding. The artwork sits to the left of the existing compute diagram and stacks above it on small screens.

`RaccoonMarkWindow` presents a 38%-wide moving band: ASCII in its left half and diagonal hatching in its right half. Cursor movement across the hero moves this band using CSS clipping; a transparent native range input supports horizontal touch dragging and keyboard adjustment. It has no center handle, divider or labels. Touch movement across the rest of the hero is ignored so vertical scrolling stays native.

The two mark fields are sampled only on a changed display size or responsive source, with at most 8,000 pixels per field and output DPR capped at two. Consistent graphite ink keeps the engraving's light details legible. A faint 16% original remains under both effects. The home-page ASCII phase runs at 1.75 times the shared renderer's speed; diagonal motion retains its original speed. Glyph and stroke painting is capped at 12 updates per second; cursor smoothing requests frames only while catching up to a pointer movement. The existing home-page pause control, hidden/offscreen suspension, reduced motion and disposal cover both queues. Reduced motion keeps the marks still and moves the window immediately in response to deliberate input. Development data attributes record sample revisions and canvas submission time; these do not measure total GPU/compositing cost.

Run `node --test tests/raccoonMarkWindow.test.mjs tests/imageMarks.test.mjs` to check sample reuse, read caps, both window edges, pause/visibility/reduced motion, native-input behavior, fallback and cleanup. The prerendered page retains the original illustration without JavaScript; the 404 gallery retains its complete source and credit.
