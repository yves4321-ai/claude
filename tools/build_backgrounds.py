"""Build the blank flyer backgrounds in templates/ from the Canva exports in sources/.

Only the text that changes from course to course is removed. Everything else
(photos, logos, icons, fixed text) is left exactly as exported from Canva.

    pip install pymupdf pillow numpy fonttools brotli
    python3 tools/build_backgrounds.py

Vector sources (the PDFs) have their changing text deleted. The Level 1 square
designs only exist as images, so their changing text is painted over with the
flat panel color it sits on.

Level 2 only came as dark designs. Its light versions are made from the same
files: the dark background layer and the title's dark shadow are removed
(leaving the white page underneath), white text is set again in black with the
same font, size and position, and the white EFC logo and divider are flipped
to black.
"""

import tempfile
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


# ---------- Level 2 ----------

FONTS = ROOT / "fonts"
FONT_FILES = {  # PDF font name -> our copy of the same font
    "Teko-Light": "Teko-300", "Teko-Medium": "Teko-500", "Teko-SemiBold": "Teko-600",
    "WorkSans-Medium": "WorkSans-500",
}
L2_CHANGING = [
    "HOSTED BY", " MONROEVILLE", " BLACK RIVER", "TRAINING ACADEMY", "AUG 30", "NOV 29",
    "Monroeville", "Training Center", "2465 Johnston", "Black River", "College/Law",
    "Training Academy", "1410 HWY", "Pocahontas",
]
L2_KEEP_WHITE = ["LEARN MORE AT"]  # sits on the olive button in both versions

L2_PAGES = [
    # source, output name, pixels per point, logo rect in points (white EFC logo)
    ("l2-flyer-8.5x11.pdf", "l2-print", 300 / 72, (26, 39, 189, 114)),
    ("l2-story-1080x1920.pdf", "l2-story", 4 / 3, (59, 103, 252, 187)),
    ("l2-square-1080x1080.pdf", "l2-square", 4 / 3, (56, 44, 231, 123)),
]


def ttf_fonts(tmp):
    """Converts the page's .woff2 fonts to .ttf files PyMuPDF can embed."""
    from fontTools.ttLib import TTFont

    paths = {}
    for pdf_name, ours in FONT_FILES.items():
        font = TTFont(FONTS / f"{ours}.woff2")
        font.flavor = None
        path = Path(tmp) / f"{ours}.ttf"
        font.save(path)
        paths[pdf_name] = path
    return paths


def spans(page):
    for block in page.get_text("rawdict")["blocks"]:
        for line in block.get("lines", []):
            for span in line["spans"]:
                span["text"] = "".join(c["c"] for c in span["chars"])
                if span["text"].strip():
                    yield span


def put_text(page, span, fonts, color=None):
    """Sets a span again, letter by letter at Canva's own positions, so its
    letter spacing is kept exactly."""
    rgb = color or pymupdf.sRGB_to_pdf(span["color"])
    for char in span["chars"]:
        if char["c"].strip():
            page.insert_text(
                char["origin"], char["c"], fontsize=span["size"], color=rgb,
                fontname=FONT_FILES[span["font"]].replace("-", ""), fontfile=str(fonts[span["font"]]),
            )


def redact(page, targets, fonts):
    """Removes the target spans. Teko's tall letters can overlap the line
    above, so any other text caught by the removal is put back."""
    key = lambda s: (s["text"], round(s["origin"][0]), round(s["origin"][1]))
    target_keys = {key(s) for s in targets}
    before = [s for s in spans(page) if key(s) not in target_keys]
    for span in targets:
        x0, _, x1, _ = span["bbox"]
        baseline = span["origin"][1]
        page.add_redact_annot(pymupdf.Rect(x0, baseline - span["size"] * 0.5, x1, baseline - span["size"] * 0.1))
    page.apply_redactions(
        images=pymupdf.PDF_REDACT_IMAGE_NONE,
        graphics=pymupdf.PDF_REDACT_LINE_ART_NONE,
        text=pymupdf.PDF_REDACT_TEXT_REMOVE,
    )
    after = list(spans(page))
    after_keys = {key(s) for s in after}
    damaged = [s for s in before if key(s) not in after_keys]
    # Clear what's left of a partly removed line, then set the whole line again.
    leftovers = [
        s for s in after
        if key(s) not in {key(b) for b in before}
        and any(abs(s["origin"][1] - d["origin"][1]) < 1 and pymupdf.Rect(s["bbox"]).intersects(d["bbox"]) for d in damaged)
    ]
    if leftovers:
        for span in leftovers:
            page.add_redact_annot(pymupdf.Rect(span["bbox"]).intersect(pymupdf.Rect(
                span["bbox"][0], span["origin"][1] - span["size"] * 0.5, span["bbox"][2], span["origin"][1] - span["size"] * 0.1)))
        page.apply_redactions(
            images=pymupdf.PDF_REDACT_IMAGE_NONE,
            graphics=pymupdf.PDF_REDACT_LINE_ART_NONE,
            text=pymupdf.PDF_REDACT_TEXT_REMOVE,
        )
    for span in damaged:
        put_text(page, span, fonts)


