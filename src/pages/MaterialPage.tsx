import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { marked } from 'marked';
import { useProject } from '../hooks/useProjects';
import { useChapter } from '../hooks/useChapters';
import { useLLMConfigStore } from '../stores/llmConfigStore';
import { db } from '../db';
import { generateMaterial } from '../services/ai';
import { LoadingBrain } from '../components/ui/LoadingBrain';
import { ErrorDisplay } from '../components/ui/ErrorDisplay';

// Configure marked for GFM (tables, strikethrough, etc.)
marked.setOptions({ gfm: true, breaks: true });

export function MaterialPage() {
  const { projectId, chapterId } = useParams<{ projectId: string; chapterId: string }>();
  const navigate = useNavigate();
  const project = useProject(projectId);
  const chapter = useChapter(chapterId);
  const llmConfig = useLLMConfigStore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [finalHtml, setFinalHtml] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasContent, setHasContent] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const hasStarted = useRef(false);
  const bufferRef = useRef('');
  const contentRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  // rAF loop: flush buffer → marked.parse() → innerHTML (zero React overhead)
  const flushToDOM = useCallback(() => {
    if (contentRef.current && bufferRef.current) {
      contentRef.current.innerHTML = marked.parse(bufferRef.current) as string;
    }
    rafRef.current = requestAnimationFrame(flushToDOM);
  }, []);

  const startGeneration = useCallback(async () => {
    if (!chapter || !project || !chapterId) return;

    setError(null);
    setIsDone(false);
    setFinalHtml('');
    setHasContent(false);
    setIsGenerating(true);
    bufferRef.current = '';

    const abortController = new AbortController();
    abortRef.current = abortController;

    // Start rAF loop
    rafRef.current = requestAnimationFrame(flushToDOM);

    try {
      const result = generateMaterial(
        { baseUrl: llmConfig.baseUrl, apiKey: llmConfig.apiKey, model: llmConfig.model },
        chapter.title,
        chapter.summary,
        project.goal,
        project.background,
        project.skills,
        abortController.signal,
      );

      await db.chapters.update(chapterId, { status: 'learning' });

      for await (const chunk of result.textStream) {
        if (abortController.signal.aborted) break;
        bufferRef.current += chunk;
        if (!hasContent) setHasContent(true);
      }

      if (!abortController.signal.aborted) {
        const fullText = bufferRef.current;
        await db.chapters.update(chapterId, { material: fullText });
        // Final render with marked
        setFinalHtml(marked.parse(fullText) as string);
        setIsDone(true);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error('Material generation failed:', err);
      setError(err instanceof Error ? err.message : '生成学习材料失败');
    } finally {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setIsGenerating(false);
      abortRef.current = null;
    }
  }, [chapter, project, chapterId, llmConfig, flushToDOM, hasContent]);

  // Auto-start or load existing material
  useEffect(() => {
    if (chapter && !chapter.material && !hasStarted.current && !isGenerating) {
      hasStarted.current = true;
      startGeneration();
    }
    if (chapter?.material) {
      setFinalHtml(marked.parse(chapter.material) as string);
      setIsDone(true);
      setHasContent(true);
    }
  }, [chapter, isGenerating, startGeneration]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (!chapter || !project) {
    return <div className="text-slate-400 text-center py-10">加载中...</div>;
  }

  const hasMaterial = !!chapter.material;

  return (
    <div className="max-w-[720px] mx-auto">
      <header className="flex items-center mb-4 pb-2 border-b border-slate-100">
        <button
          onClick={() => {
            if (abortRef.current) abortRef.current.abort();
            navigate(`/project/${projectId}`, { replace: true });
          }}
          className="p-2 -ml-2 text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          <FontAwesomeIcon icon="arrow-left" />
        </button>
        <h2 className="ml-2 text-lg font-extrabold text-slate-900 truncate">{chapter.title}</h2>
      </header>

      {error && !isGenerating && !hasMaterial && (
        <ErrorDisplay message={error} onRetry={() => { hasStarted.current = false; startGeneration(); }} />
      )}

      {isGenerating && !hasContent && !error && (
        <LoadingBrain
          messages={['正在组织知识结构...', '生成学习内容...', '添加示例和说明...', '优化内容排版...']}
          subtitle="AI 正在为你生成学习材料"
        />
      )}

      {/* Streaming: marked.parse() + DOM ref, 60fps, zero React re-render */}
      {isGenerating && hasContent && (
        <div>
          <div
            ref={contentRef}
            className="material-content streaming-cursor"
          />
        </div>
      )}

      {/* Done: final marked HTML (one-time) */}
      {isDone && !isGenerating && finalHtml && (
        <div>
          <div
            className="material-content"
            dangerouslySetInnerHTML={{ __html: finalHtml }}
          />
          <div className="mt-8 mb-4 pt-6 border-t border-slate-100 flex justify-between items-center">
            <button
              onClick={() => navigate(`/project/${projectId}`, { replace: true })}
              className="text-slate-400 text-sm font-bold hover:text-slate-600 transition-colors"
            >
              <FontAwesomeIcon icon="arrow-left" className="mr-1" />
              返回章节列表
            </button>
            <button
              onClick={() => navigate(`/project/${projectId}/chapter/${chapterId}/assessment`)}
              className="bg-indigo-600 text-white font-bold text-sm px-6 py-3 rounded-xl transition-all hover:opacity-90 hover:-translate-y-px hover:shadow-lg active:translate-y-0"
            >
              开始考核
              <FontAwesomeIcon icon="arrow-right" className="ml-2" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
