#!/usr/bin/env python3
"""Verify that the installed AI Butler XPI still contains this workflow patch."""

from __future__ import annotations

import argparse
import json
import sys
import zipfile
from pathlib import Path


MARKERS = (
    "workflowPreset",
    "collectionL1Summary",
    "handleCollectionL1Summary",
    "autoScanPromptName",
    "pendingL2Parents",
    "pendingL3Parents",
    "pendingRatedL1Parents",
    "getItemRating(item)",
    r"extra.match(/(?:^|\r?\n)\s*rate\s*:\s*([1-5])\s*(?=\r?\n|$)/i)",
    "async enqueueL2IfRated",
    "async enqueueL3IfRated",
    "enqueueRatedWorkflow(item)",
    "async enqueueL1IfMissingForRating",
    "scheduleQueuedTaskStart(taskQueue)",
    'workflowLevel: "L2"',
    'workflowLevel: "L3"',
    "getWorkflowCompletionTag(workflowLevel)",
    "getFirstAccessiblePDFAttachment(item)",
    "[AI-Butler] Resuming persisted pending tasks",
    'noteStrategy: "append"',
    "buildWorkflowRequestPrompt",
    "getWorkflowEndpointId(workflowLevel)",
    "ensureWorkflowEndpointConfiguration()",
    'workflowLevel: "L1"',
    "generateWithEndpoint(endpointId, request)",
    "inferredWorkflowLevel",
    "scanRecentRatedL2Items()",
    "recentRatingWindowMs",
    "bindStyleRatingClickFallback(win)",
    "static extractZoteroTags",
    "applyZoteroTags(item, tags)",
    "filterWorkflowTopicTags",
    "detectWorkflowLevelState",
    "this.scheduleQueuedTaskStart(taskQueue);",
    "abortedTaskRecoveryCount",
    "Recovered aborted tasks from persisted queue",
    "readLlmForZoteroMineruCache",
    "native-zip-fallback",
    "direct-pdf-fallback",
    'taskIntent: "manual-rerun"',
    "workflowLlmCacheDiagnosticsByItem",
    "Data:AvailableOnRequest",
    "Summary response metrics:",
    "validateResponseText",
    "LLMEmptyResponseError",
    "Recovered missing ${workflowLevel} workflow heading",
    "ensureWorkflowCompletionTag",
    "resumeSavedWorkflowArtifact",
    "savedArtifactRecoveryCount",
    "Recovered saved-note tasks for tag-only repair",
)
XPI_NAME = "zotero-ai-butler@github.com.xpi"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--profile-dir", required=True, type=Path, help="Zotero profile directory")
    parser.add_argument("--expected-version", default="3.8.5.28")
    args = parser.parse_args()

    xpi_path = args.profile_dir / "extensions" / XPI_NAME
    if not xpi_path.is_file():
        print(f"AI Butler XPI was not found: {xpi_path}", file=sys.stderr)
        return 1

    try:
        with zipfile.ZipFile(xpi_path) as archive:
            manifest = json.loads(archive.read("manifest.json"))
            source = archive.read("content/scripts/aiButler.js").decode("utf-8", errors="replace")
    except (KeyError, OSError, zipfile.BadZipFile, json.JSONDecodeError) as exc:
        print(f"Cannot inspect AI Butler XPI: {exc}", file=sys.stderr)
        return 1

    version = manifest.get("version")
    update_url = manifest.get("applications", {}).get("zotero", {}).get("update_url")
    marker_results = {marker: marker in source for marker in MARKERS}
    version_matches = version == args.expected_version
    patch_intact = all(marker_results.values())
    automatic_update_endpoint_disabled = not update_url

    print(f"ProfileDirectory: {args.profile_dir}")
    print(f"XpiPath: {xpi_path}")
    print(f"Version: {version}")
    print(f"ExpectedVersion: {args.expected_version}")
    print(f"VersionMatches={'True' if version_matches else 'False'}")
    print(f"AutomaticUpdateEndpointDisabled={'True' if automatic_update_endpoint_disabled else 'False'}")
    for marker, present in marker_results.items():
        print(f"Marker {marker!r}: {'True' if present else 'False'}")
    print(f"PatchIntact={'True' if patch_intact else 'False'}")

    if not (version_matches and patch_intact and automatic_update_endpoint_disabled):
        print(
            "AI Butler has been updated or the local workflow patch is incomplete. "
            "Exit Zotero and reinstall the custom XPI.",
            file=sys.stderr,
        )
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
