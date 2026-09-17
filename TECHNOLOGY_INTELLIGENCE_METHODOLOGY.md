# Technology Intelligence Analytical Methodology

This document specifies the technical, mathematical, and algorithmic foundation for **Technology Intelligence, Discovery, Maturity & Trends**.

---

## 1. Multi-Source Evidence Linkage & Concept Expansion

The analytical engine investigates technology queries across all connected empirical data sources:
- **Research Intelligence (Module 3)**: Evaluates publication frequency, publication year, citations, domain, keywords, abstract, and author/venue affiliations.
- **Patent Intelligence (Module 5)**: Evaluates patent filings, publication dates, classifications, citation metrics, technology domains, abstract, and distinct assignee organizations.
- **Funding Intelligence (Module 4)**: Evaluates open dates, sponsoring agencies, research areas, and funding categories.
- **Organization Network**: Evaluates cross-source participation from corporate assignees, universities, and public funding agencies.

### Technology Normalization & Concept Expansion
Queries are not restricted to exact string matches. The system applies:
1. **Query Normalization**: Strips punctuation, isolates significant tokens, and filters domain-generic stop words (`for`, `in`, `of`, `and`, `the`, `based`, `powered`, `with`, `using`, `system`, `method`).
2. **Curated Domain Concept Ontology**: Expands known technology terms into related phrases:
   - *Medical Imaging AI* $\rightarrow$ `medical image`, `medical imaging`, `mri`, `tumor segmentation`, `radiology`, `ct scan`, `ultrasound`, `biomedical imaging`, `clinical imaging`, `deep learning in medicine`, `medical diagnostics`.
   - *Edge AI* $\rightarrow$ `edge computing`, `edge intelligence`, `on-device ai`, `distributed ai`, `embedded ai`, `iot ai`, `tinyml`, `edge machine learning`.
   - *Generative AI* $\rightarrow$ `generative ai`, `large language model`, `llm`, `diffusion model`, `transformer`, `deep generative`.
   - *Quantum Computing*, *Computer Vision*, *NLP*, *Robotics*, *Cybersecurity*, *Biotechnology*, *Clean Energy*, etc.
3. **Compound Token & N-Gram Matching**: For custom user queries, calculates token coverage and phrase co-occurrence.

### Zero Fake Data Policy
Every metric, chart, and count derives strictly from records existing in the connected datasets. When no records exist, explicit diagnostic explanations detail which datasets were scanned and return verifiable zero counts.

---

## 2. Activity Intensity Ribbon & Trajectory

### Temporal Aggregation
Activity points $A_t$ for calendar year $t$ are calculated as:
$$A_t = P_t + \Phi_t + F_t$$
where $P_t$ is published papers, $\Phi_t$ is patent filings, and $F_t$ is active funding opportunities.

### Activity Intensity Calculation
For each active observation year $t$, activity intensity $I_t$ is calculated relative to the peak recorded volume:
$$I_t = \left(\frac{A_t}{\max_k A_k}\right) \times 100\%$$

- **Peak**: $I_t \ge 85\%$
- **High**: $55\% \le I_t < 85\%$
- **Moderate**: $25\% \le I_t < 55\%$
- **Low**: $I_t < 25\%$

### Year-over-Year (YoY) Growth
$$g_t = \begin{cases}
\left(\frac{A_t - A_{t-1}}{A_{t-1}}\right) \times 100\% & \text{if } A_{t-1} > 0 \\
+100\% & \text{if } A_{t-1} = 0 \text{ and } A_t > 0 \\
0\% & \text{if } A_{t-1} = 0 \text{ and } A_t = 0
\end{cases}$$

---

## 3. Technology Trend Analysis

Trends classify empirical trajectory based on multi-year velocity:

| Trend Classification | Threshold Criterion |
| :--- | :--- |
| **Growing** | Recent multi-year growth rate $\ge +10.0\%$ across $\ge 2$ active years. |
| **Stable** | Recent growth rate between $-10.0\%$ and $+10.0\%$. |
| **Declining** | Recent growth rate $\le -10.0\%$ with contracting activity. |
| **Insufficient Data** | Fewer than 2 distinct active years or fewer than 2 total records. |

---

## 4. Explainable Technology Maturity Assessment

Maturity assesses historical foundation, commercial IP protection, and organizational participation:

1. **INSUFFICIENT_DATA**: Total research papers + patents $< 2$.
2. **MATURE**:
   - Historical span $\ge 4$ years.
   - $\ge 4$ patent filings.
   - $\ge 3$ distinct corporate or institutional assignees.
3. **ESTABLISHED**:
   - Historical span $\ge 3$ years.
   - $\ge 3$ research papers and ($\ge 2$ patents or $\ge 2$ distinct organizations).
4. **DEVELOPING**:
   - Historical span $\ge 1$ year and $\ge 2$ total verified records.
5. **EARLY**:
   - Exploratory phase with preliminary publications and limited commercial patents.

---

## 5. Analytical Technology Readiness Estimate

Readiness provides an empirical estimate of practical and commercial translation:

> **Disclaimer**: *This score is a system-generated analytical estimate based on publication, patent, and organizational indicators, not an official Technology Readiness Level (TRL) certification.*

### Composite Factor Formula (Scale 0–100):
$$R = (0.25 \times S_{\text{research}}) + (0.35 \times S_{\text{patent}}) + (0.25 \times S_{\text{org}}) + (0.15 \times S_{\text{momentum}})$$

- **Research Activity Score ($S_{\text{research}}$)**:
  $$S_{\text{research}} = \min\left(100, \frac{\ln(N_{\text{papers}} + 1)}{\ln(20)} \times 100\right)$$
- **Patent & IP Score ($S_{\text{patent}}$)**:
  $$S_{\text{patent}} = \min\left(100, \frac{\ln(N_{\text{patents}} + 1)}{\ln(10)} \times 100\right)$$
- **Organization Diversity Score ($S_{\text{org}}$)**:
  $$S_{\text{org}} = \min\left(100, \frac{\ln(N_{\text{orgs}} + 1)}{\ln(8)} \times 100\right)$$
- **Adoption Momentum Score ($S_{\text{momentum}}$)**:
  - Scaled according to momentum classification (`Growing`: $60\text{--}100$, `Stable`: $55$, `Declining`: $30$, `Insufficient Data`: $40$).

---

## 6. Evidence Coverage States & Provenance

1. **STRONG**: Multi-source presence ($\ge 3$ research papers, $\ge 2$ patents, $\ge 3$ organizations, and span $\ge 2$ years) or substantial volume ($\ge 5$ papers and $\ge 3$ patents).
2. **PARTIAL**: $\ge 3$ total evidence points or presence in at least 2 distinct datasets.
3. **LIMITED**: $1\text{--}2$ isolated records across all sources.
4. **INSUFFICIENT**: $0$ matching records across Research, Patents, Funding, and Organizations.
