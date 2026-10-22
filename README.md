# Zotero AI Literature Workflow

This repository contains the reproducible deployment package for the Zotero AI literature workflow.

It includes deployment documentation, L1–L3 prompt templates, workflow scripts, configuration examples, the current AI Butler patch source, and reviewed public XPI releases. Local model endpoints, API credentials, Zotero data, backups, and intermediate build packages are deliberately excluded.

## Workflow

- New PDF: automatically runs L1.
- Rating 2–4: runs L2 after L1; if L1 is missing, runs L1 then L2.
- Rating 5: runs L3 after L1 and L2; if either earlier level is missing, completes the missing levels in order first.
- The Linux coordinator runs Qwen 27B locally. Standby devices use their locally configured endpoints and never receive embedded private addresses or keys.

For the full deployment guide, start with [Zotero_AI_Literature_L1_L2_L3_Codex_Deployment_V2.md](zotero-ai-literature-deployment/Zotero_AI_Literature_L1_L2_L3_Codex_Deployment_V2.md).

## AI Butler 3.8.5.28

The current reviewed package is [`release/zotero-ai-butler-3.8.5.28-public.xpi`](release/zotero-ai-butler-3.8.5.28-public.xpi). It contains no API key, private LAN/ZeroTier address, or upstream auto-update URL. Configure model endpoints after installation.

SHA-256: `d323e7a7039b86b70555f8ccc5d30d4a3f9cc8ac2970c908acb86311c0b9c048`

This version retains the synchronized `llm-for-zotero` MinerU cache integration from 3.8.5.25, rejects reasoning-only or incomplete model responses, recovers a missing standard L2/L3 heading only after all required sections pass validation, and can repair a missing completion tag without calling the model again when the note was already saved. See [release notes](zotero-ai-literature-deployment/RELEASE_3.8.5.28.md).

## Minimal plugin release

The streamlined implementation is intentionally maintained as a separate public project: [PracticeEarnestly/zotero-literature-flow](https://github.com/PracticeEarnestly/zotero-literature-flow). Its current release is [v0.2.1](https://github.com/PracticeEarnestly/zotero-literature-flow/releases/tag/v0.2.1), which provides the installable XPI, `update.json`, and a complete source archive.

This repository remains the deployment and AI Butler patch repository. It does not duplicate the Literature Flow source. See [Literature Flow integration](zotero-ai-literature-deployment/LITERATURE_FLOW_INTEGRATION.md) for the responsibility and version map.

## Zotero LLM Automation Bridge 0.1.5

A separate plugin queues a paper when its Style Extra rating enters five stars, calls the public llm-for-zotero Agent API, and saves a child note. It does not modify Style, llm-for-zotero, or AI Butler. Version 0.1.5 renders Markdown as Zotero rich text and migrates Bridge-owned legacy notes after backing them up.

- [Plugin source and setup](zotero-llm-automation-bridge/README.md)
- [Installable XPI and checksum](https://github.com/PracticeEarnestly/zotero-ai-literature-workflow/releases/tag/bridge-v0.1.5)
- [Validation and compatibility limits](zotero-llm-automation-bridge/docs/VALIDATION.md)

The Bridge is independent of the L1–L3 workflow above. Its queue is local to one device. Configure llm-for-zotero and review the Bridge settings before rating papers. Updates are installed manually.
