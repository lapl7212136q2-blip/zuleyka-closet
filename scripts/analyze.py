#!/usr/bin/env python3
"""
Analyze photos of Zuleyka's wardrobe using Claude Vision.

Usage:
  python3 analyze.py <photo_url>
  python3 analyze.py --batch data/catalog.json
"""

import sys
import json
import base64
import sqlite3
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv
from anthropic import Anthropic

load_dotenv()

DB_PATH = "data/closet.db"

def init_db():
    """Initialize SQLite database."""
    Path("data").mkdir(exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS garments (
            id TEXT PRIMARY KEY,
            photo_drive_id TEXT,
            garment_type TEXT,
            color TEXT,
            pattern TEXT,
            style TEXT,
            season TEXT,
            confidence REAL,
            detected_at TEXT,
            notes TEXT
        )
    """)
    conn.commit()
    return conn

def analyze_photo(client, photo_url):
    """Analyze a single photo with Claude Vision."""
    message = client.messages.create(
        model="claude-opus-4-1",
        max_tokens=1024,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "url",
                            "url": photo_url
                        }
                    },
                    {
                        "type": "text",
                        "text": """Analiza esta foto de prendas de Zuleyka. Responde SOLO en JSON valido:
{
    "is_zuleyka": true/false,
    "garments": [
        {
            "type": "tipo_prenda (ej: vestido, pantalon, blusa)",
            "color": "color_principal",
            "pattern": "liso/flores/rayas/otro",
            "style": "casual/formal/deportivo/otro",
            "season": "primavera/verano/otono/invierno",
            "confidence": 0.95
        }
    ],
    "notes": "notas_breves"
}

Sé conciso, preciso y valida el JSON."""
                    }
                ]
            }
        ]
    )

    try:
        response_text = message.content[0].text.strip()
        # Try to extract JSON if wrapped in markdown
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        return json.loads(response_text.strip())
    except json.JSONDecodeError as e:
        print(f"Error parsing response: {e}")
        print(f"Response: {message.content[0].text}")
        return {"is_zuleyka": False, "garments": [], "notes": f"parse error: {e}"}

def main():
    client = Anthropic()
    conn = init_db()

    if len(sys.argv) < 2:
        print("Usage: python3 analyze.py <photo_url> or --batch data/catalog.json")
        sys.exit(1)

    if sys.argv[1] == "--batch":
        # Batch process from catalog
        with open("data/catalog.json", "r") as f:
            catalog = json.load(f)

        total = len(catalog["source_photos"])
        for i, photo in enumerate(catalog["source_photos"], 1):
            print(f"[{i}/{total}] Analyzing {photo['drive_id']}...")
            result = analyze_photo(client, photo["drive_url"])

            if result.get("is_zuleyka") and result.get("garments"):
                for garment in result["garments"]:
                    garment_id = f"{photo['drive_id']}_{garment['type'].lower()}"
                    c = conn.cursor()
                    c.execute("""
                        INSERT OR REPLACE INTO garments
                        (id, photo_drive_id, garment_type, color, pattern, style, season, confidence, detected_at, notes)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        garment_id,
                        photo["drive_id"],
                        garment.get("type"),
                        garment.get("color"),
                        garment.get("pattern"),
                        garment.get("style"),
                        garment.get("season"),
                        garment.get("confidence"),
                        datetime.now().isoformat(),
                        result.get("notes", "")
                    ))
                conn.commit()
                print(f"  Found {len(result['garments'])} garments")
            else:
                print("  No garments detected")

        conn.close()
        print("\nAnalysis complete. Results in data/closet.db")
    else:
        # Single photo
        url = sys.argv[1]
        result = analyze_photo(client, url)
        print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
