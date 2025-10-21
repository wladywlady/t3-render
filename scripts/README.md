## Pipeline de datos (Tarea 3)

Este directorio contiene los scripts para preparar el dataset de manuales de Tesla antes de crear el dataset en Nomic Atlas.

### 0. Preparación

1. Crear un entorno virtual e instalar dependencias:

   ```bash
   python -m venv .venv
   .venv\Scripts\activate  # Windows
   pip install -r scripts/requirements.txt
   ```

2. Copiar `config/manuals.example.json` a `config/manuals.json`. El archivo ya incluye los enlaces oficiales en español (ES-MX) publicados en `https://www.tesla.com/ownersmanual/<modelo>/es_mx/Owners_Manual.pdf`. Si Tesla bloquea las descargas automatizadas (muy común), agrega cookies o cabeceras personalizadas (ver paso 1).

### 1. Descargar manuales (`download_manuals.py`)

```bash
python scripts/download_manuals.py
```

- Por defecto cada PDF queda en `data/raw/{slug}.pdf`.
- Usa `--only model_y` para limitar la descarga a ciertos modelos.
- Tesla suele aplicar restricciones (403 o redirección a `Access Denied`). Si ocurre, el script te avisará que necesitas cookies válidas. Agrega cabeceras extra:

  ```bash
  python scripts/download_manuals.py --headers-file headers.json
  ```

  Ejemplo de `headers.json`:

  ```json
  {
    "Cookie": "ak_bmsc=...; bm_sz=...; otros_cookies",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
    "Accept-Language": "es-MX,es;q=0.9,en;q=0.8"
  }
  ```

  También puedes definir la variable de entorno `TESLA_DOWNLOAD_HEADERS` con el mismo JSON.

### 2. Extraer texto limpio (`extract_text.py`)

```bash
python scripts/extract_text.py
```

- Lee cada PDF en `data/raw` y produce:
  - `data/intermediate/{slug}.json` con el texto por página.
  - `data/intermediate/{slug}.txt` para depuración manual.

### 3. Chunking (`chunk_manuals.py`)

```bash
python scripts/chunk_manuals.py --chunk-size 800 --chunk-overlap 120
```

- Genera `data/processed/{slug}.jsonl` con fragmentos listos para Nomic.
- Cada entrada JSONL incluye metadatos (modelo, páginas de origen, tamaño, etc.).

### 4. Compilación final (`compile_dataset.py`)

```bash
python scripts/compile_dataset.py
```

- Une todos los JSONL individuales en `data/compiled/manuales_compilados.jsonl`.
- El archivo resultante (~10k líneas) es el que se sube a Nomic Atlas.

### 5. Subida a Nomic (manual, pero guiado)

1. Crear dataset público en [https://atlas.nomic.ai](https://atlas.nomic.ai) y subir `data/compiled/manuales_compilados.jsonl`.
2. Seleccionar el campo `text` como fuente para embeddings.
3. Registrar la URL del mapa y el `projection_id`.
4. Guardar tu API key de Nomic (se usará en el backend).

> Dato: Mantén al menos ~2M tokens libres para la corrección del curso.

### Verificación rápida

- Usa `wc -l data/processed/*.jsonl` (o `Measure-Object -Line` en PowerShell) para revisar recuentos.
- Revisa algunos registros:

  ```bash
  python - <<'PY'
  import json, itertools, pathlib
  path = pathlib.Path("data/processed/model_3.jsonl")
  with path.open(encoding="utf-8") as f:
      for line in itertools.islice(f, 3):
          print(json.loads(line)["metadata"])
  PY
  ```

Con este pipeline listo, podrás abordar la integración con Nomic y el backend Express sin bloquearte por la preparación del dataset.
*** End Patch
