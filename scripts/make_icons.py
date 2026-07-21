"""Genera los iconos de la app (monograma Z, negro con dorado) en public/.

Uso: venv/Scripts/python.exe scripts/make_icons.py
Requiere Pillow y la fuente Bodoni MT de Windows.
"""

import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public")
FONT = r"C:\Windows\Fonts\BOD_BI.TTF"  # Bodoni MT Bold Italic

INK = (43, 33, 24)      # --ink
GOLD = (193, 154, 75)   # --gold
GOLD_HI = (222, 189, 122)

S = 1024  # lienzo maestro


def canvas():
    return Image.new("RGBA", (S, S), INK + (255,))


def draw_z(img, frac):
    d = ImageDraw.Draw(img)
    fs = int(S * frac * 1.4)
    font = ImageFont.truetype(FONT, fs)
    l, t, r, b = d.textbbox((0, 0), "Z", font=font)
    fs = max(8, int(fs * (S * frac) / (b - t)))
    font = ImageFont.truetype(FONT, fs)
    l, t, r, b = d.textbbox((0, 0), "Z", font=font)
    d.text(((S - (r - l)) / 2 - l, (S - (b - t)) / 2 - t), "Z", font=font, fill=GOLD)


def draw_ring(img, inset, width):
    m = S * inset
    ImageDraw.Draw(img).ellipse(
        [m, m, S - m, S - m], outline=GOLD_HI, width=max(2, round(S * width))
    )


def build(z_frac, ring_inset=None):
    img = canvas()
    if ring_inset is not None:
        draw_ring(img, ring_inset, 0.004)
    draw_z(img, z_frac)
    return img


def rounded(img, frac=0.22):
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, S - 1, S - 1], radius=int(S * frac), fill=255
    )
    out = img.copy()
    out.putalpha(mask)
    return out


def save(img, name, size, round_corners=True):
    im = rounded(img) if round_corners else img
    im.resize((size, size), Image.LANCZOS).save(os.path.join(OUT, name))
    print(name, size)


ringed = build(0.34, ring_inset=0.10)  # Z dentro del circulo dorado
plain = build(0.44)                    # sin circulo, para tamaños chicos

save(ringed, "icon-192.png", 192)
save(ringed, "icon-512.png", 512)
save(ringed, "apple-touch-icon.png", 180, round_corners=False)  # iOS recorta solo
save(plain, "favicon-32.png", 32)

# maskable: full-bleed y contenido dentro de la zona segura (80% central)
save(build(0.30), "icon-maskable-512.png", 512, round_corners=False)

rounded(plain).resize((256, 256), Image.LANCZOS).save(
    os.path.join(OUT, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48), (64, 64)]
)
print("favicon.ico")
