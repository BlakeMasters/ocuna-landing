# Le Raton

Le Raton is the custom font used by the historical raccoon gallery on the 404
page. Its starting point is the small handwritten margin beneath *Le Raton*
(1756). The expanded font uses matching small annotations from eighteen
drawings credited to Jacques de Sève, dated 1755–1759.

The archive records identify the drawing artist, but do not identify the
writer of the margin notes. The drawing dates do not establish when the notes
were written. Similarity of the handwriting is a visual assessment of slant,
letter shapes, joins, and pen contrast, not an attribution of the writing to
de Sève or proof that every note is by the same person.

## Source coverage

Forty of the fifty-two alphabetic forms and all ten digits are directly traced
from the selected notes. This replaces twenty-three previously interpreted
letters and four digits with scanned ink forms. The connected source groups
`Le` and `Raton` are also preserved as standard OpenType ligatures.

The remaining interpreted letters are uppercase `K M N Q U W Y` and lowercase
`j k q w z`. No matching examples of these were found in the inspected small
notes. Larger formal labels and the artist's signature were excluded because
their lettering differs from the target annotation style.

Lowercase `k` and `q` are curved pen reconstructions. Their new strokes have
individual pressure profiles, wandering centers, uneven ink edges, and small
rounded nib endings, guided by the traced `a b g h l y`. They are recorded as
drawn forms, not historical traces. Their parameters and fixed random seeds
are retained in `glyphs.json` and `draw-missing-glyphs.py`.

The 1.110 local pass applied the same pen treatment to the remaining
interpreted letters. All fifty-two alphabetic forms were reviewed against the
saved trace and margin proofs. Ten additional forms needed revision:

| Forms | Problem observed | Local revision |
| --- | --- | --- |
| `K M N W Y` | Long straight edges, repeated stem thickness, and flat endings. | Curved stems and connectors, individual pressure profiles, uneven edges, and rounded pen endings. |
| `U` | A rigid return stem and overly regular bowl. | An asymmetric bowl and curved return with changing pressure. |
| `Q` | A smooth oval that differed from the traced `O`. | The exact traced `O` body plus a separately drawn curved tail. |
| `j` | Straight broad stem, slash-like dot, and spacing based on its wide lower loop. | Curved stem and descender, the traced `i` dot, and spacing from the upper body with the loop allowed to overhang. |
| `w` | Two repeated `u` forms with duplicated ink and joins. | A continuous pen gesture with unequal bowls and closer spacing. |
| `z` | Straight diagonal and a regular loop. | A bent diagonal, loose lower loop, changing pressure, and uneven ink edges. |

The local 1.120 pass corrected hollow slivers left by that pass. The old
stroke outline crossed itself at tight retracings, and its even-odd raster fill
cancelled overlapping ink. The generator now paints a union of small nib-sweep
sections, rounded contacts, and cap fans. Interiors of reconstructed stems in
`K M N U W Y k w` are solid; larger intentional counters in `q` and `z` remain
open. Only sub-nib pinholes are sealed elsewhere. Historical traces never go
through this correction.

That pass retained exactly the same saved outlines and spacing for the forty
directly traced letters, ten traced digits, ligatures, and symbols. The reconstructed letters,
including `k` and `q`, retain their pen paths, pressure profiles, and random
seeds, with their filled outlines rebuilt. Accented forms follow their bases.
`letterform-audit.json` records a decision for every letter and identifies the
traced forms used as visual guides. Its stroke-fill checks reproduce the old
missing ink and verify coverage at every sampled nib center. Long outline
edges are a diagnostic aid,
not a quality score: surviving traces may contain them, and `Q` deliberately
inherits the source contours of `O`.

The penstroke and spacing refinements below were approved for publication
as version 1.160, replacing version 1.100.

The 1.130 local spacing pass compares whole captions from *Le Raton*,
*La Fouine*, *Le Lynx*, *Le Zibet*, *Le Renard*, and *Le Palmiste*. Extraction
crop widths had reserved blank margins or space for dots and flourishes that
overhang neighbouring letters in the surviving handwriting. Seven forms now
use their bodies for placement:

