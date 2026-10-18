# Technology Intelligence Analytical Methodology

This document defines the mathematical, algorithmic, and statistical foundation for the **Technology Intelligence Platform (Module 6)**.

---

## 1. Core Purpose & Architectural Principles

The Technology Intelligence module assesses technology trajectories, developmental maturity, organizational dynamics, and commercial adoption based on empirical, multi-source evidence:
- **Module 3 (Research Intelligence)**: Peer-reviewed publications, citation dynamics, author affiliations, keywords, and research domains.
- **Module 5 (Patent Intelligence)**: Patent filings, patent grants, IPC/CPC technological classifications, assignee networks, and technological domains.
- **Module 4 (Funding Intelligence)**: R&D grant allocations, sponsoring agencies, and competitive research funding streams.

### Principles:
1. **Zero Fabrication Policy**: All metrics, trajectories, and scores derive solely from verified records present in the connected repository. If evidence is sparse, the system explicitly returns `"Insufficient Evidence"`.
2. **No Arbitrary Hardcoded Count Cutoffs**: Maturity is determined through multi-dimensional, relative indicator normalization, multi-year directionality, and persistence analysis, rather than simplistic fixed thresholds (such as `papers > 1000 = Mature`).
3. **Strict Separation of Developmental Maturity & Market Adoption**: Technology development (scientific discovery and patent protection) and commercial market adoption are distinct phenomena. Adoption is evaluated independently and never bundled into the 6 developmental maturity indicator weights.

---

## 2. Six Core Maturity Indicators & Weights

The developmental maturity index combines six distinct empirical indicators totaling **100%**:

| Indicator | Weight | Data Source | Primary Role |
| :--- | :---: | :--- | :--- |
| **Research Growth** | **25%** | Module 3 (Papers) | Multi-year publication velocity, expansion slope, and momentum consistency |
| **Patent Growth** | **25%** | Module 5 (Patents) | Multi-year intellectual property filing momentum and commercialization intent |
| **Research Activity** | **15%** | Module 3 (Papers) | Total empirical publication volume and sustained historical presence |
| **Patent Activity** | **15%** | Module 5 (Patents) | Total verified patent filing volume and industrial IP persistence |
| **Organization Participation** | **10%** | Modules 3 & 5 | Number of unique institutions/enterprises actively filing or publishing, and network expansion |
| **Technology / Application Diversity** | **10%** | Modules 3 & 5 | Breadth of distinct scientific domains, application use-cases, and IPC classifications |
| **Total** | **100%** | | |

### Rationale for Proposed Indicator Weights:
- **Research Growth (25%) & Patent Growth (25%)**: Technology evolution is fundamentally a dynamic process. High historical volume without recent growth indicates stagnation; strong growth indicates high current development velocity.
- **Research Activity (15%) & Patent Activity (15%)**: Growth rates must be anchored to substantial empirical volume to filter out low-sample noise.
- **Organization Participation (10%)**: Broad multi-institutional participation demonstrates genuine industry-wide momentum rather than single-lab isolation.
- **Application Diversity (10%)**: Technologies spanning multiple domains demonstrate cross-industry applicability and general-purpose technology characteristics.

---

## 3. Multi-Year Time Series & Growth Methodology

For each technology query $Q$, the system constructs a continuous multi-year time series across active observation years $T = \{t_1, t_2, \dots, t_n\}$:

$$\text{EvidenceSeries}(t) = \langle P_t, \Phi_t, O_t, D_t \rangle$$

where $P_t$ is research publication count, $\Phi_t$ is patent filing count, $O_t$ is unique participating organizations, and $D_t$ is distinct application domains.

### 3.1 Year-over-Year (YoY) Growth Calculation
For any continuous metric $X_t$:

$$g_t = \begin{cases}
\left(\frac{X_t - X_{t-1}}{X_{t-1}}\right) \times 100\% & \text{if } X_{t-1} > 0 \\
\text{"Emergence from zero"} & \text{if } X_{t-1} = 0 \text{ and } X_t > 0 \\
\text{"No observed activity"} & \text{if } X_{t-1} = 0 \text{ and } X_t = 0
\end{cases}$$

### 3.2 Multi-Year Trend & Slope Calculation
To evaluate overall trajectory without single-year volatility, linear regression slope $\beta$ is computed over yearly sequences:

$$\beta = \frac{n \sum (t \cdot X_t) - (\sum t)(\sum X_t)}{n \sum t^2 - (\sum t)^2}$$

Normalized trend slope $\hat{\beta} = \frac{\beta}{\bar{X} + \epsilon}$ maps the velocity into directional categories:
- **Increasing**: $\hat{\beta} > +0.10$ with positive recent momentum.
- **Stable**: $-0.10 \le \hat{\beta} \le +0.10$ with persistent multi-year volume.
- **Declining**: $\hat{\beta} < -0.10$ over 2+ consecutive intervals.
- **Insufficient Data**: Total active years $< 2$ or total count $< 2$.

### 3.3 Compound Annual Growth Rate (CAGR)
CAGR is computed exclusively when mathematically valid:
$$\text{CAGR} = \left(\frac{X_{t_n}}{X_{t_1}}\right)^{\frac{1}{t_n - t_1}} - 1$$
**Preconditions**: $X_{t_1} > 0$, $X_{t_n} > 0$, and $(t_n - t_1) \ge 2$ years. Never calculated when $X_{t_1} = 0$.