def is_changing(span):
    return any(span["text"].startswith(p) for p in L2_CHANGING)


def build_l2_dark(source, name, scale, fonts):
    doc = pymupdf.open(SOURCES / source)
    page = doc[0]
    changing = [s for s in spans(page) if is_changing(s)]
    redact(page, changing, fonts)
    pix = page.get_pixmap(matrix=pymupdf.Matrix(scale, scale), alpha=False)
    pix.save(OUT / f"{name}-dark.png")
    print(f"{name}-dark: {pix.width}x{pix.height}, removed {len(changing)} text lines")


def build_l2_light(source, name, scale, logo, fonts):
    doc = pymupdf.open(SOURCES / source)
    page = doc[0]

    # The first thing drawn on the white page is the dark background (/X4).
    xref = page.get_contents()[0]
    stream = doc.xref_stream(xref)
    assert b"/X4 Do" in stream, "dark background layer not found"
    doc.update_stream(xref, stream.replace(b"/X4 Do", b"", 1))

    # The blurred dark shadow behind "LEVEL 2 ADVANCED INSTRUCTOR" would look
    # like a smudge on white.
    title = next(s for s in spans(page) if s["text"].startswith("INSTRUCTOR"))
    middle = pymupdf.Rect(title["bbox"]).tl + (pymupdf.Rect(title["bbox"]).br - pymupdf.Rect(title["bbox"]).tl) * 0.5
    shadow = next(
        info for info in page.get_images(full=True)
        if middle in page.get_image_bbox(info) and page.get_image_bbox(info).width < page.rect.width
    )
    page.delete_image(shadow[0])

    all_spans = list(spans(page))
    changing = [s for s in all_spans if is_changing(s)]
    white = [
        s for s in all_spans
        if s["color"] == 0xFFFFFF and not is_changing(s) and not any(s["text"].startswith(k) for k in L2_KEEP_WHITE)
    ]
    redact(page, changing + white, fonts)
    for span in white:
        put_text(page, span, fonts, color=(0, 0, 0))

    # White divider line under the address -> black.
    for drawing in page.get_drawings():
        if drawing.get("color") == (1.0, 1.0, 1.0) and drawing["rect"].height < 1:
            r = drawing["rect"]
            width = drawing.get("width") or 3
            page.draw_rect(pymupdf.Rect(r.x0, r.y0 - width / 2, r.x1, r.y0 + width / 2), color=None, fill=(0, 0, 0))

    pix = page.get_pixmap(matrix=pymupdf.Matrix(scale, scale), alpha=False)
    image = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)

    # Flip the white-on-black logo to black-on-white, taken from the dark original.
    original = pymupdf.open(SOURCES / source)[0]
    clip = pymupdf.Rect(logo)
    logo_pix = original.get_pixmap(matrix=pymupdf.Matrix(scale, scale), clip=clip, alpha=False)
    flipped = 255 - np.array(Image.frombytes("RGB", (logo_pix.width, logo_pix.height), logo_pix.samples))
    flipped[flipped.min(axis=2) > 225] = 255
    image.paste(Image.fromarray(flipped.astype(np.uint8)), (round(clip.x0 * scale), round(clip.y0 * scale)))

    image.save(OUT / f"{name}-light.png", optimize=True)
    print(f"{name}-light: {pix.width}x{pix.height}, recolored {len(white)} text lines")


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    for args in PDF_PAGES:
        build_pdf_page(*args)
    for name in SQUARE_ERASE:
        build_square(name)
    with tempfile.TemporaryDirectory() as tmp:
        fonts = ttf_fonts(tmp)
        for source, name, scale, logo in L2_PAGES:
            build_l2_dark(source, name, scale, fonts)
            build_l2_light(source, name, scale, logo, fonts)
