# Mac Management Migration Status — 2026-10-22

## AI Butler 5 migration update

- Official 5.1.0 source was pinned at commit
  `2a3ba3a16114f6a61e581c3eb0b40a089d63f165`.
- P520 coordinator overlay `5.1.0.3` was built and passed the queue and Zotero
  compatibility test suites.
- Other reading devices remain on the official, unmodified AI Butler release.
- P520 production deployment completed after a verified XPI/preferences backup.
- Rollback backup:
  `/home/xiqing/zotero-ai-butler-backups/20261022-163855-before-5.1.0.3`.

## Scope

This document tracks migration of the Zotero AI literature workflow maintenance
assets to the Mac and records the controlled P520 extension migration. The
deployment did not directly edit the Zotero database or storage directory.

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
| P520 | `5.1.0.3` | `coordinator-qwen` | `mineru` | `480f6b2073da5845d8c58241d3543eaf537c3ff03417fd792c0574fea0b3159f` |
| Mac | `3.8.5.25` | default `reader-standby`; rating automation disabled | `mineru` | `9e2796398fa96bebccdacba76343cc20f9331ec3c28e9a5b194cd0bed7ba075b` |

Both installed XPIs passed ZIP integrity checks. After the P520 migration,
Zotero reported AI Butler `5.1.0.3` active and enabled. Its item and collection
menus both expose the same L1/L2/L3 reading-level submenu; collection scope also
retains rated-workflow repair. The local Qwen endpoint returned HTTP 200. The
L1/L2/L3 prompt lengths remained 4908, 7924, and 13189 characters. No workflow
task was submitted during deployment.

Runtime XPI snapshots are stored outside this Git repository. Raw Zotero
preferences are not copied because they can contain credentials.

## Known differences and migration gaps

1. The public Git baseline stops at AI Butler `3.8.5.25`, while P520 is running
   `3.8.5.28`.
2. Comparing the reviewed public `3.8.5.25` XPI with the P520 `3.8.5.28` XPI
   shows changes only in `content/scripts/aiButler.js` and `manifest.json`.
3. The previous P520 `3.8.5.28` XPI retained the upstream auto-update URL. The
   installed `5.1.0.3` package now uses this repository's controlled update feed.
4. The Windows maintenance directory is being audited against GitHub `main` for
   source, prompts, scripts, tests, release notes, and validation reports that
   have not yet been committed.
5. The current Mac runtime and the reviewed public release use different XPI
   hashes even though both report version `3.8.5.25`. The installed Mac package
   therefore remains a runtime snapshot, not the reproducible public baseline.

## Reconstructed public 3.8.5.28 candidate

The P520 runtime code delta has been imported into tracked source while keeping
the repository-owned homepage and removing the upstream auto-update URL. A
credential-free public candidate was rebuilt from that source:

- Package: `release/zotero-ai-butler-3.8.5.28-public.xpi`
- SHA-256: `d323e7a7039b86b70555f8ccc5d30d4a3f9cc8ac2970c908acb86311c0b9c048`
- Files: 95
- ZIP integrity: pass
- Public manifest version: `3.8.5.28`
- Runtime code match: pass for `content/scripts/aiButler.js`
- Private address and credential pattern scan: no findings

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
3. Compare the reconstructed release notes with the Windows `3.8.5.26`–
   `3.8.5.28` historical notes and retain any additional verified evidence.
4. Decide separately whether the Mac reader installation should be upgraded;
   keep P520 as the only active coordinator unless a manual failover is intended.