---

## 4. Indicator Normalization Methodology

To avoid hardcoded arbitrary counts (e.g. fixed 1000 paper limits), indicators are normalized on a $[0, 100]$ continuous scale calibrated relative to dataset corpus distributions:

### 4.1 Research & Patent Growth Scores ($S_{\text{rg}}, S_{\text{pg}}$)
- Evaluates recent 3-year YoY mean growth, overall regression slope $\hat{\beta}$, and direction consistency:
$$S_{\text{growth}} = \min\left(100, \max\left(0, 50 + 25 \cdot \hat{\beta} + 0.25 \cdot \bar{g}_{\text{recent}}\right)\right)$$
If data is insufficient ($< 2$ active observation points), score defaults to $0$ with confidence marked as Limited.

### 4.2 Research & Patent Activity Scores ($S_{\text{ra}}, S_{\text{pa}}$)
- Normalizes observed cumulative volume and active yearly span using logarithmic sub-linear scaling relative to dataset maximums:
$$S_{\text{activity}} = \min\left(100, \frac{\ln(1 + N_{\text{records}})}{\ln(1 + \text{CorpusMax})} \times 80 + \frac{\text{ActiveYears}}{\text{MaxYears}} \times 20\right)$$

### 4.3 Organization Participation Score ($S_{\text{org}}$)
- Measures unique enterprise/institutional presence and organizational growth trajectory:
$$S_{\text{org}} = \min\left(100, \frac{\ln(1 + N_{\text{orgs}})}{\ln(1 + \text{CorpusMaxOrgs})} \times 85 + (\text{OrgTrendBonus})\right)$$

### 4.4 Technology / Application Diversity Score ($S_{\text{div}}$)
- Quantifies breadth of validated semantic application domains and technological classifications:
$$S_{\text{div}} = \min\left(100, \frac{\ln(1 + N_{\text{domains}})}{\ln(1 + \text{CorpusMaxDomains})} \times 100\right)$$

---

## 5. Total Weighted Maturity Score

$$\text{MaturityScore} = 0.25 S_{\text{rg}} + 0.25 S_{\text{pg}} + 0.15 S_{\text{ra}} + 0.15 S_{\text{pa}} + 0.10 S_{\text{org}} + 0.10 S_{\text{div}}$$

---

## 6. Data-Driven Stage Classification & Explainability

Stage classification is **not** a simple score threshold. It evaluates multi-dimensional signals:

| Stage | Data-Driven Criterion |
| :--- | :--- |
| **Emerging** | Recent activity (span $\le 3$ years or nascent emergence), positive research growth ($\hat{\beta}_{\text{research}} > 0$), patenting beginning to emerge ($\Phi \ge 0$), early organizational footprint. |
| **Developing** | Sustained research expansion across multiple years, increasing patent filings ($\hat{\beta}_{\text{patent}} > 0$), expanding organization network ($\ge 2$ organizations), and broadening application diversity. |
| **Mature** | Substantial multi-year historical span ($\ge 3\text{--}4$ years), high sustained research and patent activity, broad institutional participation ($\ge 3$ active organizations), broad application diversity, with growth rates stabilizing into steady equilibrium. |
| **Declining** | Persistent multi-year contraction in research ($\hat{\beta}_{\text{research}} < -0.10$) and patent activity ($\hat{\beta}_{\text{patent}} < -0.10$), shrinking organizational base. |
| **Insufficient Evidence** | Insufficient historical evidence ($< 2$ total records or $< 2$ active observation years). No stage is fabricated. |

### Dynamic Explainability Generation
For every classification, the engine automatically compiles:
1. **Primary Supporting Signals**: Quantified metrics driving the determination (e.g. *"Sustained multi-year research growth (+45.2%) with increasing patent filings"*).
2. **Limiting Factors**: Bottlenecks preventing a higher classification (e.g. *"Patent volume remains low relative to scientific publication volume"*).
3. **Conflicting Signal Resolution**: Clarifies diverging indicators (e.g. *"High academic research growth is accompanied by modest patent activity, indicating active laboratory discovery with nascent commercial IP translation"*).

---

## 7. Independent Market Adoption Analysis

Adoption measures real-world commercialization and deployment evidence, completely decoupled from developmental maturity:
- **Adoption Signals**:
  - Commercial assignees actively deploying the technology in industry.
  - Clinical, industrial, or production use-case validations in abstracts.
  - Active funding from commercial and applied translation grants.
- **Classifications**: `High`, `Moderate`, `Low`, or `Insufficient Evidence`.

---

## 8. Evidence Coverage, Provenance & Confidence

Confidence is evaluated independently of the maturity score:
- **High Confidence**: $\ge 3$ observation years, presence across research and patent datasets, $\ge 5$ distinct verified records.
- **Moderate Confidence**: 2 active years with verified records in at least one dataset.
- **Low / Insufficient Confidence**: 1 isolated year or single record.

Provenance links every metric back to verifiable record IDs, titles, publication/filing dates, and institutional assignees.
