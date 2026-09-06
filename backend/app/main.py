import os
from dotenv import load_dotenv

# Ensure environment variables are loaded regardless of how uvicorn was started
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from backend.app.auth.router import router as auth_router
from backend.app.database.connection import engine
from backend.app.routers.patents import router as patents_router
from backend.app.routers.platform import router as platform_router
from backend.app.routers.profile import router as profile_router
from backend.app.routers.publications import router as publications_router
from backend.app.routers.research_details import router as research_details_router
from backend.app.routers.research_paper import router as research_paper_router

app = FastAPI(
    title="Research Funding & Innovation Intelligence Platform"
)

# Keep allowed browser origins explicit in production via CORS_ORIGINS.
origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include core application routers
app.include_router(auth_router)
app.include_router(profile_router)
app.include_router(research_details_router)
app.include_router(publications_router)
app.include_router(patents_router)
app.include_router(platform_router)
app.include_router(research_paper_router)


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

