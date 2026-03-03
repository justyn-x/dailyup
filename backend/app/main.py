from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="DailyUp", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
from app.api.projects import router as projects_router
from app.api.settings import router as settings_router
from app.api.plans import router as plans_router
from app.api.chapters import router as chapters_router
from app.api.assessments import router as assessments_router

app.include_router(projects_router)
app.include_router(settings_router)
app.include_router(plans_router)
app.include_router(chapters_router)
app.include_router(assessments_router)
