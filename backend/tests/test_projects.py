"""Tests for the projects API — P1, P2 property tests + unit tests."""

import pytest
from hypothesis import given, settings, HealthCheck
from hypothesis import strategies as st

pytestmark = pytest.mark.asyncio


# ── Property P1: Project creation round-trip (loop-based) ────────────────

async def test_p1_project_round_trip(client):
    """Feature: dailyup-learning-app, Property 1: Project creation round-trip.
    For any valid project with a non-empty goal, creating the project via the
    API and then retrieving it should return identical goal/background/skills."""
    strategy = st.fixed_dictionaries({
        "goal": st.text(min_size=1, max_size=100).filter(lambda s: s.strip()),
        "background": st.text(min_size=0, max_size=100),
        "skills": st.text(min_size=0, max_size=100),
    })
    for data in strategy.example() and [strategy.example() for _ in range(100)]:
        resp = await client.post("/api/projects", json=data)
        assert resp.status_code == 201
        created = resp.json()

        get_resp = await client.get(f"/api/projects/{created['id']}")
        assert get_resp.status_code == 200
        retrieved = get_resp.json()

        assert retrieved["goal"] == data["goal"].strip()
        assert retrieved["background"] == data["background"]
        assert retrieved["skills"] == data["skills"]


# ── Property P2: Invalid goal rejection ──────────────────────────────────

async def test_p2_invalid_goal_rejection(client):
    """Feature: dailyup-learning-app, Property 2: Invalid goal rejection.
    For any empty/whitespace-only goal, creation should be rejected with 422."""
    strategy = st.from_regex(r"^\s*$", fullmatch=True)
    for _ in range(100):
        goal = strategy.example()
        resp = await client.post(
            "/api/projects",
            json={"goal": goal, "background": "", "skills": ""},
        )
        assert resp.status_code == 422
        body = resp.json()
        detail = body.get("detail", [])
        field_names = []
        for err in detail:
            field_names.extend(str(part) for part in err.get("loc", []))
        assert "goal" in field_names


# ── Unit tests ───────────────────────────────────────────────────────────

async def test_create_project(client):
    resp = await client.post(
        "/api/projects",
        json={"goal": "Learn Python", "background": "None", "skills": "HTML"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["goal"] == "Learn Python"
    assert data["progress"] == 0.0
    assert "id" in data


async def test_list_projects(client):
    await client.post("/api/projects", json={"goal": "A"})
    await client.post("/api/projects", json={"goal": "B"})
    resp = await client.get("/api/projects")
    assert resp.status_code == 200
    assert len(resp.json()) >= 2


async def test_get_project_detail(client):
    create_resp = await client.post("/api/projects", json={"goal": "Test detail"})
    pid = create_resp.json()["id"]
    resp = await client.get(f"/api/projects/{pid}")
    assert resp.status_code == 200
    assert resp.json()["plan"] is None


async def test_get_project_not_found(client):
    resp = await client.get("/api/projects/99999")
    assert resp.status_code == 404


async def test_delete_project(client):
    create_resp = await client.post("/api/projects", json={"goal": "Delete me"})
    pid = create_resp.json()["id"]
    assert (await client.delete(f"/api/projects/{pid}")).status_code == 204
    assert (await client.get(f"/api/projects/{pid}")).status_code == 404


async def test_delete_project_not_found(client):
    assert (await client.delete("/api/projects/99999")).status_code == 404


async def test_delete_project_cascade(client, test_db):
    from app.models import (
        LearningProject, LearningPlan, Chapter,
        LearningMaterial, Assessment,
    )

    async with test_db() as session:
        project = LearningProject(goal="Cascade test")
        session.add(project)
        await session.flush()

        plan = LearningPlan(project_id=project.id, status="completed")
        session.add(plan)
        await session.flush()

        chapter = Chapter(plan_id=plan.id, order_index=0, title="Ch1", objective="Obj1")
        session.add(chapter)
        await session.flush()

        material = LearningMaterial(chapter_id=chapter.id, content="Content")
        session.add(material)
        await session.flush()

        assessment = Assessment(
            chapter_id=chapter.id,
            questions=[{"type": "choice", "question": "Q?", "options": ["A", "B"], "correct_answer": "A"}],
            status="generated",
        )
        session.add(assessment)
        await session.commit()

        ids = (project.id, plan.id, chapter.id, material.id, assessment.id)

    assert (await client.delete(f"/api/projects/{ids[0]}")).status_code == 204

    async with test_db() as session:
        assert (await session.get(LearningProject, ids[0])) is None
        assert (await session.get(LearningPlan, ids[1])) is None
        assert (await session.get(Chapter, ids[2])) is None
        assert (await session.get(LearningMaterial, ids[3])) is None
        assert (await session.get(Assessment, ids[4])) is None
