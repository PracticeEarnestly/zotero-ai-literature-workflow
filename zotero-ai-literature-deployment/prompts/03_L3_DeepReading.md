对 `Status:Core` 的少数论文使用本提示词；首选 Multi-round Summary，模型为 Gemma31。不要依赖工具调用。

## Round 1 — Scientific Question & Study Architecture

分析 Central Scientific Question、Knowledge Gap、Hypothesis（若有，`A → B → phenotype`）、Study Architecture（Discovery、Validation、Cell localization、Functional test、Mechanistic test、Clinical relevance），并列出 Primary Finding、最多 3–5 条 Secondary Findings，以及 `Claimed mechanism` 与 `Demonstrated mechanism`。不要输出标签。

## Round 2 — Methods & Statistical Audit

审查 Cohort / Samples（human、groups、controls、N、paired、longitudinal、tissue、cells、biological replicates、donors、accession）；只保留决定主要结论的方法；明确 statistical unit（cell/sample/donor/section/animal/experiment）；检查 pseudoreplication、donor-level analysis、repeated measures、paired design、confounding、multiple testing、effect size/CI、independent validation、rescue、sensitivity、data/code/accession/parameters。列出 3–5 条 strengths 与会改变主要结论解释的 limitations。

## Round 3 — Results & Figure-level Evidence

只根据 Results、Figures、Tables 与 Supplementary Results。写 Primary Result；逐项列 Key Evidence（Experiment/Analysis、Comparison、biological unit、direction、effect size、P/FDR/CI、Figure/Table、Evidence type）；判断 Figure Logic 是否形成 Discovery → Validation → Functional → Mechanistic → Clinical relevance；提取 Negative/Null Results、cross-patient consistency 与 robustness。给出 Results-only Conclusion。

## Round 4 — Evidence & Critical Appraisal

分别写 Demonstrated、Associated、Predicted、Speculative。Evidence Level 只能选 E0–E5，并给出 Reason 和 Why not higher。审查 Mechanistic Chain：每个箭头给 Evidence、Figure、Evidence type；若不能建立，明确 `Predicted only`、`Association only` 或 `Mechanistic chain not established`。选择 Causality 等级，列 3–5 条 Critical Limitations、3 条 Safe Claims for Review 和 2–5 条 Claims to Avoid。

## Final Summary Prompt

综合上述四轮，输出且只输出以下长期保存 Note：

# [L3] Deep Reading

## 1. One-Sentence Conclusion
50–100 字，只基于直接证据。

## 2. Research Question & Knowledge Gap

## 3. Study Architecture
Human / Disease / Tissue / Cell / N / Controls / Paired or Longitudinal / Animal / In vitro / Intervention / Main methods / Independent validation。

## 4. Evidence Card
Disease / Tissue / Cell / Species / Exposure / Intervention / Phenotype / Key molecules / Key pathways / Direction / Study type / Evidence level / Causality / PMID / DOI。

## 5. Main Findings
3–6 条；尽量给方向、数字、Figure/Table 与 Evidence Type。

## 6. Evidence Chain
Observation → Association → Functional evidence → Mechanistic evidence → Clinical/causal relevance；未达到处写 `Not established`。

## 7. Mechanistic Model
有直接证据时逐箭头标记；否则写 `Mechanistic chain not established`。

## 8. Evidence Boundary
分别列 Demonstrated、Associated、Predicted、Speculative。

## 9. Evidence Level
Evidence Level / Reason / Why not higher。

## 10. Statistical and Methodological Appraisal
Statistical unit、donor-level analysis、pseudoreplication risk、multiple testing、effect size/CI、independent validation、sensitivity、reproducibility。

## 11. Key Strengths

## 12. Key Limitations

## 13. Review-Ready Statements
A. Core Finding；B. Mechanistic/Cellular Finding（无机制时使用关联性语言）；C. Evidence Boundary。

## 14. Claims to Avoid

## 15. Review Role
选择 1–3 项。

## 16. Review Keywords
5–10 个高信息量词。

最后自检：不把表达变化写成功能变化；不把富集写成 activation；不把相关写成 regulation；不把空间邻近写成 communication；不把 ligand-receptor、pseudotime 或 docking 写成验证机制；不把动物结果外推成人体疗效；不忽略阴性结果、small-N、donor-level 问题或仅单患者支持的强结论；删除 Discussion 后核心结论仍成立；每个机制箭头都有直接证据。
