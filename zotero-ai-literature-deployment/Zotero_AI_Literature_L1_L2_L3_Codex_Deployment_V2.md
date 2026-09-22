# Zotero 三层 AI 文献阅读系统：部署说明 V2

更新日期：2026-08-26  
状态：本机已部署，并已用真实的 5 星文献验证 L1 → L2 → L3 自动链路。

本方案使用冻结的自定义 AI Butler fork（Base: 3.8.5）。上游升级不视为兼容更新；新系统或新平台安装后必须完成第 8 节验收。

本文件是第一版方案的可执行更新版。第一版保留作设计记录；后续安装、验收、排错以本文件为准。

## 1. 工作流目标

用漏斗式阅读处理文献：先快速筛选，再补充证据卡，最后只对核心文献深读。

```text
新增且有本地 PDF
        ↓
L1：One Sentence
        ↓  人工在 Style「评级」打分
1 星：保留 L1
2–4 星：若缺少 L1，则 L1 后 L2；已有 L1 时只运行 L2
5 星：若缺少 L1，则 L1 后 L2 后 L3；已有 L1 时 L2 完成后自动 L3
```

L2 与 L3 都追加到已有 AI Note，不覆盖已有内容。成功完成后会加入对应流程标签：`AI:L1`、`AI:L2`、`AI:L3`。

## 2. 当前架构与职责

| 组件 | 职责 |
| --- | --- |
| Zotero | 条目、Collection、PDF、Note、Tag 与同步 |
| Zotero Style | 在父文献的「评级」字段写入 `Extra` 中的 `rate: 1` 至 `rate: 5` |
| AI Butler | MinerU 解析、自动 L1、星级触发 L2/L3、队列、AI Note 与 Collection 批处理 |
| MinerU | PDF 转为可供模型阅读的 Markdown；优先使用本地可访问 PDF |
| llm-for-zotero | 人工发起的 L1/L2/L3 与 Agent Mode 科研用途标签管理 |
| Qwen 27B | L1 默认模型；L2 的固定模型 |
| Gemma 31B | L3 的固定模型；AI Butler 与 llm-for-zotero 共用 |
| 本地 Gemma4 12B | 可在 AI Butler 的 Zotero 偏好设置中选为 L1；默认不启用该选择 |

模型地址、密钥和局域网配置只保留在 Zotero 本地首选项，不写入本文件或 Git。

## 3. 自动规则

### 3.1 L1：新增文献

- 触发条件：新增父文献，且至少有一个本地路径可访问的 PDF。
- 行为：自动运行 `L1：One Sentence`；默认使用 Qwen 27B，也可在 AI Butler 的 Zotero 偏好设置中切换为本地 LM Studio 的 Gemma4 12B。切换仅影响之后新建的 L1 任务。
- Note 行为：已有 AI Note 时追加 L1 结果。
- 标签：读取 L1 输出末尾的结构化 JSON，只追加允许前缀的标签；任务成功时确保写入 `AI:L1`。

如果条目有多个 PDF，流程会跳过失效附件，选择第一个可读取的本地 PDF。

### 3.2 L2：评级 2–4 星

- Style 会把评分保存为 `Extra` 字段中的 `rate: N`。
- 触发条件：评级为 2、3 或 4 星，且条目尚无 `AI:L2`。
- 行为：若尚无 `AI:L1`，先补做 L1；L1 完成后运行 `L2：Evidence Card`，使用 Qwen 27B，并追加到 AI Note。
- 完成标记：`AI:L2`。

### 3.3 L3：评级 5 星

- 触发条件：评级为 5 星，且条目尚无 `AI:L3`。
- 行为：若尚无 `AI:L1`，先补做 L1；若尚未完成 L2，再运行 L2；L2 完成后自动运行 `L3：Deep Reading`。
- 模型：Gemma 31B。
- Note 行为：追加到同一 AI Note。
- 完成标记：`AI:L3`。

L3 采用串行交接，不会与 L2 同时争用同一条目的任务 ID。若 Zotero 在队列交接时退出，启动后会恢复未完成的 pending 任务。

## 4. 手动入口

- 任意文献右键菜单：可手动运行 L1、L2 或 L3。
- 任意 Collection 右键菜单：选择“L1 批量文献总结并打标签”，处理该 Collection 的直接子文献。
- llm-for-zotero：可手动调用 L3；其 L3 使用与 AI Butler 相同的 Gemma 31B。
- Agent Mode：使用 `research-literature-tagging` 管理 Project、Status、Grant、Manuscript 等人工科研标签。

## 5. 标签与 Note 规则

