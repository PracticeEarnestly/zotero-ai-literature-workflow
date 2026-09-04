# AI Butler 工作流精简对齐

本文件记录 AI Butler `3.8.5.3` 对 Literature Flow 工作流逻辑的对齐。它只调整 L1/L2/L3 阅读流程，不移除 AI Butler 的其他界面或功能。

## 规则

1. 新加入且有本地 PDF 的条目自动运行 L1。
2. 条目有任意旧 AI Note 但没有 `AI:L1` 时，仍运行 L1，并将结果追加到现有 AI Note。
3. 评级为 2–4 星时，按缺失顺序运行 L1、L2。
4. 评级为 5 星时，按缺失顺序运行 L1、L2、L3。
5. 手动运行 L1、L2 或 L3 时，同样追加到已有 AI Note。
6. 工作流只写入固定阶段标签：`AI:L1`、`AI:L2`、`AI:L3`。模型输出中的主题标签不会写入条目。

非工作流的 AI Butler 功能仍保留原有标签行为。

## 可重复构建

1. 从已安装的冻结 XPI 解包源码。
2. 运行 `scripts/apply_ai_butler_literature_flow_alignment.py --source-dir <解包目录>`。
3. 将 `manifest.json` 的版本提高到新版本。
4. 运行 `scripts/build_ai_butler_xpi.py --source-dir <解包目录> --out <新包.xpi>`。
5. 用 `scripts/test_ai_butler_patch.py` 在安装后检查版本与工作流标记。

新包安装前必须完全退出 Zotero。不要覆盖运行中的 XPI。
