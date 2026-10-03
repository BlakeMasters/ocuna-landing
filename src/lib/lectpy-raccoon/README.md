# Lectpy raccoon walk

Adapted from the MIT-licensed Lectpy vector animation. The original license is retained in [LICENSE](LICENSE).

The traced logo contours are preserved. The homepage uses the bare renderer without presentation controls, directly below the introduction, with a `startle-sniff` profile: walk in, give a brief startle, sniff downward once, then walk on. The homepage sets `walkCadence: 1.5` strides per second. Entry and exit playback rates follow the physical travel distance and actor scale, so a wider page takes longer to cross instead of speeding up the legs. At 1440px with the capped headline size, entry takes roughly fifteen seconds and exit roughly sixteen seconds. Entry holds its walking speed until a brief braking segment in the final six percent of the approach. The short startle and sniff play at 0.8 times their source rate, with the ten-second offstage pause preserved. This version rotates the face close to its attachment with a small nine-degree sniff and no horizontal head compression. The long back and neck contours stay outside the head binding. The unpaced source timeline remains 24.8 seconds; the original 16-second profile and its three optional idle variations remain available to callers.

Local adaptations expose `play`/`pause`, fit the actor and stage to desktop/mobile, reduce bob/head tilt, and smooth the return arc of each paw. The homepage gait phase follows the actor's actual ground travel divided by its SVG scale, with a stride of `140 / .62` source units. This cancels the body's forward travel during each paw's planted stance. The body bob follows that same gait phase. Tail binding uses the tail's contour vertices and stripe contours, excluding the hind paw. The homepage starts moving immediately; the actor begins entirely offstage and enters through the page edge. Reduced motion, visibility suspension, looping and disposal remain in the source rig.

Original SHA-256:

- `raccoon_walk.js`: `0FFE30C32A2F5D787EDF2289449AAF530BD64F881DB07C421E888ACB20A62784`
- `raccoon_art.js`: `1CF0E4A012237C72CE9489488F2756D79B02022546B76E365B065BC04EDADC48`

The original MIT notice is included in [LICENSE](LICENSE).

The walking layer spans the viewport and clips at the page edges. The homepage uses `actorWidthEm: 2.4`, based on the same font-size variable as the headline. The raccoon and its shallow stage grow with the title and stop growing at the title's font-size cap. A ResizeObserver matches the SVG viewBox to the actual lane width and recalculates the path from just outside the left edge to the center, then beyond the right edge. Resizing preserves the animation clock; very narrow screens cap the actor at 32% of the viewport. This gives the enlarged compute diagram more space in the first view without enlarging the raccoon indefinitely on wide displays. The diagram and copy remain centered. Callers can use `actorWidth` for a fixed CSS-pixel size, or omit both sizing options to retain the original scalable presentation renderer.