| Form | Previous advance | Local advance | Spacing change |
| --- | ---: | ---: | --- |
| `i` | 466 | 258 | Narrow stem sets the advance; the leaning dot overhangs. |
| `y` | 790 | 562 | Upper body sets placement; the long descender overhangs. |
| `Z` | 1310 | 648 | Upper zigzag sets the advance; the lower flourish runs beneath following letters. |
| `c` | 506 | 430 | Remove blank left crop margin; retain the right bearing. |
| `s` | 434 | 386 | Remove blank left crop margin; retain the long-s shape and right bearing. |
| `u` | 554 | 506 | Remove blank left crop margin; measure adjacent pairs separately. |
| `f` | 601 | 458 | Position the upper stem; allow its left-reaching descender to overhang. |

Values are font units out of 1000 per em. All changes are constant horizontal
translations or advances: none reshapes the ink. The other 106 base records,
including all reconstructed letters and both ligatures, are unchanged from
1.120. Accented and composed forms follow their base metrics.

Pair spacing for `Ra at fo ou ui rd` uses the horizontal separation of traced
ink extents within the same caption. Different normalization scales are
converted with their geometric mean. `yn` and `Zi` use approximate visual
landmarks in their source words, with a two-pixel reading tolerance. These are
interpretations of observed handwriting, not verified author intent or an
exact whole-word facsimile. Overlapping bounding extents do not mean every
stroke should touch. The default advances of `i` and `Z` include optical
bearings; they are not independently attested historical metrics. Unverified
pairs keep their existing optical spacing.

The original gap between the traced `Le` and `Raton` groups is about 40 scan
pixels, or 418 normalized font units. Increasing the reusable word space from
285 to 305 units changes that font gap from 398 to 418. This uses one observed
caption gap; handwriting does not have a single fixed word-space width.

`spacing.json` records every changed metric, pair measurement, approximation,
and retained optical pair. `spacing-audit.json` records all fifty-two letters,
checks that the ink shapes are unchanged, and verifies the compiled OpenType
pair values. The local comparison page presents original caption crops beside
versions 1.120 and 1.130.

The 1.140 local pass corrects large capital-to-lowercase gaps, beginning with
`N`. Its tall finishing stroke reserved space that a following lowercase
letter can occupy. Reducing its advance globally would make some capital pairs
collide, so the correction uses kerning. All 225 compiled outlines, advances,
and the two original ligatures remain byte-identical to 1.130. The eight
source-informed pair adjustments and the 305-unit word space are preserved.

All 26 base capitals were inspected in words and compared by the facing ink
at shared heights. Only lowercase combinations with a minimum horizontal
clearance larger than the word space receive new base corrections. They are
adjusted in 25-unit steps toward 175 units of clearance. This catches `N` and
similar overspacing after `W Y T F V` and other capitals, without changing
already closer combinations. Accented capitals and following accented or
composed letters inherit their bases' corrections, limited where necessary
to keep at least 60 units of sampled ink clearance. Capital-to-capital
spacing stays unchanged.

These are optical corrections to the digital construction, not historical
pair measurements. `N` remains an explicitly reconstructed form. The new
`capitalPairSpacing` section in `spacing.json` records the affected
combinations and thresholds; `spacing-audit.json` distinguishes this audit's
1.130 baseline from the earlier 1.120 metric audit. The capital comparison
page shows 1.130 and 1.140 together, including unchanged capital pairs and
accented examples.

The 1.150 local refinement follows review of every `Aa`–`Za` combination.
`Ma` and `Ka` remained slightly loose because their gaps were below the
earlier word-space threshold. Their kerning is now -75 and -100 units,
respectively. Only `M` and `K` combinations with more than 225 units of
facing-ink clearance receive this smaller pass, toward 200 units in 25-unit
steps. Already closer pairs are retained. Accented variants keep the existing
clearance guard. All other capitals' pair values and every compiled outline
and advance are unchanged from 1.140. `spacing.json` records this as a
separate refinement; `spacing-audit.json` records its 1.140 baseline.

