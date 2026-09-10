from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from backend.app.auth.router import router as auth_router
from backend.app.database.connection import engine
from backend.app.routers.funding_opportunity import (
    router as funding_router,
)
from backend.app.routers.patent import router as patent_router
from backend.app.routers.platform import router as platform_router
from backend.app.routers.profile import router as profile_router
from backend.app.routers.publications import router as publications_router
from backend.app.routers.research_details import router as research_details_router
from backend.app.routers.research_paper import router as research_paper_router

app = FastAPI(
    title="Research Funding & Innovation Intelligence Platform"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(profile_router)
app.include_router(research_details_router)
app.include_router(publications_router)
app.include_router(research_paper_router)
app.include_router(funding_router)
app.include_router(patent_router)
app.include_router(platform_router)


@app.get("/")
def root():
    return {
        "message": "Research Funding & Innovation Intelligence Platform API"
    }


@app.get("/health/database")
def database_health():
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        return {
            "database": "connected",
            "test": result.scalar()
        }