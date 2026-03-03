"""Tests for the settings API — P10 property test + unit tests."""

import pytest
from hypothesis import strategies as st
from unittest.mock import patch, AsyncMock

pytestmark = pytest.mark.asyncio


# ── Property P10: API Key non-exposure ───────────────────────────────────

async def test_p10_api_key_masking(client):
    """Feature: dailyup-learning-app, Property 10: API Key non-exposure.
    The GET response must never contain the full API key."""
    key_strategy = st.text(
        alphabet=st.characters(whitelist_categories=("L", "N", "P")),
        min_size=5, max_size=100,
    )
    for _ in range(100):
        api_key = key_strategy.example()
        await client.put(
            "/api/settings",
            json={"api_base_url": "http://example.com", "api_key": api_key, "model_name": "m"},
        )
        resp = await client.get("/api/settings")
        assert resp.status_code == 200
        data = resp.json()
        masked = data["api_key_masked"]
        assert masked != api_key
        assert masked.endswith(api_key[-4:])
        assert "****" in masked


# ── Unit tests ───────────────────────────────────────────────────────────

async def test_get_settings_default(client):
    resp = await client.get("/api/settings")
    assert resp.status_code == 200
    data = resp.json()
    assert data["api_base_url"] == ""
    assert data["api_key_masked"] == ""
    assert data["is_configured"] is False


async def test_put_settings(client):
    resp = await client.put(
        "/api/settings",
        json={"api_base_url": "https://api.openai.com/v1", "api_key": "sk-abcdefgh12345678", "model_name": "gpt-4"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_configured"] is True
    assert "****" in data["api_key_masked"]
    assert data["api_key_masked"].endswith("5678")


async def test_get_settings_after_put(client):
    await client.put(
        "/api/settings",
        json={"api_base_url": "http://localhost:8080", "api_key": "my-secret-key-1234", "model_name": "llama-3"},
    )
    resp = await client.get("/api/settings")
    data = resp.json()
    assert data["is_configured"] is True
    assert "****" in data["api_key_masked"]


async def test_full_api_key_never_in_get_response(client):
    key = "sk-reallySecretKey9999"
    await client.put(
        "/api/settings",
        json={"api_base_url": "https://api.example.com", "api_key": key, "model_name": "model-v1"},
    )
    resp = await client.get("/api/settings")
    assert key not in resp.text


async def test_verify_endpoint_not_configured(client):
    resp = await client.post("/api/settings/verify")
    assert resp.status_code == 200
    assert resp.json()["valid"] is False


async def test_verify_endpoint_with_mock(client, test_db):
    from app.models import LLMSettings
    async with test_db() as session:
        settings = await session.get(LLMSettings, 1)
        settings.api_base_url = "http://fake-api.com"
        settings.api_key = "sk-test123456"
        settings.model_name = "test-model"
        await session.commit()

    mock_response = AsyncMock()
    mock_response.choices = [AsyncMock()]
    mock_response.choices[0].message.content = "Hi"

    with patch("openai.AsyncOpenAI") as mock_cls:
        mock_client = AsyncMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        mock_cls.return_value = mock_client

        resp = await client.post("/api/settings/verify")
        assert resp.status_code == 200
        data = resp.json()
        assert data["valid"] is True
        assert data["message"] == "连接成功"
