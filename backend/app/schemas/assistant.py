from typing import Any, List, Optional
from pydantic import BaseModel, Field


class AssistantMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, description="User input message or question")
    page_context: Optional[str] = Field(default="global", description="Current frontend page route or section id")
    entity_context: Optional[dict[str, Any]] = Field(default_factory=dict, description="Active entity or selected item details")
    conversation_history: Optional[List[dict[str, str]]] = Field(default_factory=list, description="Prior conversational turns")


class AssistantAction(BaseModel):
    type: str = Field(..., description="Action type: 'navigate', 'report', 'search', 'explain', 'filter'")
    label: str = Field(..., description="Button or action label")
    route: Optional[str] = Field(default=None, description="Frontend router path if type is navigate")
    payload: Optional[dict[str, Any]] = Field(default_factory=dict, description="Action parameter payload")


class AssistantSource(BaseModel):
    category: str = Field(..., description="Entity category: 'Research', 'Patents', 'Funding', 'Technology', 'Innovation', 'Commercialization'")
    title: str = Field(..., description="Title of the source entity")
    subtitle: Optional[str] = Field(default=None, description="Metadata or brief description")
    metric: Optional[str] = Field(default=None, description="Key empirical metric")
    route: Optional[str] = Field(default=None, description="Direct navigation link")


class AssistantChatResponse(BaseModel):
    message: str = Field(..., description="Synthesized intelligent response formatted with markdown")
    intent: str = Field(..., description="Detected user intent category")
    actions: List[AssistantAction] = Field(default_factory=list, description="Interactive action and navigation buttons")
    sources: List[AssistantSource] = Field(default_factory=list, description="Direct empirical evidence & reference records")
    suggestions: List[str] = Field(default_factory=list, description="Contextual follow-up prompt suggestions")
    provider: str = Field(default="ResearchIntel Copilot Engine", description="AI Provider or Heuristic Inference Engine")
