from datetime import datetime
from typing import List, Optional

from sqlalchemy import ForeignKey, Integer, Float, String, Text, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class LLMSettings(Base):
    __tablename__ = "llm_settings"
    id: Mapped[int] = mapped_column(primary_key=True)
    api_base_url: Mapped[str] = mapped_column(String(500), default="")
    api_key: Mapped[str] = mapped_column(String(500), default="")
    model_name: Mapped[str] = mapped_column(String(200), default="")
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())


class LearningProject(Base):
    __tablename__ = "learning_projects"
    id: Mapped[int] = mapped_column(primary_key=True)
    goal: Mapped[str] = mapped_column(Text, nullable=False)
    background: Mapped[str] = mapped_column(Text, default="")
    skills: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())
    plan: Mapped[Optional["LearningPlan"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )


class LearningPlan(Base):
    __tablename__ = "learning_plans"
    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("learning_projects.id"), unique=True
    )
    status: Mapped[str] = mapped_column(String(20), default="generating")
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    project: Mapped["LearningProject"] = relationship(back_populates="plan")
    chapters: Mapped[List["Chapter"]] = relationship(
        back_populates="plan",
        order_by="Chapter.order_index",
        cascade="all, delete-orphan",
    )


class Chapter(Base):
    __tablename__ = "chapters"
    id: Mapped[int] = mapped_column(primary_key=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey("learning_plans.id"))
    order_index: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(500))
    objective: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="not_started")
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    plan: Mapped["LearningPlan"] = relationship(back_populates="chapters")
    material: Mapped[Optional["LearningMaterial"]] = relationship(
        back_populates="chapter", cascade="all, delete-orphan", uselist=False
    )
    assessment: Mapped[Optional["Assessment"]] = relationship(
        back_populates="chapter", cascade="all, delete-orphan", uselist=False
    )


class LearningMaterial(Base):
    __tablename__ = "learning_materials"
    id: Mapped[int] = mapped_column(primary_key=True)
    chapter_id: Mapped[int] = mapped_column(ForeignKey("chapters.id"), unique=True)
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    chapter: Mapped["Chapter"] = relationship(back_populates="material")


class Assessment(Base):
    __tablename__ = "assessments"
    id: Mapped[int] = mapped_column(primary_key=True)
    chapter_id: Mapped[int] = mapped_column(ForeignKey("chapters.id"), unique=True)
    questions: Mapped[dict] = mapped_column(JSON)
    user_answers: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    results: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="generated")
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    submitted_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    chapter: Mapped["Chapter"] = relationship(back_populates="assessment")
