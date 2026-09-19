import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from backend.app.auth.router import router as auth_router
from backend.app.database.connection import engine
from backend.app.routers.research_paper import router as research_paper_router
from backend.app.routers.funding_opportunity import router as funding_router
from backend.app.routers.patent import router as patent_router
from backend.app.routers.technology import router as technology_router

app = FastAPI(
    title="Research Funding & Innovation Intelligence Platform"
)

# Configure CORS Middleware
cors_origins_raw = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
origins = [origin.strip() for origin in cors_origins_raw.split(",") if origin.strip()]
if "*" not in origins:
    origins.extend(["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(research_paper_router)
app.include_router(funding_router)
app.include_router(patent_router)
app.include_router(technology_router)


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