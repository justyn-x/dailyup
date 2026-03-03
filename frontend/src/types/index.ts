export interface Settings {
  api_base_url: string;
  api_key_masked: string;
  model_name: string;
  is_configured: boolean;
}

export interface UpdateSettingsRequest {
  api_base_url: string;
  api_key: string;
  model_name: string;
}

export interface CreateProjectRequest {
  goal: string;
  background: string;
  skills: string;
}

export interface Project {
  id: number;
  goal: string;
  background: string;
  skills: string;
  progress: number;
  created_at: string;
}

export interface ChapterSummary {
  id: number;
  order_index: number;
  title: string;
  objective: string;
  status: string;
  score: number | null;
}

export interface Plan {
  id: number;
  project_id: number;
  status: string;
  chapters: ChapterSummary[];
}

export interface ProjectDetail {
  id: number;
  goal: string;
  background: string;
  skills: string;
  progress: number;
  created_at: string;
  plan: Plan | null;
}

export interface Chapter {
  id: number;
  plan_id: number;
  order_index: number;
  title: string;
  objective: string;
  status: string;
  created_at: string;
}

export interface Material {
  id: number;
  chapter_id: number;
  content: string;
  created_at: string;
}

export interface QuestionItem {
  type: string;
  question: string;
  options?: string[];
  correct_answer: string;
  explanation?: string;
}

export interface Assessment {
  id: number;
  chapter_id: number;
  questions: QuestionItem[];
  status: string;
  created_at: string;
}

export interface ResultItem {
  correct: boolean;
  correct_answer: string;
  explanation: string;
}

export interface AssessmentResult {
  id: number;
  chapter_id: number;
  questions: QuestionItem[];
  user_answers: string[];
  results: ResultItem[];
  score: number;
  status: string;
  submitted_at: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public data: Record<string, unknown>,
  ) {
    super(`API Error ${status}`);
    this.name = "ApiError";
  }
}
