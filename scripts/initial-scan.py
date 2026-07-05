#!/usr/bin/env python3
"""
Fase 0: Scan inicial de prendas de Zuleyka desde Google Drive.

Este script:
1. Lee fotos de la carpeta immich-backup-zuleyka en Google Drive
2. Detecta prendas con Claude Vision
3. Genera catálogo deduplicado en SQLite
"""

import os
import json
import sqlite3
from pathlib import Path
from dotenv import load_dotenv
from google.auth.transport.requests import Request
from google.oauth2.service_account import Credentials
from google.oauth2 import default
from googleapiclient.discovery import build
from anthropic import Anthropic

load_dotenv()

DRIVE_FOLDER_ID = "1DSfv-2Ipd-5ieV9aPDToqbTc6KmmFbbk"  # library folder in immich backup
DB_PATH = "data/closet.db"

def init_db():
    """Initialize SQLite database."""
    Path("data").mkdir(exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS garments (
            id TEXT PRIMARY KEY,
            photo_url TEXT,
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

def get_drive_service():
    """Authenticate with Google Drive."""
    creds, _ = default(scopes=['https://www.googleapis.com/auth/drive.readonly'])
    return build('drive', 'v3', credentials=creds)

def list_photos(service, folder_id, year="2026"):
    """List all photos from a specific year folder."""
    query = f"'{folder_id}' in parents and trashed=false"
    results = service.files().list(q=query, spaces='drive', fields='files(id, name, mimeType)', pageSize=100).execute()

    year_folders = [f for f in results.get('files', []) if f['name'] == year and f['mimeType'] == 'application/vnd.google-apps.folder']
    if not year_folders:
        return []

    year_folder_id = year_folders[0]['id']
    year_query = f"'{year_folder_id}' in parents and (mimeType contains 'image/' or mimeType contains 'video/')"
    year_files = service.files().list(q=year_query, spaces='drive', fields='files(id, name, mimeType, webContentLink)', pageSize=1000).execute()

    return year_files.get('files', [])

def analyze_garment(client, image_url):
    """Analyze an image with Claude Vision to detect garments."""
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
                            "url": image_url
                        }
                    },
                    {
                        "type": "text",
                        "text": """Analiza esta foto de Zuleyka. Responde en JSON:
{
    "is_zuleyka": bool,
    "garments": [
        {
            "type": "tipo_prenda",
            "color": "color_principal",
            "pattern": "estampado/liso",
            "style": "estilo_general",
            "season": "primavera/verano/otoño/invierno",
            "confidence": 0.95
        }
    ],
    "notes": "notas_adicionales"
}
Sé conciso y preciso."""
                    }
                ]
            }
        ]
    )

    try:
        return json.loads(message.content[0].text)
    except:
        return {"is_zuleyka": False, "garments": [], "notes": "parse error"}

def main():
    print("🧥 Fase 0: Scan inicial de clóset de Zuleyka")

    # Init database
    conn = init_db()

    # Auth
    drive_service = get_drive_service()
    client = Anthropic()

    # Get photos from 2026
    photos = list_photos(drive_service, DRIVE_FOLDER_ID, year="2026")
    print(f"📸 Encontradas {len(photos)} fotos en 2026")

    # Process first 10 as test
    for i, photo in enumerate(photos[:10]):
        print(f"  [{i+1}/10] {photo['name']}...", end=" ", flush=True)

        # Get download link
        file_id = photo['id']
        download_url = f"https://drive.google.com/uc?id={file_id}&export=download"

        # Analyze
        result = analyze_garment(client, download_url)

        if result.get('is_zuleyka') and result.get('garments'):
            c = conn.cursor()
            for garment in result['garments']:
                garment['photo_url'] = download_url
                garment['id'] = f"{file_id}_{garment['type'].lower()}"
                c.execute("""
                    INSERT OR REPLACE INTO garments
                    (id, photo_url, garment_type, color, pattern, style, season, confidence, detected_at, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
                """, (
                    garment['id'],
                    garment.get('photo_url'),
                    garment.get('type'),
                    garment.get('color'),
                    garment.get('pattern'),
                    garment.get('style'),
                    garment.get('season'),
                    garment.get('confidence'),
                    result.get('notes')
                ))
            conn.commit()
            print("✅")
        else:
            print("⏭️")

    conn.close()
    print("\n✨ Catálogo guardado en data/closet.db")

if __name__ == "__main__":
    main()
