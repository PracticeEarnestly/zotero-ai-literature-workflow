# Mac Management Migration Status — 2026-10-22

## Scope

This document tracks migration of the Zotero AI literature workflow maintenance
assets to the Mac. It does not change any Zotero library, installed extension,
model endpoint, or device role.

## Git baseline

- Repository: `PracticeEarnestly/zotero-ai-literature-workflow`
- Default branch reviewed: `main`
- Reviewed commit: `4647f7f46aa3235fd2e4347e7ebec57ac8e9c642`
- Public AI Butler baseline: `3.8.5.25`
- Public XPI SHA-256:
  `51525ead5ad40a8d88ef37e39a47e8f494852545efdb29352ddef0df51e80a7b`

The repository contains deployment documentation, L1–L3 prompts, build and
validation scripts, the AI Butler patch source, the standalone Bridge source,
and reviewed public release packages.

## Live runtime readback

| Runtime | AI Butler | Role | PDF mode | XPI SHA-256 |
| --- | --- | --- | --- | --- |
| P520 | `3.8.5.28` | `coordinator-qwen` | `mineru` | `4dc2dc9256173a2a0ae69495162c909e3357218541207836bff9da6b3ea48a2b` |
| Mac | `3.8.5.25` | default `reader-standby`; rating automation disabled | `mineru` | `9e2796398fa96bebccdacba76343cc20f9331ec3c28e9a5b194cd0bed7ba075b` |

Both installed XPIs passed ZIP integrity checks and contained 95 files. The
P520 model endpoint and the Mac-to-P520 model route responded successfully at
the time of the readback. No workflow task was submitted.

Runtime XPI snapshots are stored outside this Git repository. Raw Zotero
preferences are not copied because they can contain credentials.

## Known differences and migration gaps

1. The public Git baseline stops at AI Butler `3.8.5.25`, while P520 is running
   `3.8.5.28`.
2. Comparing the reviewed public `3.8.5.25` XPI with the P520 `3.8.5.28` XPI
   shows changes only in `content/scripts/aiButler.js` and `manifest.json`.
3. The installed P520 XPI contains no detected private IPv4 address, OpenAI-like
   API key, or Bearer token, but it retains the upstream auto-update URL. It must
   not be published unchanged.
4. The Windows maintenance directory is being audited against GitHub `main` for
   source, prompts, scripts, tests, release notes, and validation reports that
   have not yet been committed.
5. The current Mac runtime and the reviewed public release use different XPI
   hashes even though both report version `3.8.5.25`. The installed Mac package
   therefore remains a runtime snapshot, not the reproducible public baseline.

## Publication and deployment controls

- Never commit API keys, tokens, private endpoints, Zotero databases, user
  preferences, attachment data, backups, or intermediate build packages.
- Keep runtime snapshots outside Git and verify their SHA-256 values.
- Import Windows maintenance assets on a review branch, not directly on `main`.
- Remove the upstream auto-update URL from reviewed public AI Butler packages.
- Rebuild a candidate XPI from tracked source and run syntax, marker, ZIP, and
  secret checks before considering an upgrade.
- Do not install a migrated package or start L1/L2/L3 tasks as part of the source
  migration.

## Pending work

1. Complete the Windows-to-GitHub difference audit.
2. Review and merge safe historical assets from the Windows audit branch.
3. Reconstruct the `3.8.5.28` source delta from authoritative assets and add its
   release notes and validation evidence.
4. Build and validate a credential-free public `3.8.5.28` candidate.
5. Decide separately whether the Mac reader installation should be upgraded;
   keep P520 as the only active coordinator unless a manual failover is intended.
