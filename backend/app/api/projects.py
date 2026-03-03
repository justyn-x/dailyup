from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import async_session
from app.models import LearningProject, LearningPlan, Chapter, Assessment
from app.schemas import (
    CreateProjectRequest,
    ProjectResponse,
    ProjectDetailResponse,
    PlanResponse,
    ChapterSummary,
)

router = APIRouter(prefix="/api/projects", tags=["projects"])


async def get_db():
    async with async_session() as session:
        yield session


def _compute_progress(project: LearningProject) -> float:
    """Compute progress as completed_chapters / total_chapters."""
    if not project.plan or not project.plan.chapters:
        return 0.0
    total = len(project.plan.chapters)
    completed = sum(
        1 for ch in project.plan.chapters if ch.status == "completed"
    )
    return completed / total


def _build_project_response(project: LearningProject) -> ProjectResponse:
    return ProjectResponse(
        id=project.id,
        goal=project.goal,
        background=project.background,
        skills=project.skills,
        progress=_compute_progress(project),
        created_at=project.created_at,
    )


def _build_chapter_summary(chapter: Chapter) -> ChapterSummary:
    score = None
    if chapter.assessment and chapter.assessment.score is not None:
        score = chapter.assessment.score
    return ChapterSummary(
        id=chapter.id,
        order_index=chapter.order_index,
        title=chapter.title,
        objective=chapter.objective,
        status=chapter.status,
        score=score,
    )


def _build_project_detail(project: LearningProject) -> ProjectDetailResponse:
    plan_response = None
    if project.plan:
        chapters = [
            _build_chapter_summary(ch) for ch in project.plan.chapters
        ]
        plan_response = PlanResponse(
            id=project.plan.id,
            project_id=project.plan.project_id,
            status=project.plan.status,
            chapters=chapters,
        )
    return ProjectDetailResponse(
        id=project.id,
        goal=project.goal,
        background=project.background,
        skills=project.skills,
        progress=_compute_progress(project),
        created_at=project.created_at,
        plan=plan_response,
    )


# Eager-loading options reused across queries
_project_load_options = (
    selectinload(LearningProject.plan)
    .selectinload(LearningPlan.chapters)
    .selectinload(Chapter.assessment),
)


@router.post("", response_model=ProjectResponse, status_code=201)
async def create_project(
    body: CreateProjectRequest, db: AsyncSession = Depends(get_db)
):
    project = LearningProject(
        goal=body.goal,
        background=body.background,
        skills=body.skills,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    # New project has no plan, progress is 0.0
    return ProjectResponse(
        id=project.id,
        goal=project.goal,
        background=project.background,
        skills=project.skills,
        progress=0.0,
        created_at=project.created_at,
    )


@router.get("", response_model=list[ProjectResponse])
async def list_projects(db: AsyncSession = Depends(get_db)):
    stmt = select(LearningProject).options(*_project_load_options)
    result = await db.execute(stmt)
    projects = result.scalars().all()
    return [_build_project_response(p) for p in projects]


@router.get("/{project_id}", response_model=ProjectDetailResponse)
async def get_project(project_id: int, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(LearningProject)
        .where(LearningProject.id == project_id)
        .options(*_project_load_options)
    )
    result = await db.execute(stmt)
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    return _build_project_detail(project)


@router.delete("/{project_id}", status_code=204)
async def delete_project(project_id: int, db: AsyncSession = Depends(get_db)):
    # Need to load relationships for cascade delete to work via ORM
    stmt = (
        select(LearningProject)
        .where(LearningProject.id == project_id)
        .options(*_project_load_options)
    )
    result = await db.execute(stmt)
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    await db.delete(project)
    await db.commit()
    return None
