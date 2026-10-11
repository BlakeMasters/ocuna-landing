# 404 raccoon gallery

The missing-page gallery is a selection of six historical illustrations, ordered
by the date of the drawing or scanned edition. It is not an exhaustive history.
Research and retrieval date: October 10, 2026.

The shared metadata in `src/content/raccoonGallery.js` drives the React page and
the prerendered `404.html`. Assets are hosted locally in
`site-public/raccoon-gallery/`, with smaller images for the gallery and larger
images for the viewer. The complete scans are retained in both sizes; only
resizing and WebP encoding were applied. Download URLs, original dimensions,
original SHA-256 hashes, and derivative dimensions are recorded in that folder’s
`sources.json`.

| Date | Work and credit | Verified source and rights |
| --- | --- | --- |
| 1756 | *Le Raton*, Jacques de Sève. A drawing for Buffon’s 1760 natural-history volume. | [Wikimedia Commons record](https://commons.wikimedia.org/wiki/File:Le_Raton._-_dessin_-_De_Seve_1756._-_btv1b10528231v.jpg), drawing held by the [Bibliothèque nationale de France](https://gallica.bnf.fr/ark:/12148/btv1b10528231v). The record dates the drawing to 1756 and marks it public domain. |
| 1845 | *Raccoon, male*, John James Audubon; lithographed, printed, and colored by John T. Bowen. | [Amon Carter Museum of American Art, 1965.147](https://www.cartermuseum.org/collection/procyon-lotor-cuvier-raccoon-male-natural-size-1965147). The museum dates this print to 1845, identifies the medium as lithograph with applied watercolor, and marks it public domain. The museum’s own scan is used; the enhanced Rawpixel copy was not used. |
| 1869 | “The Racoon” from *Picture Natural History*, a book credited to Mary E. C. Boutell. | [Wikimedia Commons record](https://commons.wikimedia.org/wiki/File:Picture_Natural_History_-_No_17_-_The_Racoon.png). Dated 1869 and marked public domain. The [digitized Oxford copy](https://books.google.com/books/about/Picture_natural_history_with_600_illustr.html?id=jYIDAAAAQAAJ) identifies Boutell as the text’s author. The illustrator is not identified, so the gallery credits her as the book’s author. |
| 1902 | Figure 213 from *The Cambridge Natural History*, volume X, *Mammalia*, by Frank E. Beddard. | [Wikimedia Commons record](https://commons.wikimedia.org/wiki/File:Cambridge_Natural_History_Mammalia_Fig_213.jpg). The current imageinfo metadata confirms 1902 and public-domain status. The existing local JPEG was used as the source; Beddard is credited as the book’s author. |
| 1907 | Plate 4 from *Tenants of the Trees*, illustrated by Louis Rhead, book by Clarence Hawkes. | [Wikimedia Commons record](https://commons.wikimedia.org/wiki/File:Tenants_of_the_trees_(Plate_4)_(7067436015).jpg), from the [Biodiversity Heritage Library](https://www.biodiversitylibrary.org/page/6478781). Current imageinfo metadata confirms 1907, Rhead’s illustration credit in the description, and public-domain status. The existing local JPEG was used. |
| 1918 | Page 3 illustration from *The Adventures of Bobby Coon*, Harrison Cady, book by Thornton W. Burgess. | [Project Gutenberg’s digitized edition](https://www.gutenberg.org/cache/epub/46951/pg46951-images.html) identifies Cady and gives 1918 on the title page. The [catalog record](https://www.gutenberg.org/ebooks/46951) states public domain in the United States; the gallery preserves that territorial qualification. |

The original artwork, digitization date, and upload date are distinct. In
particular, the 1756 drawing predates the 1760 volume, the Audubon print’s own
inscription establishes 1845, and the Cady entry follows the digitized 1918
edition rather than a later 1920 edition or Gutenberg’s 2014 release date.
