import { getPref } from "../utils/prefs";
import { LLMEndpointManager } from "./llmEndpointManager";

export type WorkflowLevel = "L1" | "L2" | "L3";

const PROMPT_NAMES: Record<WorkflowLevel, string[]> = {
  L1: ["L1：One Sentence", "L1:One Sentence", "L1"],
  L2: ["L2：Evidence Card", "L2:Evidence Card", "L2"],
  L3: ["L3：Deep Reading", "L3:Deep Reading", "L3"],
};

const ALLOWED_TAG_PREFIXES = [
  "AI:",
  "Evidence:",
  "Disease:",
  "Tissue:",
  "Cell:",
  "Gene:",
  "Pathway:",
  "Exposure:",
  "Intervention:",
  "Method:",
  "Phenotype:",
  "Species:",
  "Design:",
];

export function isWorkflowCoordinator(): boolean {
  return (
    String(getPref("workflowDeviceRole" as any) || "") === "coordinator-qwen"
  );
}

export function isRatingWorkflowEnabled(): boolean {
  return (
    isWorkflowCoordinator() &&
    (getPref("ratingWorkflowEnabled" as any) as boolean) !== false
  );
}

export function getWorkflowPrompt(level: WorkflowLevel): string | null {
  try {
    const raw = String(getPref("customPrompts" as any) || "").trim();
    const prompts = raw ? JSON.parse(raw) : {};
    for (const name of PROMPT_NAMES[level]) {
      const value = prompts?.[name];
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
  } catch (error) {
    ztoolkit.log(`[LiteratureWorkflow] Failed to read ${level} prompt:`, error);
  }
  return null;
}

export function getWorkflowEndpointId(level: WorkflowLevel): string {
  const configured = String(
    getPref(`workflow${level}EndpointName` as any) || "Qwen",
  ).trim();
  const endpoint = LLMEndpointManager.getEndpoints().find(
    (candidate) => candidate.name === configured,
  );
  if (!endpoint?.enabled || !LLMEndpointManager.isEndpointUsable(endpoint)) {
    throw new Error(
      `${level} preferred endpoint "${configured}" is missing, disabled, or incomplete`,
    );
  }
  return endpoint.id;
}

export function getItemRating(item: Zotero.Item): number {
  const extra = String(item.getField?.("extra") || "");
  const match = extra.match(/(?:^|\r?\n)\s*rate\s*:\s*([1-5])\s*(?=\r?\n|$)/i);
  return match ? Number(match[1]) : 0;
}

export function hasWorkflowLevel(
  item: Zotero.Item,
  level: WorkflowLevel,
): boolean {
  try {
    return (item.getTags?.() || []).some(({ tag }) => tag === `AI:${level}`);
  } catch {
    return false;
  }
}

export function prepareWorkflowPrompt(
  prompt: string,
  item: Zotero.Item,
  level: WorkflowLevel,
): string {
  const title = String(item.getField?.("title") || "");
  const creators = (item.getCreators?.() || []) as Array<{
    firstName?: string;
    lastName?: string;
    name?: string;
  }>;
  const authors = creators
    .map(
      (creator) =>
        creator.name ||
        [creator.firstName, creator.lastName].filter(Boolean).join(" "),
    )
    .filter(Boolean)
    .join(", ");
  return prompt
    .replace(/\{\{title\}\}/g, title)
    .replace(/\{\{authors\}\}/g, authors)
    .concat(
      `\n\n---\nAI_BUTLER_WORKFLOW_${level}_V1\n只输出最终结果，不输出推理过程。必须保留提示词要求的 ZOTERO_TAGS_JSON_START/END 块。`,
    );
}

export function extractWorkflowResult(content: string): {
  cleanContent: string;
  tags: string[];
} {
  const block = content.match(
    /ZOTERO_TAGS_JSON_START\s*([\s\S]*?)\s*ZOTERO_TAGS_JSON_END/i,
  );
  const tags = new Set<string>();
  if (block) {
    try {
      const parsed = JSON.parse(block[1]);
      for (const value of Object.values(parsed || {})) {
        if (!Array.isArray(value)) continue;
        for (const raw of value) {
          const tag = String(raw || "").trim();
          if (
            tag.length <= 80 &&
            ALLOWED_TAG_PREFIXES.some((prefix) => tag.startsWith(prefix))
          ) {
            tags.add(tag);
          }
        }
      }
    } catch (error) {
      ztoolkit.log("[LiteratureWorkflow] Invalid structured tag JSON:", error);
    }
  }
  const cleanContent = content
    .replace(/\s*ZOTERO_TAGS_JSON_START[\s\S]*?ZOTERO_TAGS_JSON_END\s*/i, "\n")
    .trim();
  return { cleanContent, tags: [...tags].slice(0, 20) };
}

export async function applyWorkflowTags(
  item: Zotero.Item,
  level: WorkflowLevel,
  tags: string[],
): Promise<void> {
  for (const tag of new Set([`AI:${level}`, ...tags])) item.addTag(tag);
  await item.saveTx();
}
