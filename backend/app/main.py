from fastapi import FastAPI
from sqlalchemy import text

from backend.app.auth.router import router as auth_router
from backend.app.routers.research_info import router as research_router
from backend.app.database.connection import engine

app = FastAPI(
    title="Research Funding & Innovation Intelligence Platform"
)

app.include_router(auth_router)
app.include_router(research_router)

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
