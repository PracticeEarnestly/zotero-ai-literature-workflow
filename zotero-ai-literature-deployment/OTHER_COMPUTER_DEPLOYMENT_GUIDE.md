# 在另一台电脑部署 Zotero AI 文献工作流

本教程部署当前工作流：新增带 PDF 的文献自动执行 L1；任何 Collection 可右键批量执行 L1；AI Note 的结构化标签自动写回父条目。L2、L3 保留为手动深读工具。

本教程使用固定的自定义 fork：**Base: AI Butler 3.8.5；Patch: L1 自动化、评级触发 L2/L3、队列恢复与直接结构化标签写入**。当前可执行方案以 [第二版部署说明](Zotero_AI_Literature_L1_L2_L3_Codex_Deployment_V2.md) 为准。

目标支持 Windows、Ubuntu、macOS 与 Zotero 9.x。自定义 XPI 在新平台安装后，必须完成本文第 7 节验收；新电脑应从干净的 Zotero 配置开始，**不要**用旧电脑的整个 Profile 覆盖新电脑。

## 0. 准备迁移包

在旧电脑的本目录中，复制下列文件到 U 盘、加密网盘或受信任的同步目录：

| 文件 | 用途 |
| --- | --- |
| `backup/zotero-ai-butler-3.8.5-codex-l3-queue-resume-5star-20260826-103910.xpi` | 当前自定义 AI Butler：自动 L1、评级触发 L2/L3、队列恢复、Collection 批量 L1 与直接标签写入 |
| `scripts/export_ai_butler_prompts.py` | 从旧电脑导出当前实际启用的 L1/L2/L3 提示词 |
| `skills/research-literature-tagging.md` | 标签判定规则说明 |
| `config/tag-taxonomy.md` | 标签分类表 |
| `scripts/Test-AiButlerPatch.ps1` 或 `scripts/test_ai_butler_patch.py` | 安装后检测 |

不要复制整个 `Profiles` 目录、`prefs.js`、`zotero.sqlite`、`storage`、`key4.db`、`logins.json`、Cookies 或 `MODEL_ENDPOINTS.local.md`。它们可能包含登录状态、文献数据库、附件或 API 密钥，也可能造成同步冲突。

### 标签规则迁移原则

当前 V2 不依赖 Actions and Tags 自动解析 AI Note。AI Butler 会在每次 L1/L2/L3 完成时，解析**当次模型输出**末尾的 JSON、先从 Note 正文移除 JSON、再将允许的标签直接写到父条目。因此不要从旧 `prefs.js` 导出或导入旧的 Actions and Tags 自动标签规则。

如果旧电脑仍有“添加标签 / Add tags”类 Actions and Tags 规则，请停用它；它是产生 JSON 或正文碎片标签的常见原因。

### 导出当前实际提示词

现有 `prompts/` 下的 Markdown 用于设计记录；迁移时应导出旧电脑当前实际启用的提示词，以保留 V2 所需的 JSON 输出约定。完全退出 Zotero 后执行：

```bash
python3 scripts/export_ai_butler_prompts.py \
  --prefs '<旧电脑 prefs.js 的实际路径>' \
  --output './transfer/ai-butler-custom-prompts.json'
```

将生成的 `ai-butler-custom-prompts.json` 转移到新电脑。该文件只有提示词文本和名称，不含模型地址或 API Key。

## 0A. Ubuntu 与 macOS 的路径和系统差异

插件、提示词、模型设置和日常操作与 Windows 相同；差异主要是 Zotero Profile 路径与终端命令。

| 系统 | 常见 `prefs.js` 位置 | 寻找实际文件的只读命令 |
| --- | --- | --- |
| macOS | `~/Library/Application Support/Zotero/Profiles/<Profile 名称>/prefs.js` | `find ~/Library/Application\ Support/Zotero -maxdepth 3 -name prefs.js -print` |
| Ubuntu（官方 tarball/普通安装） | `~/.zotero/zotero/<Profile 名称>/prefs.js` | `find ~/.zotero/zotero -maxdepth 3 -name prefs.js -print` |
| Ubuntu（Snap） | `~/snap/zotero/common/.zotero/zotero/<Profile 名称>/prefs.js` | `find ~/snap/zotero/common/.zotero/zotero -maxdepth 3 -name prefs.js -print` |

注意事项：

1. macOS 必须用“Zotero → Quit Zotero”或 `Command + Q` 完全退出，不是只关闭窗口。
2. Ubuntu 若使用 Snap，附件和 Profile 通常在 Snap 的专用目录；不要把普通安装目录与 Snap 目录混用。
3. 本地 `.xpi` 只应从可信迁移包安装。macOS 若提示来源警告，确认文件来自本工作流后再在 Zotero 插件页继续安装。
4. 跨平台脚本仅依赖 Python 标准库，不需要第三方 Python 包；但仍应先运行 `python3 --version`。若系统没有 Python 3，请先安装 Python 3。

