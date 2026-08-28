import os
from dotenv import load_dotenv

# Ensure environment variables are loaded regardless of how uvicorn was started
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from backend.app.auth.router import router as auth_router
from backend.app.database.connection import engine

app = FastAPI(
    title="Research Funding & Innovation Intelligence Platform"
)

# Keep allowed browser origins explicit in production via CORS_ORIGINS.
origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)


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
