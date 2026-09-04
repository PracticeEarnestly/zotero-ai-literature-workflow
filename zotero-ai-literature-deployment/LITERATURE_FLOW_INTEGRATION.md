# 精简插件与部署仓库的关系

## 当前版本

| 项目 | GitHub 位置 | 当前版本 | 用途 |
| --- | --- | --- | --- |
| 精简插件 | [zotero-literature-flow](https://github.com/PracticeEarnestly/zotero-literature-flow) | [v0.2.1](https://github.com/PracticeEarnestly/zotero-literature-flow/releases/tag/v0.2.1) | 可直接安装的 Zotero XPI 与自动更新清单 |
| 部署与 AI Butler 补丁 | [zotero-ai-literature-workflow](https://github.com/PracticeEarnestly/zotero-ai-literature-workflow) | `main` | 提示词、部署文档、检查脚本与 AI Butler 工作流补丁 |

## 精简插件包含的工作流

- 新加入的本地 PDF 可自动进入 L1。
- 评级为 2–4 星时，缺失的步骤按 L1、L2 顺序补齐。
- 评级为 5 星时，缺失的步骤按 L1、L2、L3 顺序补齐。
- 已完成 L2 的条目由 2–4 星改为 5 星时，会进入 L3。
- L1/L2 与 L3 可使用不同的 OpenAI 兼容模型端点。
- 配置 MinerU 时使用 MinerU；未配置时回退到 Zotero 全文索引。
- 只写入 `AI:L1`、`AI:L2`、`AI:L3` 与 `Literature Flow` 流程标签，不使用模型输出生成主题标签。

## 维护原则

两个仓库刻意不互相复制源码或 XPI：

- 更新精简插件时，在 `zotero-literature-flow` 发布新版本和 XPI。
- 更新 AI Butler 工作流时，在本私有仓库维护补丁、提示词与部署文档。
- 两边出现流程规则变化时，同时更新本文件中的版本与规则说明。
