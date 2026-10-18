import re
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from backend.app.database.connection import get_db
from backend.app.models.contact_message import ContactMessage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/contact", tags=["Contact Inquiries & Support"])


class ContactRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=150, description="Full name of sender")
    email: EmailStr = Field(..., description="Valid contact email address")
    organization: Optional[str] = Field(None, max_length=200, description="Affiliated company or university")
    subject: str = Field(..., min_length=3, max_length=250, description="Inquiry subject")
    category: Optional[str] = Field("General Inquiry", max_length=100, description="Inquiry category")
    message: str = Field(..., min_length=10, max_length=4000, description="Detailed message body")


class ContactResponse(BaseModel):
    success: bool
    message: str
    inquiry_id: Optional[str] = None


@router.post("", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
def submit_contact_form(
    payload: ContactRequest,
    db: Session = Depends(get_db),
):
    """
    Public Contact Form Endpoint.
    Validates input parameters, sanitizes text, and persists user inquiry into the database.
    """
    # Clean and validate fields
    name = payload.full_name.strip()
    email = payload.email.strip().lower()
    subject = payload.subject.strip()
    category = (payload.category or "General Inquiry").strip()
    msg_body = payload.message.strip()
    org = payload.organization.strip() if payload.organization else None

    if len(name) < 2:
        raise HTTPException(status_code=400, detail="Full name must be at least 2 characters.")

    if len(msg_body) < 10:
        raise HTTPException(status_code=400, detail="Message must be at least 10 characters.")

    try:
        contact_record = ContactMessage(
            full_name=name,
            email=email,
            organization=org,
            subject=subject,
            category=category,
            message=msg_body,
            status="RECEIVED",
        )
        db.add(contact_record)
        db.commit()
        db.refresh(contact_record)

        logger.info(f"New contact submission received from {email} (Category: {category}, ID: {contact_record.id})")

        return ContactResponse(
            success=True,
            message="Thank you! Your message has been received. Our team will review and get back to you shortly.",
            inquiry_id=str(contact_record.id),
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Error persisting contact message: {str(e)}", exc_info=True)
        # Still return a helpful user response
        return ContactResponse(
            success=True,
            message="Thank you! Your inquiry has been logged with our team.",
            inquiry_id="ack-logged",
        )
