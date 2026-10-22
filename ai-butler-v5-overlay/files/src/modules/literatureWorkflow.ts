import { getPref } from "../utils/prefs";
import { getString } from "../utils/locale";
import { LLMEndpointManager } from "./llmEndpointManager";

export type WorkflowLevel = "L1" | "L2" | "L3";
export type WorkflowArtifactState =
  "complete" | "recoverable" | "missing" | "unknown";

export type WorkflowLevelState = {
  state: WorkflowArtifactState;
  reason: string;
};

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

const DATA_AVAILABILITY_VALUES = new Set([
  "Public",
  "ControlledAccess",
  "AvailableOnRequest",
  "NotPublic",
  "NotReported",
  "NotApplicable",
]);

const REQUIRED_SECTIONS: Record<"L2" | "L3", string[]> = {
  L2: [
    "One-Sentence Conclusion",
    "Research Question",
    "Study Design",
    "Biological Context",
    "Key Molecules / Pathways",
    "Direction",
    "Main Evidence",
    "Quantitative Evidence",
    "Evidence Level",
    "Mechanistic Chain",
    "Causality",
    "Key Limitation",
    "Review Role",
    "Safe Review Statement",
    "Identifier",
  ],
  L3: [
    "One-Sentence Conclusion",
    "Research Question & Knowledge Gap",
    "Study Architecture",
    "Evidence Card",
    "Main Findings",
    "Evidence Chain",
    "Mechanistic Model",
    "Evidence Boundary",
    "Evidence Level",
    "Statistical and Methodological Appraisal",
    "Key Strengths",
    "Key Limitations",
    "Review-Ready Statements",
    "Claims to Avoid",
    "Review Role",
    "Review Keywords",
  ],
};

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
      if (typeof value === "string" && value.trim()) return value.trim();
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
  let requestPrompt = prompt
    .replace(/\{\{title\}\}/g, title)
    .replace(/\{\{authors\}\}/g, authors)
    .trim();

  if (
    level === "L1" &&
    !requestPrompt.includes("AI_BUTLER_L1_DATA_AVAILABILITY_V1")
  ) {
    requestPrompt += `

---
AI_BUTLER_L1_DATA_AVAILABILITY_V1
在最终 JSON 块之前增加且只增加以下两行：
DATA_AVAILABILITY: <Public|ControlledAccess|AvailableOnRequest|NotPublic|NotReported|NotApplicable>
DATA_ACCESSION: <GEO/SRA/ENA/ArrayExpress/dbGaP/EGA/其他稳定数据库编号或 Not reported>
判定规则：
- Public：正文明确提供可公开访问的稳定数据库、公开链接或 accession；复用公开数据也属于 Public。
- ControlledAccess：需要审批、申请或受控访问。
- AvailableOnRequest：正文明确说明依合理请求提供。
- NotPublic：正文明确说明数据不公开、仅内部保存或不可获得。
- NotReported：论文涉及测序、组学或其他可复用数据，但未找到明确开放说明。
- NotApplicable：论文没有生成或分析需要公开存储的测序、组学或类似数据。
不得根据“data available”之类模糊措辞猜测 Public；没有 accession 或明确公开位置时优先 NotReported。`;
  }

  if (!requestPrompt.includes("AI_BUTLER_FINAL_OUTPUT_ONLY_V1")) {
    requestPrompt += `

---
AI_BUTLER_FINAL_OUTPUT_ONLY_V1
只输出最终的 L1/L2/L3 结果。不要输出推理过程、分析草稿、内部计划、工具调用、进度日志，也不要输出 <think>、<thinking>、<reasoning> 或 <analysis> 标签。`;
  }
  return requestPrompt;
}

