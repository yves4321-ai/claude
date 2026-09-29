# Flyer Maker

A one-page web app for the EFC Instructor Certification Course flyers. Type
the course details once and it produces all six flyers, using the exact Canva
designs as backgrounds, so colors, photos, logos and layout stay untouched:

| Design | Output |
| --- | --- |
| Print flyer 8.5×11, light and dark | One PDF at 300 DPI: light is page 1, dark is page 2 |
| Social post 1080×1080, light and dark | Two PNGs |
| Story 1080×1920, light and dark | Two PNGs |

Changing fields: city, state, hosted by, date range, hours, address, price,
who it's open to (LEO or Public) and, on the 8.5×11 only, seats available.
Choosing LEO or Public also switches the "Designed for …" bullet and the fine
print on every flyer.

Text is set in Teko and Work Sans at the same sizes and positions as the
Bryan, TX flyers. It wraps inside each panel the way Canva does, never leaves
a single word alone on the last line, and only gets smaller when wrapping
can't make it fit. If something is still too long, the app says so under
that flyer.

## Using it

Open `index.html` through any web server (it can't run by double-clicking the
file). Fill in the form, then click **Download all flyers**. The last values
typed are remembered in the browser.

To run it locally: `python3 -m http.server` in this folder, then open
http://localhost:8000.

## How it's put together

- `sources/`: the Canva exports (8.5×11 PDF, story PDF, square PNGs) plus the
  Bryan, TX stories used to check the layout.
- `tools/build_backgrounds.py`: removes the changing text from the sources and
  writes the blank backgrounds to `templates/`. Rerun it after replacing a
  source file: `pip install pymupdf pillow numpy`, then
  `python3 tools/build_backgrounds.py`.
- `templates.js`: every text box's font, size, color and position, plus the
  wording for LEO and Public. Open the app with `?debug` on the end of the
  address to see the boxes outlined.
- `app.js`: the form, text layout, and PDF/PNG export.

Fonts (Teko, Work Sans), jsPDF and JSZip are stored in this repo, so the page
doesn't load anything from outside sites.
