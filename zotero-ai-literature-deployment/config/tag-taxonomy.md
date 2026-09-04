# 标签分类

## 自动阅读层级

- `AI:L1`
- `AI:L2`
- `AI:L3`

L2/L3 只能有一个 `Evidence:E#`：`Evidence:E0` 至 `Evidence:E5`。

## 人工科研决策

- Status：`Status:Core`、`Status:Maybe`、`Status:Exclude` 互斥；`Status:Cited`、`Status:Check` 可共存。
- Project：`Project:<ProjectName>`，仅在用户明确给出项目名时创建。
- Manuscript：Background、Rationale、Methods、ResultsContext、Discussion、Comparison、Limitation。
- Grant：Background、UnmetNeed、KnowledgeGap、Hypothesis、PreliminarySupport、Mechanism、Method、Feasibility、Innovation、Risk。
- MethodRef：Core、Workflow、Statistics、Benchmark、Parameter、Visualization、Code、Protocol、Validation、Reproduce。
- Data：Candidate、HighValue、Downloaded、Processed、Reusable、MetadataCheck、Restricted、Request、Unavailable、Exclude。
- Idea：Seed、Mechanism、CrossDisease、CrossTissue、Contradiction、KnowledgeGap、Testable、FutureProject。
