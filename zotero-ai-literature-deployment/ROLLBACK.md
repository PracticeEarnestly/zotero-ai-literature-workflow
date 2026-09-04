# 回滚

## 备份位置

`backup/`（已被 Git 忽略）包含部署前的：

- Zotero Profile 快照（运行锁文件除外）；
- `prefs.js` 快照；
- llm-for-zotero Skills 快照。

## 回滚步骤

1. 完全退出 Zotero。
2. 将 `backup/ai-butler-config/prefs.js.pre-deployment` 恢复到原 Profile 的 `prefs.js`。
3. 如安装过自定义 Skill，将备份的 Skills 目录恢复到 llm-for-zotero Skills 目录。
4. 重新打开 Zotero，并在 AI Butler 模型平台确认原有 Qwen endpoint 已恢复。

不得用 SQLite 文件回滚本次部署；本次没有修改该文件。

本次无源码补丁，故不需要 Git 回滚上游插件代码。
