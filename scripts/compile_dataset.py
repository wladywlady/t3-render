from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Iterable, List

from utils import filter_manuals, load_manuals_config

PROCESSED_DIR = Path(__file__).resolve().parents[1] / "data" / "processed"
COMPILED_PATH = Path(__file__).resolve().parents[1] / "data" / "compiled" / "manuales_compilados.jsonl"


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Concatena los JSONL individuales en un unico dataset compilado.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=COMPILED_PATH,
        help="Ruta de salida para el JSONL compilado.",
    )
    parser.add_argument(
        "--only",
        nargs="+",
        help="Limita la compilacion a ciertos manuales.",
    )
    args = parser.parse_args(list(argv) if argv is not None else None)

    try:
        manuals = filter_manuals(load_manuals_config(), args.only)
    except Exception as exc:
        print(f"[ERROR] {exc}", file=sys.stderr)
        return 1

    processed_files: List[Path] = []
    for manual in manuals:
        path = manual.processed_jsonl_path
        if not path.exists():
            print(f"[WARN] No existe {path}, omitiendo {manual.display_name}")
            continue
        processed_files.append(path)

    if not processed_files:
        print("[ERROR] No se encontraron archivos procesados para compilar.", file=sys.stderr)
        return 1

    total_lines = concatenate_files(processed_files, args.output)
    print(f"[OK] Dataset compilado con {total_lines} lineas -> {args.output}")
    return 0


def concatenate_files(files: List[Path], output: Path) -> int:
    output.parent.mkdir(parents=True, exist_ok=True)
    total_lines = 0

    with output.open("w", encoding="utf-8") as out_f:
        for path in files:
            with path.open(encoding="utf-8") as in_f:
                for line in in_f:
                    if not line.strip():
                        continue
                    out_f.write(line.rstrip("\n") + "\n")
                    total_lines += 1

    return total_lines


if __name__ == "__main__":
    raise SystemExit(main())

