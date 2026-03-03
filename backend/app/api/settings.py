from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

import app.database as db
from app.models import LLMSettings
from app.schemas import SettingsResponse, UpdateSettingsRequest

router = APIRouter(prefix="/api/settings", tags=["settings"])


async def get_db():
    async with db.async_session() as session:
        yield session


def _mask_api_key(key: str) -> str:
    """Mask API key showing only last 4 chars, e.g. 'sk-****abcd'."""
    if not key:
        return ""
    if len(key) <= 4:
        return "****" + key
    return key[:3] + "****" + key[-4:]


def _build_settings_response(settings: LLMSettings) -> SettingsResponse:
    is_configured = bool(
        settings.api_base_url and settings.api_key and settings.model_name
    )
    return SettingsResponse(
        api_base_url=settings.api_base_url,
        api_key_masked=_mask_api_key(settings.api_key),
        model_name=settings.model_name,
        is_configured=is_configured,
    )


@router.get("", response_model=SettingsResponse)
async def get_settings(db: AsyncSession = Depends(get_db)):
    settings = await db.get(LLMSettings, 1)
    return _build_settings_response(settings)


@router.put("", response_model=SettingsResponse)
async def update_settings(
    body: UpdateSettingsRequest, db: AsyncSession = Depends(get_db)
):
    settings = await db.get(LLMSettings, 1)
    settings.api_base_url = body.api_base_url
    settings.api_key = body.api_key
    settings.model_name = body.model_name
    await db.commit()
    await db.refresh(settings)
    return _build_settings_response(settings)


@router.post("/verify")
async def verify_settings(db: AsyncSession = Depends(get_db)):
    settings = await db.get(LLMSettings, 1)

    if not (settings.api_base_url and settings.api_key and settings.model_name):
        return {"valid": False, "message": "请先完成 API 配置"}

    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(
            api_key=settings.api_key,
            base_url=settings.api_base_url,
        )
        await client.chat.completions.create(
            model=settings.model_name,
            messages=[{"role": "user", "content": "Say hi"}],
            max_tokens=10,
        )
        return {"valid": True, "message": "连接成功"}

    except Exception as exc:
        exc_type = type(exc).__name__

        # openai SDK exception hierarchy
        from openai import AuthenticationError, APIConnectionError, RateLimitError

        if isinstance(exc, AuthenticationError):
            return {"valid": False, "message": "API Key 无效，请检查后重试"}
        if isinstance(exc, APIConnectionError):
            return {"valid": False, "message": "无法连接到 AI 服务，请检查 API 地址"}
        if isinstance(exc, RateLimitError):
            return {"valid": False, "message": "请求过于频繁，请稍后重试"}

        return {"valid": False, "message": f"验证失败: {exc_type} - {exc}"}
