import { MainWindow } from "./views/MainWindow";
import { getString } from "../utils/locale";
import { AutoScanManager } from "./autoScanManager";
import {
  getCompletedL1State,
  getItemRating,
  getWorkflowLevelState,
  getWorkflowPrompt,
  isWorkflowCoordinator,
  type WorkflowLevel,
} from "./literatureWorkflow";

function showToast(
  text: string,
  type: "default" | "success" | "error" = "default",
  closeTime: number = 4500,
): void {
  new ztoolkit.ProgressWindow("AI Butler", {
    closeOnClick: true,
    closeTime,
  })
    .createLine({ text, type })
    .show();
}

async function maybeOpenTaskPanel(): Promise<void> {
  try {
    const mainWindow = MainWindow.getInstance();
    await mainWindow.open("tasks");
    mainWindow.getTaskQueueView().refresh();
  } catch (error) {
    ztoolkit.log("[LiteratureWorkflow] Failed to open task panel:", error);
  }
}

function coordinatorReady(): boolean {
  if (isWorkflowCoordinator()) return true;
  showToast("L1/L2/L3 工作流只在 P520 主协调器模式运行", "error");
  return false;
}

export async function handleSelectedWorkflowLevel(
  level: WorkflowLevel,
): Promise<void> {
  if (!coordinatorReady()) return;
  if (!getWorkflowPrompt(level)) {
    showToast(`未找到 ${level} 提示词，请先在 AI Butler 设置中保存`, "error");
    return;
  }
  const items = (Zotero.getActiveZoteroPane()?.getSelectedItems() || []).filter(
    (item: Zotero.Item) => item.isRegularItem?.(),
  );
  if (!items.length) {
    showToast("请先选择文献条目", "error");
    return;
  }
  try {
    const manager = AutoScanManager.getInstance();
    let requested = 0;
    let alreadyComplete = 0;
    for (const item of items) {
      const state =
        level === "L1"
          ? await getCompletedL1State(item)
          : await getWorkflowLevelState(item, level);
      if (state.state === "complete") {
        alreadyComplete += 1;
        continue;
      }
      await manager.enqueueWorkflowLevel(item, level, items.length === 1);
      requested += 1;
    }
    await maybeOpenTaskPanel();
    showToast(
      `已检查 ${items.length} 篇：${level} 请求 ${requested} 篇，已完成 ${alreadyComplete} 篇`,
      "success",
    );
  } catch (error: any) {
    ztoolkit.log(`[LiteratureWorkflow] Manual ${level} enqueue failed:`, error);
    showToast(`${level} 入队失败：${error?.message || error}`, "error", 6000);
  }
}

export async function handleCollectionL1Summary(): Promise<void> {
  if (!coordinatorReady()) return;
  if (!getWorkflowPrompt("L1")) {
    showToast("未找到 L1 提示词，请先在 AI Butler 设置中保存", "error");
    return;
  }
  const collection = Zotero.getActiveZoteroPane()?.getSelectedCollection();
  if (!collection) {
    showToast("请先选择一个分类", "error");
    return;
  }
  const manager = AutoScanManager.getInstance();
  const candidates: Zotero.Item[] = [];
  let skipped = 0;
  for (const item of collection.getChildItems()) {
    if (!item.isRegularItem?.()) {
      skipped += 1;
      continue;
    }
    const state = await getCompletedL1State(item);
    if (state.state !== "missing") {
      skipped += 1;
      continue;
    }
    if (!(await manager.hasUsableAnalyzableAttachment(item))) {
      skipped += 1;
      continue;
    }
    candidates.push(item);
  }
  if (!candidates.length) {
    showToast(`「${collection.name}」没有需要生成 L1 的新 PDF 文献`);
    return;
  }
  const confirmed = Services.prompt.confirm(
    Zotero.getMainWindow() as any,
    getString("workflow-confirm-collection-l1-title"),
    getString("workflow-confirm-collection-l1-body", {
      args: { collection: collection.name, count: candidates.length },
    }),
  );
  if (!confirmed) return;
  for (const item of candidates) {
    await manager.enqueueWorkflowLevel(item, "L1");
  }
  await maybeOpenTaskPanel();
  showToast(
    `已加入 L1 检查：${candidates.length} 篇；跳过 ${skipped} 篇`,
    "success",
  );
}

export async function handleCollectionRatedWorkflowRepair(): Promise<void> {
  if (!coordinatorReady()) return;
  const collection = Zotero.getActiveZoteroPane()?.getSelectedCollection();
  if (!collection) {
    showToast("请先选择一个分类", "error");
    return;
  }
  const manager = AutoScanManager.getInstance();
  const candidates: Zotero.Item[] = [];
  const summary = {
    scanned: 0,
    unrated: 0,
    complete: 0,
    uncertain: 0,
    noAttachment: 0,
  };
  for (const item of collection.getChildItems()) {
    if (!item.isRegularItem?.()) continue;
    summary.scanned += 1;
    const rating = getItemRating(item);
    if (rating < 1) {
      summary.unrated += 1;
      continue;
    }
    const expected: WorkflowLevel[] = ["L1"];
    if (rating >= 2) expected.push("L2");
    if (rating >= 5) expected.push("L3");
    const states = await Promise.all(
      expected.map((level) =>
        level === "L1"
          ? getCompletedL1State(item)
          : getWorkflowLevelState(item, level),
      ),
    );
    if (states.some((state) => state.state === "unknown")) {
      summary.uncertain += 1;
      continue;
    }
    if (states.every((state) => state.state === "complete")) {
      summary.complete += 1;
      continue;
    }
    if (!(await manager.hasUsableAnalyzableAttachment(item))) {
      summary.noAttachment += 1;
      continue;
    }
    candidates.push(item);
  }
  if (!candidates.length) {
    showToast(
      `没有可补齐条目：已完整 ${summary.complete}，待确认 ${summary.uncertain}，未评分 ${summary.unrated}，无附件 ${summary.noAttachment}`,
    );
    return;
  }
  const confirmed = Services.prompt.confirm(
    Zotero.getMainWindow() as any,
    getString("workflow-confirm-rated-repair-title"),
    getString("workflow-confirm-rated-repair-body", {
      args: {
        collection: collection.name,
        count: candidates.length,
        uncertain: summary.uncertain,
      },
    }),
  );
  if (!confirmed) return;
  for (const item of candidates) await manager.enqueueRatedWorkflow(item);
  await maybeOpenTaskPanel();
  showToast(
    `已扫描 ${summary.scanned} 篇，安排补齐 ${candidates.length} 篇；待确认 ${summary.uncertain} 篇未入队`,
    "success",
    6000,
  );
}
