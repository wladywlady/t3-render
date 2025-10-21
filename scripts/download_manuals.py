from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Iterable

import requests
from tqdm import tqdm

from utils import (
    ManualConfig,
    ensure_directory,
    filter_manuals,
    load_manuals_config,
    read_headers_from_env_or_file,
)


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Descarga los manuales de Tesla definidos en config/manuals.json",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--only",
        nargs="+",
        help="Filtra manuales por key/slug/nombre. Ej: --only model3 model_y",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Fuerza la descarga incluso si el archivo ya existe.",
    )
    parser.add_argument(
        "--headers-file",
        help="Ruta a un JSON con headers HTTP extra (cookies, etc.).",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=90,
        help="Timeout por request en segundos.",
    )

    args = parser.parse_args(list(argv) if argv is not None else None)

    try:
        manuals = filter_manuals(load_manuals_config(), args.only)
    except Exception as exc:
        print(f"[ERROR] {exc}", file=sys.stderr)
        return 1

    headers = read_headers_from_env_or_file(args.headers_file)
    session = requests.Session()
    session.headers.update(headers)

    for manual in manuals:
        try:
            download_manual(session, manual, force=args.force, timeout=args.timeout)
        except Exception as exc:
            print(f"[ERROR] {manual.display_name}: {exc}", file=sys.stderr)
            return 1

    return 0


def download_manual(session: requests.Session, manual: ManualConfig, force: bool, timeout: int) -> None:
    destination = manual.raw_pdf_path
    ensure_directory(destination)

    if destination.exists() and not force:
        print(f"[SKIP] {manual.display_name} ya existe en {destination.name}")
        return

    print(f"[INFO] Descargando {manual.display_name} desde {manual.pdf_url}")
    try:
        response = session.get(manual.pdf_url, stream=True, timeout=timeout)
        response.raise_for_status()
    except requests.HTTPError as exc:
        status = exc.response.status_code if exc.response is not None else "desconocido"
        if status in (401, 403):
            raise RuntimeError(
                "Acceso denegado (HTTP %s). Tesla suele requerir cookies de sesión. "
                "Repite la descarga pasando --headers-file con tus cookies del navegador "
                "o define TESLA_DOWNLOAD_HEADERS." % status
            ) from exc
        raise

    content_type = response.headers.get("content-type", "").lower()
    if "pdf" not in content_type:
        raise RuntimeError(
            f"Respuesta inesperada (content-type: {content_type or 'desconocido'}). "
            "Verifica los headers/cookies usados."
        )

    total = int(response.headers.get("content-length", 0))
    temp_path = destination.with_suffix(".tmp")

    with temp_path.open("wb") as f:
        if total == 0:
            for chunk in response.iter_content(chunk_size=1024 * 64):
                if chunk:
                    f.write(chunk)
        else:
            with tqdm(
                total=total,
                unit="B",
                unit_scale=True,
                unit_divisor=1024,
                desc=destination.name,
            ) as progress:
                for chunk in response.iter_content(chunk_size=1024 * 128):
                    if chunk:
                        f.write(chunk)
                        progress.update(len(chunk))

    temp_path.replace(destination)
    print(f"[OK] Guardado en {destination}")


if __name__ == "__main__":
    raise SystemExit(main())
