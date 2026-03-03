"""Tests for progress calculation (P8) and deletion cascade (P9)."""

import pytest
from hypothesis import strategies as st

from app.models import (
    LearningProject, LearningPlan, Chapter,
    LearningMaterial, Assessment,
)

pytestmark = pytest.mark.asyncio


async def _create_project_with_chapters(test_db, statuses):
    async with test_db() as session:
        project = LearningProject(goal="Progress test")
        session.add(project)
        await session.flush()
        plan = LearningPlan(project_id=project.id, status="completed")
        session.add(plan)
        await session.flush()
        for i, status in enumerate(statuses):
            session.add(Chapter(plan_id=plan.id, order_index=i, title=f"Ch{i}", objective=f"Obj{i}", status=status))
        await session.commit()
        return project.id


# ── Property P8: Progress percentage calculation ─────────────────────────

async def test_p8_progress_calculation(client, test_db):
    """Feature: dailyup-learning-app, Property 8: Progress percentage calculation."""
    statuses_strategy = st.lists(
        st.sampled_from(["not_started", "learning", "completed"]),
        min_size=1, max_size=15,
    )
    for _ in range(100):
        statuses = statuses_strategy.example()
        project_id = await _create_project_with_chapters(test_db, statuses)
        resp = await client.get(f"/api/projects/{project_id}")
        assert resp.status_code == 200
        expected = sum(1 for s in statuses if s == "completed") / len(statuses)
        assert abs(resp.json()["progress"] - expected) < 1e-9


# ── Property P9: Project deletion cascade ────────────────────────────────

async def test_p9_deletion_cascade(client, test_db):
    """Feature: dailyup-learning-app, Property 9: Project deletion cascade."""
    for _ in range(50):
        num_chapters = st.integers(min_value=1, max_value=4).example()
        has_material = st.booleans().example()
        has_assessment = st.booleans().example()

        async with test_db() as session:
            project = LearningProject(goal="Cascade test")
            session.add(project)
            await session.flush()
            plan = LearningPlan(project_id=project.id, status="completed")
            session.add(plan)
            await session.flush()

            chapter_ids, material_ids, assessment_ids = [], [], []
            for i in range(num_chapters):
                ch = Chapter(plan_id=plan.id, order_index=i, title=f"Ch{i}", objective=f"O{i}")
                session.add(ch)
                await session.flush()
                chapter_ids.append(ch.id)
                if has_material:
                    m = LearningMaterial(chapter_id=ch.id, content=f"C{i}")
                    session.add(m)
                    await session.flush()
                    material_ids.append(m.id)
                if has_assessment:
                    a = Assessment(chapter_id=ch.id, questions=[{"type": "fill_blank", "question": "Q", "correct_answer": "A"}], status="generated")
                    session.add(a)
                    await session.flush()
                    assessment_ids.append(a.id)
            await session.commit()
            pid, plid = project.id, plan.id

        assert (await client.delete(f"/api/projects/{pid}")).status_code == 204

        async with test_db() as session:
            assert (await session.get(LearningProject, pid)) is None
            assert (await session.get(LearningPlan, plid)) is None
            for cid in chapter_ids:
                assert (await session.get(Chapter, cid)) is None
            for mid in material_ids:
                assert (await session.get(LearningMaterial, mid)) is None
            for aid in assessment_ids:
                assert (await session.get(Assessment, aid)) is None
