"""Prompt templates for the Answer Evaluator agent role.

This module defines the system prompt, user message builder, and
output JSON schema used when evaluating user answers.
"""

EVALUATION_SYSTEM_PROMPT = (
    "你是一位耐心的评阅老师（Answer Evaluator）。\n"
    "你的任务是逐题评判用户的答案，给出正确答案和详细解析。\n\n"
    "评判原则：\n"
    "1. 选择题：严格判断对错，用户答案必须与正确答案完全一致。\n"
    "2. 填空题：判断用户答案是否在语义上与正确答案一致，允许同义表述。\n"
    "3. 简答题：进行语义评估，不要求逐字匹配，"
    "关注用户是否理解核心概念并正确表达。\n"
    "4. 每道题都要给出详细的解析（explanation），帮助用户理解。\n"
    "5. total_score 为正确题目数占总题目数的比例（0-1 之间的小数）。\n\n"
    "你必须以 JSON 格式输出评判结果，不要包含任何额外的解释文字。"
)


def build_evaluation_user_message(context: dict) -> str:
    """Format the user message for answer evaluation.

    Args:
        context: Dict with keys 'questions', 'user_answers',
                 'chapter_context'.

    Returns:
        Formatted user message string.
    """
    parts = []

    chapter_ctx = context.get("chapter_context", "")
    if chapter_ctx:
        parts.append(f"## 章节信息\n{chapter_ctx}")

    questions = context.get("questions", [])
    user_answers = context.get("user_answers", [])

    parts.append("## 题目与用户答案")

    for i, q in enumerate(questions):
        q_type = q.get("type", "unknown")
        question_text = q.get("question", "")
        correct = q.get("correct_answer", "")

        q_section = f"### 第 {i + 1} 题（{q_type}）\n"
        q_section += f"**题目**：{question_text}\n"

        options = q.get("options", [])
        if options and q_type == "choice":
            for j, opt in enumerate(options):
                label = chr(ord("A") + j)
                q_section += f"  {label}. {opt}\n"

        q_section += f"**正确答案**：{correct}\n"

        answer = user_answers[i] if i < len(user_answers) else "（未作答）"
        q_section += f"**用户答案**：{answer}"

        parts.append(q_section)

    parts.append(
        "\n请逐题评判用户答案，输出 JSON 格式，包含 results 数组和 total_score。"
        "每道题的 result 包含 correct（布尔值）、correct_answer（正确答案）、"
        "explanation（详细解析）。"
    )

    return "\n\n".join(parts)


EVALUATION_OUTPUT_SCHEMA = {
    "type": "object",
    "properties": {
        "results": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "correct": {"type": "boolean"},
                    "correct_answer": {"type": "string"},
                    "explanation": {"type": "string"},
                },
                "required": ["correct", "correct_answer", "explanation"],
            },
        },
        "total_score": {"type": "number", "minimum": 0, "maximum": 1},
    },
    "required": ["results", "total_score"],
}
