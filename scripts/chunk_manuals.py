from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Iterable, List

from langchain_text_splitters import RecursiveCharacterTextSplitter
from tqdm import tqdm

from utils import (
    ManualConfig,
    ensure_directory,
    filter_manuals,
    load_manuals_config,
    now_iso,
)

INTERMEDIATE_DIR = Path(__file__).resolve().parents[1] / "data" / "intermediate"


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Genera archivos JSONL con chunks (~800 caracteres) por manual",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--only",
        nargs="+",
        help="Filtra manuales por key/slug/nombre. Ej: --only cybertruck",
    )
    parser.add_argument(
        "--chunk-size",
        type=int,
        default=800,
        help="Tamanio final de cada chunk en caracteres aproximado.",
    )
    parser.add_argument(
        "--chunk-overlap",
        type=int,
        default=120,
        help="Solapamiento entre chunks consecutivos.",
    )
    args = parser.parse_args(list(argv) if argv is not None else None)

    try:
        manuals = filter_manuals(load_manuals_config(), args.only)
    except Exception as exc:
        print(f"[ERROR] {exc}", file=sys.stderr)
        return 1

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=args.chunk_size,
        chunk_overlap=args.chunk_overlap,
        length_function=len,
        separators=["\n\n", "\n", ". ", " "],
    )

    for manual in manuals:
        try:
            process_manual(manual, splitter)
        except FileNotFoundError:
            print(
                f"[ERROR] No se encontro el archivo intermedio para {manual.display_name} ({manual.intermediate_json_path})",
                file=sys.stderr,
            )
            return 1
        except Exception as exc:
            print(f"[ERROR] {manual.display_name}: {exc}", file=sys.stderr)
            return 1

    return 0


def process_manual(manual: ManualConfig, splitter: RecursiveCharacterTextSplitter) -> None:
    with manual.intermediate_json_path.open(encoding="utf-8") as f:
        intermediate = json.load(f)

    pages: List[dict] = intermediate["pages"]
    if not pages:
        raise ValueError("No hay paginas extraidas para este manual.")

    documents = build_documents_from_pages(manual, pages)
    split_docs = splitter.split_documents(documents)

    ensure_directory(manual.processed_jsonl_path)
    chunk_count = write_jsonl(manual, split_docs)

    avg_chars = sum(len(doc.page_content) for doc in split_docs) / max(chunk_count, 1)
    print(
        f"[OK] {manual.display_name}: {chunk_count} chunks (promedio {avg_chars:.0f} chars) -> {manual.processed_jsonl_path.name}"
    )


def build_documents_from_pages(manual: ManualConfig, pages: List[dict]):
    """Agrupa paginas contiguas en documentos base para permitir chunks multi-pagina."""

    from langchain_core.documents import Document  # lazy import to avoid optional dependency at module import

    # Agrupar en bloques de ~3200 caracteres para permitir overlap multi-pagina.
    MAX_BLOCK_LEN = 3200
    buffer: List[str] = []
    buffer_pages: List[int] = []
    documents: List[Document] = []

    for page in pages:
        text = page["text"].strip()
        if not text:
            continue

        buffer.append(text)
        buffer_pages.append(page["page_number"])

        buffer_len = sum(len(item) for item in buffer)
        if buffer_len >= MAX_BLOCK_LEN:
            documents.append(
                Document(
                    page_content="\n\n".join(buffer),
                    metadata={
                        "page_start": buffer_pages[0],
                        "page_end": buffer_pages[-1],
                        "source_pages": buffer_pages.copy(),
                        "model_key": manual.key,
                        "slug": manual.slug,
                        "document_title": manual.document_title,
                    },
                )
            )
            buffer.clear()
            buffer_pages.clear()

    if buffer:
        documents.append(
            Document(
                page_content="\n\n".join(buffer),
                metadata={
                    "page_start": buffer_pages[0],
                    "page_end": buffer_pages[-1],
                    "source_pages": buffer_pages.copy(),
                    "model_key": manual.key,
                    "slug": manual.slug,
                    "document_title": manual.document_title,
                },
            )
        )

    return documents


def write_jsonl(manual: ManualConfig, documents) -> int:
    import json

    output_path = manual.processed_jsonl_path
    count = 0
    with output_path.open("w", encoding="utf-8") as f:
        for idx, doc in enumerate(documents):
            metadata = {
                "model_key": manual.key,
                "model_slug": manual.slug,
                "model_name": manual.display_name,
                "document_title": manual.document_title,
                "source_file": manual.raw_pdf_path.name,
                "page_start": doc.metadata.get("page_start"),
                "page_end": doc.metadata.get("page_end"),
                "source_pages": doc.metadata.get("source_pages"),
                "chunk_index": idx,
                "char_count": len(doc.page_content),
                "generated_at": now_iso(),
            }
            record = {"text": doc.page_content.strip(), "metadata": metadata}
            json.dump(record, f, ensure_ascii=False)
            f.write("\n")
            count += 1
    return count


if __name__ == "__main__":
    raise SystemExit(main())
