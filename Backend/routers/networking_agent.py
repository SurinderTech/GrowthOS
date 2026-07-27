"""
routers/networking_agent.py
Networking Agent — track outreach contacts and draft AI outreach messages.
Mounted at /agents/networking in main.py.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from Backend.db.session import get_db
from Backend.models.agents_data import Contact
from Backend.routers.auth import get_current_user
from Backend.routers.dashboard import get_user_profile
from Backend.schemas.agents_data import ContactCreate, ContactUpdate, ContactOut, DraftMessageOut
from Backend.services.agents_ai_service import draft_outreach_message

router = APIRouter(tags=["Networking Agent"])

VALID_STATUSES = {"to_reach", "contacted", "replied", "connected"}


@router.get("/", response_model=List[ContactOut])
def list_contacts(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return (
        db.query(Contact)
        .filter(Contact.user_id == current_user.id)
        .order_by(Contact.created_at.desc())
        .all()
    )


@router.post("/", response_model=ContactOut)
def create_contact(body: ContactCreate, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    contact = Contact(
        user_id=current_user.id,
        name=body.name,
        role=body.role,
        company=body.company,
        platform=body.platform,
        notes=body.notes,
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


@router.patch("/{contact_id}", response_model=ContactOut)
def update_contact(contact_id: str, body: ContactUpdate, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    contact = db.query(Contact).filter(Contact.id == contact_id, Contact.user_id == current_user.id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found.")
    if body.status and body.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"status must be one of {VALID_STATUSES}")

    for field, value in body.dict(exclude_unset=True).items():
        setattr(contact, field, value)
    db.commit()
    db.refresh(contact)
    return contact


@router.delete("/{contact_id}")
def delete_contact(contact_id: str, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    contact = db.query(Contact).filter(Contact.id == contact_id, Contact.user_id == current_user.id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found.")
    db.delete(contact)
    db.commit()
    return {"deleted": True}


@router.post("/{contact_id}/draft-message", response_model=DraftMessageOut)
def draft_message(contact_id: str, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    contact = db.query(Contact).filter(Contact.id == contact_id, Contact.user_id == current_user.id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found.")

    profile = get_user_profile(current_user.id, db)
    message = draft_outreach_message(
        {"name": contact.name, "role": contact.role, "company": contact.company, "platform": contact.platform},
        profile,
    )
    contact.last_message = message
    db.commit()
    return DraftMessageOut(message=message)
