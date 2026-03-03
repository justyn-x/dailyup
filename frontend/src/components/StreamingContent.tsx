import MarkdownRenderer from "@/components/MarkdownRenderer";
import { useStreamStore } from "@/stores/streamStore";

export default function StreamingContent() {
  const content = useStreamStore((s) => s.content);
  const isStreaming = useStreamStore((s) => s.isStreaming);

  if (!content && !isStreaming) {
    return null;
  }

  return (
    <div className="relative">
      <MarkdownRenderer content={content} />
      {isStreaming && (
        <span
          className="inline-block w-0.5 h-5 bg-indigo-500 align-middle ml-0.5 streaming-cursor"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
