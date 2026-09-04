#!/usr/bin/env python3
"""Export AI Butler custom prompts from a Zotero prefs.js file.

The JSON output contains prompt names and text only. It does not contain model
endpoints, API keys, Zotero credentials, library data, or attachments.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path


PREF_RE = re.compile(
    r'^user_pref\("extensions\.zotero\.aiButler\.customPrompts",\s*(?P<value>.+)\);$'
)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prefs", required=True, type=Path, help="Path to Zotero prefs.js")
    parser.add_argument("--output", required=True, type=Path, help="Output JSON path")
    args = parser.parse_args()

    if not args.prefs.is_file():
        parser.error(f"Zotero preferences file was not found: {args.prefs}")

    prompt_data = None
    for line in args.prefs.read_text(encoding="utf-8", errors="replace").splitlines():
        match = PREF_RE.match(line)
        if not match:
            continue
        try:
            prompt_data = json.loads(json.loads(match.group("value")))
        except (json.JSONDecodeError, TypeError) as exc:
            print(f"Cannot parse AI Butler custom prompts: {exc}", file=sys.stderr)
            return 1
        break

    if not isinstance(prompt_data, dict):
        print("AI Butler custom prompts were not found in prefs.js.", file=sys.stderr)
        return 1

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8", newline="\n") as output_file:
        json.dump(prompt_data, output_file, ensure_ascii=False, indent=2)
        output_file.write("\n")
    print(f"Exported {len(prompt_data)} AI Butler custom prompts to: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
