# Zotero AI Literature Workflow

This repository contains the reproducible deployment package for the Zotero AI literature workflow.

It includes deployment documentation, L1–L3 prompt templates, workflow scripts, configuration examples, and the current AI Butler patch source. Local model endpoints, API credentials, Zotero data, backups, and generated XPI packages are deliberately excluded.

## Workflow

- New PDF: automatically runs L1.
- Rating 2–4: runs L2 after L1; if L1 is missing, runs L1 then L2.
- Rating 5: runs L3 after L1 and L2; if either earlier level is missing, completes the missing levels in order first.
- L1 and L2 use Qwen 27B. L3 uses the configured Gemma 31B endpoint.

For the full deployment guide, start with [Zotero_AI_Literature_L1_L2_L3_Codex_Deployment_V2.md](zotero-ai-literature-deployment/Zotero_AI_Literature_L1_L2_L3_Codex_Deployment_V2.md).
