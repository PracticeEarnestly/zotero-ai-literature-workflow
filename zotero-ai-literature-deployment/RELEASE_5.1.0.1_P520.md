# AI Butler 5.1.0.1 P520 migration release

Date: 2026-10-22

This release rebases the P520 coordinator workflow on official AI Butler
5.1.0 (`2a3ba3a16114f6a61e581c3eb0b40a089d63f165`). Other reading devices should
install the unmodified official release.

## Verified locally

- Production XPI build and TypeScript check: passed.
- i18n source/build checks: passed.
- Prettier and ESLint: passed.
- Task queue suite: 57 passed.
- Zotero compatibility suite: 33 passed.
- XPI version readback: `5.1.0.1`.
- XPI update feed readback: this repository, not the upstream repository.
- XPI SHA-256: `fdb1f1388ba39f0054945ecfde3dad4aa16035dafe347f9182b7b91c25629134`.

## Migration boundary

- The Zotero database and storage directory are not modified by the installer.
- Existing endpoint, MinerU, prompt, and device-role preferences are retained.
- The previous XPI and preference files must be backed up before replacement.
- Rollback consists of stopping Zotero, restoring the previous XPI and backed-up
  preference files, and restarting Zotero.

## P520 production readback

- Installed extension: `5.1.0.1`, active, not user-disabled.
- Installed XPI SHA-256 matched the release artifact.
- Device role remained `coordinator-qwen`; automatic scanning remained enabled.
- L1/L2/L3 prompts remained present with lengths 4908/7924/13189.
- Qwen remained enabled at the local P520 endpoint and `/v1/models` returned
  HTTP 200.
- MinerU credential remained present; its value was not printed or copied.
- Rollback backup:
  `/home/xiqing/zotero-ai-butler-backups/20261022-1601-before-5.1.0.1`.
- No live paper was queued during deployment, so the library received no test
  note or test tag.
