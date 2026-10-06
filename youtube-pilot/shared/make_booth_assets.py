#!/usr/bin/env python3
"""Draws The Confession Booth brand assets: logo, banner, thumbnail template.

    python shared/make_booth_assets.py
Writes to booth/assets/. Flat shapes drawn at 4x and downsampled for clean edges.
"""
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "booth", "assets")
FONTS = os.path.join(ROOT, "shared", "fonts")
BG = (0x14, 0x11, 0x18)
AMBER = (0xF5, 0xA5, 0x24)
CREAM = (0xF5, 0xEF, 0xE6)
SS = 4  # supersample factor


def font(name, size):
    return ImageFont.truetype(os.path.join(FONTS, name), size)


def bubble_mask(size, keyhole=True):
    """Speech bubble with a keyhole cutout, as an L-mode mask of `size` px square."""
    s = size * SS
    m = Image.new("L", (s, s), 0)
    d = ImageDraw.Draw(m)
    # bubble body
    x0, y0, x1, y1 = 0.10 * s, 0.14 * s, 0.90 * s, 0.72 * s
    d.rounded_rectangle([x0, y0, x1, y1], radius=0.16 * s, fill=255)
    # tail, bottom left
    d.polygon([(0.26 * s, 0.68 * s), (0.46 * s, 0.68 * s), (0.22 * s, 0.88 * s)], fill=255)
    if keyhole:
        cx, cy, r = 0.50 * s, 0.37 * s, 0.085 * s
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=0)
        d.polygon([(cx - 0.045 * s, cy + 0.03 * s), (cx + 0.045 * s, cy + 0.03 * s),
                   (cx + 0.075 * s, 0.60 * s), (cx - 0.075 * s, 0.60 * s)], fill=0)
    return m.resize((size, size), Image.LANCZOS)


def logo(size=800):
    img = Image.new("RGB", (size, size), BG)
    img.paste(Image.new("RGB", (size, size), AMBER), (0, 0), bubble_mask(size))
    return img


def banner():
    """Title and tagline stay inside the 1546x423 centered safe area."""
    W, H = 2560, 1440
    img = Image.new("RGB", (W, H), BG)
    # oversized soft bubbles, low opacity, blurred
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for (sz, x, y, a, flip) in [(1300, -260, -180, 34, False), (1100, 1700, 520, 28, True),
                                (700, 1450, -260, 18, False), (560, 250, 980, 16, True)]:
        m = bubble_mask(sz, keyhole=False)
        if flip:
            m = m.transpose(Image.FLIP_LEFT_RIGHT)
        tint = Image.new("RGBA", (sz, sz), AMBER + (0,))
        tint.putalpha(m.point(lambda v: v * a // 255))
        layer.alpha_composite(tint, (x, y))
    layer = layer.filter(ImageFilter.GaussianBlur(18))
    img = Image.alpha_composite(img.convert("RGBA"), layer)
    d = ImageDraw.Draw(img)
    # text inside the 1546x423 centered safe area (x 507-2053, y 508-931)
    title = "THE CONFESSION BOOTH"
    f = font("Anton-Regular.ttf", 176)
    tw = d.textlength(title, font=f)
    d.text(((W - tw) / 2, 565), title, font=f, fill=CREAM)
    tag = "The internet's wildest confessions, read aloud."
    ft = font("Inter-Medium.ttf", 54)
    tgw = d.textlength(tag, font=ft)
    d.rectangle([(W - 180) / 2, 818, (W + 180) / 2, 826], fill=AMBER)
    d.text(((W - tgw) / 2, 846), tag, font=ft, fill=CREAM)
    return img.convert("RGB")


def thumb_template(sample_words=None):
    W, H = 1280, 720
    img = Image.new("RGB", (W, H), BG)
    # dark diagonal gradient: warm plum at top right fading to near-black
    grad = Image.new("RGB", (W, H))
    px = grad.load()
    for y in range(H):
        for x in range(W):
            t = min(1.0, max(0.0, (x / W) * 0.7 + (1 - y / H) * 0.3))
            px[x, y] = tuple(int(BG[i] + (c - BG[i]) * t) for i, c in enumerate((0x3A, 0x22, 0x2E)))
    img = grad
    d = ImageDraw.Draw(img)
    # scene slot on the right: dim panel that the AI scene crop replaces
    slot = Image.new("L", (W, H), 0)
    ImageDraw.Draw(slot).rounded_rectangle([640, 40, 1240, 680], radius=28, fill=70)
    img.paste(Image.new("RGB", (W, H), (0x2A, 0x24, 0x30)), (0, 0), slot)
    # amber underline accent under the text block
    d.rectangle([64, 592, 404, 608], fill=AMBER)
    if sample_words:
        f = font("Anton-Regular.ttf", 150)
        y = 560 - 18 - 165 * len(sample_words)
        for w in sample_words:
            d.text((64, y), w, font=f, fill=CREAM)
            y += 165
    # small booth logo, bottom right, no background box
    img.paste(Image.new("RGB", (96, 96), AMBER), (W - 96 - 28, H - 96 - 20), bubble_mask(96))
    return img


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    logo().save(os.path.join(OUT, "logo.png"))
    banner().save(os.path.join(OUT, "banner.png"))
    thumb_template().save(os.path.join(OUT, "thumb-template.png"))
    thumb_template(["SHE SAID", "WHAT?"]).save(os.path.join(OUT, "thumb-sample.png"))
    for n in sorted(os.listdir(OUT)):
        im = Image.open(os.path.join(OUT, n))
        print(f"{n}: {im.size[0]}x{im.size[1]}")
