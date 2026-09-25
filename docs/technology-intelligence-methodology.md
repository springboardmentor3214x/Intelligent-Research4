# Module 6 — Technology Intelligence Methodology & Scoring Architecture

## 1. Overview & Objectives

**Module 6 (Technology Intelligence)** provides an objective, data-driven framework for assessing:
1. **Emerging Technologies**: Detecting early research momentum and cross-domain expansion.
2. **Technology Maturity**: Quantifying developmental progression from Nascent exploration to Full Maturity.
3. **Growth Dynamics**: Tracking longitudinal acceleration using linear regression slopes and Compound Annual Growth Rates (CAGR).
4. **Market & Domain Adoption**: Assessing commercialization footprint independently of scientific development.
5. **Organizational & Cross-Domain Ecosystem**: Quantifying institutional participation, industrial translational support, and application diversity.

---

## 2. Six Core Maturity Indicators & Mathematical Models

Technology maturity is evaluated across **six core developmental indicators** summing to exactly **100% (1.00)**:

| Indicator | Weight ($w_i$) | Raw Metric | Normalization Model | Status & Interpretation |
| :--- | :---: | :--- | :--- | :--- |
| **Research Growth** | **25%** ($0.25$) | Regression Slope $\beta_{\text{res}}$ & Recent YoY Growth | $\min(100, \max(0, 50 + 20 \times \beta + 0.3 \times \text{YoY}))$ | Continuous $[0, 100]$; dynamic trajectory |
| **Patent Growth** | **25%** ($0.25$) | Regression Slope $\beta_{\text{pat}}$ & Recent YoY Growth | $\min(100, \max(0, 50 + 20 \times \beta + 0.3 \times \text{YoY}))$ | Continuous $[0, 100]$; IP filing acceleration |
| **Research Activity** | **15%** ($0.15$) | Cumulative Unique Scholarly Papers ($N_{\text{res}}$) | $\min(100, \frac{\log(1 + N_{\text{res}})}{\log(1 + 250)} \times 100)$ | Sublinear log scaling (diminishing returns) |
| **Patent Activity** | **15%** ($0.15$) | Cumulative Unique Patents ($N_{\text{pat}}$) | $\min(100, \frac{\log(1 + N_{\text{pat}})}{\log(1 + 100)} \times 100)$ | Sublinear log scaling (diminishing returns) |
| **Organization Participation** | **10%** ($0.10$) | Unique Institutional Affiliations ($N_{\text{org}}$) | $\min(100, \frac{\log(1 + N_{\text{org}})}{\log(1 + 50)} \times 100)$ | Institutional breadth & collaboration scale |
| **Application Diversity** | **10%** ($0.10$) | Unique IPC Subclasses / Application Domains ($N_{\text{app}}$) | $\min(100, \frac{\log(1 + N_{\text{app}})}{\log(1 + 20)} \times 100)$ | Cross-domain technological penetration |

$$\text{Total Weight} = \sum_{i=1}^6 w_i = 0.25 + 0.25 + 0.15 + 0.15 + 0.10 + 0.10 = 1.00 \quad (100\%)$$

---

## 3. Missing Data Policy & Adjusted-Weight Re-Normalization

In empirical intelligence, missing historical years or unavailable external repositories must **never** be treated as a performance penalty or a true score of zero.

### 3.1 Status Classification
Each indicator explicitly reports one of five discrete states:
1. `available`: Multi-year empirical data exists and was successfully normalized.
2. `true_zero`: Connected source was searched and verified $0$ records exist (e.g. $0$ patents filed for a purely theoretical physics topic).
3. `insufficient_evidence`: Insufficient observation years ($<2$ active years) or records to compute a valid trend or slope.
4. `source_unavailable`: External adapter encountered an unreachable endpoint or network timeout.
5. `no_match_found`: Technology term yielded no matches across available indices.

### 3.2 Adjusted Score Formula
When an indicator has status `insufficient_evidence` or `source_unavailable`, its `normalized_score` is set to `None` (rendered as `N/A` in UI). The composite maturity score is re-normalized dynamically over the remaining valid indicators:

$$\text{Adjusted Score} = \frac{\sum_{i \in \text{Available}} w_i \cdot S_i}{\sum_{i \in \text{Available}} w_i}$$

Where $W_{\text{available}} = \sum_{i \in \text{Available}} w_i$. Both raw unadjusted sum and adjusted normalized scores are preserved in the response schema.

---

## 4. Zero-Division & Small-Sample Mathematical Handling

1. **Compound Annual Growth Rate (CAGR)**:
   $$\text{CAGR} = \left(\frac{V_{\text{end}}}{V_{\text{start}}}\right)^{\frac{1}{N}} - 1$$
   - When $V_{\text{start}} = 0$, CAGR is mathematically undefined. The system returns `None` and falls back to **Linear Regression Slope ($\beta$)** and absolute YoY counts.
   - Requires $N \ge 2$ distinct observation years; otherwise returns `None`.
2. **Linear Regression Slope ($\beta$)**:
   $$\beta = \frac{N \sum (t \cdot y) - (\sum t)(\sum y)}{N \sum t^2 - (\sum t)^2}$$
   - Handles transitions from $0 \to X$ gracefully without division by zero.
   - For single-year observations ($N < 2$), slope is undefined (`None`).

---

## 5. Non-Contradictory Explainability Engine

The explanation generation engine enforces strict factual consistency:
- **Zero Paper Invariant**: If $N_{\text{res}} = 0$, the system will **never** generate phrases like *"expanding scientific research"*, *"publication volume"*, or *"scholarly interest"*.
- **Zero Patent Invariant**: If $N_{\text{pat}} = 0$, the system will **never** state *"active patent filings"*, *"intellectual property expansion"*, or *"commercial patenting"*.
- **Low Confidence Warning**: If active observation years $< 2$, the confidence rating is strictly capped at `Low` or `Insufficient` with explicit caveats provided in `stage.reason`.

---

## 6. Independent Market Adoption Analysis

Market adoption is decoupled from developmental maturity scores to avoid confounding technical readiness with commercial diffusion:

- **Dimensions Analyzed**:
  1. **Industrial Assignee Ratio**: Proportion of corporate patent assignees vs. academic/governmental institutions.
  2. **Translational Funding**: Volume of commercialization, SBIR/STTR, or pilot deployment grants.
  3. **Multi-Domain Commercial Presence**: Breadth of industrial use cases.
- **Classifications**: `High`, `Moderate`, `Low`, or `Insufficient Evidence`.
- **Trend**: `Increasing`, `Stable`, `Nascent`, or `Insufficient Evidence`.

---

## 7. Dynamic Concept Expansion for Unseen Technologies

To support arbitrary and emerging technologies without requiring pre-seeded database entries, the engine executes a multi-tiered query expansion pipeline:
1. **Normalized Query**: Exact token filtering and stop-word removal.
2. **Curated Concept Dictionary**: Matches canonical domain synonyms (e.g. `BCI` $\leftrightarrow$ `Brain-Computer Interface`, `Generative AI` $\leftrightarrow$ `LLMs`).
3. **Dynamic Algorithmic Variation Generator**:
   - Morphological stemming (e.g. *batteries* $\leftrightarrow$ *battery*).
   - Acronym generation from multi-token noun phrases.
   - N-gram bi-gram/tri-gram decomposition.
   - Technical prefix/suffix mapping (`bio` $\leftrightarrow$ `biological`, `neuro` $\leftrightarrow$ `neural`, `autonomous` $\leftrightarrow$ `self-driving`).

---

## 8. Multi-Source Integration & Indian Patent (IP India) Ingest

Evidence is aggregated from both global and national repositories:
- **Research**: OpenAlex, Crossref, OpenAIRE, PubMed, Local Research DB (Module 3).
- **Patents**: PatentsView (USPTO), EPO OPS, Indian Patent Office (IP India / InPASS via country code `IN` & premier institutions like IITs, CSIR, ISRO, DRDO, IISc), Local Patent DB (Module 5).
- **Funding**: NIH RePORTER, CORDIS, Indian R&D Programs (ANRF, DST, BIRAC, MeitY via Module 4).
- **Deduplication**: Multi-key deterministic deduplication preserves source provenance and prevents artificial activity inflation.
