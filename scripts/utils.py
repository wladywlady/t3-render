from __future__ import annotations

import json
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Iterable, List, Optional

from slugify import slugify


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONFIG_PATH = REPO_ROOT / "config" / "manuals.json"
EXAMPLE_CONFIG_PATH = REPO_ROOT / "config" / "manuals.example.json"


@dataclass(frozen=True)
class ManualConfig:
    """Structured configuration for a single Tesla manual."""

    key: str
    display_name: str
    slug: str
    document_title: str
    pdf_url: str
    source_url: Optional[str]
    language: str
    region: Optional[str]

    @property
    def raw_pdf_path(self) -> Path:
        return REPO_ROOT / "data" / "raw" / f"{self.slug}.pdf"

    @property
    def intermediate_json_path(self) -> Path:
        return REPO_ROOT / "data" / "intermediate" / f"{self.slug}.json"

    @property
    def intermediate_txt_path(self) -> Path:
        return REPO_ROOT / "data" / "intermediate" / f"{self.slug}.txt"

    @property
    def processed_jsonl_path(self) -> Path:
        return REPO_ROOT / "data" / "processed" / f"{self.slug}.jsonl"


def load_manuals_config(path: Optional[Path] = None) -> List[ManualConfig]:
    """Load manuals configuration from JSON file."""

    config_path = path or DEFAULT_CONFIG_PATH
    if not config_path.exists():
        example_path = EXAMPLE_CONFIG_PATH
        raise FileNotFoundError(
            f"No se encontró {config_path}. Copia y personaliza {example_path} según tus URLs."
        )

    with config_path.open(encoding="utf-8-sig") as f:
        data = json.load(f)

    manuals: List[ManualConfig] = []
    for key, raw in data.items():
        try:
            display_name = raw["display_name"]
            document_title = raw["document_title"]
            pdf_url = raw["pdf_url"]
        except KeyError as exc:
            raise KeyError(f"Falta el campo obligatorio {exc} en la configuración de '{key}'") from exc

        slug = raw.get("slug") or slugify(key, separator="_")
        language = raw.get("language", "es")
        source_url = raw.get("source_url")
        region = raw.get("region")

        if not isinstance(pdf_url, str) or not pdf_url.lower().endswith(".pdf"):
            raise ValueError(f"URL inválida para '{key}': '{pdf_url}' debe apuntar a un PDF.")

        manuals.append(
            ManualConfig(
                key=key,
                display_name=display_name,
                slug=slug,
                document_title=document_title,
                pdf_url=pdf_url,
                source_url=source_url,
                language=language,
                region=region,
            )
        )

    if not manuals:
        raise ValueError("La configuración no contiene manuales.")

    return manuals


def filter_manuals(manuals: Iterable[ManualConfig], only: Optional[Iterable[str]] = None) -> List[ManualConfig]:
    """Filter manual configs by keys/slug/display name."""

    if not only:
        return list(manuals)

    requested = {normalize_identifier(item) for item in only}
    selected: List[ManualConfig] = []
    matched_identifiers = set()
    for manual in manuals:
        identifiers = {
            normalize_identifier(manual.key),
            normalize_identifier(manual.slug),
            normalize_identifier(manual.display_name),
        }
        if identifiers & requested:
            selected.append(manual)
            matched_identifiers |= identifiers & requested

    missing = requested - matched_identifiers
    if missing:
        raise ValueError(f"No se encontraron manuales para: {', '.join(sorted(missing))}")

    return selected


def normalize_identifier(value: str) -> str:
    """Normalize identifiers to compare manual keys and names."""

    return slugify(value, separator="_")


def now_iso() -> str:
    """Return current timestamp in ISO format (UTC)."""

    return datetime.now(timezone.utc).isoformat()


def ensure_directory(path: Path) -> None:
    """Ensure directory exists."""

    path.parent.mkdir(parents=True, exist_ok=True)


def read_headers_from_env_or_file(headers_file: Optional[str] = None) -> Dict[str, str]:
    """Load optional custom HTTP headers for Tesla downloads."""

    header_dict: Dict[str, str] = {}

    if env := os.getenv("TESLA_DOWNLOAD_HEADERS"):
        header_dict.update(json.loads(env))

    if headers_file:
        file_path = Path(headers_file)
        if not file_path.exists():
            raise FileNotFoundError(f"No se encontró el archivo de headers: {file_path}")
        with file_path.open(encoding="utf-8") as f:
            header_dict.update(json.load(f))

    # Always set a desktop UA to evitar bloqueos básicos.
    header_dict.setdefault(
        "User-Agent",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
    )
    header_dict.setdefault("Accept-Language", "es-MX,es;q=0.9,en;q=0.8")
    header_dict.setdefault("Accept", "application/pdf")
    header_dict.setdefault("Accept-Encoding", "identity")
    header_dict.setdefault("Referer", "https://www.tesla.com/ownersmanual")

    return header_dict