## 1. 安装并同步 Zotero

1. 在新电脑安装 Zotero Desktop，启动一次。
2. 在“设置/偏好设置 → 同步”登录同一个 Zotero 账号。
3. 等待文献库同步完成。自动阅读依赖本地 PDF，因此还要等待附件同步完成，或确保测试文献已有本地 PDF。
4. 不要复制旧 Profile；也避免两台电脑同时改同一篇 AI Note。

## 2. 安装插件

在 Zotero 的“工具 → 插件”中，安装 **llm-for-zotero**（可选），用于 Zotero 内的 L1/L2/L3 技能。自动 L1、评级触发 L2/L3 和结构化标签的核心均由自定义 AI Butler 负责；不需要安装 Actions and Tags。

再安装自定义 AI Butler：

1. 在插件页点击右上角齿轮。
2. 选择“从文件安装插件”。
3. 选择 `zotero-ai-butler-3.8.5-codex-l3-queue-resume-5star-20260826-103910.xpi`。
4. 按提示重启 Zotero。

该安装包已包含：

| 功能 | 预期行为 |
| --- | --- |
| 新增条目自动运行 | 新增普通文献且 PDF 可读时，自动执行 L1；不限制 Collection |
| Collection 右键 L1 | 任意 Collection 均有“L1 批量文献总结并打标签”；处理直接子条目 |
| 评级触发 | `rate: 2–4` 自动追加 L2；`rate: 5` 先追加 L2，再串行追加 L3 |
| 结构化标签 | 每次 L1/L2/L3 完成后直接解析当次输出并写回父条目；不依赖外部事件 |

## 3. 在新电脑单独配置模型

在 AI Butler 设置中填写模型服务地址、模型名称和 API Key。密钥只保存在新电脑；不要放进迁移包、提示词或 Zotero 同步内容。

确认：

1. 已启用“新增条目自动运行/Automatically scan new items”。
2. 自动提示词名称为 `L1：One Sentence`。
3. L1、L2、L3 阅读菜单没有被界面设置隐藏。

建议先对一篇有 PDF 的已有文献做单篇测试；模型调用正常后再验证自动任务。

## 4. 导入 L1、L2、L3 提示词

打开 `transfer/ai-butler-custom-prompts.json`，在 AI Butler 的提示词管理页逐项新建或更新。名称保持一致，避免自动 L1/L2/L3 找不到模板。

| 名称 | JSON 中对应键 |
| --- | --- |
| `L1：One Sentence` | `L1：One Sentence` |
| `L2：Evidence Card` | `L2：Evidence Card` |
| `L3：Deep Reading` | `L3：Deep Reading` |

每次修改后，用一篇测试文献确认模型输出末尾有 `ZOTERO_TAGS_JSON_START` 与 `ZOTERO_TAGS_JSON_END`。AI Butler 会解析这段 JSON 后从保存的 AI Note 中移除它；最终应在父条目看到规范标签，而非在 Note 中保留 JSON。

## 5. 不配置 Actions and Tags 自动标签

当前 V2 已不把 JSON 保存到 AI Note，因此不使用 `createItem`、`createNote` 或 `appendNote` 来自动写标签。不要新建 Actions and Tags 的“添加标签 / Add tags”规则，也不要导入旧机的该类规则。

这样可以避免 AI Note 正文、JSON 或脚本被拆成大量无关标签。若标签异常，先检查本次模型输出是否包含合法 JSON，再检查父条目实际标签；不要用外部事件规则重复处理。

## 6. 可选：迁移 llm-for-zotero 的 L1/L2/L3 技能

若只使用 AI Butler 自动 L1，可跳过。本功能需要时：

1. 在新电脑启动一次 llm-for-zotero 的 Agent/技能功能，让插件创建其用户技能目录。
2. 从旧电脑复制 `zotero-literature-l1`、`zotero-literature-l2`、`zotero-literature-l3` 三个技能目录，放入 `{ZoteroDataDir}/llm-for-zotero/skills/`。
3. 重启 Zotero，在 llm-for-zotero 的技能列表确认三项可见。

不要迁移整个 llm-for-zotero runtime/profile 目录；只迁移上述自定义 Skill 文件。

## 7. 安装后验收

### 7.1 检查自定义 AI Butler

完全退出 Zotero 后执行：

```powershell
.\scripts\Test-AiButlerPatch.ps1 `
  -ProfileDirectory 'C:\Users\<你的用户名>\AppData\Roaming\Zotero\Zotero\Profiles\<Profile 名称>'
