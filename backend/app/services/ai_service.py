"""AI Service Layer — orchestrates AI Agent workflow.

Coordinates ContextBuilder, prompt templates, LLM calls via OpenAI SDK,
and OutputParser to implement the four agent roles:
Plan Architect, Content Tutor, Assessment Designer, Answer Evaluator.
"""

import json
import logging
from datetime import datetime
from typing import AsyncGenerator

from openai import (
    APIConnectionError,
    AsyncOpenAI,
    AuthenticationError,
    BadRequestError,
    RateLimitError,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import (
    Assessment,
    Chapter,
    LearningMaterial,
    LearningPlan,
    LearningProject,
    LLMSettings,
)
from app.services.context_builder import ContextBuilder
from app.services.output_parser import OutputParser, ParseError
from app.services.prompts.assessment_prompt import (
    ASSESSMENT_OUTPUT_SCHEMA,
    ASSESSMENT_SYSTEM_PROMPT,
    build_assessment_user_message,
)
from app.services.prompts.evaluation_prompt import (
    EVALUATION_OUTPUT_SCHEMA,
    EVALUATION_SYSTEM_PROMPT,
    build_evaluation_user_message,
)
from app.services.prompts.material_prompt import (
    MATERIAL_SYSTEM_PROMPT,
    build_material_user_message,
)
from app.services.prompts.plan_prompt import (
    PLAN_OUTPUT_SCHEMA,
    PLAN_SYSTEM_PROMPT,
    build_plan_user_message,
)

logger = logging.getLogger(__name__)


def _sse(event: str, data: dict) -> str:
    """Format a Server-Sent Event string."""
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


class AIService:
    """Orchestrates AI Agent: context building -> prompt rendering ->
    LLM call -> output parsing."""

    def __init__(self) -> None:
        self.context_builder = ContextBuilder()
        self.output_parser = OutputParser()

    async def _get_llm_client(
        self, session: AsyncSession
    ) -> tuple[AsyncOpenAI, str]:
        """Read LLM settings from DB and create an AsyncOpenAI client.

        Returns:
            Tuple of (AsyncOpenAI client, model_name).

        Raises:
            ValueError: If LLM is not configured.
        """
        settings = await session.get(LLMSettings, 1)
        if not settings or not settings.api_key or not settings.api_base_url:
            raise ValueError("LLM 未配置，请先在设置页面配置 API 信息")

        client = AsyncOpenAI(
            api_key=settings.api_key,
            base_url=settings.api_base_url,
        )
        return client, settings.model_name

    async def _call_llm_structured(
        self,
        client: AsyncOpenAI,
        system_prompt: str,
        user_message: str,
        schema: dict,
        model: str,
    ) -> dict:
        """Call LLM and get structured JSON output with 3-level fallback.

        Level 1: response_format=json_schema (OpenAI native)
        Level 2: response_format=json_object (widely supported)
        Level 3: Prompt constraint + regex extraction (fallback)

        If all levels fail, attempts smart retry with error feedback.

        Args:
            client: AsyncOpenAI client.
            system_prompt: System prompt string.
            user_message: User message string.
            schema: Expected output JSON schema.
            model: Model name.

        Returns:
            Parsed and validated dict.

        Raises:
            ParseError: If all attempts fail.
        """
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ]

        # Level 1: json_schema mode
        try:
            response = await client.chat.completions.create(
                model=model,
                messages=messages,
                response_format={
                    "type": "json_schema",
                    "json_schema": {
                        "name": "structured_output",
                        "strict": True,
                        "schema": schema,
                    },
                },
            )
            raw = response.choices[0].message.content or ""
            return self.output_parser.parse_json_response(raw, schema)
        except (BadRequestError, Exception) as e:
            logger.info("Level 1 (json_schema) failed: %s. Trying Level 2.", e)

        # Level 2: json_object mode
        try:
            response = await client.chat.completions.create(
                model=model,
                messages=messages,
                response_format={"type": "json_object"},
            )
            raw = response.choices[0].message.content or ""
            return self.output_parser.parse_json_response(raw, schema)
        except (BadRequestError, Exception) as e:
            logger.info("Level 2 (json_object) failed: %s. Trying Level 3.", e)

        # Level 3: Prompt constraint + regex extraction
        enhanced_system = (
            system_prompt
            + "\n\n"
            + "重要：你必须且只能输出一个 JSON 对象，不要包含任何其他文字、"
            "markdown 标记或代码块。JSON 结构如下：\n"
            + json.dumps(schema, ensure_ascii=False, indent=2)
        )
        level3_messages = [
            {"role": "system", "content": enhanced_system},
            {"role": "user", "content": user_message},
        ]

        try:
            response = await client.chat.completions.create(
                model=model,
                messages=level3_messages,
            )
            raw = response.choices[0].message.content or ""
            return self.output_parser.parse_json_response(raw, schema)
        except ParseError as pe:
            # Smart retry with error feedback
            logger.info("Level 3 parse failed: %s. Attempting smart retry.", pe)
            return await self.output_parser.retry_with_feedback(
                llm_client=client,
                messages=level3_messages,
                raw_output=raw,
                parse_error=str(pe),
                schema=schema,
                model=model,
            )

    # ── Public API: SSE generators ───────────────────────────────

    async def generate_learning_plan(
        self, session: AsyncSession, project: LearningProject
    ) -> AsyncGenerator[str, None]:
        """Agent role: Plan Architect.

        Builds context from project, generates a structured plan via LLM,
        persists chapters to DB, and yields SSE events.

        Yields:
            SSE formatted strings (progress + done/error events).
        """
        try:
            yield _sse("progress", {
                "phase": "generating",
                "message": "正在分析学习目标...",
            })

            client, model = await self._get_llm_client(session)

            context = self.context_builder.build_plan_context(project)
            user_message = build_plan_user_message(context)

            yield _sse("progress", {
                "phase": "generating",
                "message": "正在设计学习计划...",
            })

            result = await self._call_llm_structured(
                client, PLAN_SYSTEM_PROMPT, user_message,
                PLAN_OUTPUT_SCHEMA, model,
            )

            # Persist plan and chapters
            chapters_data = result.get("chapters", [])

            yield _sse("progress", {
                "phase": "saving",
                "message": f"正在保存学习计划（{len(chapters_data)} 个章节）...",
            })

            # Check if plan already exists and remove it
            existing_plan_stmt = select(LearningPlan).where(
                LearningPlan.project_id == project.id
            )
            existing_plan_result = await session.execute(existing_plan_stmt)
            existing_plan = existing_plan_result.scalar_one_or_none()
            if existing_plan:
                await session.delete(existing_plan)
                await session.flush()

            plan = LearningPlan(
                project_id=project.id,
                status="completed",
            )
            session.add(plan)
            await session.flush()

            for i, ch_data in enumerate(chapters_data):
                chapter = Chapter(
                    plan_id=plan.id,
                    order_index=i,
                    title=ch_data["title"],
                    objective=ch_data.get("objective", ""),
                    status="not_started",
                )
                session.add(chapter)

            await session.commit()

            # Reload plan with chapters for response
            stmt = (
                select(LearningPlan)
                .where(LearningPlan.id == plan.id)
                .options(
                    selectinload(LearningPlan.chapters).selectinload(
                        Chapter.assessment
                    )
                )
            )
            plan_result = await session.execute(stmt)
            plan = plan_result.scalar_one()

            # Build PlanResponse-compatible dict
            plan_response = {
                "id": plan.id,
                "project_id": plan.project_id,
                "status": plan.status,
                "chapters": [
                    {
                        "id": ch.id,
                        "order_index": ch.order_index,
                        "title": ch.title,
                        "objective": ch.objective,
                        "status": ch.status,
                        "score": (
                            ch.assessment.score
                            if ch.assessment and ch.assessment.score is not None
                            else None
                        ),
                    }
                    for ch in plan.chapters
                ],
            }

            yield _sse("done", {"full_result": plan_response, "saved": True})

        except ValueError as e:
            yield _sse("error", {
                "code": "config_error",
                "message": str(e),
                "retryable": False,
            })
        except AuthenticationError:
            yield _sse("error", {
                "code": "auth_error",
                "message": "API Key 认证失败，请检查 LLM 配置",
                "retryable": False,
            })
        except APIConnectionError:
            yield _sse("error", {
                "code": "llm_connection_error",
                "message": "无法连接到 AI 服务，请检查 API 地址",
                "retryable": True,
            })
        except RateLimitError:
            yield _sse("error", {
                "code": "rate_limit_error",
                "message": "AI 服务请求频率超限，请稍后重试",
                "retryable": True,
            })
        except BadRequestError as e:
            yield _sse("error", {
                "code": "bad_request_error",
                "message": f"AI 服务请求参数错误：{e}",
                "retryable": False,
            })
        except ParseError as e:
            yield _sse("error", {
                "code": "parse_error",
                "message": f"AI 输出解析失败：{e}",
                "retryable": True,
            })
        except Exception as e:
            logger.exception("Unexpected error in generate_learning_plan")
            yield _sse("error", {
                "code": "internal_error",
                "message": f"生成学习计划时发生错误：{e}",
                "retryable": True,
            })

    async def generate_material(
        self, session: AsyncSession, chapter: Chapter, project: LearningProject
    ) -> AsyncGenerator[str, None]:
        """Agent role: Content Tutor.

        Streams Markdown learning material from LLM, yielding SSE chunk
        events in real time. Accumulates content and saves to DB at end.

        Yields:
            SSE formatted strings (chunk + done/error events).
        """
        try:
            client, model = await self._get_llm_client(session)

            context = await self.context_builder.build_material_context(
                session, chapter, project
            )
            user_message = build_material_user_message(context)

            messages = [
                {"role": "system", "content": MATERIAL_SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ]

            # Stream from LLM
            stream = await client.chat.completions.create(
                model=model,
                messages=messages,
                stream=True,
            )

            accumulated_content = ""

            async for chunk in stream:
                delta = chunk.choices[0].delta if chunk.choices else None
                if delta and delta.content:
                    text = delta.content
                    accumulated_content += text
                    yield _sse("chunk", {"content": text})

            if not accumulated_content.strip():
                yield _sse("error", {
                    "code": "empty_response",
                    "message": "AI 返回了空内容，请重试",
                    "retryable": True,
                })
                return

            # Save material to DB
            material = LearningMaterial(
                chapter_id=chapter.id,
                content=accumulated_content,
            )
            session.add(material)

            # Update chapter status
            chapter.status = "learning"
            await session.commit()
            await session.refresh(material)

            material_response = {
                "id": material.id,
                "chapter_id": material.chapter_id,
                "content": material.content,
                "created_at": material.created_at.isoformat(),
            }

            yield _sse("done", {"full_result": material_response, "saved": True})

        except ValueError as e:
            yield _sse("error", {
                "code": "config_error",
                "message": str(e),
                "retryable": False,
            })
        except AuthenticationError:
            yield _sse("error", {
                "code": "auth_error",
                "message": "API Key 认证失败，请检查 LLM 配置",
                "retryable": False,
            })
        except APIConnectionError:
            yield _sse("error", {
                "code": "llm_connection_error",
                "message": "无法连接到 AI 服务，请检查 API 地址",
                "retryable": True,
            })
        except RateLimitError:
            yield _sse("error", {
                "code": "rate_limit_error",
                "message": "AI 服务请求频率超限，请稍后重试",
                "retryable": True,
            })
        except BadRequestError as e:
            yield _sse("error", {
                "code": "bad_request_error",
                "message": f"AI 服务请求参数错误：{e}",
                "retryable": False,
            })
        except Exception as e:
            logger.exception("Unexpected error in generate_material")
            yield _sse("error", {
                "code": "internal_error",
                "message": f"生成学习材料时发生错误：{e}",
                "retryable": True,
            })

    async def regenerate_material(
        self, session: AsyncSession, chapter: Chapter, project: LearningProject
    ) -> AsyncGenerator[str, None]:
        """Agent role: Content Tutor (regeneration).

        Deletes existing material first, then generates fresh content.

        Yields:
            SSE formatted strings (chunk + done/error events).
        """
        try:
            # Delete existing material if present
            if chapter.material:
                await session.delete(chapter.material)
                await session.flush()

            # Delegate to generate_material for the actual generation
            async for event in self.generate_material(session, chapter, project):
                yield event

        except Exception as e:
            logger.exception("Unexpected error in regenerate_material")
            yield _sse("error", {
                "code": "internal_error",
                "message": f"重新生成学习材料时发生错误：{e}",
                "retryable": True,
            })

    async def generate_assessment(
        self, session: AsyncSession, chapter: Chapter, material: LearningMaterial
    ) -> AsyncGenerator[str, None]:
        """Agent role: Assessment Designer.

        Generates structured assessment questions via LLM and persists
        them to DB.

        Yields:
            SSE formatted strings (progress + done/error events).
        """
        try:
            yield _sse("progress", {
                "phase": "generating",
                "message": "正在分析章节内容...",
            })

            client, model = await self._get_llm_client(session)

            # Need to load the project through the chapter's plan
            stmt = (
                select(LearningPlan)
                .where(LearningPlan.id == chapter.plan_id)
                .options(selectinload(LearningPlan.project))
            )
            plan_result = await session.execute(stmt)
            plan = plan_result.scalar_one()
            project = plan.project

            context = await self.context_builder.build_assessment_context(
                session, chapter, material, project
            )
            user_message = build_assessment_user_message(context)

            yield _sse("progress", {
                "phase": "generating",
                "message": "正在设计考核题目...",
            })

            result = await self._call_llm_structured(
                client, ASSESSMENT_SYSTEM_PROMPT, user_message,
                ASSESSMENT_OUTPUT_SCHEMA, model,
            )

            questions = result.get("questions", [])

            yield _sse("progress", {
                "phase": "saving",
                "message": f"正在保存考核题目（{len(questions)} 道题）...",
            })

            # Delete existing assessment if present
            existing_stmt = select(Assessment).where(
                Assessment.chapter_id == chapter.id
            )
            existing_result = await session.execute(existing_stmt)
            existing = existing_result.scalar_one_or_none()
            if existing:
                await session.delete(existing)
                await session.flush()

            assessment = Assessment(
                chapter_id=chapter.id,
                questions=questions,
                status="generated",
            )
            session.add(assessment)
            await session.commit()
            await session.refresh(assessment)

            assessment_response = {
                "id": assessment.id,
                "chapter_id": assessment.chapter_id,
                "questions": assessment.questions,
                "status": assessment.status,
                "created_at": assessment.created_at.isoformat(),
            }

            yield _sse("done", {
                "full_result": assessment_response,
                "saved": True,
            })

        except ValueError as e:
            yield _sse("error", {
                "code": "config_error",
                "message": str(e),
                "retryable": False,
            })
        except AuthenticationError:
            yield _sse("error", {
                "code": "auth_error",
                "message": "API Key 认证失败，请检查 LLM 配置",
                "retryable": False,
            })
        except APIConnectionError:
            yield _sse("error", {
                "code": "llm_connection_error",
                "message": "无法连接到 AI 服务，请检查 API 地址",
                "retryable": True,
            })
        except RateLimitError:
            yield _sse("error", {
                "code": "rate_limit_error",
                "message": "AI 服务请求频率超限，请稍后重试",
                "retryable": True,
            })
        except BadRequestError as e:
            yield _sse("error", {
                "code": "bad_request_error",
                "message": f"AI 服务请求参数错误：{e}",
                "retryable": False,
            })
        except ParseError as e:
            yield _sse("error", {
                "code": "parse_error",
                "message": f"AI 输出解析失败：{e}",
                "retryable": True,
            })
        except Exception as e:
            logger.exception("Unexpected error in generate_assessment")
            yield _sse("error", {
                "code": "internal_error",
                "message": f"生成考核题目时发生错误：{e}",
                "retryable": True,
            })

    async def evaluate_answers(
        self, session: AsyncSession, assessment: Assessment
    ) -> AsyncGenerator[str, None]:
        """Agent role: Answer Evaluator.

        Evaluates user answers against assessment questions, persists
        results and score to DB.

        Yields:
            SSE formatted strings (progress + done/error events).
        """
        try:
            yield _sse("progress", {
                "phase": "evaluating",
                "message": "正在评判答案...",
            })

            client, model = await self._get_llm_client(session)

            # Load chapter relationship for evaluation context
            stmt = (
                select(Assessment)
                .where(Assessment.id == assessment.id)
                .options(selectinload(Assessment.chapter))
            )
            assess_result = await session.execute(stmt)
            assessment = assess_result.scalar_one()

            context = self.context_builder.build_evaluation_context(assessment)
            user_message = build_evaluation_user_message(context)

            yield _sse("progress", {
                "phase": "evaluating",
                "message": "正在逐题分析...",
            })

            result = await self._call_llm_structured(
                client, EVALUATION_SYSTEM_PROMPT, user_message,
                EVALUATION_OUTPUT_SCHEMA, model,
            )

            # Persist results
            assessment.results = result.get("results", [])
            assessment.score = result.get("total_score", 0.0)
            assessment.status = "submitted"
            assessment.submitted_at = datetime.now()

            # Update chapter status to completed
            if assessment.chapter:
                assessment.chapter.status = "completed"

            await session.commit()
            await session.refresh(assessment)

            # Build response
            questions = assessment.questions if assessment.questions else []
            user_answers = assessment.user_answers if assessment.user_answers else []

            eval_response = {
                "id": assessment.id,
                "chapter_id": assessment.chapter_id,
                "questions": questions,
                "user_answers": user_answers,
                "results": assessment.results,
                "score": assessment.score,
                "status": assessment.status,
                "submitted_at": assessment.submitted_at.isoformat(),
            }

            yield _sse("done", {"full_result": eval_response, "saved": True})

        except ValueError as e:
            yield _sse("error", {
                "code": "config_error",
                "message": str(e),
                "retryable": False,
            })
        except AuthenticationError:
            yield _sse("error", {
                "code": "auth_error",
                "message": "API Key 认证失败，请检查 LLM 配置",
                "retryable": False,
            })
        except APIConnectionError:
            yield _sse("error", {
                "code": "llm_connection_error",
                "message": "无法连接到 AI 服务，请检查 API 地址",
                "retryable": True,
            })
        except RateLimitError:
            yield _sse("error", {
                "code": "rate_limit_error",
                "message": "AI 服务请求频率超限，请稍后重试",
                "retryable": True,
            })
        except BadRequestError as e:
            yield _sse("error", {
                "code": "bad_request_error",
                "message": f"AI 服务请求参数错误：{e}",
                "retryable": False,
            })
        except ParseError as e:
            yield _sse("error", {
                "code": "parse_error",
                "message": f"AI 输出解析失败：{e}",
                "retryable": True,
            })
        except Exception as e:
            logger.exception("Unexpected error in evaluate_answers")
            yield _sse("error", {
                "code": "internal_error",
                "message": f"评判答案时发生错误：{e}",
                "retryable": True,
            })
