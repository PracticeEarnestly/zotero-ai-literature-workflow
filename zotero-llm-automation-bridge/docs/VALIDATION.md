# 验证记录：0.1.5

日期：2026-10-07。真实宿主：Windows Zotero 9.0.6，llm-for-zotero 3.9.10，Ethereal Style 6.0.86。

## Markdown 修复与旧笔记迁移

- 已通过 Zotero 原生插件管理器更新并加载 Bridge 0.1.5；安装包与构建包 SHA-256 一致。
- 两份真实旧版子笔记已迁移。任务记录与迁移前一致，没有创建新任务或调用模型。
- 完整测试笔记转换后包含 73 个标题（含总标题）、125 个加粗节点、1 个表格和 75 个原生 math 节点；旧的纯文本 pre-wrap 容器已移除。
- 原始 HTML 在 Zotero 数据目录的 `llm-automation-bridge/markdown-backups/` 中保留。去除 Zotero 数据库外层包装后，备份与迁移前原文逐字一致。
- 迁移保留原笔记、父条目和生成信息；只处理带 Bridge 标记且关联完成任务的旧格式笔记。
- 固定内置 Marked 18.1.0，采用独立实例及受控 renderer。参考官方 [Marked 扩展接口](https://marked.js.org/using_pro)。

XPI SHA-256：`5418681567a6fc1c58fbd38bf983aa6cac984038def88b2d5047a8f3be8b05a1`。

## 自动化规则与真实模型调用

- 首次启动为可编辑论文建立评分基线，任务数为 0，没有补跑已有五星。
- 对真实论文执行 `saveTx()` 评分 5→4→5，仅创建一个任务；重复通知没有重复入队。
- Figure 1 短测试通过公开 `runTurn()` 和 `paper_read` 取得目标论文的真实图像，运行正常结束，并保存到正确父条目的子笔记。
- 用户随后完成一次完整 Prompt 的论文测试，成功生成子笔记；本次修复重新排版了该结果。
- 任务及失败历史在重启和更新后保留；失败任务没有自动重新调用模型。
- 测试临时修改的 Extra 和 Prompt 已恢复，原标签及其他插件的笔记保留。
- llm-for-zotero、Style 和 AI Butler 的安装文件哈希在 Bridge 更新前后相同。模型配置和 Zotero 安全设置未修改。

## 自动化与静态检查

- 40 项 Node.js 测试通过，覆盖基线、评分触发、队列去重、Prompt 快照、权限拒绝、视觉能力、失败停止、子笔记归属、重试、取消、存储故障、Markdown 结构、HTML/链接处理、公式和迁移幂等。
- JavaScript 语法、设置面板 XML、XPI ZIP CRC、必需文件及确定性构建检查通过。
- XPI 不包含本机调试脚本、测试备份、模型密钥或 llm-for-zotero 内部源码。

## 验证范围

- 已核对真实宿主中的笔记 HTML 和插件加载，未完成 Windows 截图与鼠标点击验收。桌面控制工具在本次 WSL 环境下无法初始化。
- Style 写入的实际 Extra 评分和 Zotero 通知已测试；Style 鼠标打星操作本身未测试。
- 设置面板视觉显示、点击交互、笔记编辑及跨设备同步仍需人工检查。
- Zotero 7/8 未做真实宿主测试，当前只验证 Zotero 9.0.6。
- 成功生成笔记和读取图像不代表每个 Figure、panel、Table 都完整或科学结论正确，仍需逐篇检查覆盖和内容。
