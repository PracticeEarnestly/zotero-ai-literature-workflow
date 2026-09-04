# AI Butler 升级与回退说明

更新日期：2026-08-26

## 当前策略

- 自定义 3.8.5.2 XPI 已移除上游更新地址，不会自行下载官方 AI Butler 更新。安装后还应在插件页面把 **Allow automatic updates** 设为 **Off**，形成双重保护。
- 本地 3.8.5.2 补丁让新加入的 PDF 文献自动运行 `L1：One Sentence`，并提供任意 Collection 的“L1 批量文献总结并打标签”右键入口；已有 AI Note 会追加结果。
- Style 的 `rate: 2–4` 自动触发 L2，`rate: 5` 自动按 L2 后 L3 的顺序执行；若条目尚无 `AI:L1`，两个路径都会先补做 L1。L3 使用 Gemma 31B。
- 补丁会在启动时恢复 pending/priority 任务，并在 L2/L3 交接后重新唤醒队列，避免 L3 遗留为 pending。
- 官方更新可能覆盖这两个本地功能；自定义 L1/L2/L3 提示词和 llm-for-zotero Skills 仍保存在配置目录，通常不受影响。

L2/L3 仍作为 llm-for-zotero 的备用自定义 Skill 保存，与 AI Butler 更新相互独立。

## 正常升级后的检查

升级后只需确认：

- AI Butler 能正常打开并完成原生文献阅读；
- `L1：One Sentence` 模板仍在自定义提示词列表中；
- 新加入一篇带 PDF 的测试文献后，会自动排入 L1 任务；
- 任意 Collection 的右键菜单中仍有“L1 批量文献总结并打标签”；
- 对一篇测试文献运行 L1 后，AI Note 没有脚本碎片标签；
- 对一篇尚无 L1 的 5 星测试文献，确认依次产生 L1、L2、L3，并出现三个流程标签。

## 恢复本地自动 L1 与 Collection 入口

当前补丁的检查脚本：

```powershell
.\scripts\Test-AiButlerPatch.ps1
```

它可用于确认本地菜单、评分解析、L3 队列唤醒和终止任务恢复补丁是否仍完整。若发现补丁被覆盖，重新安装 `backup` 中最新的 `zotero-ai-butler-3.8.5.2-codex-abort-recovery-manual-updates-*.xpi`，再检查上述项目；不要修改 Zotero SQLite 数据库。
# 2026-08-26 补充：终止任务恢复保护

从 3.8.5.1 起，AI Butler 在启动时会识别“用户已终止任务”但仍被保存为“处理中”的残留记录，并将它持久化为“失败”。这类任务不会自动重跑；用户可以在队列中删除，或手动重试。

队列页面只有在底层删除成功后才会移除任务卡片，避免出现“界面已删除、重启又回来”的假象。
