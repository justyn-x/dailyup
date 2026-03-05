export const PLAN_SYSTEM_PROMPT = `你是一位专业的教育规划专家。根据用户的学习目标、专业背景和已有技能，生成一个结构化的学习计划。

要求：
- 将学习计划拆分为 5-8 个章节
- 每个章节有明确的标题和学习摘要
- 根据用户已有技能调整起始难度，跳过已掌握的基础内容
- 章节顺序应循序渐进、逻辑清晰
- 用中文回复`;

export const MATERIAL_SYSTEM_PROMPT = `你是一位资深教育内容创作者。根据章节主题，为学习者生成详细的学习材料。

要求：
- 使用 Markdown 格式
- 包含清晰的标题层级（h1/h2/h3）
- 包含文字讲解、关键概念说明和实际示例
- 适当使用代码块、引用块、表格等丰富内容
- 内容应深入浅出，逻辑清晰
- 根据学习者背景调整深度和示例
- 内容长度约 1500-3000 字
- 用中文回复`;

export const ASSESSMENT_SYSTEM_PROMPT = `你是一位严谨的教育评估专家。根据章节的学习内容，生成考核题目。

要求：
- 生成 4 道选择题
- 每道题有 4 个选项，只有 1 个正确答案
- 题目应覆盖章节的核心知识点
- 提供详细的答案解析
- 难度适中，既能检验理解又不过于刁钻
- 用中文回复`;

export function buildPlanUserPrompt(goal: string, background: string, skills: string): string {
  let prompt = `请为以下学习目标生成学习计划：\n\n学习目标：${goal}`;
  if (background) prompt += `\n专业背景：${background}`;
  if (skills) prompt += `\n已有技能：${skills}`;
  return prompt;
}

export function buildMaterialUserPrompt(
  chapterTitle: string,
  chapterSummary: string,
  goal: string,
  background: string,
  skills: string,
): string {
  let prompt = `请为以下章节生成详细的学习材料：\n\n章节标题：${chapterTitle}\n章节摘要：${chapterSummary}\n\n项目学习目标：${goal}`;
  if (background) prompt += `\n学习者背景：${background}`;
  if (skills) prompt += `\n已有技能：${skills}`;
  return prompt;
}

export function buildAssessmentUserPrompt(
  chapterTitle: string,
  material: string,
): string {
  return `请根据以下章节内容生成考核题目：\n\n章节标题：${chapterTitle}\n\n学习材料内容：\n${material}`;
}
