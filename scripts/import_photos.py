# -*- coding: utf-8 -*-
"""Importa fotos al closet: miniatura + recorte rembg + entrada en el catalogo.

Uso (una foto, con metadata):
  python scripts/import_photos.py foto.jpg --slug blusa_azul --name "Blusa Azul" \
      --category top --color blue [--pattern solid --style casual --season summer] \
      [--crop l,t,r,b]

Uso (carpeta inbox/, metadata por defecto — editar el catalogo despues):
  python scripts/import_photos.py --inbox
"""
import argparse, json, os, re, sys, unicodedata

import numpy as np
from PIL import Image, ImageOps
from rembg import remove, new_session
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PHOTOS = os.path.join(ROOT, "public", "photos")
CUTOUTS = os.path.join(PHOTOS, "cutouts")
CATALOG = os.path.join(ROOT, "data", "garments-catalog.json")
INBOX = os.path.join(ROOT, "inbox")
EXTS = (".jpg", ".jpeg", ".png", ".webp", ".heic")

# Paleta cerrada = misma que COLOR_HEX en lib/closet.ts, para que el color
# adivinado siempre tenga swatch en la UI.
COLOR_PALETTE = {
    "black": (31, 27, 22), "white": (245, 241, 234), "brown": (139, 90, 60),
    "burgundy": (122, 47, 61), "gold": (201, 162, 75), "green": (46, 125, 91),
    "mint": (168, 216, 200), "olive": (122, 122, 69), "orange": (217, 116, 52),
    "red": (192, 48, 40), "yellow": (229, 185, 60), "blue": (58, 93, 168),
    "pink": (217, 138, 168), "gray": (154, 147, 138),
}

# Mismas etiquetas que CATEGORY_LABELS/COLOR_LABELS en lib/closet.ts, para
# generar un nombre legible cuando no se pasa --name.
CATEGORY_LABELS_ES = {
    "top": "Top", "bottom": "Bajo", "dress": "Vestido",
    "outerwear": "Abrigo", "outfit": "Conjunto",
}
COLOR_LABELS_ES = {
    "black": "Negro", "white": "Blanco", "brown": "Café", "burgundy": "Guinda",
    "gold": "Dorado", "green": "Verde", "mint": "Menta", "multicolor": "Multicolor",
    "olive": "Oliva", "orange": "Naranja", "red": "Rojo", "yellow": "Amarillo",
    "blue": "Azul", "pink": "Rosa", "gray": "Gris",
}


def guess_name(category, color, pattern):
    base = f"{CATEGORY_LABELS_ES.get(category, category)} {COLOR_LABELS_ES.get(color, color)}"
    if pattern == "print":
        base += " Estampado"
    return base


def slugify(name):
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_") or "prenda"


def guess_attributes(cutout):
    """Heuristica local (sin API): color/patron desde los pixeles reales del
    recorte (no de toda la foto), categoria desde la proporcion alto/ancho.
    Es aproximada — pensada como punto de partida editable, no un veredicto."""
    a = np.array(cutout.convert("RGBA"))
    mask = a[:, :, 3] > 40
    pixels = a[:, :, :3][mask].astype(float)

    if pixels.size == 0:
        color, pattern = "multicolor", "solid"
    else:
        spread = pixels.std(axis=0).sum()
        mean_rgb = pixels.mean(axis=0)
        if spread > 90:
            color, pattern = "multicolor", "print"
        else:
            color = min(COLOR_PALETTE, key=lambda c: np.linalg.norm(np.array(COLOR_PALETTE[c]) - mean_rgb))
            pattern = "solid"

    h, w = mask.shape
    ratio = h / w if w else 1
    if ratio < 1.3:
        category = "top"
    elif ratio < 2.1:
        category = "outerwear"
    else:
        category = "outfit"

    return {
        "category": category, "color": color, "pattern": pattern,
        "style": "casual", "season": "all",
        "name": guess_name(category, color, pattern),
    }


