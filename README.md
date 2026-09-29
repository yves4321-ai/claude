# Flyer Maker

A one-page web app that fills in the changing text on the course flyers
(city, state, hosted by, dates, hours, address, price, LEO/Public, seats) and
downloads every flyer at once. The Canva designs are used as untouched
background images, so colors, logos and layout stay exactly as designed.

- **Print flyer:** 8.5×11 PDF at 300 DPI
- **Social post:** 1080×1080 PNG
- **Story:** 1080×1920 PNG

Text wraps inside each flyer's margins, lines are balanced so a single word
isn't left on its own line, and text only shrinks when wrapping can't make it
fit. If something is still too long, the app says so under that flyer.

## Using it

Open `index.html` through any web server (it can't run by double-clicking the
file). Type the course details once, then click **Download all flyers**. The
last values typed are remembered in the browser.

To run it locally: `python3 -m http.server` in this folder, then open
http://localhost:8000.

## Adding or updating a template

1. In Canva, make a copy of the design, delete only the text that changes, and
   download it as PNG (or PDF Print for the 8.5×11).
2. Save it in `templates/` using the file name set in `templates.js`
   (`print.png`, `square.png`, `story.png`). Convert a PDF to a 2550×3300 PNG.
3. Adjust the text box positions in `templates.js`. Open the app with
   `?debug` on the end of the address to see the box outlines.

Everything the page needs (Work Sans font, jsPDF, JSZip) is stored in this
repo, so the page doesn't load anything from outside sites.
