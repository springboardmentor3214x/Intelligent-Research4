# 🔬 ResearchIntel — Research Funding & Innovation Intelligence Platform

[![Python Version](https://img.shields.io/badge/Python-3.10%20%7C%203.11%20%7C%203.12%20%7C%203.14-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.138.1-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19.2.8-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.2.2-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-0.186.0-black.svg?logo=three.js&logoColor=white)](https://threejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-4169E1.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![AI Engine](https://img.shields.io/badge/AI%20Inference-Groq%20%7C%20xAI%20Grok-FF6B6B.svg)](https://groq.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE.txt)

> **ResearchIntel** is an enterprise-grade AI-powered intelligence platform that unifies global scholarly publications, patent registries, grant funding opportunities, technology maturity tracking, and explainable innovation assessment into a single real-time decision-support system for researchers, university innovation managers, startups, and policy analysts.

---

## 📑 Table of Contents

- [Platform Overview](#-platform-overview)
- [Comprehensive Module Architecture (Modules 1–11)](#-comprehensive-module-architecture-modules-111)
  - [Module 1: Enterprise Authentication & RBAC](#module-1-enterprise-authentication--rbac)
  - [Module 2: Researcher Profile & Academic Details](#module-2-researcher-profile--academic-details)
  - [Module 3: Multi-Source Research Intelligence](#module-3-multi-source-research-intelligence)
  - [Module 4: Funding Opportunity Intelligence & AI Semantic Matching](#module-4-funding-opportunity-intelligence--ai-semantic-matching)
  - [Module 5: Patent Landscape & 3D Cluster Visualization](#module-5-patent-landscape--3d-cluster-visualization)
  - [Module 6: Technology Intelligence & Empirical Maturity Engine](#module-6-technology-intelligence--empirical-maturity-engine)
  - [Module 7: Explainable Weighted Innovation Scoring Engine](#module-7-explainable-weighted-innovation-scoring-engine)
  - [Module 8: Commercialization & Translational Pathway Analysis](#module-8-commercialization--translational-pathway-analysis)
  - [Module 9: Role-Based Command Dashboards](#module-9-role-based-command-dashboards)
  - [Module 10: Unified Multi-Source Dossiers & Live PDF Synthesis](#module-10-unified-multi-source-dossiers--live-pdf-synthesis)
  - [Module 11: Real-Time Notification Center & Grounded Platform AI Assistant](#module-11-real-time-notification-center--grounded-platform-ai-assistant)
- [Data Sources & Ingestion Pipeline](#-data-sources--ingestion-pipeline)
- [System Architecture & Tech Stack](#-system-architecture--tech-stack)
- [Directory Structure](#-directory-structure)
- [Getting Started & Installation](#-getting-started--installation)
  - [Prerequisites](#prerequisites)
  - [Backend Setup (FastAPI & PostgreSQL)](#backend-setup-fastapi--postgresql)
  - [Frontend Setup (React 19 & Vite)](#frontend-setup-react-19--vite)
- [Database Migrations & Seeding](#-database-migrations--seeding)
- [Running Test Suites](#-running-test-suites)
- [API Endpoints Reference](#-api-endpoints-reference)
- [User Roles & Personas](#-user-roles--personas)
- [License](#-license)

---

## 🌟 Platform Overview

Bridging the gap between fundamental research and commercial market reality requires connecting disconnected data silos: academic papers, patent gazettes, government funding calls, and market adoption metrics. 

**ResearchIntel** harmonizes these signals:
- **13 scholarly providers** providing real-time paper discovery, structured extraction, and citation verification.
- **Global & Indian patent registries** (EPO Linked Open Data, PatentsView, and Indian Patent Office) analyzed via dense vector embeddings, KMeans clustering, and interactive 3D spatial projections.
- **Over 1,200 funding grants** dynamically matched to researcher profiles via vector cosine similarity.
- **Authoritative 5-factor deterministic Innovation Scoring** providing transparent, reproducible evaluations without LLM hallucinations.
- **Automated dossier generation** with live PDF export, role-tailored dashboards, and an evidence-grounded AI conversational assistant.

```mermaid
flowchart TD
    subgraph Data Layer
        A1[13 Scholarly Providers<br/>OpenAlex, PubMed, arXiv, etc.]
        A2[Patent Registries<br/>EPO, PatentsView, Indian IPO]
        A3[Grant Opportunities<br/>Grants.gov, NIH, CORDIS, DST]
    end

    subgraph Intelligence Engine
        B1[Dense Vector Embeddings<br/>Normalized 100k-dim semantic space]
        B2[KMeans & 3D PCA Projector]
        B3[Deterministic 5-Factor Scorer<br/>30% Novelty | 20% Patent | 15% Tech<br/>20% Market | 15% Funding]
        B4[AI Assistant & Grok Briefs<br/>Evidence-grounded synthesis]
    end

    subgraph Presentation & Role Dashboards
        C1[Researcher Dashboard]
        C2[Startup Founder Hub]
        C3[Innovation Manager Command]
        C4[Administrator Control Room]
        C5[Live PDF Export Engine]
    end

    Data Layer --> Intelligence Engine
    Intelligence Engine --> Presentation & Role Dashboards
```

---

## 🧩 Comprehensive Module Architecture (Modules 1–11)

### Module 1: Enterprise Authentication & RBAC
- **Password Security**: Argon2 hashing via `pwdlib` with salt randomization.
- **Tokens**: JWT (JSON Web Tokens) with cryptographically signed HS256 claims, expiry management, and refresh cycles.
- **OAuth2**: Google OAuth2 integration (`/auth/oauth/google` and `/auth/oauth/google/callback`) with state verification cookies.
- **Role-Based Access Control (RBAC)**: Enforced via FastAPI dependency guards (`require_roles(...)` and `get_current_user_optional`):
  - `researcher`: Academic profile tracking, recommendations, citation analysis.
  - `startup_founder`: Technology adoption velocity, market whitespace, commercialization pathways.
  - `innovation_manager`: Portfolio monitoring, maturity analysis, multi-technology comparisons.
  - `administrator`: Multi-tenant corpus ingestion, user management, and provider diagnostics.
  - `investor`, `innovator`, `reviewer`: Custom access scopes.

### Module 2: Researcher Profile & Academic Details
- Comprehensive profile model capturing:
  - Affiliation, department, designation, contact, country, and primary research domain.
  - Granular **Research Areas**, **Keywords**, **Technology Areas**, and linked **Publications** & **Patents**.
  - Dynamic profile synthesis text used by semantic matching engines to personalize intelligence across the platform.

### Module 3: Multi-Source Research Intelligence
- **13 Unified Scholarly Providers**: OpenAlex, Crossref, Semantic Scholar, CORE, arXiv, Europe PMC, PubMed, DOAJ, OpenAIRE, Zenodo, bioRxiv, medRxiv, and BASE.
- **Live Auto-Discovery Trigger**: Automatically queries external scholarly APIs when a user search yields fewer than 20 local records, indexing new papers in the background.
- **Automated AI Paper Analysis**: Deconstructs any paper into:
  - Core Research Problem & Motivation
  - Proposed Methodology & Technical Approach
  - Key Findings & Quantitative Claims
  - Limitations & Constraints
  - Future Research Directions & Whitespace Gaps
- **Independent Citation Verification**: DOI and Crossref validation with citation counts and verified source badges.

### Module 4: Funding Opportunity Intelligence & AI Semantic Matching
- **Aggregated Grant Repositories**: Grants.gov, NIH RePORTER, European Commission CORDIS, and Indian Government Grant portals (DST, ICMR, SERB).
- **Personalized Semantic Matching**:
  - Encodes the user's research profile into dense semantic vector space.
  - Calculates cosine similarity against all active funding opportunities.
  - Generates transparent match confidence (`Strong Match`, `Relevant Match`, `Broad Match`).
  - Identifies overlapping technical keywords and automated eligibility checks (citizenship, career stage, organization type).
- **Scalable Pagination & Sorting**: Handles 1,200+ opportunities with multi-parameter filtering (agency, funding type, research domain, deadline, award ceiling).
- **Saved Opportunities & Bookmarking**: One-click saved grants tracking with status indicators.

### Module 5: Patent Landscape & 3D Cluster Visualization
- **Live Patent Ingestion**: Real-time European Patent Office (EPO) Linked Open Data SPARQL queries, USPTO PatentsView, and Indian Patent Office dataset.
- **Semantic Vectorization**: High-dimensional L2-normalized vectorization of title, abstract, and IPC classifications.
- **Unsupervised KMeans Clustering**: Automatic grouping of patents into thematic technology clusters with silhouette score quality evaluation and automated label generation.
- **WebGL 3D Landscape**: Interactive Three.js spatial scatter plot with orbital controls, cluster coloring, representative patent nodes, and 2D/3D PCA projection toggles.
- **"Check Your Innovation" (Patent Idea Analyzer)**:
  - Evaluates user-submitted technical concepts against patent databases.
  - Calculates novelty index, feature overlap, and identifies direct prior art.
  - Highlights whitespace opportunities and defensible differentiation avenues.

### Module 6: Technology Intelligence & Empirical Maturity Engine
- **Target Tracking Technologies**: Quantum Computing, Synthetic Biology, Clean Energy, Brain-Computer Interfaces, Space Tech, Generative AI, Edge AI, Medical Imaging AI, Smart Materials, Cybersecurity, Solid-State Batteries, and Green Hydrogen.
- **6-Indicator S-Curve Maturity Engine**:
  1. Scholarly Publication Velocity (Module 3)
  2. Patent Inventions Volume (Module 5)
  3. Active Corporate/Institutional Assignee Diversity
  4. Global & Indian Grant Funding Inflow (Module 4)
  5. Real-World Market Adoption & Industrial Integration
  6. Longitudinal Multi-Year Momentum
- **Longitudinal Trend Tracking**: Historical dataset evolution from 2018 to present day.

### Module 7: Explainable Weighted Innovation Scoring Engine
- **Deterministic 5-Factor Formulation**:
  $$\text{Innovation Score} = S_{\text{Novelty}} \times 0.30 + S_{\text{Patent}} \times 0.20 + S_{\text{Maturity}} \times 0.15 + S_{\text{Market}} \times 0.20 + S_{\text{Funding}} \times 0.15$$
- **Strict Boundary**: No LLM ever computes, alters, or hallucinates numerical scores; all scores are computed from verifiable database entities.
- **Missing Data Policy**: Dynamic re-normalization over available factor weights ensuring fair scoring across early-stage vs. mature technologies.
- **Comparative Multi-Tech Radar**: Side-by-side factor evaluation comparing 2 to 5 technologies simultaneously.

### Module 8: Commercialization & Translational Pathway Analysis
- Technology Readiness Level (TRL 1–9) estimation from multi-domain evidence.
- Spin-off and university startup readiness evaluation.
- Target industry vertical classification, licensing opportunities, and market barrier analysis.

### Module 9: Role-Based Command Dashboards
- **Researcher Command Center**: Publications count, citation indices, personalized grant matches, research topic heatmaps, and connected intelligence flow.
- **Startup Founder Hub**: Market gaps, prior art whitespace alerts, funding opportunity deadlines, and commercialization velocity metrics.
- **Innovation Manager Dashboard**: Portfolio-wide maturity indexes, multi-technology comparisons, and university patent filing trends.
- **Administrator Room**: Real-time multi-source provider status (OpenAlex, Crossref, EPO, PubMed, etc.), batch corpus ingester, and corpus growth targets.

### Module 10: Unified Multi-Source Dossiers & Live PDF Synthesis
- Comprehensive PDF dossier generation using Python's `reportlab` library:
  - Executive Summaries & Structured Findings
  - Radar and tabular indicator breakdowns
  - Prior art citations and active funding program tables
  - Full branding, vector headers, and professional page formatting
- Browser-based live preview document with instant download capabilities.

### Module 11: Real-Time Notification Center & Grounded Platform AI Assistant
- **Smart Notification Engine**: Alerts for new relevant funding calls, patent filings matching research topics, and technology maturity shifts.
- **Platform AI Assistant (`xAI Grok / Groq Fast Inference`)**:
  - Interactive analyst chatbot grounded strictly in live database entities.
  - "Ask an Analyst" concept questions with cited evidence.
  - Generates Grok Innovation Briefs with executive summaries, opportunity signals, and research gaps.

---

## 🌐 Data Sources & Ingestion Pipeline

| Domain | Primary Data Sources & Adapters | Protocol / Format | Features Supported |
| :--- | :--- | :--- | :--- |
| **Scholarly Papers** | OpenAlex, Crossref, Semantic Scholar, CORE, arXiv, Europe PMC, PubMed, DOAJ, OpenAIRE, Zenodo, bioRxiv, medRxiv, BASE | REST JSON, XML, OAI-PMH | Multi-source search, live auto-discovery trigger (<20 records), automated structured analysis, DOI citation verification |
| **Patents & IP** | European Patent Office (EPO), USPTO PatentsView, Indian Patent Office (IPO) | SPARQL Linked Open Data, REST APIs | Multi-concept extraction, KMeans clustering, 2D/3D PCA projection, idea whitespace analysis |
| **Funding Grants** | Grants.gov, NIH RePORTER, CORDIS (European Commission), DST / ICMR / SERB (India) | REST API, Web Ingestion | Vector cosine matching, eligibility filtering, deadline status, bookmarking |
| **Technologies** | Aggregated across Module 3, 4, 5 & Market Indices | Unified SQL Models | 6-indicator maturity S-curve, adoption velocity, longitudinal trend analysis |

---

## 🛠 System Architecture & Tech Stack

### Backend
- **Language**: Python 3.10+ (tested on Python 3.14)
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) with asynchronous endpoint handling
- **Database ORM**: [SQLAlchemy 2.0](https://www.sqlalchemy.org/) with [Alembic](https://alembic.sqlalchemy.org/) migrations
- **Database Driver**: `psycopg` (v3 binary) for PostgreSQL; in-memory SQLite support for unit testing
- **Machine Learning & Math**: `scikit-learn`, `numpy`, `scipy` (KMeans clustering, PCA spatial projection, L2-normalized vectorization)
- **Document Synthesis**: `reportlab` (Dynamic enterprise PDF generation)
- **AI / LLM Integration**: [Groq Cloud SDK](https://console.groq.com/) (`openai/gpt-oss-120b`, Llama-3-70b)
- **Security & Cryptography**: `pwdlib[argon2]`, `PyJWT`

### Frontend
- **Framework**: [React 19](https://react.dev/) + [Vite 8](https://vitejs.dev/)
- **Routing**: [React Router v7](https://reactrouter.com/)
- **3D Graphics & Data Visualization**: [Three.js](https://threejs.org/) for interactive WebGL 3D patent cluster landscapes
- **Styling Architecture**: Custom CSS design system with CSS custom properties, glassmorphism, responsive viewports, and micro-animations

---

## 📂 Directory Structure

```text
Intelligent-Research4/
├── backend/
│   ├── alembic/                      # Database migration scripts
│   ├── app/
│   │   ├── auth/                     # JWT security, dependencies, and OAuth2 router
│   │   ├── database/                 # Connection pools, engine, and base models
│   │   ├── models/                   # SQLAlchemy declarative models (User, Patent, Paper, etc.)
│   │   ├── routers/                  # Modular FastAPI routers
│   │   │   ├── assistant.py          # Platform AI assistant & analyst Q&A
│   │   │   ├── commercialization.py  # Commercialization & TRL assessment
│   │   │   ├── dashboard.py          # Role-based dashboard aggregations
│   │   │   ├── funding_opportunity.py# Grants search, sync, and recommendations
│   │   │   ├── innovation_assessment.py # Deterministic Innovation Scoring API
│   │   │   ├── notifications.py      # Real-time notifications & preferences
│   │   │   ├── patent.py             # Patent search, EPO import, and 3D clustering
│   │   │   ├── reports.py            # Unified dossier generator & PDF export
│   │   │   ├── research_paper.py     # Scholarly discovery & AI paper analysis
│   │   │   ├── tech_intelligence.py  # Multi-source technology intelligence
│   │   │   └── technology.py         # Technology CRUD & maturity metrics
│   │   ├── schemas/                  # Pydantic v2 validation contracts
│   │   └── services/                 # Core business logic & external adapters
│   │       ├── providers/            # 13 Scholarly provider adapters
│   │       ├── sources/              # Multi-source patent & grant adapters
│   │       ├── citation_service.py   # DOI citation verification
│   │       ├── funding_matching_service.py # Semantic cosine similarity matcher
│   │       ├── innovation_scoring_service.py # 5-factor deterministic calculator
│   │       ├── patent_clustering_service.py  # KMeans & PCA projection
│   │       ├── report_service.py     # ReportLab PDF synthesis
│   │       └── unified_report_service.py # Multi-module dossier aggregator
│   ├── scripts/                      # Seed data fetchers & utilities
│   ├── tests_funding_intelligence.py # Test suite for funding & semantic matching
│   ├── tests_innovation_scoring.py   # Test suite for 5-factor scoring engine
│   ├── tests_patent_clustering.py    # Test suite for patent clustering & PCA
│   └── tests_research_intelligence.py# Test suite for scholarly discovery & analysis
├── docs/                             # In-depth architectural & methodology reports
├── frontend/
│   ├── public/                       # Static branding, logo, and team images
│   ├── src/
│   │   ├── components/               # Reusable UI components (Navbar, 3D Canvas, etc.)
│   │   ├── context/                  # AuthContext and state providers
│   │   ├── pages/                    # 18+ Role pages and intelligence views
│   │   │   ├── Dashboard.jsx         # Researcher analytics command center
│   │   │   ├── FundingIntelligence.jsx # Grants recommendations & filter UI
│   │   │   ├── InnovationScoring.jsx # Factor breakdown & Idea Analyzer
│   │   │   ├── Landing.jsx           # Interactive showcase homepage
│   │   │   ├── PatentLandscape.jsx   # 3D Three.js cluster map & search
│   │   │   ├── Reports.jsx           # Unified dossier builder & live PDF preview
│   │   │   ├── ResearchPapers.jsx    # Scholarly paper discovery & AI analysis
│   │   │   ├── RoleBasedDashboard.jsx# Dynamic role router
│   │   │   └── TechnologyIntelligence.jsx # Technology tracking & maturity S-curve
│   │   ├── services/                 # Frontend API clients (Axios/fetch wrappers)
│   │   ├── App.jsx                   # Master routing & layout shell
│   │   └── main.jsx                  # Application entry point
│   ├── package.json                  # Node.js dependencies
│   └── vite.config.js                # Vite build configuration
├── .env.example                      # Template environment variables
├── requirements.txt                  # Python dependencies
└── README.md                         # Project documentation
```

---

## 🚀 Getting Started & Installation

### Prerequisites
- **Python**: Version `3.10` or higher installed
- **Node.js**: Version `18.x` or higher and `npm` installed
- **PostgreSQL**: Version `14` or higher running locally or accessible remotely
- **Git**

---

### Backend Setup (FastAPI & PostgreSQL)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/springboardmentor3214x/Intelligent-Research4.git
   cd Intelligent-Research4
   ```

2. **Create and activate a Python virtual environment**:
   ```bash
   # Windows (PowerShell)
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # Linux / macOS
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install Python dependencies**:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. **Configure Environment Variables**:
   Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and fill in your database credentials and API keys:
   ```ini
   DATABASE_URL="postgresql+psycopg://postgres:your_password@localhost:5432/research_intelligence"
   JWT_SECRET_KEY="generate-a-secure-random-64-character-hex-string"
   JWT_ALGORITHM="HS256"
   ACCESS_TOKEN_EXPIRE_MINUTES="60"
   CORS_ORIGINS="http://localhost:5173"
   FRONTEND_URL="http://localhost:5173"

   # Optional: Groq API key for platform AI assistant
   GROQ_API_KEY="your-groq-api-key"
   GROQ_MODEL="openai/gpt-oss-120b"
   ```

5. **Run Database Migrations**:
   ```bash
   alembic upgrade head
   ```

6. **Seed Initial Dataset (Optional but Recommended)**:
   ```bash
   # Seed Indian Patent Office data
   python backend/seed_indian_patents.py

   # Seed domain intelligence data
   python backend/scripts/fetch_real_domain_data.py
   ```

7. **Start the FastAPI Development Server**:
   ```bash
   uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
   ```
   The backend API will be live at `http://localhost:8000`. Interactive Swagger API documentation will be available at `http://localhost:8000/docs`.

---

### Frontend Setup (React 19 & Vite)

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install Node.js dependencies**:
   ```bash
   npm install
   ```

3. **Start the Vite development server**:
   ```bash
   npm run dev
   ```
   The frontend will be live at `http://localhost:5173`.

---

## 🧪 Running Test Suites

The backend includes a comprehensive, isolated test suite covering authentication, multi-source literature discovery, semantic grant matching, and patent clustering.

Run the test suite using `pytest`:

```bash
# Run all tests
pytest -v

# Run individual module test suites
pytest backend/tests_research_intelligence.py -v
pytest backend/tests_funding_intelligence.py -v
pytest backend/tests_patent_clustering.py -v
pytest backend/tests_innovation_scoring.py -v
```

All test suites automatically run on an isolated in-memory SQLite database without mutating your production or development PostgreSQL instance.

---

## 📡 API Endpoints Reference

Below is a summary of the core REST API endpoints exposed by the backend:

| Router Prefix | Method | Endpoint | Description |
| :--- | :---: | :--- | :--- |
| **Authentication** | `POST` | `/auth/register` | Register new user account with hashed password and role |
| | `POST` | `/auth/login` | Authenticate user credentials and issue signed JWT bearer token |
| | `GET` | `/auth/me` | Fetch authenticated user profile details |
| | `GET` | `/auth/oauth/google` | Initiate Google OAuth2 authorization flow |
| **Research Papers** | `GET` | `/research-papers` | Query & filter research papers with automatic live scholarly discovery |
| | `GET` | `/research-papers/{id}` | Retrieve complete paper metadata & citation verification |
| | `POST` | `/research-papers/import` | Multi-source batch scholarly ingestion across 13 providers |
| | `POST` | `/research-papers/analyze/{id}` | Generate AI structured analysis (problem, method, findings, gaps) |
| | `GET` | `/research-papers/recommendations/me` | Personalized paper recommendations matching user's profile |
| **Funding Intelligence** | `GET` | `/funding/recommendations/me` | AI semantic grant recommendations with pagination and sorting |
| | `POST` | `/funding/sync` | Trigger live multi-source grant harvesting (DST, NIH, CORDIS) |
| | `POST` | `/funding/save/{id}` | Save / bookmark funding opportunity |
| **Patents & IP** | `GET` | `/patents/search` | Dense vector hybrid patent search |
| | `GET` | `/patents/clusters` | Retrieve KMeans patent clusters with 2D/3D PCA spatial coordinates |
| | `POST` | `/patents/import` | Import live European Patent Office (EPO) records via SPARQL |
| | `POST` | `/patents/analyze-idea` | "Check Your Innovation" prior art and feature overlap analyzer |
| **Technology Intelligence** | `GET` | `/technologies` | Retrieve all tracked technologies with maturity & momentum metrics |
| | `GET` | `/technologies/{id}/maturity` | Detailed 6-indicator maturity analysis & stage progression |
| **Innovation Scoring** | `POST` | `/innovation/assess` | Authoritative 5-factor deterministic Innovation Score (0–100) |
| | `POST` | `/innovation/compare` | Side-by-side factor comparison of 2 to 5 technologies |
| | `POST` | `/innovation/analyze-idea` | Grounded idea evaluation with research and patent similarity |
| **Unified Dossiers** | `POST` | `/reports/generate` | Synthesize complete multi-source technology dossier |
| | `GET` | `/reports/export/{id}/pdf` | Generate and stream professional ReportLab PDF download |
| **Platform Assistant** | `POST` | `/assistant/chat` | Context-grounded conversational analyst assistant |

---

## 👥 User Roles & Personas

The platform dynamically adjusts navigation, visible modules, and dashboard layouts based on the authenticated user's assigned role:

1. **Researcher (`researcher`)**:
   - Access to paper recommendations, citation verification, AI structured paper summaries, and personalized grant matching.
2. **Startup Founder (`startup_founder`)**:
   - Focus on technology adoption velocity, commercialization readiness, prior art whitespace analysis, and non-dilutive funding programs.
3. **Innovation Manager (`innovation_manager`)**:
   - Access to portfolio-wide maturity indices, multi-technology comparative side-by-side radars, and IP landscape monitoring.
4. **Administrator (`administrator`)**:
   - Access to live multi-source provider health status, bulk corpus ingesters, user provisioning, and dataset growth statistics.

---

## 📄 License

This project is licensed under the terms of the **MIT License**. See the [LICENSE.txt](file:///d:/Intelligent-Research4/LICENSE.txt) file for details.

---

<div align="center">
  <sub>Built with ❤️ by the Intelligent Research & Innovation Intelligence Platform Team</sub>
</div>
