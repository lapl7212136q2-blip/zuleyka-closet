# Zuleyka Closet — Setup Guía

Replicando el patrón de **gripboulderingtj**: Supabase + Python scripts + Netlify deploy.

## 1. Configurar Supabase

**Proyecto ya creado:** "Zuleyka Closet" (ref: `anxbsshninwvrlkescug`)

### 1a. Crear tabla `garments`

Ve a **Supabase Dashboard → SQL Editor** y corre las migraciones:

```bash
# Copiar y pegar en SQL Editor:
# → supabase/migrations/001_create_garments.sql
# → supabase/migrations/002_create_outfits.sql
```

Botón **RUN** para cada una.

### 1b. Obtener API keys

**Settings → API** y copia:
- **`NEXT_PUBLIC_SUPABASE_URL`** = `https://anxbsshninwvrlkescug.supabase.co`
- **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** = [tu anon key]
- **`SUPABASE_SERVICE_KEY`** = [tu service role key]

## 2. Configurar variables de entorno

Crea `.env.local` en la raíz:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://anxbsshninwvrlkescug.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<pega-aqui-anon-key>
SUPABASE_SERVICE_KEY=<pega-aqui-service-key>
```

**⚠️ NO versionar .env.local** (ya está en .gitignore).

## 3. Instalar dependencias

```bash
# Node.js
npm install

# Python (crea venv)
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

## 4. Ejecutar dev server

```bash
npm run dev
# http://localhost:3001
```

## 5. Analizar fotos

### Opción A: Una foto local

```bash
python scripts/analyze.py /ruta/a/foto.jpg --upload
```

### Opción B: Carpeta local

```bash
python scripts/analyze.py --local-dir /ruta/a/fotos
```

### Opción C: Desde catalog.json (Google Drive)

```bash
python scripts/analyze.py --batch
# Descarga, analiza y sube automáticamente
```

## 6. Verificar datos en Supabase

**Table Editor → garments** → verifica que tus prendas estén allí.

## 7. Deploy a Netlify

### 7a. Conectar repo a Netlify

```bash
netlify init
# Elige: connect existing repo
```

### 7b. Configurar variables de entorno en Netlify

**Netlify UI → Site Settings → Build & Deploy → Environment**

Agrega (igual a .env.local):
```
NEXT_PUBLIC_SUPABASE_URL=https://anxbsshninwvrlkescug.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu-key>
```

### 7c. Deploy

```bash
netlify deploy --prod
```

## Flujo = gripboulderingtj

1. **Cambios locales** → git commit
2. **Análisis** → `python analyze.py --batch` (sube a Supabase)
3. **UI dev** → `npm run dev` (localhost:3001)
4. **Deploy** → `netlify deploy --prod`
5. **Datos en prod** → Supabase (visible vía API)

## Troubleshooting

**"SUPABASE_SERVICE_KEY not set"**
→ Crea `.env.local` con la variable

**"No migrations"**
→ Copia SQL de `supabase/migrations/` al Supabase SQL Editor y corre

**"Can't find PIL/rembg"**
→ `pip install -r requirements.txt` en venv activado

**"API returns empty garments"**
→ Verifica que los garments tengan `analysis_status='completed'` en Supabase