The 1.160 local refinement applies the same small spacing pass to `U`, after
review of the capital test. `Ua` is 50 units tighter, reducing its sampled
facing-ink clearance from 244 to 194 units. Other `U` combinations above the
225-unit threshold move toward 200 units in 25-unit steps. Accented variants
retain the 60-unit clearance guard. The accepted `M` and `K` adjustments,
every other capital's spacing, and all 225 outlines and advances remain
unchanged from 1.150. This is an optical adjustment to the reconstructed `U`,
not a measurement of historical handwriting. The configuration and audit
retain the earlier refinements and record the separate 1.150 baseline.

Version 1.170 restores the left bowl of `d` from the same *Le Renard* scan.
The original extraction began at scan x=430 and cut through that bowl,
leaving two disconnected ink pieces and flat vertical clipping edges. The
crop now begins at x=419. Its original placement and 580-unit advance stay
fixed, while the entry ink can overhang the preceding letter. The left
bearing changes from 28 to -82 units. Every other source trace, pen
reconstruction, pair adjustment, and original ligature is retained.

The font contains ink outlines only; its counters and margins are transparent.
The apparent erasure beside `n` in “found” was missing source ink in `d`.
No paper-colored box is used to separate letters. The extraction script
supports `--characters d` for a selective source correction, and the audits
record the expanded crop and unchanged records. Source boundary flags also
include connected entry/exit strokes and neighbouring ink, so they are
visually inspected rather than automatically filled or expanded.
The 404 font URLs include the version so visitors fetch the corrected outlines
even when their browsers cached the previous release.

Traces retain the irregular contours of the surviving ink. Neighbouring marks
and paper spots were masked out; detached strokes belonging to `F` and `h`
were retained. Long descenders were shortened for live text. The letters
`b g l J` are spaced from their bodies, with long flourishes allowed to
overhang adjacent letters; their traced geometry is unchanged. The lowercase
`s` from *Le Palmiste* preserves the source's long-s form; the unusual capitals
`D` and `E` likewise follow their captions rather than modern textbook shapes.
Missing symbols and accents are interpreted or composed from the font's own
forms. No outlines from another font were used.

## Historical references

The following archive records identify the drawings as public domain. Sources
were inspected on October 11, 2026. Dates below refer to the drawings.

