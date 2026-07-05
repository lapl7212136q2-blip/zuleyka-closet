# Zuleyka Closet

AI-powered wardrobe management system en español.

## Fases

- **Fase 0** (hoy): Scan inicial de prendas desde Google Drive (immich backup)
- **Fase 1**: Escáner de prendas, deduplicación, catálogo confirmable
- **Fase 2**: Clóset web con filtros y favoritas
- **Fase 3**: Estilista IA (outfit del día, clima, ocasión)
- **Fase 4**: Calendario, estadísticas, maleta
- **Fase 5**: PWA en iPhone o app nativa

## Setup

```bash
# Install dependencies
npm install
pip install -r requirements.txt

# Create .env from example
cp .env.example .env
# Editar .env con tu ANTHROPIC_API_KEY

# Run analysis
python3 scripts/analyze.py --batch data/catalog.json

# Dev server (cuando llegue Fase 2)
npm run dev
```

## Architecture

- **Backend**: Next.js API routes (Node.js)
- **Frontend**: React
- **Database**: SQLite (portable)
- **Vision**: Claude API (image analysis)
- **Source**: Google Drive (immich backup)

## Current Status

✅ Repo initialized
✅ Google Drive photos found (2 from 2026-07-05)
⏳ Analysis in progress
