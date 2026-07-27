"""
routers/project_agent.py
Project Agent — track build-in-progress projects from idea to shipped.
Mounted at /agents/projects in main.py.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from Backend.db.session import get_db
from Backend.models.agents_data import Project
from Backend.routers.auth import get_current_user
from Backend.schemas.agents_data import ProjectCreate, ProjectUpdate, ProjectOut

router = APIRouter(tags=["Project Agent"])

VALID_STATUSES = {"idea", "in_progress", "completed"}


@router.get("/", response_model=List[ProjectOut])
def list_projects(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return (
        db.query(Project)
        .filter(Project.user_id == current_user.id)
        .order_by(Project.created_at.desc())
        .all()
    )


@router.post("/", response_model=ProjectOut)
def create_project(body: ProjectCreate, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    if body.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"status must be one of {VALID_STATUSES}")
    project = Project(
        user_id=current_user.id,
        title=body.title,
        description=body.description,
        status=body.status,
        github_url=body.github_url,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.patch("/{project_id}", response_model=ProjectOut)
def update_project(project_id: str, body: ProjectUpdate, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    if body.status and body.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"status must be one of {VALID_STATUSES}")

    for field, value in body.dict(exclude_unset=True).items():
        setattr(project, field, value)
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}")
def delete_project(project_id: str, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    db.delete(project)
    db.commit()
    return {"deleted": True}
