from __future__ import annotations

import argparse
import json
import re
import sys
from typing import Iterable, List

from pypdf import PdfReader
from tqdm import tqdm

from utils import (
    ManualConfig,
    ensure_directory,
    filter_manuals,
    load_manuals_config,
    now_iso,
)


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Extrae texto limpio de los PDFs en data/raw/*.pdf",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--only",
        nargs="+",
        help="Filtra manuales por key/slug/nombre. Ej: --only model_y",
    )
    args = parser.parse_args(list(argv) if argv is not None else None)

    try:
        manuals = filter_manuals(load_manuals_config(), args.only)
    except Exception as exc:
        print(f"[ERROR] {exc}", file=sys.stderr)
        return 1

    for manual in manuals:
        try:
            extract_manual(manual)
        except FileNotFoundError:
            print(
                f"[ERROR] No se encontro el PDF para {manual.display_name} ({manual.raw_pdf_path})",
                file=sys.stderr,
            )
            return 1
        except Exception as exc:
            print(f"[ERROR] {manual.display_name}: {exc}", file=sys.stderr)
            return 1

    return 0


def extract_manual(manual: ManualConfig) -> None:
    pdf_path = manual.raw_pdf_path
    reader = PdfReader(str(pdf_path))

    pages_output: List[dict] = []
    combined_text_lines: List[str] = []

    for index, page in enumerate(tqdm(reader.pages, desc=manual.slug, unit="pag"), start=1):
        raw_text = page.extract_text() or ""
        cleaned = clean_text(raw_text)
        if not cleaned:
            continue

        pages_output.append(
            {
                "page_number": index,
                "text": cleaned,
                "char_count": len(cleaned),
            }
        )
        combined_text_lines.append(f"--- Pagina {index} ---\n{cleaned}\n")

    metadata = {
        "model_key": manual.key,
        "slug": manual.slug,
        "display_name": manual.display_name,
        "document_title": manual.document_title,
        "pdf_source": str(pdf_path.name),
        "total_pages": len(reader.pages),
        "extracted_pages": len(pages_output),
        "extracted_at": now_iso(),
    }

    data = {"metadata": metadata, "pages": pages_output}

    ensure_directory(manual.intermediate_json_path)
    ensure_directory(manual.intermediate_txt_path)

    with manual.intermediate_json_path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    with manual.intermediate_txt_path.open("w", encoding="utf-8") as f:
        f.write("\n".join(combined_text_lines))

    print(f"[OK] Texto extraido en {manual.intermediate_json_path.name}")


_MULTISPACE = re.compile(r"[ \t]+")
_BLANK_LINES = re.compile(r"\n{3,}")


def clean_text(text: str) -> str:
    """Heuristicas basicas para limpiar texto extraido de PDF."""

    text = text.replace("\r", "\n")
    text = text.replace("\u00ad\n", "")
    text = text.replace("\u00ad", "")

    # Unir palabras cortadas por salto de linea con guion.
    text = re.sub(r"(\w)-\n(\w)", r"\1\2", text)

    # Saltos simples -> espacio; doble salto preserva parrafos.
    text = re.sub(r"(?<!\n)\n(?!\n)", " ", text)

    text = _MULTISPACE.sub(" ", text)
    text = _BLANK_LINES.sub("\n\n", text.strip())

    text = re.sub(r"Pagina \d+ de \d+", "", text, flags=re.IGNORECASE)
    text = re.sub(r"Tesla,?\s+Inc\.", "", text)

    return text.strip()


if __name__ == "__main__":
    raise SystemExit(main())

