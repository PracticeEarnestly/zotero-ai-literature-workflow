#!/usr/bin/env python3
"""Align the installed AI Butler L1-L3 workflow with Literature Flow rules.

The source directory must come from the frozen AI Butler 3.8.5.2 XPI.  Each
replacement is exact and is applied once, so an unexpected upstream build
fails safely instead of producing a partly patched plugin.
"""

from __future__ import annotations

import argparse
from pathlib import Path


SOURCE_FILE = Path("content/scripts/aiButler.js")

REPLACEMENTS = (
    (
        "workflow tag-only output",
        '''            const parsedTags = this.extractZoteroTags(fullContent);
            fullContent = parsedTags.content;''',
        '''            const parsedTags = this.extractZoteroTags(fullContent);
            // L1/L2/L3 use fixed workflow tags. Model-generated topic tags are
            // deliberately not written back to the Zotero item.
            const workflowTagOnly = ["L1", "L2", "L3"].includes(configuredWorkflowLevel);
            fullContent = parsedTags.content;''',
    ),
    (
        "skip model tags for workflow",
        '''            await this.applyZoteroTags(item, parsedTags.tags);''',
        '''            if (!workflowTagOnly) {
              await this.applyZoteroTags(item, parsedTags.tags);
            }''',
    ),
    (
        "manual workflow append",
        '''            forceOverwrite: true,
            prompt: workflowPrompt,
            summaryMode: "single",
            workflowLevel,
            endpointId''',
        '''            forceOverwrite: true,
            prompt: workflowPrompt,
            summaryMode: "single",
            noteStrategy: "append",
            workflowLevel,
            endpointId''',
    ),
    (
        "auto L1 only skips existing L1",
        '''          if (await this.hasExistingAINote(item)) return;''',
        '''          // An unrelated AI note must not block L1.  Existing notes
          // receive an appended L1 result, matching Literature Flow behavior.
          if (await this.hasL1Summary(item)) return;''',
    ),
    (
        "auto L1 append and wake queue",
        '''            await tqm.addTask(item, false, { prompt, summaryMode: "single", workflowLevel: "L1", endpointId: getWorkflowEndpointId("L1") });
            ztoolkit.log(''',
        '''            await tqm.addTask(item, false, {
              prompt,
              summaryMode: "single",
              noteStrategy: "append",
              workflowLevel: "L1",
              endpointId: getWorkflowEndpointId("L1")
            });
            this.scheduleQueuedTaskStart(tqm);
            ztoolkit.log(''',
    ),
)


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise RuntimeError(f"Expected one {label!r} anchor, found {count}")
    return source.replace(old, new, 1)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", required=True, type=Path)
    args = parser.parse_args()

    source_path = args.source_dir / SOURCE_FILE
    if not source_path.is_file():
        parser.error(f"AI Butler source was not found: {source_path}")

    source = source_path.read_text(encoding="utf-8")
    for label, old, new in REPLACEMENTS:
        source = replace_once(source, old, new, label)
    source_path.write_text(source, encoding="utf-8")
    print(f"Applied Literature Flow alignment: {source_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