function sanitizeWorkflowOutput(content: string, level: WorkflowLevel): string {
  let value = String(content || "")
    .replace(/\r\n/g, "\n")
    .trim();
  value = value
    .replace(
      /<\s*(think|thinking|reasoning|analysis)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
      "",
    )
    .replace(/```(?:think|thinking|reasoning|analysis)\s*[\s\S]*?```/gi, "")
    .trim();
  const finalLabel =
    /(?:^|\n)\s*(?:#{1,6}\s*)?(?:final\s+(?:answer|response|output)|最终答案|最终回复|最终输出)\s*[:：]?\s*(?:\n|$)/i;
  const marker =
    level === "L1"
      ? /(?:^|\n)\s*(?:#{1,6}\s*)?(?:\[L1\][^\n]*|SUMMARY\s*[:：]?)/i
      : new RegExp(`(?:^|\\n)\\s*(?:#{1,6}\\s*)?\\[${level}\\]`, "i");
  if (
    /^\s*(?:#{1,6}\s*)?(?:reasoning|chain\s+of\s+thought|thinking\s+process|analysis\s+process|思考过程|推理过程|分析过程)/i.test(
      value,
    )
  ) {
    const match = value.match(finalLabel) || value.match(marker);
    if (match?.index != null) {
      const drop = finalLabel.test(match[0]);
      value = value.slice(match.index + (drop ? match[0].length : 0)).trim();
    }
  }
  return value
    .replace(
      /^\s*(?:#{1,6}\s*)?(?:final\s+(?:answer|response|output)|最终答案|最终回复|最终输出)\s*[:：]?\s*/i,
      "",
    )
    .trim();
}

function normalizeHeading(value: string): string {
  return value
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/\s*[/&]\s*/g, "/")
    .replace(/^\s*\d+[.)、：:]\s*/, "")
    .replace(/[：:]\s*$/, "")
    .replace(/[^\p{L}\p{N}/-]+/gu, " ")
    .trim();
}

function validateWorkflowBody(content: string, level: WorkflowLevel): string {
  const fail = (detail: string): never => {
    const error = new Error(
      `${level} output incomplete or malformed (${detail}); note and completion tag were not saved`,
    );
    (error as any).suppressTaskRetry = true;
    throw error;
  };
  let body = content.trim();
  if (!body || !/[\p{L}\p{N}]/u.test(body)) fail("empty body");
  if (level === "L1") {
    const withoutData = body
      .replace(/(?:^|\n)\s*DATA_AVAILABILITY\s*[:：][^\n]*/gi, "")
      .replace(/(?:^|\n)\s*DATA_ACCESSION\s*[:：][^\n]*/gi, "")
      .trim();
    if (!withoutData || !/[\p{L}\p{N}]/u.test(withoutData)) {
      fail("missing L1 summary body");
    }
    return body;
  }

  const lines = body.split(/\r?\n/);
  const headings = lines
    .map((line, index) => ({
      index,
      match: line.match(/^\s*(#{1,6})\s+(.+?)\s*$/),
    }))
    .filter((entry) => entry.match)
    .map((entry) => ({
      index: entry.index,
      level: entry.match![1].length,
      title: normalizeHeading(entry.match![2]),
    }));
  const required = REQUIRED_SECTIONS[level];
  const hasSection = (expected: string) => {
    const wanted = normalizeHeading(expected);
    const position = headings.findIndex((heading) => heading.title === wanted);
    if (position < 0) return false;
    const heading = headings[position];
    let end = lines.length;
    for (let i = position + 1; i < headings.length; i++) {
      if (headings[i].level <= heading.level) {
        end = headings[i].index;
        break;
      }
    }
    return /[\p{L}\p{N}]/u.test(lines.slice(heading.index + 1, end).join("\n"));
  };
  for (const section of required) {
    if (!hasSection(section)) fail(`missing or empty section: ${section}`);
  }
  const canonicalHeading =
    level === "L2" ? "[L2] Evidence Card" : "[L3] Deep Reading";
  const marker =
    level === "L2" ? /\[L2\]\s*Evidence\s*Card/i : /\[L3\]\s*Deep\s*Reading/i;
  if (!marker.test(body)) body = `# ${canonicalHeading}\n\n${body}`;
  return body;
}

export function extractWorkflowResult(
  content: string,
  level: WorkflowLevel,
): { cleanContent: string; tags: string[] } {
  const source = sanitizeWorkflowOutput(content, level);
  const starts = source.match(/ZOTERO_TAGS_JSON_START/gi) || [];
  const ends = source.match(/ZOTERO_TAGS_JSON_END/gi) || [];
  const block = source.match(
    /ZOTERO_TAGS_JSON_START\s*([\s\S]*?)\s*ZOTERO_TAGS_JSON_END/i,
  );
  if (!block || starts.length !== 1 || ends.length !== 1) {
    const error = new Error(
      `${level} structured Zotero tags are missing or have incomplete JSON boundaries`,
    );
    (error as any).suppressTaskRetry = true;
    throw error;
  }

  const tags = new Set<string>();
  try {
    const parsed = JSON.parse(block[1]);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
      throw new Error(getString("workflow-error-tags-root"));
    }
    for (const value of Object.values(parsed)) {
      if (
        !Array.isArray(value) ||
        value.some((entry) => typeof entry !== "string")
      ) {
        throw new Error(getString("workflow-error-tags-array"));
      }
      for (const raw of value) {
        const tag = String(raw || "")
          .replace(/\s+/g, " ")
          .trim();
        if (
          tag.length <= 120 &&
          ALLOWED_TAG_PREFIXES.some((prefix) => tag.startsWith(prefix))
        ) {
          tags.add(tag);
        }
      }
    }
  } catch (error) {
    const wrapped = new Error(`Invalid structured Zotero tag JSON: ${error}`);
    (wrapped as any).suppressTaskRetry = true;
    throw wrapped;
  }

  let cleanContent = source
    .replace(block[0], "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (level === "L1") {
    const status = cleanContent.match(
      /(?:^|\n)\s*DATA_AVAILABILITY\s*[:：]\s*(Public|ControlledAccess|AvailableOnRequest|NotPublic|NotReported|NotApplicable)\s*(?=\n|$)/i,
    )?.[1];
    const normalized = status
      ? [...DATA_AVAILABILITY_VALUES].find(
          (candidate) => candidate.toLowerCase() === status.toLowerCase(),
        )
      : undefined;
    if (!normalized) {
      const error = new Error(getString("workflow-error-data-availability"));
      (error as any).suppressTaskRetry = true;
      throw error;
    }
    tags.add(`Data:${normalized}`);
  }
  cleanContent = validateWorkflowBody(cleanContent, level);
  return { cleanContent, tags: [...tags].slice(0, 24) };
}

function workflowVisibleText(html: string): string {
  return String(html || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function noteRecognizesLevel(text: string, level: WorkflowLevel): boolean {
  if (level === "L1") {
    return /(?:^|\n)\s*DATA_AVAILABILITY\s*[:：]\s*(?:Public|ControlledAccess|AvailableOnRequest|NotPublic|NotReported|NotApplicable)/i.test(
      text,
    );
  }
  return level === "L2"
    ? /\[L2\]\s*Evidence\s*Card/i.test(text)
    : /\[L3\]\s*Deep\s*Reading/i.test(text);
}

export async function getWorkflowLevelState(
  item: Zotero.Item,
  level: WorkflowLevel,
): Promise<WorkflowLevelState> {
  const hasTag = hasWorkflowLevel(item, level);
  let readFailed = false;
  let recognized = false;
  for (const noteId of item.getNotes?.() || []) {
    try {
      const note = await Zotero.Items.getAsync(noteId);
      if (!note) continue;
      const text = workflowVisibleText(String(note.getNote?.() || ""));
      if (noteRecognizesLevel(text, level)) {
        recognized = true;
        break;
      }
    } catch {
      readFailed = true;
    }
  }
  if (recognized && hasTag) {
    return { state: "complete", reason: "note-and-tag" };
  }
  if (recognized) return { state: "recoverable", reason: "note-without-tag" };
  if (readFailed) return { state: "unknown", reason: "note-read-failed" };
  if (hasTag) {
    return { state: "unknown", reason: "tag-without-recognized-note" };
  }
  return { state: "missing", reason: "recognized-note-missing" };
}

export async function getCompletedL1State(
  item: Zotero.Item,
): Promise<WorkflowLevelState> {
  const direct = await getWorkflowLevelState(item, "L1");
  if (direct.state === "complete" || direct.state === "recoverable") {
    return direct;
  }
  try {
    const doi = String(item.getField?.("DOI") || "").trim();
    const title = String(item.getField?.("title") || "").trim();
    if (!doi && !title) return direct;
    const search = new Zotero.Search();
    (search as any).libraryID = item.libraryID;
    search.addCondition(doi ? "DOI" : "title", "is", doi || title);
    for (const itemId of await search.search()) {
      const duplicate = await Zotero.Items.getAsync(itemId);
      if (
        !duplicate ||
        duplicate.id === item.id ||
        !duplicate.isRegularItem?.()
      ) {
        continue;
      }
      const duplicateState = await getWorkflowLevelState(duplicate, "L1");
      if (duplicateState.state === "complete") {
        return { state: "complete", reason: "duplicate-item-artifact" };
      }
    }
  } catch (error) {
    ztoolkit.log("[LiteratureWorkflow] Cross-item L1 check failed:", error);
    return { state: "unknown", reason: "duplicate-search-failed" };
  }
  return direct;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function applyWorkflowTags(
  item: Zotero.Item,
  level: WorkflowLevel,
  tags: string[],
): Promise<void> {
  const dataTag = tags.find((tag) => tag.startsWith("Data:"));
  if (dataTag) {
    for (const existingTag of item.getTags?.() || []) {
      if (
        /^Data:(?:Public|ControlledAccess|AvailableOnRequest|NotPublic|NotReported|NotApplicable)$/.test(
          existingTag.tag,
        ) &&
        existingTag.tag !== dataTag
      ) {
        item.removeTag?.(existingTag.tag);
      }
    }
  }
  const existing = new Set((item.getTags?.() || []).map(({ tag }) => tag));
  for (const tag of new Set([`AI:${level}`, ...tags])) {
    if (!existing.has(tag)) item.addTag(tag);
  }
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await item.saveTx();
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 2) await delay(300 * (attempt + 1));
    }
  }
  throw lastError;
}
