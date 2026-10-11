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
- Family: `Le Raton`; style: `Regular`; version: `1.100`.
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

The builder reads `glyphs.json`, writes the TTF and WOFF, and updates the build
report. Fixed timestamps and fixed pen seeds make repeated builds identical.
The ordinary Vite build consumes these files without Python dependencies.

To revise an interpreted character, edit `draw-missing-glyphs.py`, then run:

```powershell
python scripts/font-source/le-raton/draw-missing-glyphs.py
python scripts/build-le-raton-font.py
```

This optional design step needs NumPy and OpenCV as well as FontTools. It
preserves every traced character and only generates missing forms, unions
overlapping pen strokes, and writes the base vector data again.

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
