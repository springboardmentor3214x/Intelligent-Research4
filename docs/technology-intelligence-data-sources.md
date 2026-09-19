# Multi-Source Technology Intelligence Data Sources & Architecture

This document provides complete technical specifications for all connected external and internal empirical data sources integrated into **Module 6 (Technology Intelligence)**.

---

## 1. System Architecture & Modular Source Ingestion

The platform utilizes a decoupled, modular adapter architecture organized under `backend/app/services/sources/`:

```
Technology Intelligence Engine (Module 6)
   │
   ├─► Source Registry Orchestrator
   │      ├─► Research Adapters:
   │      │     ├─ OpenAlex (Scholarly Works REST API)
   │      │     ├─ Crossref (Scholarly Metadata API)
   │      │     ├─ OpenAIRE (Research Products API)
   │      │     ├─ PubMed (NCBI E-utilities API - Biomedical Domain Filtered)
   │      │     └─ Module 3 Database (Local Peer-reviewed papers)
   │      │
   │      ├─► Patent Adapters:
   │      │     ├─ PatentsView (USPTO Patent Search API)
   │      │     ├─ EPO OPS (European Patent Office Open Patent Services API)
   │      │     └─ Module 5 Database (Local Patent filings & IPC classifications)
   │      │
   │      └─► Funding Adapters:
   │            ├─ NIH RePORTER (Biomedical Projects Search API)
   │            ├─ CORDIS (European Horizon & FP7 R&D Projects API)
   │            └─ Module 4 Database (Indian R&D Grants + Grants.gov)
   │
   ├─► Resilience & Cache Layer (TTL Caching + Graceful Error Isolation)
   │
   ├─► Deduplication Pipeline (DOI, PMID, Patent Number, Normalized Title)
   │
   ├─► Multi-Year Historical Aggregation & Entity Extraction
   │
   ├─► 6 Core Maturity Indicators (Exact Weights: 25%, 25%, 15%, 15%, 10%, 10%)
   │
   └─► Explainability & Independent Adoption Analysis
```

---

## 2. Integrated Data Sources

| Source | Category | Endpoint / Mechanism | Auth Requirements | Rate Limits / Policy | Domain Specialization |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **OpenAlex** | Research | `api.openalex.org/works` | None (Polite mailto) | 10 req/sec | Global Scholarly Literature, Concept Graph, Authors, Citations |
| **Crossref** | Research | `api.crossref.org/works` | None (Polite mailto) | 50 req/sec | DOI Metadata, Funders, Publishers, ORCID |
| **OpenAIRE** | Research | `api.openaire.eu/search/researchProducts` | None (Open Graph) | Standard Web Rate | European & Global Open Access, Research Products & Projects |
| **PubMed** | Research | `eutils.ncbi.nlm.nih.gov/entrez/eutils/` | None (NCBI API) | 3 req/sec | Biomedical, Clinical AI, Radiology, Healthcare Technologies |
| **Module 3 DB** | Research | Local PostgreSQL | Local DB Connection | Unlimited | Verified Peer-Reviewed Publications & Citations |
| **PatentsView** | Patents | `search.patentsview.org/api/v1/patent/` | Optional API Key | 10 req/min | US Patents, Assignees, Inventors, CPC Classifications |
| **EPO OPS** | Patents | `ops.epo.org/3.2/rest-services` | `EPO_CLIENT_ID`, `EPO_CLIENT_SECRET` | 10 req/min (OAuth) | European & Worldwide Patents, Legal Status |
| **Module 5 DB** | Patents | Local PostgreSQL | Local DB Connection | Unlimited | Verified Patents, Assignee Networks, IPC Classes |
| **NIH RePORTER** | Funding | `api.reporter.nih.gov/v2/projects/search` | None (Public POST) | Standard Web Rate | US Biomedical & Health Research Grants |
| **CORDIS** | Funding | `cordis.europa.eu/api/projects/search` | None (EU Open Data) | Standard Web Rate | EU Horizon Europe & Framework Program Projects |
| **Module 4 DB** | Funding | Local PostgreSQL | Local DB Connection | Unlimited | Indian R&D Programs (ANRF, DST, BIRAC, MeitY, etc.) |

---

## 3. Resilience, Error Isolation & Cache Policy

1. **Non-Blocking Adapter Isolation**: Each adapter wraps external network calls with a strict timeout (8-10s) and exception safety. If an API is unreachable, rate-limited, or unconfigured, it logs a warning and returns an empty list, allowing other sources and the local database to complete the analysis seamlessly.
2. **Graceful Credential Detection**: Adapters requiring credentials (e.g. `EPO OPS`) verify environment variables before executing. If missing, the status is marked as `AUTHENTICATION_REQUIRED` (`credentials_not_configured`) rather than failing or fabricating zero values.
3. **Evidence Caching**: The `EvidenceCacheManager` implements a 24-hour TTL in-memory and disk cache (`.cache_evidence/`) keyed by sanitized query terms. This prevents duplicate network round-trips and enables fully functional offline operation.

---

## 4. Multi-Source Deduplication & Provenance Rules

The deduplication engine distinguishes **Source Coverage** from **Unique Verified Evidence**:

- **Research Deduplication Key Hierarchy**:
  1. Normalized DOI (`doi:10.xxxx/...`)
  2. PubMed ID (`pmid:xxxx`)
  3. OpenAlex Work ID (`openalex:Wxxxx`)
  4. Normalized Alphanumeric Title + Publication Year (`title:normalized_title:year`)
- **Patent Deduplication Key Hierarchy**:
  1. Normalized Patent / Publication Number (`pat:US11456789` or `pat:EP3456789`)
  2. Normalized Title + Filing Year (`pattitle:normalized_title:year`)
- **Grant Deduplication Key Hierarchy**:
  1. Source Grant ID (`grant:nih:xxxx`, `grant:cordis:xxxx`)
  2. Normalized Title (`granttitle:normalized_title`)

When duplicates occur across sources (e.g., a paper listed in OpenAlex, Crossref, and PubMed), the record is merged into a single unique item while preserving the contributing source list in the provenance map.

---

## 5. Mathematical & Maturity Scoring Foundations

### 5.1 Six Core Maturity Indicators (100% Total)

| Indicator | Weight | Raw Measure | Normalization |
| :--- | :---: | :--- | :--- |
| **Research Growth** | **25%** | Regression Slope $\beta_{\text{res}}$ & Recent YoY | Continuous scale $[0, 100]$ |
| **Patent Growth** | **25%** | Regression Slope $\beta_{\text{pat}}$ & Recent YoY | Continuous scale $[0, 100]$ |
| **Research Activity** | **15%** | Cumulative Unique Papers | Sublinear logarithmic scale |
| **Patent Activity** | **15%** | Cumulative Unique Patents | Sublinear logarithmic scale |
| **Organization Participation** | **10%** | Unique Organizations | Logarithmic scale + Trend bonus |
| **Technology Diversity** | **10%** | Unique Application Domains / IPC | Logarithmic scale $[0, 100]$ |

### 5.2 Independent Market Adoption
Adoption is evaluated **strictly independently** of developmental maturity. It evaluates active commercial assignees, industrial translational grants, and deployment evidence, categorized into `High`, `Moderate`, `Low`, or `Insufficient Evidence`.
