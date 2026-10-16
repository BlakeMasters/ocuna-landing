# Header logo walking animation

The active header animation is a continuous SVG gait, using the original logo contours in `src/lib/lectpy-raccoon/raccoon_art.js` and the same deformation rig as the homepage. It does not consume the generated sprite sheet.

## Motion

- `src/lib/brandWalk.js` drives the existing paw bindings with a continuous phase.
- One stride takes 800 ms. The tail sway closes over two strides, giving a seamless 1600 ms full loop.
- Each planted paw sweeps backward for 62% of its cycle at a fixed floor height. Its return arc lifts it before moving forward. Near and far legs use separate phase offsets.
- The head retains the source logo's shape and proportions. The body has a small bob; the figure remains in its logo position.
- Playback runs with requestAnimationFrame while the logo is hovered or keyboard focused, visible, and motion is allowed.
- Activation eases from the source still over 140 ms. Hover exit cancels scheduled work and restores the static logo. Reduced motion keeps the static image.

The header uses two SVG paths and the existing bitmap lettering. This preserves the original logo identity while allowing actual continuous limb movement.

## Verification

`tests/brandWalk.test.mjs` checks planted-foot retraction and floor contact, lifted-paw return, continuous closure of all contour points, rigid facial distances, viewBox containment, and cancellation on hover exit. The existing homepage gait tests remain applicable because its shared rig is unchanged.

The local review page is `.tmp/brand-walk-review.html`. It renders the actual imported gait at header size and enlarged, with pause, slow playback, and phase selection. `.tmp/brand-walk-continuous.gif` is rendered from those same paths.

## Rejected generated sheet

The generated sixteen-pose illustration was rejected because its leg poses did not form a coherent walking sequence. Its registration measurements did not establish gait quality. It has been removed from the served assets and retained locally at `.tmp/brand-walk-rejected-v2.png`. The imagegen prompts are retained at `.tmp/brand-walk-imagegen-prompts.md`.
