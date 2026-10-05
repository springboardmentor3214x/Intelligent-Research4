import os
from dotenv import load_dotenv

# Ensure environment variables are loaded regardless of how uvicorn was started
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from backend.app.auth.router import router as auth_router
from backend.app.database.connection import engine

from backend.app.routers.funding_opportunity import (
    router as funding_router,
)
from backend.app.routers.patent import router as patent_router
from backend.app.routers.patents import router as profile_patents_router
from backend.app.routers.platform import router as platform_router
from backend.app.routers.profile import router as profile_router
from backend.app.routers.publications import router as publications_router
from backend.app.routers.research_details import (
    router as research_details_router,
)
from backend.app.routers.research_paper import (
    router as research_paper_router,
)

# Module 6 - Technology Intelligence
from backend.app.routers.technology import (
    router as technology_router,
)

# Module 8 - Commercialization Intelligence
from backend.app.routers.commercialization import (
    router as commercialization_router,
)

from backend.app.routers import innovation_scoring


app = FastAPI(
    title="Research Funding & Innovation Intelligence Platform"
)


# ---------------------------------------------------------
# CORS configuration
# ---------------------------------------------------------

default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

env_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "").split(",")
    if origin.strip()
]

origins = list(set(default_origins + env_origins))


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------
# Include application routers
# ---------------------------------------------------------

# Authentication
app.include_router(auth_router)

# User profile
app.include_router(profile_router)

# Research details
app.include_router(research_details_router)

# Publications
app.include_router(publications_router)

# Profile patents
app.include_router(profile_patents_router)

# Research papers
app.include_router(research_paper_router)

# Module 4 - Funding Intelligence
app.include_router(funding_router)

# Module 5 - Patent Intelligence
app.include_router(patent_router)

# Module 6 - Technology Intelligence
app.include_router(technology_router)

# Module 8 - Commercialization Intelligence
app.include_router(commercialization_router)

# Platform
app.include_router(platform_router)

# Innovation scoring
app.include_router(innovation_scoring.router)


# ---------------------------------------------------------
# Root endpoint
# ---------------------------------------------------------

@app.get("/")
def root():
    return {
        "message": "Research Funding & Innovation Intelligence Platform API"
    }


# ---------------------------------------------------------
# Database health check
# ---------------------------------------------------------

@app.get("/health/database")
def database_health():
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))

        return {
            "database": "connected",
            "test": result.scalar(),
        }
