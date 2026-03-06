import { generateText, streamText, Output } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { planSchema, assessmentSchema } from '../schemas';
import type { LLMConfig } from '../types';
import {
  PLAN_SYSTEM_PROMPT,
  MATERIAL_SYSTEM_PROMPT,
  ASSESSMENT_SYSTEM_PROMPT,
  buildPlanUserPrompt,
  buildMaterialUserPrompt,
  buildAssessmentUserPrompt,
} from '../lib/prompts';

// Only use the Vite CORS proxy on localhost dev server.
// Tauri production (tauri://), Vercel deployment (https://), and other environments call LLM APIs directly.
const useProxy = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

function getProvider(config: LLMConfig) {
  if (!useProxy) {
    // Production: call the LLM API directly
    return createOpenAICompatible({
      name: 'user-llm',
      baseURL: config.baseUrl.replace(/\/$/, ''),
      apiKey: config.apiKey,
    });
  }

  // Dev mode: route through Vite CORS proxy
  const realBaseUrl = config.baseUrl;
  return createOpenAICompatible({
    name: 'user-llm',
    baseURL: `${window.location.origin}/llm-proxy`,
    apiKey: config.apiKey,
    fetch: (url, init) => {
      const parsedUrl = new URL(url as string, window.location.origin);
      const pathAfterProxy = parsedUrl.pathname.replace('/llm-proxy', '');
      const targetUrl = realBaseUrl.replace(/\/$/, '') + pathAfterProxy;

      return fetch(url, {
        ...init,
        headers: {
          ...(init?.headers as Record<string, string>),
          'X-Target-URL': targetUrl,
        },
      });
    },
  });
}

export async function generatePlan(
  config: LLMConfig,
  goal: string,
  background: string,
  skills: string,
) {
  const provider = getProvider(config);
  const result = await generateText({
    model: provider(config.model),
    system: PLAN_SYSTEM_PROMPT,
    prompt: buildPlanUserPrompt(goal, background, skills),
    experimental_output: Output.object({ schema: planSchema }),
  });
  return result.experimental_output;
}

export function generateMaterial(
  config: LLMConfig,
  chapterTitle: string,
  chapterSummary: string,
  goal: string,
  background: string,
  skills: string,
  abortSignal?: AbortSignal,
) {
  const provider = getProvider(config);
  return streamText({
    model: provider(config.model),
    system: MATERIAL_SYSTEM_PROMPT,
    prompt: buildMaterialUserPrompt(chapterTitle, chapterSummary, goal, background, skills),
    abortSignal,
  });
}

export async function generateAssessment(
  config: LLMConfig,
  chapterTitle: string,
  material: string,
) {
  const provider = getProvider(config);
  const result = await generateText({
    model: provider(config.model),
    system: ASSESSMENT_SYSTEM_PROMPT,
    prompt: buildAssessmentUserPrompt(chapterTitle, material),
    experimental_output: Output.object({ schema: assessmentSchema }),
  });
  return result.experimental_output;
}

export async function testConnection(config: LLMConfig) {
  try {
    const provider = getProvider(config);
    const result = await generateText({
      model: provider(config.model),
      prompt: '请回复"连接成功"四个字。',
      maxTokens: 20,
    });
    return result.text;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`连接失败: ${error.message}`);
    }
    throw new Error('连接失败: 未知错误');
  }
}
