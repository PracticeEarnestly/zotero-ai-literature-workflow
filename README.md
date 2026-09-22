# Zotero AI Literature Workflow

This repository contains the reproducible deployment package for the Zotero AI literature workflow.

It includes deployment documentation, L1–L3 prompt templates, workflow scripts, configuration examples, the current AI Butler patch source, and one reviewed public XPI. Local model endpoints, API credentials, Zotero data, backups, and intermediate build packages are deliberately excluded.

## Workflow

- New PDF: automatically runs L1.
- Rating 2–4: runs L2 after L1; if L1 is missing, runs L1 then L2.
- Rating 5: runs L3 after L1 and L2; if either earlier level is missing, completes the missing levels in order first.
- The Linux coordinator runs Qwen 27B locally. Standby devices use their locally configured endpoints and never receive embedded private addresses or keys.

For the full deployment guide, start with [Zotero_AI_Literature_L1_L2_L3_Codex_Deployment_V2.md](zotero-ai-literature-deployment/Zotero_AI_Literature_L1_L2_L3_Codex_Deployment_V2.md).

## AI Butler 3.8.5.25

The current reviewed package is [`release/zotero-ai-butler-3.8.5.25-public.xpi`](release/zotero-ai-butler-3.8.5.25-public.xpi). It contains no API key, private LAN/ZeroTier address, or upstream auto-update URL. Configure model endpoints after installation.

SHA-256: `51525ead5ad40a8d88ef37e39a47e8f494852545efdb29352ddef0df51e80a7b`

This version reuses synchronized `llm-for-zotero` MinerU ZIP caches before parsing a PDF again. It also adds Zotero's native ZIP reader as a fallback for scanned PDFs, preserves detailed cache diagnostics, and allows a failed fixed-ID workflow task to be manually rerun. See [release notes](zotero-ai-literature-deployment/RELEASE_3.8.5.25.md).

## Minimal plugin release

The streamlined implementation is intentionally maintained as a separate public project: [PracticeEarnestly/zotero-literature-flow](https://github.com/PracticeEarnestly/zotero-literature-flow). Its current release is [v0.2.1](https://github.com/PracticeEarnestly/zotero-literature-flow/releases/tag/v0.2.1), which provides the installable XPI, `update.json`, and a complete source archive.

This repository remains the deployment and AI Butler patch repository. It does not duplicate the Literature Flow source. See [Literature Flow integration](zotero-ai-literature-deployment/LITERATURE_FLOW_INTEGRATION.md) for the responsibility and version map.
