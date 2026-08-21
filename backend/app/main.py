from fastapi import FastAPI
from sqlalchemy import text

from backend.app.database.connection import engine

app = FastAPI(
    title="Research Funding & Innovation Intelligence Platform"
)


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