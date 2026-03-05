import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useProject } from '../hooks/useProjects';
import { useChapter } from '../hooks/useChapters';
import { useLLMConfigStore } from '../stores/llmConfigStore';
import { db } from '../db';
import { generateAssessment } from '../services/ai';
import { LoadingBrain } from '../components/ui/LoadingBrain';
import { ErrorDisplay } from '../components/ui/ErrorDisplay';
import type { Question } from '../types';

export function AssessmentPage() {
  const { projectId, chapterId } = useParams<{ projectId: string; chapterId: string }>();
  const navigate = useNavigate();
  const project = useProject(projectId);
  const chapter = useChapter(chapterId);
  const llmConfig = useLLMConfigStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const questions: Question[] = chapter?.assessment?.questions ?? [];
  const hasAssessment = questions.length > 0;

  const startAssessment = useCallback(async () => {
    if (!chapter || !chapterId || !chapter.material) return;

    setError(null);
    setIsLoading(true);

    try {
      const result = await generateAssessment(
        { baseUrl: llmConfig.baseUrl, apiKey: llmConfig.apiKey, model: llmConfig.model },
        chapter.title,
        chapter.material,
      );

      if (!result || !result.questions || result.questions.length === 0) {
        setError('生成的考核题目为空');
        return;
      }

      await db.chapters.update(chapterId, {
        assessment: { questions: result.questions },
      });
    } catch (err) {
      console.error('Assessment generation failed:', err);
      setError(err instanceof Error ? err.message : '生成考核题目失败');
    } finally {
      setIsLoading(false);
    }
  }, [chapter, chapterId, llmConfig]);

  // Auto-start if no assessment
  const hasStartedRef = useRef(false);
  useEffect(() => {
    if (chapter && !chapter.assessment && !hasStartedRef.current && !isLoading) {
      hasStartedRef.current = true;
      startAssessment();
    }
    // If assessment already completed, show result directly
    if (chapter?.assessment?.score !== undefined) {
      setShowResult(true);
    }
  }, [chapter, isLoading, startAssessment]);

  if (!chapter || !project) {
    return <div className="text-slate-400 text-center py-10">加载中...</div>;
  }

  async function handleSelectAnswer(answerIdx: number) {
    if (submitted) return;
    setSelectedAnswer(answerIdx);
  }

  async function handleSubmitAnswer() {
    if (selectedAnswer === null || !chapterId) return;
    setSubmitted(true);

    // Save user answer
    const updatedQuestions = [...questions];
    updatedQuestions[currentIdx] = { ...updatedQuestions[currentIdx], userAnswer: selectedAnswer };

    await db.chapters.update(chapterId, {
      assessment: { ...chapter!.assessment!, questions: updatedQuestions },
    });
  }

  function handleNext() {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setSelectedAnswer(null);
      setSubmitted(false);
    } else {
      // Calculate score and finish
      finishAssessment();
    }
  }

  async function finishAssessment() {
    if (!chapterId || !chapter?.assessment) return;

    const qs = chapter.assessment.questions;
    const correct = qs.filter((q) => q.userAnswer === q.correctIndex).length;
    const score = Math.round((correct / qs.length) * 100);

    await db.chapters.update(chapterId, {
      status: 'assessment_completed',
      assessment: { ...chapter.assessment, score },
      completedAt: new Date().toISOString(),
    });

    setShowResult(true);
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-[640px] mx-auto">
        <header className="flex items-center mb-4">
          <button
            onClick={() => navigate(`/project/${projectId}`)}
            className="p-2 -ml-2 text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <FontAwesomeIcon icon="arrow-left" />
          </button>
          <h2 className="ml-2 text-lg font-extrabold text-slate-900 truncate">章节考核</h2>
        </header>
        <LoadingBrain
          messages={['分析章节内容...', '设计考核题目...', '生成答案解析...', '校验题目质量...']}
          subtitle="AI 正在为你生成考核题目"
        />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-[640px] mx-auto">
        <header className="flex items-center mb-4">
          <button
            onClick={() => navigate(`/project/${projectId}`)}
            className="p-2 -ml-2 text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <FontAwesomeIcon icon="arrow-left" />
          </button>
          <h2 className="ml-2 text-lg font-extrabold text-slate-900 truncate">章节考核</h2>
        </header>
        <ErrorDisplay message={error} onRetry={() => { hasStartedRef.current = false; startAssessment(); }} />
      </div>
    );
  }

  // Result state
  if (showResult && chapter.assessment) {
    const qs = chapter.assessment.questions;
    const correct = qs.filter((q) => q.userAnswer === q.correctIndex).length;
    const score = chapter.assessment.score ?? Math.round((correct / qs.length) * 100);

    return (
      <div className="max-w-[640px] mx-auto">
        <header className="flex items-center mb-6">
          <button
            onClick={() => navigate(`/project/${projectId}`)}
            className="p-2 -ml-2 text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <FontAwesomeIcon icon="arrow-left" />
          </button>
          <h2 className="ml-2 text-lg font-extrabold text-slate-900 truncate">考核结果</h2>
        </header>

        {/* Score card */}
        <div className="bg-gradient-to-br from-indigo-500 to-violet-500 rounded-[2rem] p-8 text-white text-center mb-6 shadow-lg shadow-indigo-200/50">
          <p className="text-[10px] font-extrabold opacity-70 uppercase tracking-widest mb-3">得分</p>
          <span className="text-5xl font-extrabold italic">{score}</span>
          <span className="text-lg font-bold ml-1">分</span>
          <p className="text-xs opacity-70 mt-2">{correct}/{qs.length} 题正确</p>
        </div>

        {/* Question review */}
        <div className="space-y-4">
          {qs.map((q, idx) => {
            const isCorrect = q.userAnswer === q.correctIndex;
            return (
              <div key={idx} className="bg-white rounded-2xl p-5 border border-slate-100">
                <div className="flex items-start gap-3 mb-3">
                  <FontAwesomeIcon
                    icon={isCorrect ? 'check-circle' : 'times-circle'}
                    className={`mt-0.5 ${isCorrect ? 'text-green-500' : 'text-red-400'}`}
                  />
                  <p className="text-sm font-bold text-slate-800">{q.question}</p>
                </div>
                <div className="space-y-2 ml-7">
                  {q.options.map((opt, optIdx) => {
                    let optClass = 'text-slate-500';
                    if (optIdx === q.correctIndex) optClass = 'text-green-600 font-bold';
                    if (optIdx === q.userAnswer && optIdx !== q.correctIndex) optClass = 'text-red-400 line-through';
                    return (
                      <p key={optIdx} className={`text-xs ${optClass}`}>
                        {String.fromCharCode(65 + optIdx)}. {opt}
                      </p>
                    );
                  })}
                </div>
                <div className="mt-3 ml-7 bg-indigo-50 rounded-xl p-3">
                  <p className="text-xs text-indigo-700 font-bold">{q.explanation}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 mb-4">
          <button
            onClick={() => navigate(`/project/${projectId}`)}
            className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl transition-all hover:opacity-90 hover:-translate-y-px hover:shadow-lg active:translate-y-0"
          >
            返回章节列表
          </button>
        </div>
      </div>
    );
  }

  // Quiz state
  if (!hasAssessment) {
    return <div className="text-slate-400 text-center py-10">加载中...</div>;
  }

  const currentQ = questions[currentIdx];

  return (
    <div className="max-w-[640px] mx-auto">
      <header className="flex items-center mb-4">
        <button
          onClick={() => navigate(`/project/${projectId}`)}
          className="p-2 -ml-2 text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          <FontAwesomeIcon icon="arrow-left" />
        </button>
        <h2 className="ml-2 text-lg font-extrabold text-slate-900 truncate">{chapter.title} - 考核</h2>
      </header>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-6">
        {questions.map((_, idx) => (
          <div
            key={idx}
            className={`h-1.5 flex-1 rounded-full transition-all ${
              idx < currentIdx
                ? 'bg-indigo-500'
                : idx === currentIdx
                  ? 'bg-indigo-300'
                  : 'bg-slate-100'
            }`}
          />
        ))}
        <span className="text-[10px] font-bold text-slate-400 ml-1">
          {currentIdx + 1}/{questions.length}
        </span>
      </div>

      {/* Question */}
      <div className="mb-6">
        <p className="text-base font-bold text-slate-800">{currentQ.question}</p>
      </div>

      {/* Options */}
      <div className="space-y-3 mb-6">
        {currentQ.options.map((opt, optIdx) => {
          let className = 'quiz-option rounded-2xl p-4 flex items-center gap-3';
          if (submitted) {
            className += ' disabled';
            if (optIdx === currentQ.correctIndex) className += ' correct';
            else if (optIdx === selectedAnswer && optIdx !== currentQ.correctIndex) className += ' incorrect';
          } else if (optIdx === selectedAnswer) {
            className += ' selected';
          }

          return (
            <div
              key={optIdx}
              className={className}
              onClick={() => handleSelectAnswer(optIdx)}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                optIdx === selectedAnswer
                  ? 'bg-indigo-100 text-indigo-600'
                  : 'bg-slate-50 text-slate-400'
              }`}>
                {String.fromCharCode(65 + optIdx)}
              </div>
              <span className="text-sm font-bold text-slate-700">{opt}</span>
            </div>
          );
        })}
      </div>

      {/* Explanation */}
      {submitted && (
        <div className="mb-6 bg-indigo-50 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <FontAwesomeIcon
              icon={selectedAnswer === currentQ.correctIndex ? 'check-circle' : 'times-circle'}
              className={selectedAnswer === currentQ.correctIndex ? 'text-green-500' : 'text-red-400'}
            />
            <span className={`text-sm font-bold ${selectedAnswer === currentQ.correctIndex ? 'text-green-600' : 'text-red-500'}`}>
              {selectedAnswer === currentQ.correctIndex ? '回答正确！' : '回答错误'}
            </span>
          </div>
          <p className="text-xs text-indigo-700 font-bold">{currentQ.explanation}</p>
        </div>
      )}

      {/* Actions */}
      {!submitted ? (
        <button
          onClick={handleSubmitAnswer}
          disabled={selectedAnswer === null}
          className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl transition-all hover:opacity-90 hover:-translate-y-px hover:shadow-lg active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          确认答案
        </button>
      ) : (
        <button
          onClick={handleNext}
          className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl transition-all hover:opacity-90 hover:-translate-y-px hover:shadow-lg active:translate-y-0"
        >
          {currentIdx < questions.length - 1 ? '下一题' : '查看结果'}
          <FontAwesomeIcon icon="arrow-right" className="ml-2" />
        </button>
      )}
    </div>
  );
}
