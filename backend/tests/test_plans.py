"""Tests for the plans API — P3 property test + unit tests."""

import json
import pytest
from hypothesis import strategies as st
from unittest.mock import patch

from app.models import LearningProject, LearningPlan, Chapter

pytestmark = pytest.mark.asyncio


async def _create_project_with_plan(test_db, chapters_data):
    async with test_db() as session:
        project = LearningProject(goal="Test goal")
        session.add(project)
        await session.flush()
        plan = LearningPlan(project_id=project.id, status="completed")
        session.add(plan)
        await session.flush()
        for i, ch in enumerate(chapters_data):
            session.add(Chapter(plan_id=plan.id, order_index=i, title=ch["title"], objective=ch["objective"]))
        await session.commit()
        return project.id, plan.id


# ── Property P3: Learning plan structure invariant ───────────────────────

async def test_p3_plan_structure_invariant(client, test_db):
    """Feature: dailyup-learning-app, Property 3: Learning plan structure invariant."""
    chapter_strategy = st.fixed_dictionaries({
        "title": st.text(min_size=1, max_size=80).filter(lambda s: s.strip()),
        "objective": st.text(min_size=1, max_size=150).filter(lambda s: s.strip()),
    })
    chapters_strategy = st.lists(chapter_strategy, min_size=1, max_size=8)

    for _ in range(100):
        chapters_data = chapters_strategy.example()
        project_id, _ = await _create_project_with_plan(test_db, chapters_data)

        resp = await client.get(f"/api/projects/{project_id}/plan")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["chapters"]) >= 1
        for i, ch in enumerate(data["chapters"]):
            assert ch["title"].strip() != ""
            assert ch["objective"].strip() != ""
            assert ch["order_index"] == i


# ── Unit tests ───────────────────────────────────────────────────────────

async def test_generate_plan_with_mock(client, test_db):
    create_resp = await client.post("/api/projects", json={"goal": "Learn Rust"})
    project_id = create_resp.json()["id"]

    chapters_data = [
        {"title": "Intro to Rust", "objective": "Learn basics"},
        {"title": "Ownership", "objective": "Understand ownership"},
    ]

    async def mock_generate_plan(self, session, project):
        plan = LearningPlan(project_id=project.id, status="completed")
        session.add(plan)
        await session.flush()
        created = []
        for i, ch in enumerate(chapters_data):
            c = Chapter(plan_id=plan.id, order_index=i, title=ch["title"], objective=ch["objective"])
            session.add(c)
            created.append(c)
        await session.commit()
        for c in created:
            await session.refresh(c)
        await session.refresh(plan)

        plan_resp = {
            "id": plan.id, "project_id": plan.project_id, "status": plan.status,
            "chapters": [{"id": c.id, "order_index": c.order_index, "title": c.title, "objective": c.objective, "status": c.status, "score": None} for c in created],
        }
        yield f'event: progress\ndata: {json.dumps({"phase": "generating", "message": "..."})}\n\n'
        yield f'event: done\ndata: {json.dumps({"full_result": plan_resp, "saved": True}, ensure_ascii=False)}\n\n'

    with patch("app.services.ai_service.AIService.generate_learning_plan", mock_generate_plan):
        resp = await client.post(f"/api/projects/{project_id}/plan")
        assert resp.status_code == 200
        assert "event: done" in resp.text

    get_resp = await client.get(f"/api/projects/{project_id}/plan")
    assert get_resp.status_code == 200
    assert len(get_resp.json()["chapters"]) == 2


async def test_get_plan(client, test_db):
    project_id, _ = await _create_project_with_plan(test_db, [{"title": "Ch1", "objective": "Obj1"}])
    resp = await client.get(f"/api/projects/{project_id}/plan")
    assert resp.status_code == 200
    assert resp.json()["chapters"][0]["title"] == "Ch1"


async def test_get_plan_not_found(client):
    create_resp = await client.post("/api/projects", json={"goal": "No plan"})
    resp = await client.get(f"/api/projects/{create_resp.json()['id']}/plan")
    assert resp.status_code == 404


async def test_generate_plan_duplicate_409(client, test_db):
    project_id, _ = await _create_project_with_plan(test_db, [{"title": "Ch1", "objective": "Obj1"}])
    resp = await client.post(f"/api/projects/{project_id}/plan")
    assert resp.status_code == 409


async def test_generate_plan_project_not_found(client):
    resp = await client.post("/api/projects/99999/plan")
    assert resp.status_code == 404
