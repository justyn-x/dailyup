import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import AssessmentForm from "@/components/AssessmentForm";
import AssessmentResultView from "@/components/AssessmentResult";
import { useStreamStore } from "@/stores/streamStore";
import { request } from "@/services/api";
import { streamFetch } from "@/services/sse";
import type {
  Chapter,
  Assessment,
  AssessmentResult,
} from "@/types";

type PageState =
  | { phase: "loading" }
  | { phase: "generating" }
  | { phase: "quiz"; assessment: Assessment }
  | { phase: "submitting" }
  | { phase: "results"; result: AssessmentResult }
  | { phase: "error"; message: string };

export default function ChapterAssessmentPage() {
  const { id } = useParams<{ id: string }>();
  const chapterId = Number(id);

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [pageState, setPageState] = useState<PageState>({ phase: "loading" });
  const streamStore = useStreamStore();
  const hasTriggeredGeneration = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const abortStream = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, []);

  // Fetch chapter and existing assessment on mount
  useEffect(() => {
    let cancelled = false;

    // Abort previous stream and reset when chapter changes
    abortStream();
    streamStore.reset();
    hasTriggeredGeneration.current = false;

    async function fetchData() {
      try {
        const chapterData = await request<Chapter>(
          `/chapters/${chapterId}`
        );
        if (cancelled) return;
        setChapter(chapterData);

        // Check if an assessment already exists
        try {
          const assessment = await request<Assessment>(
            `/chapters/${chapterId}/assessment`
          );
          if (cancelled) return;

          if (assessment.status === "submitted") {
            // Assessment was already submitted, fetch result
            try {
              const result = await request<AssessmentResult>(
                `/assessments/${assessment.id}/result`
              );
              if (cancelled) return;
              setPageState({ phase: "results", result });
            } catch {
              // Result not found, show the assessment for re-submission
              if (cancelled) return;
              setPageState({ phase: "quiz", assessment });
            }
          } else {
            // Assessment exists but not submitted yet
            if (cancelled) return;
            setPageState({ phase: "quiz", assessment });
          }
        } catch {
          // No assessment exists, need to generate
          if (cancelled) return;
          setPageState({ phase: "generating" });
        }
      } catch (err) {
        if (cancelled) return;
        setPageState({
          phase: "error",
          message: err instanceof Error ? err.message : "加载失败",
        });
      }
    }

    fetchData();
    return () => {
      cancelled = true;
      abortStream();
    };
  }, [chapterId]);

  // Auto-trigger assessment generation
  useEffect(() => {
    if (
      pageState.phase === "generating" &&
      !hasTriggeredGeneration.current
    ) {
      hasTriggeredGeneration.current = true;
      generateAssessment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageState.phase]);

  const generateAssessment = useCallback(() => {
    abortStream();
    streamStore.reset();
    streamStore.setStreaming(true);
    streamStore.setProgressMessage("正在生成考核题目...");

    const controller = new AbortController();
    abortControllerRef.current = controller;

    streamFetch(`/chapters/${chapterId}/assessment`, {
      signal: controller.signal,
      onProgress: (_phase, message) => {
        useStreamStore.getState().setProgressMessage(message);
      },
      onDone: (result) => {
        useStreamStore.getState().setStreaming(false);
        const data = result as { assessment?: Assessment } & Assessment;
        const assessment = data.assessment ?? data;
        setPageState({ phase: "quiz", assessment });
      },
      onError: (error) => {
        useStreamStore.getState().setError(error.message);
        setPageState({ phase: "error", message: error.message });
      },
    });
  }, [chapterId, streamStore, abortStream]);

  const handleSubmit = useCallback(
    (answers: string[]) => {
      if (pageState.phase !== "quiz") return;
      const assessment = pageState.assessment;

      abortStream();
      setPageState({ phase: "submitting" });
      streamStore.reset();
      streamStore.setStreaming(true);
      streamStore.setProgressMessage("正在评判答案...");

      const controller = new AbortController();
      abortControllerRef.current = controller;

      streamFetch(`/assessments/${assessment.id}/submit`, {
        body: { answers },
        signal: controller.signal,
        onProgress: (_phase, message) => {
          useStreamStore.getState().setProgressMessage(message);
        },
        onDone: (result) => {
          useStreamStore.getState().setStreaming(false);
          const data = result as { result?: AssessmentResult } & AssessmentResult;
          const assessmentResult = data.result ?? data;
          setPageState({ phase: "results", result: assessmentResult });
        },
        onError: (error) => {
          useStreamStore.getState().setError(error.message);
          setPageState({ phase: "error", message: error.message });
        },
      });
    },
    [pageState, streamStore, abortStream]
  );

  const handleBack = () => {
    window.history.back();
  };

  const progressMessage = streamStore.progressMessage;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto max-w-4xl flex items-center gap-4 h-14 px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold truncate">
              {chapter ? `${chapter.title} - 考核` : "加载中..."}
            </h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto max-w-4xl px-4 py-6">
        {/* Loading state */}
        {pageState.phase === "loading" && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Generating assessment */}
        {pageState.phase === "generating" && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">
                {progressMessage || "正在生成考核题目..."}
              </p>
            </div>
          </div>
        )}

        {/* Submitting answers */}
        {pageState.phase === "submitting" && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">
                {progressMessage || "正在评判答案..."}
              </p>
            </div>
          </div>
        )}

        {/* Quiz form */}
        {pageState.phase === "quiz" && (
          <AssessmentForm
            questions={pageState.assessment.questions}
            onSubmit={handleSubmit}
          />
        )}

        {/* Results */}
        {pageState.phase === "results" && (
          <div className="space-y-6">
            <AssessmentResultView result={pageState.result} />
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回章节
              </Button>
            </div>
          </div>
        )}

        {/* Error state */}
        {pageState.phase === "error" && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <p className="text-destructive">{pageState.message}</p>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
            >
              重试
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
