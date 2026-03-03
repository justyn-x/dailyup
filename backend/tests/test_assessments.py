"""Tests for the assessments API — P5, P6, P7 property tests + unit tests."""

import json
import pytest
from datetime import datetime
from hypothesis import strategies as st
from unittest.mock import patch

from app.models import (
    LearningProject, LearningPlan, Chapter,
    LearningMaterial, Assessment,
)

pytestmark = pytest.mark.asyncio


async def _create_chapter_with_material(test_db):
    async with test_db() as session:
        project = LearningProject(goal="Assessment test")
        session.add(project)
        await session.flush()
        plan = LearningPlan(project_id=project.id, status="completed")
        session.add(plan)
        await session.flush()
        chapter = Chapter(plan_id=plan.id, order_index=0, title="Ch", objective="Obj", status="learning")
        session.add(chapter)
        await session.flush()
        material = LearningMaterial(chapter_id=chapter.id, content="Study this.")
        session.add(material)
        await session.commit()
        return {"project_id": project.id, "chapter_id": chapter.id, "material_id": material.id}


async def _create_assessment(test_db, chapter_id, questions, status="generated"):
    async with test_db() as session:
        a = Assessment(chapter_id=chapter_id, questions=questions, status=status)
        session.add(a)
        await session.commit()
        return a.id


# ── Hypothesis strategies ────────────────────────────────────────────────

choice_q = st.fixed_dictionaries({
    "type": st.just("choice"),
    "question": st.text(min_size=1, max_size=100).filter(lambda s: s.strip()),
    "options": st.lists(st.text(min_size=1, max_size=30).filter(lambda s: s.strip()), min_size=2, max_size=4),
    "correct_answer": st.text(min_size=1, max_size=30).filter(lambda s: s.strip()),
    "explanation": st.text(max_size=100),
})

other_q = st.fixed_dictionaries({
    "type": st.sampled_from(["fill_blank", "short_answer"]),
    "question": st.text(min_size=1, max_size=100).filter(lambda s: s.strip()),
    "correct_answer": st.text(min_size=1, max_size=50).filter(lambda s: s.strip()),
    "explanation": st.text(max_size=100),
})

questions_strategy = st.lists(st.one_of(choice_q, other_q), min_size=1, max_size=4)


# ── Property P5: Assessment structure invariant ──────────────────────────

async def test_p5_assessment_structure(client, test_db):
    """Feature: dailyup-learning-app, Property 5: Assessment structure invariant."""
    for _ in range(100):
        questions = questions_strategy.example()
        ids = await _create_chapter_with_material(test_db)
        await _create_assessment(test_db, ids["chapter_id"], questions)

        resp = await client.get(f"/api/chapters/{ids['chapter_id']}/assessment")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["questions"]) >= 1
        for q in data["questions"]:
            assert q["type"] in ("choice", "fill_blank", "short_answer")
            assert q["question"].strip()
            assert q["correct_answer"].strip()
            if q["type"] == "choice":
                assert len(q.get("options", [])) >= 1


# ── Property P6: Evaluation completeness ─────────────────────────────────

async def test_p6_evaluation_completeness(client, test_db):
    """Feature: dailyup-learning-app, Property 6: Evaluation completeness."""
    score_strategy = st.floats(min_value=0.0, max_value=1.0, allow_nan=False)

    for _ in range(100):
        questions = questions_strategy.example()
        score = score_strategy.example()
        ids = await _create_chapter_with_material(test_db)

        user_answers = [f"ans_{i}" for i in range(len(questions))]
        results = [
            {"correct": i % 2 == 0, "correct_answer": q["correct_answer"], "explanation": "Explained."}
            for i, q in enumerate(questions)
        ]

        async with test_db() as session:
            a = Assessment(
                chapter_id=ids["chapter_id"], questions=questions,
                user_answers=user_answers, results=results,
                score=score, status="submitted", submitted_at=datetime.now(),
            )
            session.add(a)
            await session.commit()
            aid = a.id

        resp = await client.get(f"/api/assessments/{aid}/result")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["results"]) == len(data["questions"])
        for r in data["results"]:
            assert isinstance(r["correct"], bool)
            assert r["correct_answer"].strip()
            assert r["explanation"].strip()
        assert 0.0 <= data["score"] <= 1.0


