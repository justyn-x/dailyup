"""Context Builder for AI Agent prompts.

Builds LLM prompt context with project-level memory by querying the
database for learning trajectory data (completed chapters, scores,
weak areas).
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import (
    Assessment,
    Chapter,
    LearningMaterial,
    LearningPlan,
    LearningProject,
)

# Score threshold below which a chapter is considered a weak area
WEAK_SCORE_THRESHOLD = 0.7


class ContextBuilder:
    """Builds LLM prompt context with project-level memory from DB."""

    async def build_learning_memory(
        self, session: AsyncSession, project: LearningProject
    ) -> dict:
        """Query DB for the project's learning trajectory.

        Returns:
            Dict with keys:
            - completed_chapters: list of {title, score} for completed chapters
            - weak_areas: list of chapter titles with score < threshold
            - current_progress: float (0-1) representing completion ratio
        """
        # Load the plan with chapters and assessments
        stmt = (
            select(LearningPlan)
            .where(LearningPlan.project_id == project.id)
            .options(
                selectinload(LearningPlan.chapters).selectinload(
                    Chapter.assessment
                )
            )
        )
        result = await session.execute(stmt)
        plan = result.scalar_one_or_none()

        if not plan or not plan.chapters:
            return {
                "completed_chapters": [],
                "weak_areas": [],
                "current_progress": 0.0,
            }

        total_chapters = len(plan.chapters)
        completed_chapters = []
        weak_areas = []

        for chapter in plan.chapters:
            if chapter.status == "completed":
                score = None
                if chapter.assessment and chapter.assessment.score is not None:
                    score = chapter.assessment.score
                completed_chapters.append(
                    {"title": chapter.title, "score": score}
                )
                if score is not None and score < WEAK_SCORE_THRESHOLD:
                    weak_areas.append(chapter.title)

        current_progress = (
            len(completed_chapters) / total_chapters if total_chapters > 0 else 0.0
        )

        return {
            "completed_chapters": completed_chapters,
            "weak_areas": weak_areas,
            "current_progress": current_progress,
        }

    def build_plan_context(self, project: LearningProject) -> dict:
        """Assemble context for plan generation.

        Returns:
            Dict with keys: goal, background, skills.
        """
        return {
            "goal": project.goal,
            "background": project.background or "",
            "skills": project.skills or "",
        }

    async def build_material_context(
        self,
        session: AsyncSession,
        chapter: Chapter,
        project: LearningProject,
    ) -> dict:
        """Assemble context for material generation.

        Includes learning memory for personalization.

        Returns:
            Dict with keys: chapter_title, chapter_objective, project_goal,
            user_background, user_skills, learning_memory.
        """
        learning_memory = await self.build_learning_memory(session, project)

        return {
            "chapter_title": chapter.title,
            "chapter_objective": chapter.objective or "",
            "project_goal": project.goal,
            "user_background": project.background or "",
            "user_skills": project.skills or "",
            "learning_memory": learning_memory,
        }

    async def build_assessment_context(
        self,
        session: AsyncSession,
        chapter: Chapter,
        material: LearningMaterial,
        project: LearningProject,
    ) -> dict:
        """Assemble context for assessment generation.

        Includes learning memory to adjust difficulty.

        Returns:
            Dict with keys: chapter_title, chapter_objective,
            material_summary, user_background, learning_memory.
        """
        learning_memory = await self.build_learning_memory(session, project)

        # Use the first ~2000 chars of material as summary to stay within
        # context limits while still giving the LLM enough content to
        # generate relevant questions.
        content = material.content or ""
        material_summary = content[:2000]
        if len(content) > 2000:
            material_summary += "\n\n...（材料内容已截断）"

        return {
            "chapter_title": chapter.title,
            "chapter_objective": chapter.objective or "",
            "material_summary": material_summary,
            "user_background": project.background or "",
            "learning_memory": learning_memory,
        }

    def build_evaluation_context(self, assessment: Assessment) -> dict:
        """Assemble context for answer evaluation.

        Returns:
            Dict with keys: questions, user_answers, chapter_context.
        """
        questions = assessment.questions if assessment.questions else []
        user_answers = assessment.user_answers if assessment.user_answers else []

        # Build a brief chapter context string from the assessment's chapter
        chapter_context = ""
        if assessment.chapter:
            chapter_context = (
                f"章节：{assessment.chapter.title}\n"
                f"学习目标：{assessment.chapter.objective or ''}"
            )

        return {
            "questions": questions,
            "user_answers": user_answers,
            "chapter_context": chapter_context,
        }
