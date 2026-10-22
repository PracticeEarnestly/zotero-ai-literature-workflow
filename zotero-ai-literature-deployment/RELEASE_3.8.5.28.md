# AI Butler 3.8.5.28 发布说明

## 来源与范围

本版本从 P520 于 2026-10-22 实际加载的 `3.8.5.28` XPI 回读源码，
与仓库已审查的公开 `3.8.5.25` 基线逐文件比较后重建。两个 XPI 均为
95 个文件，代码差异只位于 `content/scripts/aiButler.js`；公开包的
`manifest.json` 另行移除上游自动更新地址并指向本仓库。

本说明记录 `3.8.5.25` 到 `3.8.5.28` 的累计代码差异，不把这些差异
强行拆分到缺少完整 Git 历史的中间版本。

## 主要改动

- 记录流式与非流式模型响应的结束原因、正文长度和 reasoning 长度。
- 将只有思考过程、没有可保存正文的响应判定为
  `LLMEmptyResponseError`，在 API 尝试循环内进行一次受控恢复，避免保存
  空笔记。
- 对 `finish_reason` 缺失或不是 `stop` 的 OpenAI 兼容响应继续按未完成
  输出处理。
- 当 L2/L3 正文包含全部必需栏目但模型漏写顶层标准标题时，补回规范
  标题后继续严格栏目校验；正文栏目不完整时仍拒绝保存。
- 将“笔记已保存”和“完成标签已写入”分成可恢复的两个阶段。
- Zotero 数据库忙或同步冲突导致 `AI:L1/L2/L3` 标签写入失败时，保留
  已保存笔记的 artifact 元数据；重启或重试后只补写完成标签，不再次
  调用模型。
- 标签写入遇到可识别的 Zotero 数据库忙错误时，等待后重试一次。
- 数据库忙错误不再误报为模型 API 故障。

## 保留能力

- 自动 L1、评级触发 L2/L3、固定完成标签和跨条目 L1 去重。
- Data 开放状态标签与 accession 记录。
- llm-for-zotero MinerU ZIP 缓存复用及 Zotero 原生 ZIP 后备读取。
- 多设备角色、手动主备切换、任务分段计时与失败任务手动重跑。
- 结构化输出、Evidence Level 和内容完整性校验。

## 发布安全

- 回读的运行时 XPI 未检测到私有 IPv4 地址、OpenAI 风格密钥或 Bearer
  token。
- 公开构建不包含 Zotero 偏好设置、模型地址、API key、数据库、附件或
  运行时任务状态。
- 公开构建移除上游 `update_url`，避免自定义补丁被自动覆盖。

公开 XPI SHA-256：
`d323e7a7039b86b70555f8ccc5d30d4a3f9cc8ac2970c908acb86311c0b9c048`

完整离线检查结果见 [TEST_RESULTS_3.8.5.28.json](TEST_RESULTS_3.8.5.28.json)。

## 验证要求

发布前必须通过：

1. JavaScript 语法检查。
2. AI Butler 工作流 marker 检查。
3. XPI ZIP 完整性与版本检查。
4. 私有地址和凭据模式扫描。
5. 与 P520 运行时 XPI 的代码文件哈希对照。

安装和真实文库写入属于独立验证步骤，不由源码迁移自动触发。

## 构建

```bash
python3 zotero-ai-literature-deployment/scripts/build_ai_butler_xpi_normalized.py \
  --source-dir zotero-ai-butler-patch \
  --out release/zotero-ai-butler-3.8.5.28-public.xpi
```
