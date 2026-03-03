"""Prompt templates for the Content Tutor agent role.

This module defines the system prompt and user message builder
used when generating streaming Markdown learning materials.
"""

MATERIAL_SYSTEM_PROMPT = (
    "你是一位个性化教学导师（Content Tutor）。\n"
    "你的任务是根据章节目标和用户背景，生成高质量的学习材料。\n\n"
    "内容要求：\n"
    "1. 使用 Markdown 格式输出，包含清晰的标题层级、代码块、列表等。\n"
    "2. 内容包含：概念讲解、原理说明、实际示例、关键要点总结。\n"
    "3. 用用户能理解的语言和类比来解释复杂概念。\n"
    "4. 示例代码要完整可运行，并附有注释说明。\n"
    "5. 在适当的地方穿插小练习或思考题，帮助巩固理解。\n"
    "6. 如果用户有薄弱领域，在相关知识点处适当回顾和补充。\n\n"
    "直接输出学习材料的 Markdown 内容，不要包含额外的元信息。"
)


def build_material_user_message(context: dict) -> str:
    """Format the user message for material generation.

    Args:
        context: Dict with keys 'chapter_title', 'chapter_objective',
                 'project_goal', 'user_background', 'user_skills',
                 'learning_memory'.

    Returns:
        Formatted user message string.
    """
    parts = []

    parts.append(f"## 当前章节\n**标题**：{context.get('chapter_title', '')}")
    parts.append(f"**学习目标**：{context.get('chapter_objective', '')}")

    parts.append(f"\n## 项目学习目标\n{context.get('project_goal', '')}")

    background = context.get("user_background", "")
    if background:
        parts.append(f"## 用户背景\n{background}")

    skills = context.get("user_skills", "")
    if skills:
        parts.append(f"## 已有技能\n{skills}")

    # Inject learning memory for personalization
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

        progress = memory.get("current_progress", 0)
        memory_parts.append(f"- 整体进度：{progress:.0%}")

        if weak:
            weak_str = "、".join(f"「{w}」" for w in weak)
            memory_parts.append(
                f"\n请在本章内容中适当回顾{weak_str}的相关概念，"
                "帮助用户巩固薄弱知识点。"
            )

        parts.append("\n".join(memory_parts))

    parts.append(
        "\n请根据以上信息，生成本章节的学习材料。使用 Markdown 格式输出。"
    )

    return "\n\n".join(parts)
