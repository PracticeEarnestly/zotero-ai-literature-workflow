#!/usr/bin/env python3
"""Export the AI Butler structured-tag JavaScript from a Zotero prefs.js file.

The output contains only the Actions & Tags rule script. It does not contain
Zotero credentials, cookies, the library database, attachments, or API keys.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path


RULE_LINE = re.compile(
    r'^user_pref\("(?P<key>extensions\.actionsTags\.rules\.[^"]+)",\s*(?P<value>.+)\);$'
)
MARKER = "AI Butler -> Zotero Structured Tag Sync"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prefs", required=True, type=Path, help="Path to Zotero prefs.js")
    parser.add_argument("--output", required=True, type=Path, help="Output JavaScript path")
    args = parser.parse_args()

    if not args.prefs.is_file():
        parser.error(f"Zotero preferences file was not found: {args.prefs}")

    candidates: list[str] = []
    for line in args.prefs.read_text(encoding="utf-8", errors="replace").splitlines():
        match = RULE_LINE.match(line)
        if not match:
            continue
        try:
            stored_rule_json = json.loads(match.group("value"))
            rule = json.loads(stored_rule_json)
        except (json.JSONDecodeError, TypeError):
            continue
        if (
            rule.get("event") == 5
            and rule.get("operation") == 4
            and MARKER in str(rule.get("data", ""))
        ):
            candidates.append(str(rule["data"]))

    if len(candidates) != 1:
        print(
            f"Expected one AI Butler tag-sync rule, but found {len(candidates)}. "
            "Open Actions & Tags on the old computer and verify the structured-tag rule.",
            file=sys.stderr,
        )
        return 1

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8", newline="\n") as output_file:
        output_file.write(candidates[0])
    print(f"Exported the AI Butler structured-tag rule to: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
