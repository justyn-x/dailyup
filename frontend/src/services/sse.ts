const API_BASE = "/api";

interface StreamFetchOptions {
  method?: "GET" | "POST";
  body?: unknown;
  onChunk?: (content: string) => void;
  onProgress?: (phase: string, message: string) => void;
  onDone: (result: unknown) => void;
  onError: (error: {
    code: string;
    message: string;
    retryable: boolean;
  }) => void;
}

export async function streamFetch(
  path: string,
  options: StreamFetchOptions,
): Promise<void> {
  const { method = "POST", body, onChunk, onProgress, onDone, onError } =
    options;

  const fetchOptions: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body !== undefined) {
    fetchOptions.body = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, fetchOptions);
  } catch {
    onError({
      code: "network_error",
      message: "网络连接失败",
      retryable: true,
    });
    return;
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    onError({
      code: "http_error",
      message: errorData.detail || `HTTP ${response.status}`,
      retryable: response.status >= 500,
    });
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    onError({
      code: "stream_error",
      message: "无法读取响应流",
      retryable: false,
    });
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      let currentEvent = "";
      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          const data = line.slice(6);
          try {
            const parsed = JSON.parse(data);
            switch (currentEvent) {
              case "chunk":
                onChunk?.(parsed.content);
                break;
              case "progress":
                onProgress?.(parsed.phase, parsed.message);
                break;
              case "done":
                onDone(parsed.full_result ?? parsed);
                return;
              case "error":
                onError(parsed);
                return;
            }
          } catch {
            // Skip malformed JSON lines
          }
        } else if (line === "") {
          currentEvent = "";
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
