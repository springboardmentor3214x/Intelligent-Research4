import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    notification_type: str
    title: str
    message: str
    related_module: str | None = None
    related_record_id: str | None = None
    priority: str
    is_read: bool
    target_url: str | None = None
    created_at: datetime


class NotificationListResponse(BaseModel):
    items: list[NotificationResponse]
    total: int
    unread_count: int


class NotificationCreateRequest(BaseModel):
    notification_type: str = Field(min_length=1, max_length=50)
    title: str = Field(min_length=1, max_length=255)
    message: str = Field(min_length=1)
    related_module: str | None = Field(default=None, max_length=100)
    related_record_id: str | None = Field(default=None, max_length=255)
    priority: str = Field(default="NORMAL", max_length=20)
    target_url: str | None = Field(default=None, max_length=500)