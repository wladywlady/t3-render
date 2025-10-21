# Tarea 3 · Tesla RAG Chatbot

Aplicacion full-stack (Express + React) que expone un chatbot con RAG sobre manuales de Tesla. El repositorio ya contiene el pipeline de datos, integracion con Nomic Atlas y con el LLM entregado por la catedra.

## Estructura
- `scripts/`: pipeline de scraping, limpieza, chunking y compilado (`python -m venv` recomendado; dependencias en `scripts/requirements.txt`).
- `data/`: salidas del pipeline (`raw`, `processed`, `intermediate`, `compiled/manuales_compilados.jsonl`).
- `server/`: backend Express en TypeScript. Sirve API `/api/chat` y archivos estaticos de `web/dist`.
- `web/`: frontend React + Tailwind (Vite) con interfaz de chat y referencias.
- `Dockerfile` / `render.yaml`: artefactos listos para desplegar backend + frontend en Render con un solo servicio web.

## Requisitos locales
- Node.js 20.x (verificar con `node -v`).
- npm 10.x (`npm -v`).
- Python 3.11+ para los scripts de datos (opcional si no se reejecuta pipeline).

## Variables de entorno
Crear `server/.env` (no versionado) o configurarlas directamente en el entorno de despliegue:

```
NOMIC_API_KEY=...
NOMIC_PROJECTION_ID=...
LLM_BASE_URL=https://asteroide.ing.uc.cl
LLM_MODEL_NAME=integracion
LLM_API_KEY=        # opcional si la catedra no lo requiere
NOMIC_K=6           # numero de fragmentos a solicitar a Nomic
PORT=3000
```

Para desarrollo local basta con copiar los valores de `ENVIRONMENT.md` (no publicar ese archivo).

## Desarrollo local
```bash
npm ci --prefix server
npm ci --prefix web
npm run build --prefix web
npm run build --prefix server
npm start --prefix server    # sirve API y frontend compilado en http://localhost:3000
```

Durante desarrollo es posible usar:
- Backend: `npm run dev --prefix server`
- Frontend: `npm run dev --prefix web` (usa proxy en `vite.config.ts` hacia `http://localhost:3000/api`)

## Pipeline de datos
1. Descargar manuales listados en `config/manuals.example.json` editando URLs necesarias.
2. `python scripts/download_manuals.py`
3. `python scripts/extract_text.py`
4. `python scripts/chunk_manuals.py`
5. `python scripts/compile_dataset.py`

Los artefactos generados se encuentran en `data/`. Subir `data/compiled/manuales_compilados.jsonl` a Nomic Atlas y registrar `projection_id`.

## Pruebas manuales recomendadas
- `curl http://localhost:3000/health` → `{ "ok": true }`.
- `POST http://localhost:3000/api/chat` con `{"model":"Model 3","question":"Como calibro las camaras?"}`; verificar respuesta y referencias.
- En frontend, enviar preguntas con diferentes modelos y forzar errores (sin modelo valido, sin contexto) para validar mensajes de usuario.
- Revisar logs de backend (`pino`) ante fallas de Nomic o LLM.

## Despliegue con Docker
```
docker build -t tesla-rag .
docker run --rm -p 3000:3000 ^
  -e NOMIC_API_KEY=... ^
  -e NOMIC_PROJECTION_ID=... ^
  -e LLM_BASE_URL=https://asteroide.ing.uc.cl ^
  -e LLM_MODEL_NAME=integracion ^
  tesla-rag
```
El contenedor ejecuta `node server/dist/index.js` y sirve el frontend compilado.

## Despliegue en Render
1. Conectar el repositorio y seleccionar **Blueprint** utilizando `render.yaml`.
2. Render construira la imagen con el `Dockerfile` incluido.
3. Configurar variables de entorno faltantes (`NOMIC_API_KEY`, `NOMIC_PROJECTION_ID`, `LLM_API_KEY` si aplica). Las marcadas con `sync: false` deben ingresarse manualmente.
4. Verificar la pagina con `/health` y realizar pruebas E2E (`/api/chat` y UI).

## Uso de tokens en Nomic
- Revisar panel `Usage` en https://atlas.nomic.ai/data/<usuario>/org/settings.
- Mantener al menos ~2M tokens libres para la correccion.
- Documentar cualquier accion que consuma volumen elevado (reprocesar dataset, reindexar).

## Bitacora / TODO
- Estado actual de pendientes en `TODO.md`.
- Registrar resultados de las pruebas manuales y validaciones finales antes de entregar.