- AI Butler 在每次 L1/L2/L3 的**当次模型输出**中解析 `ZOTERO_TAGS_JSON_START` 与 `ZOTERO_TAGS_JSON_END` 之间的 JSON；随后从 AI Note 正文移除该 JSON，并把允许前缀标签直接写回父条目。
- 因此已保存的 AI Note 不保留 JSON 标签块；L1/L2/L3 追加不会形成“多个 JSON 块如何选择”的问题。
- 当前 V2 不依赖 Actions and Tags 的 `createItem`、`createNote` 或 `appendNote` 自动事件。不要迁移旧的“添加标签 / Add tags”规则。
- 不删除用户已有标签。
- 只接受有固定前缀的结构化标签，例如 `AI:`、`Evidence:`、`Disease:`、`Tissue:`、`Cell:`、`Gene:`、`Pathway:`、`Method:`、`Species:`、`Design:`。
- 标签应代表论文实际研究主线，不能把 Introduction、Discussion 中随意提到的内容写成标签。
- AI Note 不再写入 Actions & Tags 脚本碎片或逗号拆分出的无关文本。

## 6. 已实现的可靠性修复

| 问题 | 修复结果 |
| --- | --- |
| 旧 PDF 失效导致“找不到 PDF” | 选择第一个本地可访问的 PDF |
| L1 完成后无法继续 | Zotero 启动时恢复 pending/priority 任务 |
| Style 保存 `rate: 5` 但不触发 | 修正评分解析，准确识别 `rate: 1–5` |
| L2 成功但 L3 停在 pending | L2/L3 入队后延迟检查并唤醒任务队列 |
| L2/L3 没有新增流程标签 | 成功后强制补充 `AI:L2` 或 `AI:L3` |
| 旧 Actions and Tags 规则造成正文碎片标签 | V2 改为 AI Butler 直接解析当次输出；迁移时停用旧的“添加标签”规则 |

## 7. 日常使用建议

1. 导入文献并确认 PDF 能在 Zotero 内打开。
2. 等待 L1 完成后，用 Style 评级进行人工筛选。
3. 2–4 星用于需要证据结构化的文献。
4. 5 星只用于综述核心文献；系统会依次生成 L2 与 L3。
5. 以 `AI:L1`、`AI:L2`、`AI:L3` 作为流程完成状态，而不是仅依靠 Note 标题判断。

建议比例：约 100 篇 L1、20–30 篇 L2、5–10 篇 L3。实际比例按课题需要调整。

## 8. 验收步骤

### 基础验收

1. 新增一篇带本地 PDF 的测试文献。
2. 确认任务队列出现并完成 L1，条目含 `AI:L1`。
3. 对一篇尚无 L1 的条目打 2–4 星，确认先生成 L1、再追加 L2，并出现 `AI:L1`、`AI:L2`。
4. 对一篇尚无 L1 的条目打 5 星，确认依次生成 L1、L2、L3，并出现全部三个流程标签。
5. 重复运行 L1，确认不会删除 `AI:L2`、`AI:L3` 或 `Evidence:` 标签。
6. 在升级或重新安装后运行补丁检测，确认其能区分 `PatchIntact=True` 与 `PatchIntact=False`。

### 当前已完成的真实验证

文献 “Comprehensive single-cell profiling of monocytes in HLA-B27-positive ankylosing spondylitis with acute anterior uveitis” 已验证：5 星 → 自动 L2 → 自动 L3 成功。

2026-08-27 已安装补充规则：对缺少 `AI:L1` 的已评分条目先补做 L1，再按 2–4 星进入 L2 或按 5 星进入 L2、L3。该补丁已通过安装完整性与静态校验；首次实际验收按第 8 节第 3–4 项执行。

## 9. 快速排错

| 现象 | 首先检查 |
| --- | --- |
| 新文献没有 L1 | 是否有本地可读取 PDF；AI Butler 的自动扫描是否开启 |
| 评分后没有 L2 | `Extra` 是否出现 `rate: 2` 以上；条目是否已有 `AI:L2`；补丁是否完整 |
| L2 有结果但 L3 无模型负载 | 查看任务队列是否为 pending；重启 Zotero 可恢复 pending；确认使用最新版队列唤醒修复包 |
| 报 PDF 路径不存在 | 确认 PDF 实体文件仍在本机；删除或修复失效附件后重试 |
| 生成了无关标签 | 检查提示词的结构化 JSON；不应启用将 Actions & Tags 脚本文本直接写为标签的规则 |

## 10. 升级、验证与回退

AI Butler 官方自动升级可能覆盖本地补丁。升级后：

1. 退出 Zotero。
2. 运行 `scripts/test_ai_butler_patch.py` 或 `scripts/Test-AiButlerPatch.ps1` 验证补丁标记。
3. 若验证失败，从 `backup` 中选择最新的 `zotero-ai-butler-3.8.5-codex-rated-l1-l2-l3-chain-*.xpi` 重新安装。
4. 重启 Zotero 后按第 8 节进行最小验收。

不要直接修改 `zotero.sqlite`。所有插件替换前先备份当前 XPI；模型服务端无需因本工作流更改端口、上下文长度或 Agent/tool-calling 设置。

后续修改插件代码时，以 [SOURCE_BASELINE.md](SOURCE_BASELINE.md) 指定的冻结 V2 源码目录为起点。不要再以旧的 `zotero-ai-butler-patch` 目录作为 V2 基线。
