from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.auth.dependencies import get_current_user_optional
from backend.app.database.connection import get_db
from backend.app.models.user import User
from backend.app.schemas.assistant import (
    AssistantMessageRequest,
    AssistantChatResponse,
)
from backend.app.services.assistant_service import assistant_service

router = APIRouter(
    prefix="/assistant",
    tags=["ResearchIntel AI Copilot & Assistant"],
)


@router.post("/chat", response_model=AssistantChatResponse)
def assistant_chat_endpoint(
    request: AssistantMessageRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """
    ResearchIntel Platform Copilot Chat & Intent Resolution Endpoint.
    Orchestrates real empirical search across research papers, grants, patents,
    technologies, innovation scoring, and reports with RBAC protections.
    """
    return assistant_service.process_chat_query(
        db=db,
        current_user=current_user,
        request=request,
    )