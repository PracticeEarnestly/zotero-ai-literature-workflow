# AI Butler 5.1.0.2 P520 workflow recovery release

Date: 2026-10-22

This release keeps the official AI Butler 5.1.0 implementation and restores the
P520-only L1/L2/L3 coordinator functions that were incomplete in 5.1.0.1.
Other reading devices should continue to use the unmodified official release.

## Audit result

The stored L1/L2/L3 prompt text was unchanged from the last 3.8.5 deployment,
but the runtime contract and menu integration were incomplete. The audit found:

- the item context-menu entry for manually running L1/L2/L3 was absent;
- the collection L1 and rated-workflow repair entries were absent;
- legacy menu visibility preferences hid every official 5.1 item, so a
  collapsed AI Butler root could disappear;
- the L1 data-availability/accession instruction was not appended at runtime;
- workflow-specific output validation, note-aware completion detection, and
  cross-item L1 duplicate detection had not been ported;
- a rated item waiting for an attachment resumed only L1 instead of the full
  rating-driven chain.

## Restored behavior

- Item menu: `运行阅读层级` with L1, L2, and L3 children.
- Collection menus: batch L1 and scan rated items to fill only missing levels.
- Exact L1 data-availability and final-output-only runtime contracts.
- Required structured tag JSON and L1/L2/L3 body validation before saving a
  completion tag.
- Recovery of a missing completion tag when a readable workflow note exists;
  a tag without a recognized note is treated as uncertain and is not rerun
  automatically.
- Exact DOI/title cross-item L1 duplicate detection.
- Rating-chain continuation when a delayed attachment becomes usable.
- Retry of completion/tag persistence during transient Zotero save contention.
- Official 5.1 context-menu entries were re-enabled in the P520 preferences.

## Retained official 5.1 behavior

Official persistent queue recovery, manual retry/abort support, incomplete LLM
output retention, deep-read slot resume, and saved MinerU Markdown attachment
reuse remain unchanged.

The old note-consolidation command was intentionally not restored because it
moved notes to trash. The old direct dependency on llm-for-zotero's private ZIP
cache was also not restored; official 5.1's own MinerU Markdown attachment cache
is the supported replacement. Historical L1 notes without data-availability
metadata are not silently reprocessed.

## Verification

- Production build and TypeScript check: passed.
- Prettier and ESLint: passed.
- i18n source/build checks: passed.
- Task queue tests: 57 passed.
- Zotero compatibility tests: 33 passed.
- XPI version: `5.1.0.2`.
- XPI update feed: repository-controlled release feed.
- XPI SHA-256:
  `f866feda3b55688a269c71ee46ea327ffb644a3e21cfdfa8ec85b29aa27d2188`.
- Credential-pattern scan: no embedded key or bearer token found.

## P520 deployment readback

- Extension state: active, enabled, not app-disabled.
- Installed XPI hash matched the release artifact.
- Coordinator defaults: `coordinator-qwen`, rating workflow enabled, L1/L2/L3
  endpoint name `Qwen`.
- PDF mode remained `mineru`; automatic scan remained enabled.
- L1/L2/L3 prompt lengths remained 4908/7924/13189 and their SHA-256 values
  matched the pre-upgrade readback.
- Local Qwen `/v1/models` returned HTTP 200.
- No live paper task was submitted during deployment.
- Rollback backup:
  `/home/xiqing/zotero-ai-butler-backups/20261022-162445-before-5.1.0.2`.

The first direct-file restart was rejected by Zotero's stale extension cache.
The deployment automatically rolled back to verified 5.1.0.1, then repeated
the upgrade with the extension-state version updated and `-purgecaches`. The
final 5.1.0.2 XPI and extension state were independently read back.
