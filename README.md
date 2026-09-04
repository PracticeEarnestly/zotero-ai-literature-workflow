# Zotero AI Literature Workflow

This repository contains the reproducible deployment package for the Zotero AI literature workflow.

It includes deployment documentation, L1–L3 prompt templates, workflow scripts, configuration examples, and the current AI Butler patch source. Local model endpoints, API credentials, Zotero data, backups, and generated XPI packages are deliberately excluded.

## Workflow

- New PDF: automatically runs L1.
- Rating 2–4: runs L2 after L1; if L1 is missing, runs L1 then L2.
- Rating 5: runs L3 after L1 and L2; if either earlier level is missing, completes the missing levels in order first.
- L1 and L2 use Qwen 27B. L3 uses the configured Gemma 31B endpoint.

For the full deployment guide, start with [Zotero_AI_Literature_L1_L2_L3_Codex_Deployment_V2.md](zotero-ai-literature-deployment/Zotero_AI_Literature_L1_L2_L3_Codex_Deployment_V2.md).

## Minimal plugin release

The streamlined implementation is intentionally maintained as a separate public project: [PracticeEarnestly/zotero-literature-flow](https://github.com/PracticeEarnestly/zotero-literature-flow). Its current release is [v0.2.1](https://github.com/PracticeEarnestly/zotero-literature-flow/releases/tag/v0.2.1), which provides the installable XPI, `update.json`, and a complete source archive.

This repository remains the private deployment and AI Butler patch repository. It does not duplicate the Literature Flow source or release artifacts. See [Literature Flow integration](zotero-ai-literature-deployment/LITERATURE_FLOW_INTEGRATION.md) for the responsibility and version map.
