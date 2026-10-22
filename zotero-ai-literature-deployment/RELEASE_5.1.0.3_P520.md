# AI Butler 5.1.0.3 P520 collection-menu parity release

Date: 2026-10-22

This P520-only patch keeps the official AI Butler 5.1.0 base and the 5.1.0.2
coordinator workflow while making collection context-menu behavior consistent
with the item context menu. Other reading devices should continue to use the
unmodified official release.

## Fixed behavior

- Item and collection context menus now both show `运行阅读层级` with L1, L2,
  and L3 children.
- Collection scope retains the separate `扫描已评分文献并补齐流程` maintenance
  action.
- Collection L1/L2/L3 batches skip completed, uncertain, and attachment-less
  items instead of silently rerunning them.
- A recognized workflow note that is missing only its completion tag is repaired
  without another model request.
- The install verifier now checks the AI Butler 5.1 overlay and the repository-
  controlled update URL instead of obsolete 3.8.x implementation markers.

## Verification

- Prettier and ESLint: passed.
- Task queue tests: 57 passed.
- Production build and TypeScript: passed.
- Source and built i18n checks: passed.
- Zotero 7-10 compatibility tests: 33 passed.
- XPI files: 206; ZIP integrity: passed.
- XPI SHA-256:
  `480f6b2073da5845d8c58241d3543eaf537c3ff03417fd792c0574fea0b3159f`.
- Credential-pattern scan: no embedded API key or bearer token found.

## P520 deployment readback

- Extension version `5.1.0.3`; active, enabled, and not app-disabled.
- Installed XPI hash matched the locally verified artifact.
- Item and collection L1/L2/L3 menu markers were present in the installed XPI.
- Coordinator role, rating workflow, MinerU PDF mode, and automatic scanning
  remained enabled.
- L1/L2/L3 remained routed to the endpoint named `Qwen`; its models endpoint
  returned HTTP 200.
- Prompt lengths remained 4908/7924/13189 and all three prompt SHA-256 values
  matched the pre-upgrade readback.
- Zotero restarted with cache purge; no live literature task was submitted.
- Rollback backup:
  `/home/xiqing/zotero-ai-butler-backups/20261022-163855-before-5.1.0.3`.
