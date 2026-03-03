from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


# ─── Settings ───────────────────────────────────────────────

class UpdateSettingsRequest(BaseModel):
    api_base_url: str = Field(..., min_length=1)
    api_key: str = Field(..., min_length=1)
    model_name: str = Field(..., min_length=1)


class SettingsResponse(BaseModel):
    api_base_url: str
    api_key_masked: str
    model_name: str
    is_configured: bool


# ─── Projects ───────────────────────────────────────────────

class CreateProjectRequest(BaseModel):
    goal: str = Field(..., min_length=1, description="学习目标，不能为空")
    background: str = Field(default="", description="专业知识背景")
    skills: str = Field(default="", description="当前已有技能")

    @field_validator("goal")
    @classmethod
    def goal_not_whitespace(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("学习目标不能为空或纯空白字符")
        return v.strip()


class ProjectResponse(BaseModel):
    id: int
    goal: str
    background: str
    skills: str
    progress: float
    created_at: datetime


class ChapterSummary(BaseModel):
    id: int
    order_index: int
    title: str
    objective: str
    status: str
    score: Optional[float] = None


class ProjectDetailResponse(BaseModel):
    id: int
    goal: str
    background: str
    skills: str
    progress: float
    created_at: datetime
    plan: Optional["PlanResponse"] = None


# ─── Plans ──────────────────────────────────────────────────

class PlanResponse(BaseModel):
    id: int
    project_id: int
    status: str
    chapters: List[ChapterSummary]


# ─── Chapters ───────────────────────────────────────────────

class ChapterResponse(BaseModel):
    id: int
    plan_id: int
    order_index: int
    title: str
    objective: str
    status: str
    created_at: datetime


class MaterialResponse(BaseModel):
    id: int
    chapter_id: int
    content: str
    created_at: datetime


# ─── Assessments ────────────────────────────────────────────

class QuestionItem(BaseModel):
    type: str
    question: str
    options: Optional[List[str]] = None
    correct_answer: str
    explanation: Optional[str] = None


class AssessmentResponse(BaseModel):
    id: int
    chapter_id: int
    questions: List[QuestionItem]
    status: str
    created_at: datetime


class SubmitAnswerRequest(BaseModel):
    answers: List[str]


class ResultItem(BaseModel):
    correct: bool
    correct_answer: str
    explanation: str


class AssessmentResultResponse(BaseModel):
    id: int
    chapter_id: int
    questions: List[QuestionItem]
    user_answers: List[str]
    results: List[ResultItem]
    score: float
    status: str
    submitted_at: datetime
