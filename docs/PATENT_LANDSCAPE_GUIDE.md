# Patent Landscape & Semantic Clustering Module Documentation

## Overview
The Patent Landscape & Semantic Clustering module retrieves, structures, embeds, and clusters genuine live patent records from international intellectual property repositories—primarily the **European Patent Office (EPO)** via Open Patent Services / Linked Data SPARQL endpoints—and projects them into interactive **2D / 3D PCA semantic spaces**.

---

## 1. Free Patent Data Sources & Setup
### Primary Provider: European Patent Office (EPO) Linked Data & SPARQL
- **Endpoint**: `https://data.epo.org/linked-data/query`
- **Cost**: Completely free, public, no credit card or paid tier required.
- **Authentication**: By default, EPO Linked Data SPARQL requires no API key or token.
- **Optional EPO OPS OAuth Credentials**:
  If you have an official EPO OPS developer account:
  ```env
  EPO_OPS_CONSUMER_KEY=your_epo_consumer_key_here
  EPO_OPS_CONSUMER_SECRET=your_epo_consumer_secret_here
  ```
  *(Even without these credentials, the system automatically uses the free SPARQL Linked Data endpoint.)*

### Retrieved Fields per Patent Record:
- `publication_number`: Short normalized identifier (e.g. `EP 2690552 A1`)
- `title`: English title of the invention
- `abstract`: Complete English abstract text
- `assignee`: Primary applicant / corporate assignee
- `inventors`: Inventor names
- `filing_date`: Date of application filing
- `publication_date`: Official publication date
- `classification`: International Patent Classification (IPC) codes
- `technology_domain`: Search keyword domain
- `citation_count`: Number of cited patent publications
- `source`: `"EPO"`
- `official_link`: Permanent URI link to official publication record

---

## 2. Live Ingestion & Scaling (5 to 1,000 Patents)
- The user can select to import batches of **5, 50, 100, 500, or 1,000 genuine patents**.
- Ingestion uses **multi-threaded concurrent workers** (`ThreadPoolExecutor`) with non-blocking HTTP requests (`httpx`) to ensure fast imports without timeouts.
- **Deduplication**: Automatically deduplicates against existing records using `(source, source_id)` and `publication_number`.

---

## 3. Real Semantic Clustering & Dimensionality Reduction
- **Embedding Model**: `sentence-transformers/all-MiniLM-L6-v2` (384-dimensional dense semantic vectors with L2 normalization).
- **Clustering Algorithm**: Dynamic $K$-Means clustering with silhouette score optimization (evaluated using cosine distance).
- **Cluster Label Generation**: TF-IDF keyword extraction and frequency analysis of cluster titles & abstracts.
- **Spatial Projections**:
  - **2D PCA**: Principal components 1 and 2 normalized for 2D semantic maps.
  - **3D PCA**: Principal components 1, 2, and 3 centered for WebGL / Three.js 3D landscape navigation.

---

## 4. Innovation Idea Analyzer ("Check Your Innovation")
- Allows researchers to enter a project or startup description.
- Computes exact cosine similarity scores against all database patents.
- Identifies feature overlap, potential white space / innovation gaps, and strategic differentiation directions.
- **Disclaimer**: Similarity scores represent textual/semantic similarity and do not constitute formal legal opinions or freedom-to-operate determinations.

---

## 5. Startup and Testing Instructions
### Backend:
```bash
# Run unit tests
python -m pytest backend/tests_patent_clustering.py
```

### Frontend:
```bash
cd frontend
npm run dev
```
