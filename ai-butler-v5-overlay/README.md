# AI Butler 5.1 P520 overlay

This directory contains the small P520 workflow overlay applied to the official
AI Butler 5.1.0 source tree.

- Upstream repository: `https://github.com/steven-jianhao-li/zotero-AI-Butler.git`
- Pinned upstream commit: `2a3ba3a16114f6a61e581c3eb0b40a089d63f165`
- Derived package version: `5.1.0.3`
- Target role: `coordinator-qwen` on P520 only
- Update feed: this repository, never the upstream release feed

The overlay preserves upstream queue recovery, MinerU reuse, incomplete-output
handling, and Zotero 7-10 compatibility. It adds only:

1. L1/L2/L3 custom prompt and fixed-endpoint task options.
2. P520 coordinator routing to the endpoint named `Qwen`.
3. Rating workflow: 1 star ensures L1, 2-4 stars add L2, 5 stars adds L3.
4. Structured Zotero tag extraction and `AI:L1`/`AI:L2`/`AI:L3` completion tags.
5. Per-task append strategy so later levels do not overwrite earlier notes.
6. Matching item/collection L1/L2/L3 workflow menus independent of old
   visibility preferences, plus the collection rating-repair action.
7. L1 data-availability contract, strict L1/L2/L3 output validation, safe
   completion-tag recovery, and cross-item L1 duplicate detection.

The legacy note-consolidation action is intentionally not restored because it
moved notes to trash. Official 5.1 queue recovery, incomplete-output retention,
and MinerU Markdown attachment reuse replace the corresponding old internals.

No API key, Zotero database, or user prompt content is embedded in the XPI.
Existing preferences are retained by Zotero during the in-place upgrade.

Build with:

```bash
./zotero-ai-literature-deployment/scripts/build_ai_butler_v5_p520.sh
```
