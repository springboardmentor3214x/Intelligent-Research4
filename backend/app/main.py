from fastapi import FastAPI
from sqlalchemy import text

from app.auth.router import router as auth_router
from app.database.connection import engine

from app.routers.platform import router as platform_router

app = FastAPI(
    title="Research Funding & Innovation Intelligence Platform"
)

app.include_router(auth_router)

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
