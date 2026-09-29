"""Build the blank flyer backgrounds in templates/ from the Canva exports in sources/.

Only the text that changes from course to course is removed. Everything else
(photos, logos, icons, fixed text) is left exactly as exported from Canva.

    pip install pymupdf pillow numpy
    python3 tools/build_backgrounds.py

Vector sources (the PDFs) have their changing text deleted. The square designs
only exist as images, so their changing text is painted over with the flat
panel color it sits on.
"""

from pathlib import Path

import numpy as np
import pymupdf
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCES = ROOT / "sources"
OUT = ROOT / "templates"

# Text on these PDF pages that changes per course. A span is removed when its
# text starts with one of these prefixes.
PRINT_CHANGING = [
    "BRYAN, TX", "TEXAS A&M", "SERVICE (TEEX", "Designed for", "June 29", "0800hrs",
    "Texas A&M", "Extension Service", "(TEEX)", "Bldg 7751", "Campus, Bryan",
    "Limited Space", "Limited Spots", "Open to LEO", "LEO ONLY", "Cost", " $1467", " per person",
]
STORY_CHANGING = [
    "MYRTLE BEACH", "OKLAHOMA CITY", "HOSTED BY", "GEORGETOWN", "& KILO", "MOORE", "Designed for",
    "Security & Military", "personnel, by", "February", "March", "2026", "0800hrs", "1630hrs",
    "Kilo Delta", "George Bishop", "Parkway", "SC 29579", "MetroTech", "Campus) Public",
    "Academy, 4901", "Oklahoma City OK", "*Limited", "Will Sell Out", "Open to LEO", "(LE &",
    "$1397", " per person",
]

PDF_PAGES = [
    # source file, page, output name, pixels per PDF point, changing text
    ("flyer-8.5x11.pdf", 0, "print-light", 300 / 72, PRINT_CHANGING),
    ("flyer-8.5x11.pdf", 1, "print-dark", 300 / 72, PRINT_CHANGING),
    ("story-1080x1920.pdf", 0, "story-light", 4 / 3, STORY_CHANGING),
    ("story-1080x1920.pdf", 1, "story-dark", 4 / 3, STORY_CHANGING),
]

# Rectangles (x0, y0, x1, y1 in pixels) holding changing text on the square
# images. Each is filled with the median color of its own border.
SQUARE_ERASE = {
    "square-light": [
        (40, 166, 432, 232),  # city
        (40, 480, 586, 555),  # host name
        (78, 620, 580, 656),  # "Designed for ..." bullet
        (712, 600, 1076, 642),  # date
        (712, 686, 1076, 722),  # hours
        (712, 755, 1076, 885),  # address
        (60, 940, 590, 1008),  # cost
        (60, 1010, 590, 1058),  # fine print
    ],
    "square-dark": [
        (40, 166, 408, 232),
        (40, 482, 586, 556),
        (78, 620, 580, 656),
        (712, 600, 1076, 642),
        (712, 686, 1076, 722),
        (712, 755, 1076, 885),
        (40, 940, 586, 1008),
        (40, 1010, 586, 1058),
    ],
}


def build_pdf_page(source, page_no, name, scale, changing):
    doc = pymupdf.open(SOURCES / source)
    page = doc[page_no]
    removed = []
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            for span in line["spans"]:
                if any(span["text"].startswith(p) for p in changing):
                    # Cover only from the baseline up to cap height, so text on
                    # the lines just above and below is never caught.
                    x0, _, x1, _ = span["bbox"]
                    baseline = span["origin"][1]
                    r = pymupdf.Rect(x0, baseline - span["size"] * 0.5, x1, baseline - span["size"] * 0.1)
                    page.add_redact_annot(r)
                    removed.append(span["text"])
    page.apply_redactions(
        images=pymupdf.PDF_REDACT_IMAGE_NONE,
        graphics=pymupdf.PDF_REDACT_LINE_ART_NONE,
        text=pymupdf.PDF_REDACT_TEXT_REMOVE,
    )
    pix = page.get_pixmap(matrix=pymupdf.Matrix(scale, scale), alpha=False)
    pix.save(OUT / f"{name}.png")
    print(f"{name}: {pix.width}x{pix.height}, removed {len(removed)} text lines")


def border_color(pixels, x0, y0, x1, y1):
    edge = np.concatenate([
        pixels[y0, x0:x1], pixels[y1 - 1, x0:x1], pixels[y0:y1, x0], pixels[y0:y1, x1 - 1],
    ])
    return np.median(edge, axis=0).astype(np.uint8)


def build_square(name):
    pixels = np.array(Image.open(SOURCES / f"{name}.png").convert("RGB"))
    for x0, y0, x1, y1 in SQUARE_ERASE[name]:
        pixels[y0:y1, x0:x1] = border_color(pixels, x0, y0, x1, y1)
    Image.fromarray(pixels).save(OUT / f"{name}.png", optimize=True)
    print(f"{name}: erased {len(SQUARE_ERASE[name])} areas")


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    for args in PDF_PAGES:
        build_pdf_page(*args)
    for name in SQUARE_ERASE:
        build_square(name)
