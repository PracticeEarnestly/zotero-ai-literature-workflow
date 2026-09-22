# AI Butler 3.8.5.25 发布说明

## 主要改动

- 优先复用同一 Zotero 条目下由 llm-for-zotero 保存的 MinerU ZIP 缓存，避免 L2/L3 或重跑 L1 时再次解析整篇 PDF。
- JSZip 无法读取缓存时，自动使用 Zotero 原生 ZIP 读取器。
- 对无文字层的扫描 PDF，所有文本读取入口都会先检查现有 MinerU 缓存。
- 缓存附件、PDF key、`full.md` 或 ZIP 解压异常会保留在任务错误详情中。
- 手动重跑 L1/L2/L3 时，允许重新执行同一固定任务 ID 的旧失败任务。
- 保留多设备角色、自动 L1、评级触发 L2/L3、标签去重、Data 开放性标签与 L1/L2/L3 笔记整理。

## P520 实际验证

- 环境：Ubuntu，Zotero 9.0.1，AI Butler 3.8.5.25。
- 测试文献：`Microplastic-induced hypertension in rats: a two-hit model exploring oxidative stress and gut microbiota`。
- 测试 PDF 无可选文字，条目下已有 llm-for-zotero MinerU ZIP 缓存。
- 任务成功进入本机 Qwen 27B，生成 L1 Note，并写入 `AI:L1`、`Data:AvailableOnRequest` 及其他结构化标签。
- 运行时两张 RTX 2080 Ti 的 GPU 负载约为 87% 和 89%，证明任务已进入模型生成阶段。

## 发布安全

公开源码与 XPI 不包含 API key、ZeroTier/Tailscale 地址或其他本地凭据。安装后需在 AI Butler 的模型端点页填写实际地址与密钥。

发布 XPI 的 SHA-256：`51525ead5ad40a8d88ef37e39a47e8f494852545efdb29352ddef0df51e80a7b`

## 构建

```bash
python3 zotero-ai-literature-deployment/scripts/build_ai_butler_xpi_normalized.py \
  --source-dir zotero-ai-butler-patch \
  --out release/zotero-ai-butler-3.8.5.25-public.xpi
```