| Drawing | Archive record | Traced forms |
| --- | --- | --- |
| *Le Raton*, 1756 | [BnF / Gallica](https://gallica.bnf.fr/ark:/12148/btv1b10528231v) | `L R a t n m p V I 3 5 6`, period, `Le`, `Raton` |
| *Le Renard*, 1756 | [BnF / Gallica](https://gallica.bnf.fr/ark:/12148/btv1b10527973q) | `T r d 0` |
| *La Fouine*, 1756 | [BnF / Gallica](https://gallica.bnf.fr/ark:/12148/btv1b10528214c) | `o e f u i 1 8` |
| *Le Buffle*, 1756 | [BnF / Gallica](https://gallica.bnf.fr/ark:/12148/btv1b10528362x) | `B X 4` |
| *Le Furet*, 1756 | [BnF / Gallica](https://gallica.bnf.fr/ark:/12148/btv1b105283245) | `F 2` |
| *Le Palmiste*, 1759 | [BnF / Gallica](https://gallica.bnf.fr/ark:/12148/btv1b105284629) | `P l s` |
| *L'Agouti*, 1755 | [BnF / Gallica](https://gallica.bnf.fr/ark:/12148/btv1b105283406) | `A g 9` |
| *Le Jaguar*, 1758 | [BnF / Gallica](https://gallica.bnf.fr/ark:/12148/btv1b105285204) | `J` |
| *La Civette*, 1755 | [BnF / Gallica](https://gallica.bnf.fr/ark:/12148/btv1b105285456) | `C` |
| *La Serotine*, 1758 | [BnF / Gallica](https://gallica.bnf.fr/ark:/12148/btv1b105282257) | `S` |
| *Le Lynx ou Loup-cervier*, 1759 | [BnF / Gallica](https://gallica.bnf.fr/ark:/12148/btv1b105285295) | `c x y` |
| *Dromadaire*, 1755 | [BnF / Gallica](https://gallica.bnf.fr/ark:/12148/btv1b10528017z) | `D 7` |
| *La Genette*, 1755 | [BnF / Gallica](https://gallica.bnf.fr/ark:/12148/btv1b10528548j) | `G` |
| *L'Hyoene*, 1759 | [BnF / Gallica](https://gallica.bnf.fr/ark:/12148/btv1b10528533w) | `H` |
| *L'Ecureuil Suisse*, 1759 | [BnF / Gallica](https://gallica.bnf.fr/ark:/12148/btv1b105284680) | `E` |
| *L'Ondatra*, 1759 | [BnF / Gallica](https://gallica.bnf.fr/ark:/12148/btv1b10528000d) | `O` |
| *Le Zibet*, 1755 | [BnF / Gallica](https://gallica.bnf.fr/ark:/12148/btv1b10528542v) | `Z b` |
| *Chauves souris étrangères, Planche III*, 1759 | [BnF / Gallica](https://gallica.bnf.fr/ark:/12148/btv1b10528456p) | `h v` |

`scripts/font-source/le-raton/sources.json` retains the corresponding Wikimedia
Commons records, exact download addresses, image variants, dimensions, and
SHA-256 hashes. The first five images are full scans; the thirteen other
images are archive thumbnails at 1920 pixels wide. Extraction coordinates
refer to those exact variants. Modern inventory stamps are excluded.

`additional-samples.json` records the new crops, cleanup masks, thresholds,
baselines, and scaling. `traced-glyphs.json` preserves the extracted contours;
`glyphs.json` adds drawn and adapted forms. `build-report.json` lists each
glyph's method, the traced and interpreted alphabet, and final file hashes.

## Font files and page use

- `site-public/fonts/LeRaton-Regular.ttf`: installable TrueType font.
- `site-public/fonts/LeRaton-Regular.woff`: compressed font served by the site.
- Family: `Le Raton`; style: `Regular`; version: `1.170`.
- 225 glyphs and 223 mapped characters, including the alphabet, digits,
  punctuation, common French accents, and navigation arrows.
- OpenType features: standard ligatures (`liga`) and pair spacing (`kern`).

The handwriting is already slanted. CSS uses normal style and weight 400,
without synthetic italic or bold. The 404's headings, dates, artwork titles,
and credits use Le Raton. Longer descriptions and navigation retain the
existing serif face. The font selectors are confined to the 404, including
its enlarged artwork viewer and prerendered HTML.

## Rebuilding and editing

The saved vector data is sufficient to rebuild both fonts with FontTools
(built with 4.56.0):

```powershell
python scripts/build-le-raton-font.py
```

The builder reads `glyphs.json` and `spacing.json`, writes the TTF and WOFF, and updates the build
report. Fixed timestamps and fixed pen seeds make repeated builds identical.
The ordinary Vite build consumes these files without Python dependencies.

To revise an interpreted character, edit `draw-missing-glyphs.py`, then run:

```powershell
python scripts/font-source/le-raton/draw-missing-glyphs.py
python scripts/build-le-raton-font.py
```

This optional design step needs NumPy and OpenCV as well as FontTools. It
preserves traced ink geometry, generates missing forms, unions overlapping
pen strokes, applies the recorded layout translations, and writes the base
vector data again. Spacing translations are applied last to fresh raw traces
so repeated generation cannot accumulate offsets or move a reconstructed dot.

To repeat extraction, download the exact variants recorded in `sources.json`.
Save the original three as `raton.jpg`, `renard.jpg`, and `fouine.jpg` in one
folder, and the fifteen additional scans under their recorded
`localFilenameForExtraction` names in another. Extraction checks their hashes
and additionally needs Pillow:

```powershell
python scripts/font-source/le-raton/trace-margins.py .tmp/le-raton-font --additional-scan-directory .tmp/le-raton-font/research-more
python scripts/font-source/le-raton/draw-missing-glyphs.py
python scripts/build-le-raton-font.py
```

If the additional scan directory is omitted, the extraction step preserves
existing additional traces in `traced-glyphs.json`. Original scans and temporary
proof images are local research files, not runtime assets.
