#!/usr/bin/env python3
"""Verify that the installed AI Butler XPI still contains this workflow patch."""

from __future__ import annotations

import argparse
import json
import sys
import zipfile
from pathlib import Path


EXPECTED_UPDATE_URL = (
    "https://github.com/PracticeEarnestly/zotero-ai-literature-workflow/"
    "releases/download/release/update.json"
)

MARKERS = (
    "zotero-itemmenu-ai-butler-workflow-preset",
    "zotero-collectionmenu-ai-butler-workflow-preset",
    "zotero-collectionmenu-ai-butler-workflow-l1",
    "zotero-collectionmenu-ai-butler-workflow-l2",
    "zotero-collectionmenu-ai-butler-workflow-l3",
    "zotero-collectionmenu-ai-butler-workflow-repair",
    "handleCollectionWorkflowLevel",
    "handleCollectionRatedWorkflowRepair",
    "handleSelectedWorkflowLevel",
    "getItemRating(item)",
    r"extra.match(/(?:^|\r?\n)\s*rate\s*:\s*([1-5])\s*(?=\r?\n|$)/i)",
    "enqueueRatedWorkflow(item)",
    "enqueueWorkflowLevel",
    'noteStrategy: "append"',
    "getWorkflowEndpointId",
    "getWorkflowPrompt",
    "getCompletedL1State",
    "getWorkflowLevelState",
    "generateWithEndpoint(endpointId, request)",
    "applyWorkflowTags",
    "AI_BUTLER_L1_DATA_AVAILABILITY_V1",
    "AI_BUTLER_FINAL_OUTPUT_ONLY_V1",
    "note-without-tag",
    "duplicate-item-artifact",
    "workflow-confirm-collection-level-title",
    "coordinator-qwen",
    "ratingWorkflowEnabled",
    "MinerU",
)
XPI_NAME = "zotero-ai-butler@github.com.xpi"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--profile-dir", required=True, type=Path, help="Zotero profile directory")
    parser.add_argument("--expected-version", default="5.1.0.3")
    parser.add_argument("--expected-update-url", default=EXPECTED_UPDATE_URL)
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
    update_endpoint_controlled = update_url == args.expected_update_url

    print(f"ProfileDirectory: {args.profile_dir}")
    print(f"XpiPath: {xpi_path}")
    print(f"Version: {version}")
    print(f"ExpectedVersion: {args.expected_version}")
    print(f"VersionMatches={'True' if version_matches else 'False'}")
    print(f"UpdateUrl: {update_url}")
    print(f"ExpectedUpdateUrl: {args.expected_update_url}")
    print(f"UpdateEndpointControlled={'True' if update_endpoint_controlled else 'False'}")
    for marker, present in marker_results.items():
        print(f"Marker {marker!r}: {'True' if present else 'False'}")
    print(f"PatchIntact={'True' if patch_intact else 'False'}")

    if not (version_matches and patch_intact and update_endpoint_controlled):
        print(
            "AI Butler has been updated or the local workflow patch is incomplete. "
            "Exit Zotero and reinstall the custom XPI.",
            file=sys.stderr,
        )
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
