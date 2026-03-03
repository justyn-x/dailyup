"""Output Parser for LLM structured output.

Handles JSON extraction from LLM responses, schema validation,
streaming markdown passthrough, and smart retry with error feedback.
"""

import json
import logging
import re
from typing import AsyncGenerator

from openai import AsyncOpenAI

logger = logging.getLogger(__name__)


class ParseError(Exception):
    """Raised when LLM output cannot be parsed into valid structured data."""

    pass


class OutputParser:
    """Parses and validates LLM structured output with smart retry."""

    def parse_json_response(self, raw: str, schema: dict) -> dict:
        """Extract JSON from LLM response and validate against schema.

        Handles common LLM output quirks:
        - Markdown code blocks (```json ... ```)
        - Leading/trailing text around JSON
        - Minor formatting issues

        Args:
            raw: Raw LLM response string.
            schema: JSON schema dict to validate against.

        Returns:
            Parsed and validated dict.

        Raises:
            ParseError: If JSON cannot be extracted or validation fails.
        """
        if not raw or not raw.strip():
            raise ParseError("LLM 返回了空内容")

        json_str = self._extract_json_string(raw)
        if json_str is None:
            raise ParseError(
                f"无法从 LLM 输出中提取 JSON。原始输出前 500 字符：{raw[:500]}"
            )

        try:
            data = json.loads(json_str)
        except json.JSONDecodeError as e:
            raise ParseError(f"JSON 解析失败：{e}。提取的内容：{json_str[:500]}")

        # Validate against schema
        validation_error = self._validate_schema(data, schema)
        if validation_error:
            raise ParseError(f"JSON 结构校验失败：{validation_error}")

        return data

    async def parse_streaming_markdown(
        self, chunks: AsyncGenerator
    ) -> AsyncGenerator[str, None]:
        """Pass through markdown chunks for streaming display.

        Yields each chunk as-is for real-time frontend rendering.

        Args:
            chunks: Async generator yielding string chunks from LLM.

        Yields:
            Markdown text chunks.
        """
        async for chunk in chunks:
            if chunk:
                yield chunk

    async def retry_with_feedback(
        self,
        llm_client: AsyncOpenAI,
        messages: list,
        raw_output: str,
        parse_error: str,
        schema: dict,
        model: str = "",
    ) -> dict:
        """Smart retry: append the failed output and error to conversation,
        ask the LLM to fix its response.

        Args:
            llm_client: The AsyncOpenAI client instance.
            messages: Original conversation messages.
            raw_output: The LLM's previous raw output that failed parsing.
            parse_error: Description of the parsing error.
            schema: Expected JSON schema.
            model: Model name to use for the retry call.

        Returns:
            Parsed and validated dict from the corrected output.

        Raises:
            ParseError: If the retry also fails to produce valid output.
        """
        # Build retry messages with error feedback
        retry_messages = list(messages)
        retry_messages.append({"role": "assistant", "content": raw_output})
        retry_messages.append({
            "role": "user",
            "content": (
                f"你上次的输出无法解析为有效 JSON。\n"
                f"错误：{parse_error}\n"
                f"期望的 JSON 结构：{json.dumps(schema, ensure_ascii=False)}\n\n"
                f"请重新输出正确的 JSON，不要包含任何额外文字或 markdown 代码块标记。"
            ),
        })

        try:
            response = await llm_client.chat.completions.create(
                model=model,
                messages=retry_messages,
            )
            retry_raw = response.choices[0].message.content or ""
            return self.parse_json_response(retry_raw, schema)
        except ParseError:
            raise
        except Exception as e:
            raise ParseError(f"重试请求失败：{e}")

    # ── Private helpers ──────────────────────────────────────────

    def _extract_json_string(self, raw: str) -> str | None:
        """Try multiple strategies to extract a JSON string from raw text.

        Strategy order:
        1. Look for ```json ... ``` code block
        2. Look for ``` ... ``` code block (without language tag)
        3. Look for outermost { ... } braces
        """
        # Strategy 1 & 2: Extract from markdown code blocks
        code_block_pattern = r"```(?:json)?\s*\n?([\s\S]*?)\n?\s*```"
        match = re.search(code_block_pattern, raw)
        if match:
            candidate = match.group(1).strip()
            if candidate.startswith("{") or candidate.startswith("["):
                return candidate

        # Strategy 3: Find outermost JSON object using brace matching
        json_pattern = r"\{[\s\S]*\}"
        match = re.search(json_pattern, raw)
        if match:
            return match.group(0)

        return None

    def _validate_schema(self, data: dict, schema: dict) -> str | None:
        """Lightweight JSON schema validation.

        Checks required fields and basic type constraints without pulling
        in a full jsonschema library. Returns an error message string on
        failure, or None on success.
        """
        if not isinstance(data, dict):
            return "顶层结构必须是 JSON 对象"

        # Check top-level required fields
        required = schema.get("required", [])
        properties = schema.get("properties", {})

        for field in required:
            if field not in data:
                return f"缺少必需字段：{field}"

        # Validate each declared property
        for field, field_schema in properties.items():
            if field not in data:
                continue

            value = data[field]
            expected_type = field_schema.get("type")

            if expected_type == "array":
                if not isinstance(value, list):
                    return f"字段 '{field}' 应为数组，实际为 {type(value).__name__}"

                min_items = field_schema.get("minItems", 0)
                if len(value) < min_items:
                    return f"字段 '{field}' 至少需要 {min_items} 个元素，实际有 {len(value)} 个"

                # Validate array items if item schema has required fields
                item_schema = field_schema.get("items", {})
                item_required = item_schema.get("required", [])
                if item_required:
                    for i, item in enumerate(value):
                        if not isinstance(item, dict):
                            return f"'{field}[{i}]' 应为对象"
                        for req_field in item_required:
                            if req_field not in item:
                                return (
                                    f"'{field}[{i}]' 缺少必需字段：{req_field}"
                                )

            elif expected_type == "number":
                if not isinstance(value, (int, float)):
                    return f"字段 '{field}' 应为数字，实际为 {type(value).__name__}"

                minimum = field_schema.get("minimum")
                maximum = field_schema.get("maximum")
                if minimum is not None and value < minimum:
                    return f"字段 '{field}' 值 {value} 小于最小值 {minimum}"
                if maximum is not None and value > maximum:
                    return f"字段 '{field}' 值 {value} 大于最大值 {maximum}"

            elif expected_type == "string":
                if not isinstance(value, str):
                    return f"字段 '{field}' 应为字符串，实际为 {type(value).__name__}"

            elif expected_type == "boolean":
                if not isinstance(value, bool):
                    return f"字段 '{field}' 应为布尔值，实际为 {type(value).__name__}"

            elif expected_type == "object":
                if not isinstance(value, dict):
                    return f"字段 '{field}' 应为对象，实际为 {type(value).__name__}"

        return None
