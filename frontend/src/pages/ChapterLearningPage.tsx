import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, ClipboardCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import StreamingContent from "@/components/StreamingContent";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { useStreamStore } from "@/stores/streamStore";
import { request } from "@/services/api";
import { streamFetch } from "@/services/sse";
import type { Chapter, Material } from "@/types";

export default function ChapterLearningPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const chapterId = Number(id);

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [existingMaterial, setExistingMaterial] = useState<Material | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const streamStore = useStreamStore();
  const hasTriggeredGeneration = useRef(false);

  // Fetch chapter info and existing material
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        setLoading(true);
        setFetchError(null);

        const chapterData = await request<Chapter>(
          `/chapters/${chapterId}`
        );
        if (cancelled) return;
        setChapter(chapterData);

        // Try to fetch existing material
        try {
          const materialData = await request<Material>(
            `/chapters/${chapterId}/material`
          );
          if (cancelled) return;
          setExistingMaterial(materialData);
        } catch {
          // No material yet, that's fine
          if (cancelled) return;
          setExistingMaterial(null);
        }
      } catch (err) {
        if (cancelled) return;
        setFetchError(
          err instanceof Error ? err.message : "加载章节信息失败"
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [chapterId]);

  // Auto-trigger material generation if no material exists
  useEffect(() => {
    if (
      !loading &&
      !existingMaterial &&
      !streamStore.isStreaming &&
      !streamStore.content &&
      !fetchError &&
      !hasTriggeredGeneration.current
    ) {
      hasTriggeredGeneration.current = true;
      generateMaterial(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, existingMaterial, fetchError]);

  const generateMaterial = useCallback(
    (isRegenerate: boolean) => {
      streamStore.reset();
      streamStore.setStreaming(true);
      setExistingMaterial(null);

      const path = isRegenerate
        ? `/chapters/${chapterId}/material/regenerate`
        : `/chapters/${chapterId}/material/generate`;

      streamFetch(path, {
        onChunk: (content) => {
          useStreamStore.getState().appendChunk(content);
        },
        onProgress: (_phase, message) => {
          useStreamStore.getState().setProgressMessage(message);
        },
        onDone: (result) => {
          const data = result as { material?: Material } & Material;
          const material = data.material ?? data;
          useStreamStore.getState().setStreaming(false);
          setExistingMaterial(material);
        },
        onError: (error) => {
          useStreamStore.getState().setError(error.message);
        },
      });
    },
    [chapterId, streamStore]
  );

  const handleBack = () => {
    window.history.back();
  };

  const handleStartAssessment = () => {
    navigate(`/chapters/${chapterId}/assessment`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-destructive">{fetchError}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          重试
        </Button>
      </div>
    );
  }

  const isStreaming = streamStore.isStreaming;
  const streamContent = streamStore.content;
  const streamError = streamStore.error;
  const progressMessage = streamStore.progressMessage;

  // Determine what content to show
  const hasStreamedContent = streamContent.length > 0;
  const hasMaterial = existingMaterial && !hasStreamedContent && !isStreaming;
  const showActions = !isStreaming && (hasMaterial || hasStreamedContent);

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
              {chapter?.title ?? "加载中..."}
            </h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto max-w-4xl px-4 py-6">
        {/* Progress message during streaming */}
        {isStreaming && progressMessage && (
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{progressMessage}</span>
          </div>
        )}

        {/* Streaming error */}
        {streamError && (
          <div className="mb-4 p-4 rounded-lg border border-destructive/50 bg-destructive/5">
            <p className="text-destructive text-sm">{streamError}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => generateMaterial(false)}
            >
              重试
            </Button>
          </div>
        )}

        {/* Streaming content (actively streaming or just finished streaming) */}
        {(isStreaming || hasStreamedContent) && <StreamingContent />}

        {/* Existing material (loaded from server, no active stream) */}
        {hasMaterial && (
          <MarkdownRenderer content={existingMaterial.content} />
        )}

        {/* Loading state while generating (no chunks yet) */}
        {isStreaming && !hasStreamedContent && !streamError && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">
                {progressMessage || "正在生成学习材料..."}
              </p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {showActions && (
          <div className="flex items-center justify-center gap-4 mt-8 pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => generateMaterial(true)}
              disabled={isStreaming}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              重新生成
            </Button>
            <Button onClick={handleStartAssessment}>
              <ClipboardCheck className="w-4 h-4 mr-2" />
              开始考核
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
