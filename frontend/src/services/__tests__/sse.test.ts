import { streamFetch } from "@/services/sse";

function createReadableStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let index = 0;
  return new ReadableStream({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(encoder.encode(chunks[index]));
        index++;
      } else {
        controller.close();
      }
    },
  });
}

function mockFetchResponse(status: number, body?: ReadableStream<Uint8Array>, jsonBody?: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    body,
    json: () => Promise.resolve(jsonBody ?? {}),
  } as unknown as Response);
}

describe("streamFetch", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("parses chunk events and calls onChunk", async () => {
    const chunks: string[] = [];
    const sseData = [
      "event: chunk\ndata: {\"content\":\"Hello \"}\n\n",
      "event: chunk\ndata: {\"content\":\"World\"}\n\n",
      "event: done\ndata: {\"full_result\":{\"id\":1}}\n\n",
    ];

    const stream = createReadableStream(sseData);
    vi.stubGlobal("fetch", mockFetchResponse(200, stream));

    let doneResult: unknown = null;
    await streamFetch("/test", {
      onChunk: (content) => chunks.push(content),
      onDone: (result) => {
        doneResult = result;
      },
      onError: () => {},
    });

    expect(chunks).toEqual(["Hello ", "World"]);
    expect(doneResult).toEqual({ id: 1 });
  });

  it("parses done events with full_result unwrapping", async () => {
    const sseData = [
      'event: done\ndata: {"full_result":{"id":42,"status":"completed","chapters":[]}}\n\n',
    ];

    const stream = createReadableStream(sseData);
    vi.stubGlobal("fetch", mockFetchResponse(200, stream));

    let doneResult: unknown = null;
    await streamFetch("/test", {
      onDone: (result) => {
        doneResult = result;
      },
      onError: () => {},
    });

    expect(doneResult).toEqual({
      id: 42,
      status: "completed",
      chapters: [],
    });
  });

  it("falls back to parsed data when full_result is absent in done event", async () => {
    const sseData = [
      'event: done\ndata: {"id":7,"name":"fallback"}\n\n',
    ];

    const stream = createReadableStream(sseData);
    vi.stubGlobal("fetch", mockFetchResponse(200, stream));

    let doneResult: unknown = null;
    await streamFetch("/test", {
      onDone: (result) => {
        doneResult = result;
      },
      onError: () => {},
    });

    expect(doneResult).toEqual({ id: 7, name: "fallback" });
  });

  it("handles error events from SSE stream", async () => {
    const sseData = [
      'event: error\ndata: {"code":"rate_limit","message":"Too many requests","retryable":true}\n\n',
    ];

    const stream = createReadableStream(sseData);
    vi.stubGlobal("fetch", mockFetchResponse(200, stream));

    let errorResult: unknown = null;
    await streamFetch("/test", {
      onDone: () => {},
      onError: (error) => {
        errorResult = error;
      },
    });

    expect(errorResult).toEqual({
      code: "rate_limit",
      message: "Too many requests",
      retryable: true,
    });
  });

  it("handles network errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );

    let errorResult: unknown = null;
    await streamFetch("/test", {
      onDone: () => {},
      onError: (error) => {
        errorResult = error;
      },
    });

    expect(errorResult).toEqual({
      code: "network_error",
      message: "网络连接失败",
      retryable: true,
    });
  });

  it("handles HTTP error responses", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchResponse(500, undefined, { detail: "Internal Server Error" }),
    );

    let errorResult: unknown = null;
    await streamFetch("/test", {
      onDone: () => {},
      onError: (error) => {
        errorResult = error;
      },
    });

    expect(errorResult).toEqual({
      code: "http_error",
      message: "Internal Server Error",
      retryable: true,
    });
  });

  it("handles HTTP 4xx as non-retryable", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchResponse(401, undefined, { detail: "Unauthorized" }),
    );

    let errorResult: { code: string; message: string; retryable: boolean } | null = null;
    await streamFetch("/test", {
      onDone: () => {},
      onError: (error) => {
        errorResult = error;
      },
    });

    expect(errorResult).not.toBeNull();
    expect(errorResult!.retryable).toBe(false);
  });

  it("handles missing response body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: null,
      } as unknown as Response),
    );

    let errorResult: unknown = null;
    await streamFetch("/test", {
      onDone: () => {},
      onError: (error) => {
        errorResult = error;
      },
    });

    expect(errorResult).toEqual({
      code: "stream_error",
      message: "无法读取响应流",
      retryable: false,
    });
  });

  it("calls onProgress for progress events", async () => {
    const progressCalls: Array<{ phase: string; message: string }> = [];
    const sseData = [
      'event: progress\ndata: {"phase":"generating","message":"Generating plan..."}\n\n',
      'event: done\ndata: {"full_result":{"id":1}}\n\n',
    ];

    const stream = createReadableStream(sseData);
    vi.stubGlobal("fetch", mockFetchResponse(200, stream));

    await streamFetch("/test", {
      onProgress: (phase, message) =>
        progressCalls.push({ phase, message }),
      onDone: () => {},
      onError: () => {},
    });

    expect(progressCalls).toEqual([
      { phase: "generating", message: "Generating plan..." },
    ]);
  });
});
