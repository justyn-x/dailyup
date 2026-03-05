export interface Project {
  id: string;
  goal: string;
  background: string;
  skills: string;
  createdAt: string;
  planStatus: 'pending' | 'generating' | 'ready' | 'failed';
}

export interface Question {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  userAnswer?: number;
}

export interface Assessment {
  questions: Question[];
  score?: number;
}

export interface Chapter {
  id: string;
  projectId: string;
  orderIndex: number;
  title: string;
  summary: string;
  status: 'not_started' | 'learning' | 'assessment_completed';
  material: string | null;
  assessment: Assessment | null;
  completedAt?: string;
}

export interface LLMConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface UserProfile {
  nickname: string;
  avatar: string;
}
