"""Shared fixtures for DailyUp backend tests."""

import sqlite3
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from app.database import Base
from app.models import LLMSettings  # ensure models are registered on Base
import app.database as db_module


@pytest_asyncio.fixture
async def test_db(tmp_path):
    """Create a fresh SQLite database for each test using a temp file.

    Tables and seed data are created synchronously to avoid aiosqlite
    event-loop issues during pytest fixture setup.
    """
    db_path = tmp_path / "test.db"

    # Create tables and seed data synchronously
    sync_engine = create_engine(f"sqlite:///{db_path}", echo=False)
    Base.metadata.create_all(sync_engine)
    with sync_engine.connect() as conn:
        conn.execute(
            text("INSERT INTO llm_settings (id, api_base_url, api_key, model_name, updated_at) VALUES (1, '', '', '', CURRENT_TIMESTAMP)")
        )
        conn.commit()
    sync_engine.dispose()

    # Async engine for actual test usage
    url = f"sqlite+aiosqlite:///{db_path}"
    engine = create_async_engine(url, echo=False)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    # Monkey-patch both engine and session factory
    original_session = db_module.async_session
    original_engine = db_module.engine
    db_module.async_session = session_factory
    db_module.engine = engine

    yield session_factory

    db_module.async_session = original_session
    db_module.engine = original_engine

    await engine.dispose()


@pytest_asyncio.fixture
async def client(test_db):
    """Async httpx test client for the FastAPI app.

    Build a fresh FastAPI app WITHOUT the lifespan to avoid init_db()
    interfering with the test database.
    """
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware

    test_app = FastAPI(title="DailyUp-Test")
    test_app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    from app.api.projects import router as projects_router
    from app.api.settings import router as settings_router
    from app.api.plans import router as plans_router
    from app.api.chapters import router as chapters_router
    from app.api.assessments import router as assessments_router

    test_app.include_router(projects_router)
    test_app.include_router(settings_router)
    test_app.include_router(plans_router)
    test_app.include_router(chapters_router)
    test_app.include_router(assessments_router)

    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
