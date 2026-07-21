# -*- coding: utf-8 -*-
"""One-off: arma el vestido naranja de rayas como prenda 360 (angles[]).
Reusa process() de import_photos.py. No hace commit."""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from import_photos import process, CATALOG, CUTOUTS  # noqa: E402
from rembg import new_session  # noqa: E402

NUEVAS = os.path.join(os.path.dirname(HERE), "public", "photos", "nuevas")

SLUG = "vestido_naranja_rayas"
# Orden de giro: frente -> 3/4 -> espalda -> frente. focus (fx,fy) sobre Zuleyka
# (centro-torso) para descartar a los perros del fondo.
FRAMES = [
    ("WhatsApp Image 2026-07-18 at 4.47.18 PM (1).jpeg", (0.50, 0.45)),  # frente
    ("WhatsApp Image 2026-07-18 at 4.47.17 PM (1).jpeg", (0.47, 0.45)),  # 3/4
    ("WhatsApp Image 2026-07-18 at 4.47.18 PM.jpeg",     (0.47, 0.40)),  # espalda
    ("WhatsApp Image 2026-07-18 at 4.47.17 PM.jpeg",     (0.47, 0.45)),  # frente 2
]

session = new_session("isnet-general-use")
os.makedirs(CUTOUTS, exist_ok=True)

angles = []
for i, (fname, focus) in enumerate(FRAMES):
    src = os.path.join(NUEVAS, fname)
    frame_slug = f"{SLUG}_{i}"
    process(src, frame_slug, focus=focus, session=session)
    angles.append(f"/photos/cutouts/{frame_slug}.webp")
    print(f"OK frame {i}: {frame_slug}.webp")

with open(CATALOG, encoding="utf-8") as f:
    catalog = json.load(f)

gid = "dl-" + SLUG
catalog = [g for g in catalog if g["id"] != gid]  # idempotente
entry = {
    "id": gid,
    "name": "Vestido naranja de rayas",
    "category": "dress",
    "primary_color": "orange",
    "pattern": "print",
    "style": "elegant",
    "season": "summer",
    "color": "orange",
    "fit_type": "regular",
    "image_path": f"/photos/{SLUG}_0.jpg",
    "analysis_status": "completed",
    "cutout_path": angles[0],
    "angles": angles,
}
catalog.append(entry)
with open(CATALOG, "w", encoding="utf-8") as f:
    json.dump(catalog, f, ensure_ascii=False, indent=2)

print(json.dumps(entry, ensure_ascii=False, indent=2))
