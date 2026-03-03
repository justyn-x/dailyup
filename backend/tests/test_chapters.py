"""Tests for the chapters API — P4 property test + unit tests."""

import pytest
from hypothesis import strategies as st

from app.models import LearningProject, LearningPlan, Chapter, LearningMaterial

pytestmark = pytest.mark.asyncio


async def _create_chapter(test_db, *, with_material=False, material_content=""):
    async with test_db() as session:
        project = LearningProject(goal="Chapter test")
        session.add(project)
        await session.flush()
        plan = LearningPlan(project_id=project.id, status="completed")
        session.add(plan)
        await session.flush()
        chapter = Chapter(plan_id=plan.id, order_index=0, title="Test Chapter", objective="Test Obj", status="not_started")
        session.add(chapter)
        await session.flush()
        mid = None
        if with_material:
            mat = LearningMaterial(chapter_id=chapter.id, content=material_content)
            session.add(mat)
            await session.flush()
            mid = mat.id
        await session.commit()
        return {"chapter_id": chapter.id, "plan_id": plan.id, "material_id": mid}


# ── Property P4: Material non-empty content ──────────────────────────────

async def test_p4_material_non_empty_content(client, test_db):
    """Feature: dailyup-learning-app, Property 4: Material generation produces non-empty content."""
    content_strategy = st.text(min_size=1, max_size=2000).filter(lambda s: s.strip())
    for _ in range(100):
        content = content_strategy.example()
        ids = await _create_chapter(test_db, with_material=True, material_content=content)
        resp = await client.get(f"/api/chapters/{ids['chapter_id']}/material")
        assert resp.status_code == 200
        data = resp.json()
        assert data["content"].strip() != ""
        assert data["content"] == content
        assert data["chapter_id"] == ids["chapter_id"]


# ── Unit tests ───────────────────────────────────────────────────────────

async def test_get_chapter(client, test_db):
    ids = await _create_chapter(test_db)
    resp = await client.get(f"/api/chapters/{ids['chapter_id']}")
    assert resp.status_code == 200
    assert resp.json()["title"] == "Test Chapter"


async def test_get_chapter_not_found(client):
    assert (await client.get("/api/chapters/99999")).status_code == 404


async def test_get_material(client, test_db):
    ids = await _create_chapter(test_db, with_material=True, material_content="# Hello\nWorld")
    resp = await client.get(f"/api/chapters/{ids['chapter_id']}/material")
    assert resp.status_code == 200
    assert resp.json()["content"] == "# Hello\nWorld"


async def test_get_material_not_found(client):
    assert (await client.get("/api/chapters/99999/material")).status_code == 404


async def test_get_material_no_material(client, test_db):
    ids = await _create_chapter(test_db, with_material=False)
    assert (await client.get(f"/api/chapters/{ids['chapter_id']}/material")).status_code == 404
