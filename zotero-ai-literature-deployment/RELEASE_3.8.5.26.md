# AI Butler 3.8.5.26 发布说明

## 修复内容

- 修复 P520 上连续出现的 L3 `missing workflow heading` 失败。
- 当 L2 或 L3 缺少固定顶层标题，但全部必需章节都存在且有内容时，自动补回标准标题。
- 正文不完整时仍然拒绝保存；证据等级、结构化标签 JSON 和完成标签校验保持不变。
- 保留 3.8.5.25 的 MinerU 缓存复用、扫描 PDF 后备解析和失败任务手动补跑能力。

## 安全边界

- 公开 XPI 不包含 API 密钥、局域网或 ZeroTier 地址。
- 不恢复官方自动更新地址。
- P520 原有模型端点保存在 Zotero 配置中，升级 XPI 时不会覆盖现有端点。

## 构建

```bash
python3 zotero-ai-literature-deployment/scripts/build_ai_butler_xpi_normalized.py \
  --source-dir zotero-ai-butler-patch \
  --out release/zotero-ai-butler-3.8.5.26-public.xpi
```
