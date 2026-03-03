import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATABASE_URL = f"sqlite+aiosqlite:///{os.path.join(BASE_DIR, 'dailyup.db')}"

engine = create_async_engine(DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def init_db():
    """Called on FastAPI startup event. Creates all tables if not exist.
    Also ensures the singleton LLMSettings record exists."""
    from app.models import LLMSettings

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with async_session() as session:
        result = await session.get(LLMSettings, 1)
        if not result:
            session.add(LLMSettings(id=1))
            await session.commit()
