"""Prompt templates for the Plan Architect agent role.

This module defines the system prompt, user message builder, and
output JSON schema used when generating a learning plan.
"""

PLAN_SYSTEM_PROMPT = (
    "你是一位资深的教育规划专家（Plan Architect）。\n"
    "你的任务是根据用户提供的学习目标、专业背景和已有技能，"
    "设计一个循序渐进、结构清晰的学习计划。\n\n"
    "设计原则：\n"
    "1. 跳过用户已经掌握的基础内容，避免浪费时间。\n"
    "2. 章节之间保持逻辑递进关系，由浅入深。\n"
    "3. 每个章节有明确的学习目标（objective），帮助用户理解学完后能做什么。\n"
    "4. 章节数量合理（通常 5-10 章），既不过于笼统也不过于细碎。\n"
    "5. 章节标题简洁明了，便于用户快速了解内容范围。\n\n"
    "你必须以 JSON 格式输出学习计划，不要包含任何额外的解释文字。"
)


def build_plan_user_message(context: dict) -> str:
    """Format the user message for plan generation.

    Args:
        context: Dict with keys 'goal', 'background', 'skills'.

    Returns:
        Formatted user message string.
    """
    goal = context.get("goal", "")
    background = context.get("background", "")
    skills = context.get("skills", "")

    parts = [f"## 学习目标\n{goal}"]

    if background:
        parts.append(f"## 专业背景\n{background}")
    else:
        parts.append("## 专业背景\n未提供")

    if skills:
        parts.append(f"## 已有技能\n{skills}")
    else:
        parts.append("## 已有技能\n无")

    parts.append(
        "\n请根据以上信息，设计一个学习计划。"
        "输出 JSON 格式，包含 chapters 数组，"
        "每个章节包含 title（章节标题）和 objective（学习目标）。"
    )

    return "\n\n".join(parts)


PLAN_OUTPUT_SCHEMA = {
    "type": "object",
    "properties": {
        "chapters": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "objective": {"type": "string"},
                },
                "required": ["title", "objective"],
            },
            "minItems": 1,
        }
    },
    "required": ["chapters"],
}
