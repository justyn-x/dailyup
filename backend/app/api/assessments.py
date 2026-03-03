import json
import logging

from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from starlette.responses import StreamingResponse

from app.database import async_session
from app.models import Assessment, Chapter, LearningMaterial
from app.schemas import (
    AssessmentResponse,
    AssessmentResultResponse,
    QuestionItem,
    ResultItem,
    SubmitAnswerRequest,
)
from app.services.ai_service import AIService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["assessments"])


@router.get("/chapters/{chapter_id}/assessment")
async def get_assessment(chapter_id: int):
    """Get existing assessment for a chapter (404 if none)."""
    async with async_session() as session:
        stmt = select(Assessment).where(Assessment.chapter_id == chapter_id)
        result = await session.execute(stmt)
        assessment = result.scalar_one_or_none()
        if not assessment:
            raise HTTPException(status_code=404, detail="该章节暂无考核")

        questions = [
            QuestionItem(**q) if isinstance(q, dict) else q
            for q in (assessment.questions or [])
        ]
        return AssessmentResponse(
            id=assessment.id,
            chapter_id=assessment.chapter_id,
            questions=questions,
            status=assessment.status,
            created_at=assessment.created_at,
        )


@router.get("/assessments/{assessment_id}/result")
async def get_assessment_result(assessment_id: int):
    """Get submitted assessment result (404 if not submitted)."""
    async with async_session() as session:
        assessment = await session.get(Assessment, assessment_id)
        if not assessment:
            raise HTTPException(status_code=404, detail="考核不存在")
        if assessment.status != "submitted":
            raise HTTPException(status_code=404, detail="该考核尚未提交")

        questions = [
            QuestionItem(**q) if isinstance(q, dict) else q
            for q in (assessment.questions or [])
        ]
        results = [
            ResultItem(**r) if isinstance(r, dict) else r
            for r in (assessment.results or [])
        ]
        return AssessmentResultResponse(
            id=assessment.id,
            chapter_id=assessment.chapter_id,
            questions=questions,
            user_answers=assessment.user_answers or [],
            results=results,
            score=assessment.score or 0.0,
            status=assessment.status,
            submitted_at=assessment.submitted_at,
        )


@router.post("/chapters/{chapter_id}/assessment")
async def generate_assessment(chapter_id: int):
    """Generate an assessment for a chapter via SSE streaming."""
    # Pre-stream validation
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
            raise HTTPException(
                status_code=404, detail="该章节暂无学习材料，请先生成学习材料"
            )

        # Delete existing assessment if any (allow regeneration)
        stmt = select(Assessment).where(Assessment.chapter_id == chapter_id)
        result = await session.execute(stmt)
        existing = result.scalar_one_or_none()
        if existing:
            await session.delete(existing)
            await session.commit()

    async def event_generator():
        try:
            ai_service = AIService()
            async with async_session() as session:
                chapter = await session.get(Chapter, chapter_id)
                stmt = select(LearningMaterial).where(
                    LearningMaterial.chapter_id == chapter_id
                )
                result = await session.execute(stmt)
                material = result.scalar_one_or_none()

                async for sse_event in ai_service.generate_assessment(
                    session, chapter, material
                ):
                    yield sse_event
        except Exception as e:
            logger.exception(
                "Error generating assessment for chapter %s", chapter_id
            )
            yield (
                f"event: error\n"
                f"data: {json.dumps({'code': 'internal_error', 'message': str(e), 'retryable': True}, ensure_ascii=False)}\n\n"
            )

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.post("/assessments/{assessment_id}/submit")
async def submit_assessment(assessment_id: int, body: SubmitAnswerRequest):
    """Submit answers for an assessment and get AI evaluation via SSE streaming."""
    # Pre-stream validation
    async with async_session() as session:
        assessment = await session.get(Assessment, assessment_id)
        if not assessment:
            raise HTTPException(status_code=404, detail="考核不存在")

        if assessment.status == "submitted":
            raise HTTPException(status_code=409, detail="该考核已提交，不能重复提交")

        # Save user answers
        assessment.user_answers = body.answers
        await session.commit()

    async def event_generator():
        try:
            ai_service = AIService()
            async with async_session() as session:
                stmt = (
                    select(Assessment)
                    .where(Assessment.id == assessment_id)
                    .options(selectinload(Assessment.chapter))
                )
                result = await session.execute(stmt)
                assessment = result.scalar_one()

                async for sse_event in ai_service.evaluate_answers(
                    session, assessment
                ):
                    yield sse_event
        except Exception as e:
            logger.exception(
                "Error evaluating assessment %s", assessment_id
            )
            yield (
                f"event: error\n"
                f"data: {json.dumps({'code': 'internal_error', 'message': str(e), 'retryable': True}, ensure_ascii=False)}\n\n"
            )

    return StreamingResponse(event_generator(), media_type="text/event-stream")
