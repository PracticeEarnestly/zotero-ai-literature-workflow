#!/usr/bin/env python3
"""Build an AI Butler XPI with portable ZIP permission metadata."""

from __future__ import annotations

import argparse
import sys
import zipfile
from pathlib import Path


SKIP_PARTS = {"__pycache__", ".git"}
SKIP_NAMES = {".DS_Store"}
REGULAR_FILE_MODE = 0o100644


def should_include(path: Path, root: Path) -> bool:
    relative = path.relative_to(root)
    return not (set(relative.parts) & SKIP_PARTS or path.name in SKIP_NAMES)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()

    source_dir = args.source_dir.resolve()
    out_path = args.out.resolve()
    if not (source_dir / "manifest.json").is_file():
        print(f"Source directory has no manifest.json: {source_dir}", file=sys.stderr)
        return 1
    if out_path.exists():
        print(f"Refusing to overwrite existing file: {out_path}", file=sys.stderr)
        return 1

    files = sorted(
        (path for path in source_dir.rglob("*") if path.is_file() and should_include(path, source_dir)),
        key=lambda path: path.relative_to(source_dir).as_posix(),
    )
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(out_path, "x", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in files:
            arcname = path.relative_to(source_dir).as_posix()
            info = zipfile.ZipInfo.from_file(path, arcname=arcname)
            info.create_system = 3
            info.external_attr = REGULAR_FILE_MODE << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, path.read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)

    print(f"Created: {out_path}")
    print(f"Files: {len(files)}")
    print("ZIP file mode: 0644")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
