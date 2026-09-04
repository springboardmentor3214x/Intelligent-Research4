import uuid
import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import List

from backend.app import crud
from backend.app.models import user as models
from backend.app.schemas import user as schemas
from backend.app.database.connection import get_db 
from backend.app.auth.security import JWT_SECRET_KEY, JWT_ALGORITHM

router = APIRouter(prefix="/profile/research", tags=["Research Profile Management"])

# Setup the system token reader location point
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login") 

# --- Secure Authentication Dependency Layer ---
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Decode using the configuration parameters from auth/security.py
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        email: str = payload.get("sub") # or payload.get("email") depending on Module 1 layout
        if email is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
        
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    return user


# --- Research Domain ---
@router.put("/domain", response_model=schemas.ProfileDomainUpdate)
def update_domain(
    domain_data: schemas.ProfileDomainUpdate, 
    current_user: models.User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    crud.update_research_domain(db, user_id=current_user.id, domain_data=domain_data)
    return domain_data

# --- Research Areas ---
@router.get("/areas", response_model=List[schemas.ResearchAreaResponse])
def get_areas(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return crud.get_user_areas(db, user_id=current_user.id)

@router.post("/areas", response_model=schemas.ResearchAreaResponse)
def add_area(
    area: schemas.ResearchAreaCreate, 
    current_user: models.User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    return crud.add_user_area(db, area=area, user_id=current_user.id)

@router.delete("/areas/{area_id}")
def remove_area(
    area_id: uuid.UUID, 
    current_user: models.User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    success = crud.delete_user_area(db, area_id=area_id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Research Area not found or unauthorized")
    return {"message": "Research Area deleted successfully"}

# --- Research Keywords ---
@router.get("/keywords", response_model=List[schemas.ResearchKeywordResponse])
def get_keywords(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return crud.get_user_keywords(db, user_id=current_user.id)

@router.post("/keywords", response_model=schemas.ResearchKeywordResponse)
def add_keyword(
    keyword: schemas.ResearchKeywordCreate, 
    current_user: models.User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    return crud.add_user_keyword(db, keyword=keyword, user_id=current_user.id)

@router.delete("/keywords/{keyword_id}")
def remove_keyword(
    keyword_id: uuid.UUID, 
    current_user: models.User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    success = crud.delete_user_keyword(db, keyword_id=keyword_id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Keyword not found or unauthorized")
    return {"message": "Keyword deleted successfully"}
