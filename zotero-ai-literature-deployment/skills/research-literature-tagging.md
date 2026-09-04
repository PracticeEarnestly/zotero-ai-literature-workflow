---
id: research-literature-tagging
match: /核心文献|可能有用|不纳入|已引用|核查|基金|假说|复现|数据集|项目|标签/i
---

# Zotero 科研文献标签管理

把用户明确表达的科研管理决定转换为 Zotero Tags。先读取当前条目与既有标签，再执行写入，并保留无关人工标签。

不要根据论文内容自行添加 `Status:Core`、`Status:Cited`、`Project:*`、`Grant:Hypothesis` 或其他个人用途标签。只在用户明确表达决定时写入。

## 映射

- “这篇是核心文献” → `Status:Core`
- “这篇可能有用，先保留” → `Status:Maybe`
- “这篇当前项目不纳入” → `Status:Exclude`
- “这篇已经引用” → `Status:Cited`
- “这篇需要投稿前再核查” → `Status:Check`
- “作为基金 Knowledge Gap” → `Grant:KnowledgeGap`
- “支持基金科学假说” → `Grant:Hypothesis`
- “这个分析流程值得复现” → `MethodRef:Workflow` + `MethodRef:Reproduce`
- “这个数据集以后可以重新分析” → `Data:Candidate`
- “这个数据已经下载” → `Data:Downloaded`
- “归到 <项目名> 项目” → `Project:<项目名>`

## 互斥规则

写入 `Status:Core`、`Status:Maybe` 或 `Status:Exclude` 前，移除其余两个。`Status:Cited` 和 `Status:Check` 不属于互斥组。

通过 Zotero 原生标签工具写入，并遵循 Agent Mode 的正常确认机制。
