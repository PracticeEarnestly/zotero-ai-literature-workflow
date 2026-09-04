# AI Butler 最小补丁评估

当前版本已提供 Queue、提示词模板、MinerU、模型优先级路由和多轮总结。未发现必须补丁。

仅当实际使用证明“已完成 L1 的 Core 文献不能方便地批量以指定提示词升级到 L2/L3”时，才考虑补丁。补丁只能复用已有 Queue、MinerU、API client 和 Note writer，并增加：

`AI Butler → Run Preset → L1 / L2 / L3`

不得新建数据库、重写任务框架或改变上游默认行为。任何补丁都应在独立 `codex/` 分支中提交，并能通过 Git 恢复。
