from fastapi import APIRouter
from backend.app.services.innovation_service import (
    get_dashboard_data,
    get_innovation_opportunities
)

router = APIRouter(prefix="/innovation", tags=["Innovation Dashboard"])


@router.get("/dashboard")
def dashboard():
    return get_dashboard_data()


@router.get("/opportunities")
def opportunities():
    return get_innovation_opportunities()