# ── Property P7: Chapter status transition ───────────────────────────────

async def test_p7_chapter_status_transition(client, test_db):
    """Feature: dailyup-learning-app, Property 7: Chapter status transition on submission."""
    for _ in range(20):  # fewer iterations since this involves mocking SSE
        questions = questions_strategy.example()
        ids = await _create_chapter_with_material(test_db)
        assessment_id = await _create_assessment(test_db, ids["chapter_id"], questions)
        user_answers = [f"ans_{i}" for i in range(len(questions))]

        async def mock_evaluate(self, session, assessment):
            from sqlalchemy import select
            from sqlalchemy.orm import selectinload
            stmt = select(Assessment).where(Assessment.id == assessment.id).options(selectinload(Assessment.chapter))
            result = await session.execute(stmt)
            a = result.scalar_one()
            a.results = [{"correct": True, "correct_answer": q["correct_answer"], "explanation": "OK"} for q in a.questions]
            a.score = 1.0
            a.status = "submitted"
            a.submitted_at = datetime.now()
            if a.chapter:
                a.chapter.status = "completed"
            await session.commit()
            yield f'event: done\ndata: {json.dumps({"full_result": {"score": 1.0}, "saved": True})}\n\n'

        with patch("app.services.ai_service.AIService.evaluate_answers", mock_evaluate):
            resp = await client.post(f"/api/assessments/{assessment_id}/submit", json={"answers": user_answers})
            assert resp.status_code == 200

        ch_resp = await client.get(f"/api/chapters/{ids['chapter_id']}")
        assert ch_resp.json()["status"] == "completed"


# ── Unit tests ───────────────────────────────────────────────────────────

async def test_generate_assessment_with_mock(client, test_db):
    ids = await _create_chapter_with_material(test_db)
    test_questions = [{"type": "choice", "question": "1+1?", "options": ["1", "2"], "correct_answer": "2", "explanation": "Math."}]

    async def mock_gen(self, session, chapter, material):
        a = Assessment(chapter_id=chapter.id, questions=test_questions, status="generated")
        session.add(a)
        await session.commit()
        await session.refresh(a)
        yield f'event: done\ndata: {json.dumps({"full_result": {"id": a.id}, "saved": True})}\n\n'

    with patch("app.services.ai_service.AIService.generate_assessment", mock_gen):
        resp = await client.post(f"/api/chapters/{ids['chapter_id']}/assessment")
        assert resp.status_code == 200

    get_resp = await client.get(f"/api/chapters/{ids['chapter_id']}/assessment")
    assert get_resp.status_code == 200
    assert get_resp.json()["status"] == "generated"


async def test_get_assessment_not_found(client):
    assert (await client.get("/api/chapters/99999/assessment")).status_code == 404


async def test_submit_assessment_duplicate_409(client, test_db):
    ids = await _create_chapter_with_material(test_db)
    async with test_db() as session:
        a = Assessment(
            chapter_id=ids["chapter_id"],
            questions=[{"type": "choice", "question": "Q?", "options": ["A"], "correct_answer": "A"}],
            user_answers=["A"], results=[{"correct": True, "correct_answer": "A", "explanation": "E"}],
            score=1.0, status="submitted", submitted_at=datetime.now(),
        )
        session.add(a)
        await session.commit()
        aid = a.id
    resp = await client.post(f"/api/assessments/{aid}/submit", json={"answers": ["B"]})
    assert resp.status_code == 409


async def test_submit_assessment_not_found(client):
    assert (await client.post("/api/assessments/99999/submit", json={"answers": ["A"]})).status_code == 404


async def test_get_assessment_result_not_submitted(client, test_db):
    ids = await _create_chapter_with_material(test_db)
    aid = await _create_assessment(test_db, ids["chapter_id"], [{"type": "fill_blank", "question": "Q?", "correct_answer": "A"}])
    assert (await client.get(f"/api/assessments/{aid}/result")).status_code == 404
