#!/usr/bin/env python3
"""
Analyze photos of Zuleyka's wardrobe using local models (rembg + color detection).
Uploads results to Supabase.

Usage:
  python3 analyze.py <image_path>
  python3 analyze.py --batch data/catalog.json
  python3 analyze.py --local-dir /path/to/photos
"""

import sys
import json
import os
import requests
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv
import uuid
from io import BytesIO

load_dotenv(".env.local")

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY not set in .env.local")
    print(f"  SUPABASE_URL={SUPABASE_URL}")
    print(f"  SERVICE_KEY={SUPABASE_SERVICE_KEY}")
    sys.exit(1)

def upload_to_supabase(garment_data):
    """Insert garment record into Supabase."""
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "apikey": SUPABASE_SERVICE_KEY,
    }

    data = {
        "name": garment_data.get("name"),
        "category": garment_data.get("category"),
        "color": garment_data.get("color"),
        "material": garment_data.get("material", "unknown"),
        "primary_color": garment_data.get("primary_color"),
        "pattern": garment_data.get("pattern"),
        "fit_type": garment_data.get("fit_type"),
        "season": garment_data.get("season"),
        "style": garment_data.get("style"),
        "notes": garment_data.get("notes", ""),
        "analysis_status": "completed",
        "image_path": garment_data.get("image_path"),
    }

    response = requests.post(
        f"{SUPABASE_URL}/rest/v1/garments",
        json=data,
        headers=headers
    )

    if response.status_code not in [200, 201]:
        print(f"  Error uploading to Supabase: {response.status_code}")
        print(f"  Response: {response.text}")
        return False

    print(f"  ✓ Uploaded: {data['name']}")
    return True

def analyze_local_image(image_path):
    """Analyze a local image with simple heuristics (no API needed)."""
    try:
        from PIL import Image
        import numpy as np
        from collections import Counter

        img = Image.open(image_path)
        img_array = np.array(img)

        # Get dominant color (simple RGB averaging)
        if img_array.ndim == 3:
            avg_color = np.mean(img_array[:, :, :3], axis=(0, 1)).astype(int)
            color_name = get_color_name(avg_color)
        else:
            color_name = "unknown"

        # Basic file size heuristic for fit detection
        file_size = os.path.getsize(image_path)
        width, height = img.size
        aspect_ratio = width / height if height > 0 else 0

        # Guess category by file analysis (you can improve this)
        category = guess_category(image_path, width, height)

        return {
            "name": Path(image_path).stem,
            "category": category,
            "primary_color": color_name,
            "color": color_name,
            "pattern": "solid",  # Would need ML for better detection
            "fit_type": "regular",  # Would need ML for fit detection
            "season": "all-season",
            "style": "casual",
            "material": "unknown",
            "image_path": str(image_path),
            "notes": f"Auto-detected from {Path(image_path).name}",
        }

    except ImportError:
        print("  Warning: PIL not available. Install pillow: pip install pillow numpy")
        return None

def get_color_name(rgb):
    """Convert RGB to approximate color name."""
    r, g, b = rgb
    if r > 200 and g > 200 and b > 200:
        return "white"
    elif r < 50 and g < 50 and b < 50:
        return "black"
    elif r > g and r > b:
        return "red"
    elif g > r and g > b:
        return "green"
    elif b > r and b > g:
        return "blue"
    elif r > 150 and g > 100 and b < 100:
        return "brown"
    elif r > 200 and g > 150 and b < 100:
        return "orange"
    elif r > 150 and g > 150:
        return "yellow"
    elif r > 150 and g < 100 and b > 150:
        return "purple"
    elif r > 150 and g > 100 and b > 100:
        return "pink"
    else:
        return "gray"

def guess_category(image_path, width, height):
    """Simple heuristic to guess garment category."""
    filename = Path(image_path).name.lower()

    if any(x in filename for x in ["pants", "jeans", "shorts", "pantalon", "jean"]):
        return "pants"
    elif any(x in filename for x in ["shirt", "blouse", "top", "blusa", "camisa"]):
        return "top"
    elif any(x in filename for x in ["dress", "vestido"]):
        return "dress"
    elif any(x in filename for x in ["jacket", "coat", "chaqueta"]):
        return "outerwear"
    elif any(x in filename for x in ["sock", "calcetín"]):
        return "accessories"
    elif height > width * 1.2:
        return "dress"  # Tall image = likely dress/pants
    else:
        return "top"

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 analyze.py <image_path>")
        print("       python3 analyze.py --batch data/catalog.json")
        print("       python3 analyze.py --local-dir /path/to/photos")
        sys.exit(1)

    if sys.argv[1] == "--local-dir":
        if len(sys.argv) < 3:
            print("Error: --local-dir requires a path")
            sys.exit(1)

        photo_dir = Path(sys.argv[2])
        if not photo_dir.exists():
            print(f"Error: Directory not found: {photo_dir}")
            sys.exit(1)

        images = list(photo_dir.glob("*.jpg")) + list(photo_dir.glob("*.png"))
        print(f"Found {len(images)} images in {photo_dir}")

        for img_path in images:
            print(f"\nAnalyzing {img_path.name}...")
            garment = analyze_local_image(str(img_path))
            if garment:
                upload_to_supabase(garment)

    elif sys.argv[1] == "--batch":
        # Batch from catalog.json
        with open("data/catalog.json", "r") as f:
            catalog = json.load(f)

        # Download and analyze each photo
        for photo in catalog.get("source_photos", []):
            drive_url = photo.get("drive_url")
            if not drive_url:
                continue

            print(f"\nDownloading {photo['drive_id']}...")
            try:
                response = requests.get(drive_url, timeout=10)
                if response.status_code != 200:
                    print(f"  Error: HTTP {response.status_code}")
                    continue

                # Save temp and analyze
                import tempfile
                temp_dir = tempfile.gettempdir()
                temp_path = f"{temp_dir}/garment_{photo['drive_id']}.jpg"
                with open(temp_path, "wb") as f:
                    f.write(response.content)

                garment = analyze_local_image(temp_path)
                if garment:
                    garment["image_path"] = drive_url
                    upload_to_supabase(garment)

                os.remove(temp_path)

            except Exception as e:
                print(f"  Error: {e}")

    else:
        # Single image
        image_path = sys.argv[1]
        if not Path(image_path).exists():
            print(f"Error: File not found: {image_path}")
            sys.exit(1)

        garment = analyze_local_image(image_path)
        if garment:
            print("\nAnalyzed garment:")
            print(json.dumps(garment, indent=2))

            # Optionally upload to Supabase
            if len(sys.argv) > 2 and sys.argv[2] == "--upload":
                upload_to_supabase(garment)

if __name__ == "__main__":
    main()
