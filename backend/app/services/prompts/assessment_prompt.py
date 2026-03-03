"""Prompt templates for the Assessment Designer agent role.

This module defines the system prompt, user message builder, and
output JSON schema used when generating chapter assessments.
"""

ASSESSMENT_SYSTEM_PROMPT = (
    "你是一位考核设计专家（Assessment Designer）。\n"
    "你的任务是根据章节内容生成覆盖核心知识点的考核题目。\n\n"
    "设计原则：\n"
    "1. 题目覆盖章节的关键知识点，避免偏题。\n"
    "2. 支持多种题型：选择题（choice）、填空题（fill_blank）、简答题（short_answer）。\n"
    "3. 选择题必须提供 4 个选项（options），其他题型 options 为空数组。\n"
    "4. 每道题都要提供正确答案（correct_answer）和解析（explanation）。\n"
    "5. 难度匹配用户水平，如果用户有薄弱领域则适当增加相关题目。\n"
    "6. 通常生成 5-8 道题目，混合不同题型。\n\n"
    "你必须以 JSON 格式输出题目，不要包含任何额外的解释文字。"
)


def build_assessment_user_message(context: dict) -> str:
    """Format the user message for assessment generation.

    Args:
        context: Dict with keys 'chapter_title', 'chapter_objective',
                 'material_summary', 'user_background', 'learning_memory'.

    Returns:
        Formatted user message string.
    """
    parts = []

    parts.append(f"## 当前章节\n**标题**：{context.get('chapter_title', '')}")
    parts.append(f"**学习目标**：{context.get('chapter_objective', '')}")

    material_summary = context.get("material_summary", "")
    if material_summary:
        parts.append(f"## 章节学习材料摘要\n{material_summary}")

    background = context.get("user_background", "")
    if background:
        parts.append(f"## 用户背景\n{background}")

    # Inject learning memory to adjust difficulty
    memory = context.get("learning_memory")
    if memory:
        memory_parts = ["## 用户学习轨迹"]

        completed = memory.get("completed_chapters", [])
        if completed:
            chapter_list = "、".join(
                f"{ch['title']}（得分 {ch['score']:.0%}）" if ch.get("score") is not None
                else ch["title"]
                for ch in completed
            )
            memory_parts.append(f"- 已完成章节：{chapter_list}")

        weak = memory.get("weak_areas", [])
        if weak:
            memory_parts.append(f"- 薄弱领域：{'、'.join(weak)}")
            memory_parts.append(
                f"\n请针对薄弱领域「{'、'.join(weak)}」适当增加相关考核题目。"
            )

        parts.append("\n".join(memory_parts))

    parts.append(
        "\n请根据以上信息，生成本章节的考核题目。"
        "输出 JSON 格式，包含 questions 数组，"
        "每道题包含 type、question、options、correct_answer、explanation 字段。"
    )

    return "\n\n".join(parts)


ASSESSMENT_OUTPUT_SCHEMA = {
    "type": "object",
    "properties": {
        "questions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "type": {
                        "type": "string",
                        "enum": ["choice", "fill_blank", "short_answer"],
                    },
                    "question": {"type": "string"},
                    "options": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Required for choice type, empty array for others",
                    },
                    "correct_answer": {"type": "string"},
                    "explanation": {"type": "string"},
                },
                "required": ["type", "question", "correct_answer"],
            },
            "minItems": 1,
        }
    },
    "required": ["questions"],
}
