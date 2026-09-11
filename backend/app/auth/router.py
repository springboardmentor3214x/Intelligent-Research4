import os
import secrets
import logging
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from starlette.responses import RedirectResponse

from backend.app.auth.dependencies import get_current_user, require_roles
from backend.app.auth.security import (
    create_access_token,
    hash_password,
    verify_password,
)
from backend.app.database.connection import get_db
from backend.app.models.user import User
from backend.app.schemas.user import UserCreate, UserResponse, UserUpdate

router = APIRouter(prefix="/auth", tags=["Authentication"])
logger = logging.getLogger(__name__)

# Administrators must be provisioned by an existing administrator, never by public sign-up.
ALLOWED_PUBLIC_ROLES = {"researcher", "startup_founder", "innovation_manager", "innovator", "investor", "reviewer", "user"}

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


def _google_settings() -> tuple[str, str, str, str]:
    """Read OAuth credentials only from the environment, never from source."""
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    if not all((client_id, client_secret, redirect_uri)):
        raise HTTPException(status_code=503, detail="Google sign-in is not configured")
    return client_id, client_secret, redirect_uri, frontend_url.rstrip("/")


@router.get("/oauth/google", summary="Start Google OAuth2 login")
def google_login() -> RedirectResponse:
    client_id, _, redirect_uri, _ = _google_settings()
    state = secrets.token_urlsafe(32)
    query = urlencode({
        "client_id": client_id, "redirect_uri": redirect_uri, "response_type": "code",
        "scope": "openid email profile", "state": state, "prompt": "select_account",
    })
    response = RedirectResponse(f"{GOOGLE_AUTH_URL}?{query}")
    # The state cookie binds the callback to the browser that initiated sign-in.
    response.set_cookie("oauth_google_state", state, max_age=600, httponly=True, secure=redirect_uri.startswith("https"), samesite="lax")
    return response


@router.get("/oauth/google/callback", summary="Complete Google OAuth2 login")
async def google_callback(request: Request, code: str, state: str, db: Session = Depends(get_db)) -> RedirectResponse:
    client_id, client_secret, redirect_uri, frontend_url = _google_settings()
    if not secrets.compare_digest(state, request.cookies.get("oauth_google_state", "")):
        raise HTTPException(status_code=400, detail="Invalid OAuth state")
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            token_response = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "code": code,
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
            if token_response.is_error:
                logger.error("Google token exchange error status %s: %s", token_response.status_code, token_response.text)
            token_response.raise_for_status()
            user_response = await client.get(GOOGLE_USERINFO_URL, headers={"Authorization": f"Bearer {token_response.json()['access_token']}"})
            if user_response.is_error:
                logger.error("Google userinfo error status %s: %s", user_response.status_code, user_response.text)
            user_response.raise_for_status()
    except (httpx.HTTPError, KeyError) as error:
        # Keep the browser message generic, but retain provider diagnostics in server logs.
        logger.warning("Google OAuth verification failed: %s", error)
        raise HTTPException(status_code=401, detail="Google sign-in could not be verified")
    identity = user_response.json()
    email = str(identity.get("email", "")).strip().lower()
    if not email or not identity.get("email_verified"):
        raise HTTPException(status_code=401, detail="Google account email is not verified")
    user = db.query(User).filter(User.email.ilike(email)).first()
    if not user:
        # A random unusable password preserves the existing non-null database schema.
        user = User(name=str(identity.get("name") or email.split("@", 1)[0]), email=email, password_hash=hash_password(secrets.token_urlsafe(48)), role="researcher")
        db.add(user); db.commit(); db.refresh(user)
    token = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role})
    response = RedirectResponse(f"{frontend_url}/oauth/callback?{urlencode({'token': token})}")
    response.delete_cookie("oauth_google_state")
    return response


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user"
)
def register(user_in: UserCreate, db: Session = Depends(get_db)) -> User:
    """
    Register a new user account.
    
    - Validates email uniqueness.
    - Hashes password securely using Argon2 (pwdlib).
    - Prevents unprivileged self-assignment of admin roles during public registration.
    - Persists user into PostgreSQL database.
    - Returns sanitized user details without password/hash.
    """
    normalized_email = user_in.email.strip().lower()

    # Check if email is already registered
    existing_user = db.query(User).filter(User.email.ilike(normalized_email)).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Protect against privileged role self-assignment on public registration.
    role_requested = (user_in.role or "researcher").strip().lower()
    if role_requested == "administrator":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrator accounts must be provisioned by the platform")
    if role_requested not in ALLOWED_PUBLIC_ROLES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid user role")

    # Hash the password
    hashed_password = hash_password(user_in.password)

    # Create new User model instance
    db_user = User(
        name=user_in.name.strip(),
        email=normalized_email,
        password_hash=hashed_password,
        role=role_requested,
        phone_number=user_in.phone_number,
        organization=user_in.organization,
        department=user_in.department,
        designation=user_in.designation,
        country=user_in.country,
        research_domain=user_in.research_domain,
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return db_user


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="User login and JWT token generation"
)
def login(
    credentials: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
) -> TokenResponse:
    """
    Authenticate user with OAuth2 password request form (username treated as email) and password, returning a JWT access token.
    """
    normalized_email = credentials.username.strip().lower()

    # Retrieve user by email
    user = db.query(User).filter(User.email.ilike(normalized_email)).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # JWT payload claims
    token_payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
    }

    access_token = create_access_token(data=token_payload)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer"
    )


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current authenticated user profile"
)
def get_me(current_user: User = Depends(get_current_user)) -> User:
    """
    Retrieve the profile of the currently authenticated user using the JWT Bearer token.
    """
    return current_user


@router.put("/me", response_model=UserResponse, summary="Update current authenticated user profile")
def update_me(profile_in: UserUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> User:
    """Update only the authenticated user's own basic profile fields."""
    updates = profile_in.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Provide at least one profile field to update")
    for field, value in updates.items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/admin/access-check", summary="Administrator-only authorization check")
def administrator_access_check(current_user: User = Depends(require_roles("administrator"))) -> dict[str, str]:
    """A protected endpoint used to verify server-side administrator authorization."""
    return {"message": f"Administrator access granted for {current_user.email}"}

