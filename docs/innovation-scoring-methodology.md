# Module 7 — Innovation Scoring Engine Methodology & Architecture

## 1. Overview & Objective

**Module 7 (Innovation Scoring Engine)** serves as the authoritative, deterministic synthesis layer within the **Intelligent-Research4** platform. It aggregates multi-source evidence across:
- **Module 3 (Research Intelligence)**: Research novelty, semantic vector distinctiveness, scholarly growth, and identified gaps.
- **Module 5 (Patent Intelligence)**: IP filing velocity, assignee ecosystem diversity, and IPC classification breadth.
- **Module 6 (Technology Intelligence)**: Multi-year technological maturity stage, longitudinal momentum, and application expansion.
- **Market Footprint**: Real-world commercialization adoption, industrial entities, and translational domains.
- **Module 4 (Grant & Funding Intelligence)**: Active grant opportunities, award alignment, funding vectors, and agency programs.

Module 7 transforms these diverse signals into a single, standardized, explainable **Innovation Evidence Score** normalized between **0.0 and 100.0**.

---

## 2. Core Factor Weights & Formula

The Innovation Evidence Score is computed deterministically using exactly five factors whose weights sum to **100% (1.00)**:

| Factor | Weight ($w_i$) | Primary Data Source | Normalization & Mathematical Model |
| :--- | :---: | :--- | :--- |
| **Research Novelty** | **30%** ($0.30$) | Module 3 (Papers & Semantic Embeddings) | Inverse semantic density: $\text{Novelty} = (1.0 - \text{sim}_{\text{mean}}) \times 100$; weighted by recent paper growth & topic distinctiveness |
| **Patent Strength** | **20%** ($0.20$) | Module 5 (Patent Records & IPC) | Sublinear log scaling on verified patents ($N_p$), unique assignees ($N_a$), and IPC subclasses ($N_c$): $S_p = 40 \frac{\log(1+N_p)}{\log(1+100)} + 30 \frac{\log(1+N_a)}{\log(1+30)} + 30 \frac{\log(1+N_c)}{\log(1+15)}$ |
| **Technology Maturity** | **15%** ($0.15$) | Module 6 (Maturity Engine) | Direct consumption of Module 6 authoritative composite score ($S_m \in [0, 100]$); stage progression from Emerging to Mature |
| **Market Potential** | **20%** ($0.20$) | Module 6 & Market Evidence | Measured from verified commercial participants ($N_e$), application domains ($N_d$), and adoption tier: $S_{\text{mkt}} = \text{AdoptionTier} \times 0.50 + 25 \frac{\log(1+N_e)}{\log(1+20)} + 25 \frac{\log(1+N_d)}{\log(1+10)}$ |
| **Funding Relevance** | **15%** ($0.15$) | Module 4 (Grants & Opportunities) | Active grant opportunities count ($N_g$) and vector semantic match score ($\text{sim}_f$): $S_f = \min(100, 50 \times \text{sim}_f + 50 \frac{\log(1+N_g)}{\log(1+10)})$ |

### Deterministic Score Equation:
$$\text{Innovation Score} = S_R \times 0.30 + S_P \times 0.20 + S_T \times 0.15 + S_M \times 0.20 + S_F \times 0.15$$

Where $S_R, S_P, S_T, S_M, S_F \in [0.0, 100.0]$.

---

## 3. Strict Boundary: Deterministic Scorer vs. LLM/Grok Synthesis

> [!IMPORTANT]
> **No Large Language Model (Grok, OpenAI, Groq, Anthropic, or Llama) is ever permitted to compute, adjust, or override numerical scores.**

1. **Deterministic Core**: All scores and indicators are computed through deterministic mathematical equations grounded in actual backend database tables and verified vectors.
2. **Role of Grok AI (`xAI Grok / Groq Fallback`)**:
   - Synthesizes and translates empirical metrics into structured executive summaries.
   - Identifies and highlights conflicting signals, limiting factors, and research gaps.
   - Answers analyst Q&A interactively, strictly constrained to the evidence context passed in the request.
   - Never fabricates patent numbers, paper counts, or funding grants.

---

## 4. Missing Data & Re-Normalization Policy

In empirical research, missing external indices must **never** be penalized as a failure or converted to 0.

### 4.1 State Distinctions
- `available`: Multi-record empirical evidence was located, verified, and normalized.
- `true_zero`: Index was queried and definitively confirmed 0 records exist (e.g. 0 patents for a purely theoretical philosophical concept).
- `insufficient_evidence`: Limited observation sample size prevents high-confidence normalization.
- `source_unavailable`: External adapter or API was unreachable/timed out.
- `no_match_found`: Technology term had no direct matches in the designated database table.

### 4.2 Dynamic Re-Normalization
When factor $k$ is `insufficient_evidence` or `source_unavailable`, its `normalized_score` is marked `None` (rendered as `N/A`).

$$\text{Available Weight} (W_{\text{avail}}) = \sum_{i \in \text{Available}} w_i$$
$$\text{Provisional Innovation Score} = \frac{\sum_{i \in \text{Available}} (w_i \cdot S_i)}{W_{\text{avail}}}$$

The system exposes **Factor Coverage** (e.g., $3/5$) alongside **Weighted Evidence Coverage** (e.g., $55.0\%$).

---

## 5. Key System Capabilities

1. **Interactive Factor Breakdown Drawer**: Inspect exact raw values, mathematical formulas, data provenance, and analytical limitations for each factor.
2. **Why This Score? Signal Engine**: Automatically classifies positive signals, limiting factors, conflicting evidence, and empirical gaps.
3. **Multi-Source Evidence Explorer**: Browse underlying papers (Module 3), patent filings & IPC codes (Module 5), grant opportunities (Module 4), and commercial ecosystem entities (Module 6).
4. **Analyze My Idea**: Enter arbitrary unstructured research/startup proposals to receive instant concept normalization, patent/research similarity mapping, and differentiation vectors.
5. **Technology Comparison**: Compare multiple technology domains side-by-side without declaring artificial "winners".
6. **Indian Innovation Intelligence**: Separate Indian domestic patent, research, and grant activity from global indices.
