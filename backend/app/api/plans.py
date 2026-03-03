import json
import logging

from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from starlette.responses import StreamingResponse

from app.database import async_session
from app.models import LearningProject, LearningPlan, Chapter
from app.schemas import PlanResponse, ChapterSummary
from app.services.ai_service import AIService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["plans"])


@router.post("/projects/{project_id}/plan")
async def generate_plan(project_id: int):
    """Generate a learning plan for the project via SSE streaming."""
    # Pre-stream validation
    async with async_session() as session:
        project = await session.get(LearningProject, project_id)
        if not project:
            raise HTTPException(status_code=404, detail="项目不存在")

        stmt = select(LearningPlan).where(LearningPlan.project_id == project_id)
        result = await session.execute(stmt)
        existing_plan = result.scalar_one_or_none()
        if existing_plan:
            raise HTTPException(status_code=409, detail="该项目已有学习计划")

    async def event_generator():
        try:
            ai_service = AIService()
            async with async_session() as session:
                project = await session.get(LearningProject, project_id)
                async for sse_event in ai_service.generate_learning_plan(
                    session, project
                ):
                    yield sse_event
        except Exception as e:
            logger.exception("Error generating plan for project %s", project_id)
            yield (
                f"event: error\n"
                f"data: {json.dumps({'code': 'internal_error', 'message': str(e), 'retryable': True}, ensure_ascii=False)}\n\n"
            )

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/projects/{project_id}/plan", response_model=PlanResponse)
async def get_plan(project_id: int):
    """Get the learning plan with chapters for a project."""
    async with async_session() as session:
        project = await session.get(LearningProject, project_id)
        if not project:
            raise HTTPException(status_code=404, detail="项目不存在")

        stmt = (
            select(LearningPlan)
            .where(LearningPlan.project_id == project_id)
            .options(
                selectinload(LearningPlan.chapters).selectinload(Chapter.assessment)
            )
        )
        result = await session.execute(stmt)
        plan = result.scalar_one_or_none()
        if not plan:
            raise HTTPException(status_code=404, detail="该项目暂无学习计划")

        chapters = [
            ChapterSummary(
                id=ch.id,
                order_index=ch.order_index,
                title=ch.title,
                objective=ch.objective,
                status=ch.status,
                score=ch.assessment.score if ch.assessment else None,
            )
            for ch in plan.chapters
        ]

        return PlanResponse(
            id=plan.id,
            project_id=plan.project_id,
            status=plan.status,
            chapters=chapters,
        )
