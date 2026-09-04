#!/usr/bin/env python3
"""Create a safe editable source baseline from a frozen AI Butler XPI."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
import zipfile
from pathlib import Path


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as input_file:
        for chunk in iter(lambda: input_file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--xpi", required=True, type=Path, help="Frozen AI Butler XPI")
    parser.add_argument("--output-dir", required=True, type=Path, help="New empty source directory")
    args = parser.parse_args()

    if not args.xpi.is_file():
        parser.error(f"XPI was not found: {args.xpi}")
    if args.output_dir.exists() and any(args.output_dir.iterdir()):
        parser.error(f"Output directory is not empty: {args.output_dir}")

    args.output_dir.mkdir(parents=True, exist_ok=True)
    output_root = args.output_dir.resolve()
    file_count = 0

    try:
        with zipfile.ZipFile(args.xpi) as archive:
            for member in archive.infolist():
                if member.is_dir():
                    continue
                target = (output_root / member.filename).resolve()
                if output_root not in target.parents:
                    raise ValueError(f"Unsafe archive path: {member.filename}")
                target.parent.mkdir(parents=True, exist_ok=True)
                with archive.open(member) as source, target.open("wb") as destination:
                    destination.write(source.read())
                file_count += 1
            manifest = json.loads(archive.read("manifest.json"))
    except (OSError, ValueError, zipfile.BadZipFile, KeyError, json.JSONDecodeError) as exc:
        print(f"Cannot extract XPI: {exc}", file=sys.stderr)
        return 1

    baseline = {
        "source": "frozen-xpi",
        "xpi_filename": args.xpi.name,
        "xpi_sha256": sha256(args.xpi),
        "addon_id": manifest.get("applications", {}).get("zotero", {}).get("id"),
        "addon_version": manifest.get("version"),
        "file_count": file_count,
    }
    (output_root / "WORKFLOW_SOURCE_BASELINE.json").write_text(
        json.dumps(baseline, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Extracted {file_count} files to: {args.output_dir}")
    print(f"XPI SHA-256: {baseline['xpi_sha256']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