def process(src, slug, crop=None, focus=None, session=None):
    """foto -> public/photos/<slug>.jpg + public/photos/cutouts/<slug>.webp

    focus: (fx, fy) fracciones dentro de `region` que caen sobre la persona a
    conservar. Cuando se da, se queda con TODO el componente conectado que
    toca ese punto (sin filtrar por tamano) — asi, si otra persona se
    superpone (un brazo, una mano encima), esa parte se queda pegada a la
    figura en vez de arriesgarse a truncarla. Sin focus se usa el filtro por
    tamano de siempre (sirve para fotos de una sola prenda/persona)."""
    session = session or new_session("isnet-general-use")
    im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    im.thumbnail((1200, 1200))
    im.save(os.path.join(PHOTOS, slug + ".jpg"), quality=82)

    region = im
    if crop:
        w, h = im.size
        l, t, r, b = crop
        region = im.crop((int(l * w), int(t * h), int(r * w), int(b * h)))

    cut = remove(region, session=session)
    a = np.array(cut)
    mask = a[:, :, 3] > 40
    lab, n = ndimage.label(mask)
    if n > 1:
        if focus:
            fw, fh = region.size
            fx, fy = int(focus[0] * fw), int(focus[1] * fh)
            ys, xs = np.nonzero(mask)
            nearest = np.argmin((xs - fx) ** 2 + (ys - fy) ** 2)
            keep_label = lab[ys[nearest], xs[nearest]]
            a[:, :, 3] = np.where(lab == keep_label, a[:, :, 3], 0)
        else:
            sizes = ndimage.sum(mask, lab, range(1, n + 1))
            keep = [i + 1 for i, s in enumerate(sizes) if s >= 0.15 * sizes.max()]
            a[:, :, 3] = np.where(np.isin(lab, keep), a[:, :, 3], 0)
    cut = Image.fromarray(a)
    bbox = cut.getbbox()
    if not bbox:
        raise RuntimeError("rembg no encontro ninguna figura en la foto")
    cut = cut.crop(bbox)
    pad = int(max(cut.size) * 0.04)
    canvas = Image.new("RGBA", (cut.width + 2 * pad, cut.height + 2 * pad), (0, 0, 0, 0))
    canvas.paste(cut, (pad, pad))
    canvas.thumbnail((900, 900))
    canvas.save(os.path.join(CUTOUTS, slug + ".webp"), "WEBP")
    return guess_attributes(canvas)


def add_entry(slug, name, category, color, pattern, style, season):
    with open(CATALOG, encoding="utf-8") as f:
        catalog = json.load(f)
    gid = "dl-" + slug
    if any(g["id"] == gid for g in catalog):
        raise RuntimeError(f"ya existe una prenda con id {gid}")
    entry = {
        "id": gid, "name": name, "category": category,
        "primary_color": color, "pattern": pattern, "style": style,
        "season": season, "color": color, "fit_type": "regular",
        "image_path": f"/photos/{slug}.jpg",
        "analysis_status": "completed",
        "cutout_path": f"/photos/cutouts/{slug}.webp",
    }
    catalog.append(entry)
    with open(CATALOG, "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)
    return entry


def main():
    p = argparse.ArgumentParser()
    p.add_argument("photo", nargs="?", help="ruta de la foto")
    p.add_argument("--inbox", action="store_true", help="procesar todo inbox/")
    p.add_argument("--slug")
    p.add_argument("--name")
    p.add_argument("--category", default=None,
                   choices=["top", "bottom", "dress", "outerwear", "outfit"],
                   help="si se omite, se adivina por heuristica local")
    p.add_argument("--color", default=None, help="si se omite, se adivina por heuristica local")
    p.add_argument("--pattern", default=None, help="si se omite, se adivina por heuristica local")
    p.add_argument("--style", default=None, help="si se omite, se usa 'casual'")
    p.add_argument("--season", default=None, help="si se omite, se usa 'all'")
    p.add_argument("--crop", help="fracciones l,t,r,b (ej. 0.3,0.1,0.7,1.0)")
    p.add_argument("--focus", help="fracciones fx,fy sobre un punto de la persona a conservar "
                                    "cuando se superpone con otra (ej. 0.8,0.5)")
    args = p.parse_args()

    os.makedirs(CUTOUTS, exist_ok=True)
    crop = tuple(float(x) for x in args.crop.split(",")) if args.crop else None
    focus = tuple(float(x) for x in args.focus.split(",")) if args.focus else None
    session = new_session("isnet-general-use")

    if args.inbox:
        os.makedirs(INBOX, exist_ok=True)
        files = [os.path.join(INBOX, f) for f in sorted(os.listdir(INBOX))
                 if f.lower().endswith(EXTS)]
        if not files:
            print("inbox/ vacio — pon ahi las fotos nuevas y vuelve a correr")
            return
        done = os.path.join(INBOX, "procesadas")
        os.makedirs(done, exist_ok=True)
        for f in files:
            slug = slugify(os.path.splitext(os.path.basename(f))[0])
            try:
                guess = process(f, slug, session=session)
                add_entry(slug, guess["name"],
                          args.category or guess["category"], args.color or guess["color"],
                          args.pattern or guess["pattern"], args.style or guess["style"],
                          args.season or guess["season"])
                os.replace(f, os.path.join(done, os.path.basename(f)))
                print(f"OK {slug}")
            except Exception as e:
                print(f"ERROR {slug}: {e}", file=sys.stderr)
        return

    if not args.photo:
        p.error("da una foto o usa --inbox")
    slug = args.slug or slugify(args.name or os.path.splitext(os.path.basename(args.photo))[0])
    guess = process(args.photo, slug, crop=crop, focus=focus, session=session)
    name = args.name or guess["name"]
    entry = add_entry(slug, name,
                      args.category or guess["category"], args.color or guess["color"],
                      args.pattern or guess["pattern"], args.style or guess["style"],
                      args.season or guess["season"])
    print(json.dumps(entry, ensure_ascii=False))


if __name__ == "__main__":
    main()
