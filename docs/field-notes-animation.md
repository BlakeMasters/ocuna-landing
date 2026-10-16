# Sleeping Field Notes raccoon

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
