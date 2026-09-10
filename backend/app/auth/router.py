from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from backend.app.auth.dependencies import get_current_user
from backend.app.auth.security import (
    create_access_token,
    hash_password,
    verify_password,
)
from backend.app.database.connection import get_db
from backend.app.models.user import User
from backend.app.schemas.user import UserCreate, UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])

ALLOWED_PUBLIC_ROLES = {"researcher", "innovator", "investor", "reviewer", "user"}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


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

    # Protect against privileged role self-assignment on public registration
    role_requested = (user_in.role or "researcher").strip().lower()
    if role_requested not in ALLOWED_PUBLIC_ROLES:
        role_requested = "researcher"

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


@router.get(
    "/oauth/google",
    summary="Initiate Google OAuth2 flow"
)
def google_oauth_login():
    """
    Redirects to Google OAuth consent screen if configured, or returns a clear message.
    """
    import os
    from fastapi.responses import RedirectResponse

    client_id = os.getenv("GOOGLE_CLIENT_ID")
    if not client_id:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth is not configured. Please sign in or register with your email and password.",
        )

    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:5173/oauth/callback")
    google_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={client_id}&response_type=code&scope=openid%20email%20profile&"
        f"redirect_uri={redirect_uri}"
    )
    return RedirectResponse(url=google_url)

