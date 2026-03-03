import json
import logging

from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from starlette.responses import StreamingResponse

from app.database import async_session
from app.models import Chapter, LearningMaterial, LearningPlan, LearningProject
from app.schemas import ChapterResponse, MaterialResponse
from app.services.ai_service import AIService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["chapters"])


@router.get("/chapters/{chapter_id}", response_model=ChapterResponse)
async def get_chapter(chapter_id: int):
    """Get chapter details by ID."""
    async with async_session() as session:
        chapter = await session.get(Chapter, chapter_id)
        if not chapter:
            raise HTTPException(status_code=404, detail="章节不存在")

        return ChapterResponse(
            id=chapter.id,
            plan_id=chapter.plan_id,
            order_index=chapter.order_index,
            title=chapter.title,
            objective=chapter.objective,
            status=chapter.status,
            created_at=chapter.created_at,
        )


@router.get("/chapters/{chapter_id}/material", response_model=MaterialResponse)
async def get_material(chapter_id: int):
    """Get the learning material for a chapter."""
    async with async_session() as session:
        chapter = await session.get(Chapter, chapter_id)
        if not chapter:
            raise HTTPException(status_code=404, detail="章节不存在")

        stmt = select(LearningMaterial).where(
            LearningMaterial.chapter_id == chapter_id
        )
        result = await session.execute(stmt)
        material = result.scalar_one_or_none()
        if not material:
            raise HTTPException(status_code=404, detail="该章节暂无学习材料")

        return MaterialResponse(
            id=material.id,
            chapter_id=material.chapter_id,
            content=material.content,
            created_at=material.created_at,
        )


async def _get_chapter_with_project(session, chapter_id: int):
    """Helper to load a chapter along with its parent project."""
    stmt = (
        select(Chapter)
        .where(Chapter.id == chapter_id)
        .options(selectinload(Chapter.plan).selectinload(LearningPlan.project))
    )
    result = await session.execute(stmt)
    chapter = result.scalar_one_or_none()
    if not chapter:
        raise HTTPException(status_code=404, detail="章节不存在")
    project = chapter.plan.project
    return chapter, project


@router.post("/chapters/{chapter_id}/material/generate")
async def generate_material(chapter_id: int):
    """Generate learning material for a chapter via SSE streaming."""
    # Pre-stream validation
    async with async_session() as session:
        chapter, project = await _get_chapter_with_project(session, chapter_id)
        chapter.status = "learning"
        await session.commit()

    async def event_generator():
        try:
            ai_service = AIService()
            async with async_session() as session:
                chapter, project = await _get_chapter_with_project(
                    session, chapter_id
                )
                async for sse_event in ai_service.generate_material(
                    session, chapter, project
                ):
                    yield sse_event
        except Exception as e:
            logger.exception(
                "Error generating material for chapter %s", chapter_id
            )
            yield (
                f"event: error\n"
                f"data: {json.dumps({'code': 'internal_error', 'message': str(e), 'retryable': True}, ensure_ascii=False)}\n\n"
            )

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.post("/chapters/{chapter_id}/material/regenerate")
async def regenerate_material(chapter_id: int):
    """Regenerate learning material for a chapter via SSE streaming."""
    # Pre-stream validation
    async with async_session() as session:
        chapter, project = await _get_chapter_with_project(session, chapter_id)

    async def event_generator():
        try:
            ai_service = AIService()
            async with async_session() as session:
                chapter, project = await _get_chapter_with_project(
                    session, chapter_id
                )
                async for sse_event in ai_service.regenerate_material(
                    session, chapter, project
                ):
                    yield sse_event
        except Exception as e:
            logger.exception(
                "Error regenerating material for chapter %s", chapter_id
            )
            yield (
                f"event: error\n"
                f"data: {json.dumps({'code': 'internal_error', 'message': str(e), 'retryable': True}, ensure_ascii=False)}\n\n"
            )

    return StreamingResponse(event_generator(), media_type="text/event-stream")
