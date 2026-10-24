# Field Notes animation

## ASCII jungle background

`createResearchJungle(canvas, scene, { style: "ascii" })` first shows the existing
growing plants, then layers colored ASCII over them on cream paper. The exported
`drawResearchJungle` drawing and its growth, leaf placement, sway, and central
paper wash are unchanged. Omitting the style option retains the original
canvas drawing.

The original animation plays at full quality for three seconds. Over the next
two seconds, an eased fade introduces the ASCII while a cream wash leaves the
original at 26% opacity. The last second gently hands that faint original layer
to the sampled source so its resolution does not jump when the overlay arrives.
There is no background slider or extra control.

The ASCII path draws the scene directly into a low-resolution sample canvas
with `willReadFrequently`. Its grid starts at roughly 9 CSS pixels per column
and 15 per row and stays at or below 20,000 samples regardless of device pixel
ratio. `buildMarkField` maps those samples to the shared paper-tone ASCII
renderer. The faint original remains underneath; the existing paper wash keeps
the reading column quiet. Sampling begins when the ASCII starts fading in.

The introduction and fade retain the original 24 FPS desktop / 18 FPS mobile
rendering. After five seconds, cached glyphs repaint at most 12 times per second
and the full-resolution plant drawing stops. During the 14-second growth
sequence, the sample field rebuilds at most about eight times per second.
Mature plants continue to sway with about four source updates per second.
Sampling never reads the full-resolution visible canvas. Very large pages use
larger cells to retain the sample limit, and the settled faint underlay is
interpolated from that same small grid.

The shared pause control freezes the scene clock and the fade together. Hidden
tabs and offscreen scenes stop scheduling frames. Reduced motion immediately
shows the mature, still layered scene without an introduction or fade;
forced colors follows that still-state policy, and CSS hides the background
in forced colors and print. Disposal cancels frames and disconnects observers
and media listeners. If the sample context or pixel reads are unavailable,
the renderer falls back to the original drawing. Development builds expose
the active style, ASCII blend, cell count, source revision, and paint duration on the
canvas for inspection; those diagnostics are omitted from production.

## Sleeping raccoon

The animation keeps `site-public/research/sleeping-raccoon.png` unchanged.
`nappingRaccoonArt.js` traces its alpha contour at one source-pixel tolerance
and retains the original ink color. One SVG path includes the outline and its
negative spaces, so the neck and striped tail remain connected during motion.

`src/lib/nappingRaccoon.js` controls a 5.8-second sleeping cycle. The back widens
and lifts slightly on inhalation; the head follows with a gentle tilt inward
and a small vertical movement. The curled tail eases with the breath, and the
lower contour stays anchored. A small ear twitch
occasionally interrupts the breathing rhythm. This replaces the previous
localized image filter with continuous vector deformation across the character.

Motion pauses through the existing shared Field Notes control, outside the
viewport, and in hidden tabs. Reduced motion and print display the original PNG.

Individual articles and the Field Notes index share the cream-and-green palette
in `ResearchPage.css`: cream paper `#f4eedf`, green ink `#234334`, muted green
metadata and borders, and a pale green code panel. The approved header-logo walk
is unchanged.
