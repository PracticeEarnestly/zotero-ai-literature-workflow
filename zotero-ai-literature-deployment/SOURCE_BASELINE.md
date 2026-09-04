# AI Butler V2 源码基线

当前可编辑基线由冻结的 V2 XPI 提取，而不是旧的 `zotero-ai-butler-patch` 目录。

## 当前基线

- XPI：`backup/zotero-ai-butler-3.8.5-codex-l3-queue-resume-5star-20260826-103910.xpi`
- SHA-256：`1A522F6E7AB5D7CB02DA2B3BE0823615274989EA922D61C3A4042ED4CDF76EE4`
- 提取目录：`source/ai-butler-3.8.5-workflow-v2-20260826/`

提取目录中的 `WORKFLOW_SOURCE_BASELINE.json` 记录来源 XPI、哈希、插件 ID、版本与文件数量。

## 维护规则

1. 所有新补丁从该目录复制到新的工作目录后再修改；不要修改冻结基线。
2. 修改后重建新的 XPI，采用包含日期和工作流版本的文件名。
3. 安装前运行 `scripts/test_ai_butler_patch.py`；安装后再次运行，并执行 V2 部署说明中的最小验收。
4. 上游 AI Butler 升级时，单独建立新的上游基线，再移植并测试本工作流补丁；不得直接覆盖当前冻结版本。
