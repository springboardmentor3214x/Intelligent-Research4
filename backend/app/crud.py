import uuid
from sqlalchemy.orm import Session
from backend.app.models.user import User, ResearchArea, ResearchKeyword as models
from backend.app.schemas import user as schemas

# --- Domain Update Logic ---
def update_research_domain(db: Session, user_id: uuid.UUID, domain_data: schemas.ProfileDomainUpdate):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user:
        db_user.research_domain = domain_data.research_domain
        db.commit()
        db.refresh(db_user)
    return db_user

# --- Research Areas Logic ---
def get_user_areas(db: Session, user_id: uuid.UUID):
    return db.query(models.ResearchArea).filter(models.ResearchArea.user_id == user_id).all()

def add_user_area(db: Session, area: schemas.ResearchAreaCreate, user_id: uuid.UUID):
    db_area = models.ResearchArea(name=area.name, user_id=user_id)
    db.add(db_area)
    db.commit()
    db.refresh(db_area)
    return db_area

def delete_user_area(db: Session, area_id: uuid.UUID, user_id: uuid.UUID):
    db_area = db.query(models.ResearchArea).filter(
        models.ResearchArea.id == area_id, 
        models.ResearchArea.user_id == user_id
    ).first()
    if db_area:
        db.delete(db_area)
        db.commit()
        return True
    return False

# --- Keywords Logic ---
def get_user_keywords(db: Session, user_id: uuid.UUID):
    return db.query(models.ResearchKeyword).filter(models.ResearchKeyword.user_id == user_id).all()

def add_user_keyword(db: Session, keyword: schemas.ResearchKeywordCreate, user_id: uuid.UUID):
    db_keyword = models.ResearchKeyword(keyword=keyword.keyword, user_id=user_id)
    db.add(db_keyword)
    db.commit()
    db.refresh(db_keyword)
    return db_keyword

def delete_user_keyword(db: Session, keyword_id: uuid.UUID, user_id: uuid.UUID):
    db_keyword = db.query(models.ResearchKeyword).filter(
        models.ResearchKeyword.id == keyword_id, 
        models.ResearchKeyword.user_id == user_id
    ).first()
    if db_keyword:
        db.delete(db_keyword)
        db.commit()
        return True
    return False