```

应看到 `VersionMatches=True` 和 `PatchIntact=True`。否则说明官方更新或错误安装覆盖了自定义版本；重新安装本迁移包并重启 Zotero。

在 macOS 或 Ubuntu，使用跨平台检测脚本。先完全退出 Zotero：

```bash
python3 scripts/test_ai_butler_patch.py \
  --profile-dir '<Zotero Profile 目录的实际路径>'
```

同样应看到 `VersionMatches=True` 和 `PatchIntact=True`。例如 macOS Profile 目录通常位于 `~/Library/Application Support/Zotero/Profiles/<Profile 名称>`；Ubuntu 普通安装通常位于 `~/.zotero/zotero/<Profile 名称>`。

### 7.2 功能测试

1. 新增一篇有本地 PDF 的普通文献，等待自动 L1。应生成 L1 AI Note，并在父条目看到规范标签。
2. 右键任意小型 Collection，选择“L1 批量文献总结并打标签”。应只处理直接子条目，**默认不递归子 Collection**；需要处理子 Collection 时分别右键运行。
3. 对已有 AI Note 的条目再次批量运行。新结果应追加到原 AI Note，而非跳过。
4. 将另一篇文献的 Style「评级」写为 `rate: 2` 至 `rate: 4`，确认 L2 追加且出现 `AI:L2`。
5. 将一篇尚无 L3 的文献评为 `rate: 5`，确认 L2 完成后才运行 L3，且出现 `AI:L3`。
6. 检查父条目标签。应是 `Disease: IBD`、`Method: Cohort` 一类短标签，不应出现 JSON、脚本或正文碎片；AI Note 中也不应保留 JSON 标签块。
7. 同一篇文章重复运行 L1，确认不产生重复或错误的低层级标签；已有 `AI:L2`/`AI:L3` 的条目不应降级。
8. 故意安装上游 AI Butler 或删除自定义 XPI 后运行检测脚本，确认它能报告 `PatchIntact=False`。

## 8. 日常流程

```text
新文献 + 本地 PDF → 自动 L1 → 解析当次结构化 JSON → AI Note + 父文献规范标签

人工评级 `rate: 2–4` → 自动 L2；`rate: 5` → L2 完成后自动 L3

任意 Collection 右键 → 批量 L1 → 已有 AI Note 采用追加模式
```

推荐以 L1 作为日常筛选入口；只有关键研究再手动使用 L2 证据卡或 L3 深度阅读。

## 9. 插件升级与维护

AI Butler 的官方自动升级可能覆盖自定义的“自动 L1”“评级触发 L2/L3”“队列恢复”“Collection 右键菜单”和“当次输出直接标签写入”。这是冻结 fork，不应把上游更新直接视为兼容更新；提示词、标签分类表及 llm-for-zotero 技能通常不受影响。

若需要维护或升级插件代码，请从 [SOURCE_BASELINE.md](SOURCE_BASELINE.md) 指定的冻结 V2 源码基线创建新的工作副本；不要直接修改已安装 XPI 或旧的 `zotero-ai-butler-patch` 目录。

每次 AI Butler 更新后：

1. 退出 Zotero。
2. 运行 `Test-AiButlerPatch.ps1`。
3. 检测失败就重新安装迁移包 `.xpi`，再重启 Zotero。
4. 用一篇测试文献验证自动 L1、Collection 批量 L1、结构化标签三项功能。

保留当前迁移包 `zotero-ai-butler-3.8.5-codex-l3-queue-resume-5star-20260826-103910.xpi`。不要用复制 `prefs.js` 或 Zotero 数据库的方式修复升级问题。

## 10. 常见问题

| 现象 | 优先检查 |
| --- | --- |
| 新文献没有自动 L1 | 是否为普通文献、是否有本地 PDF、自动扫描是否启用、模型是否可用 |
| Collection 右键没有 L1 | 重启 Zotero，运行补丁检测，确认未被官方升级覆盖 |
| 有 AI Note 但没有标签 | 检查模型当次输出是否含合法 JSON、父条目是否有 `AI:L1`/`AI:L2`/`AI:L3`、补丁检测是否通过 |
| 又出现很多无关标签 | 停用旧的 Actions and Tags “添加标签”规则；不要让外部规则解析 AI Note 正文 |
| 模型请求失败 | 在新电脑检查 API 地址、模型名、网络和 API Key；不要复制旧 Profile 密钥文件 |
| 安装 XPI 失败 | 完全退出 Zotero 后重试，确认选中迁移包内的 `.xpi` |

## 完成标准

部署完成应同时满足：

1. 新增带 PDF 的文献自动生成 L1 AI Note。
2. 任意 Collection 可右键批量执行 L1。
3. 已有 AI Note 的批处理会追加结果。
4. 父条目获得少量、规范、可检索的标签，且没有 JSON 或正文碎片标签。
