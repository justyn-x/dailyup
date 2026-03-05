import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const host = process.env.TAURI_DEV_HOST;

/**
 * Vite plugin: LLM CORS proxy
 * 前端请求 /llm-proxy，通过 X-Target-URL header 指定真实 API 地址，
 * 由 dev server 转发请求，绕开浏览器 CORS 限制。
 */
function llmProxyPlugin(): Plugin {
  return {
    name: "llm-cors-proxy",
    configureServer(server) {
      server.middlewares.use("/llm-proxy", async (req, res) => {
        // Handle CORS preflight first
        if (req.method === "OPTIONS") {
          res.writeHead(204, {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "*",
            "access-control-allow-headers": "*",
            "access-control-max-age": "86400",
          });
          res.end();
          return;
        }

        const targetUrl = req.headers["x-target-url"] as string | undefined;
        if (!targetUrl) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing X-Target-URL header" }));
          return;
        }

        // Collect request body
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(chunk as Buffer);
        }
        const body = Buffer.concat(chunks);

        // Forward headers, stripping hop-by-hop and proxy-specific ones
        const forwardHeaders: Record<string, string> = {};
        for (const [key, value] of Object.entries(req.headers)) {
          const lower = key.toLowerCase();
          if (
            lower === "host" ||
            lower === "x-target-url" ||
            lower === "connection" ||
            lower === "transfer-encoding"
          )
            continue;
          if (value) forwardHeaders[key] = Array.isArray(value) ? value.join(", ") : value;
        }

        let headersSent = false;
        try {
          const response = await fetch(targetUrl, {
            method: req.method || "POST",
            headers: forwardHeaders,
            body: body.length > 0 ? body : undefined,
          });

          // Check if streaming response
          const contentType = response.headers.get("content-type") || "";

          // Write status and headers
          const resHeaders: Record<string, string> = {};
          response.headers.forEach((v, k) => {
            const lower = k.toLowerCase();
            // Skip CORS headers from upstream — we set our own
            if (lower.startsWith("access-control-")) return;
            // Node fetch auto-decompresses, so strip encoding/length to avoid mismatch
            if (lower === "content-encoding" || lower === "content-length") return;
            resHeaders[k] = v;
          });
          resHeaders["access-control-allow-origin"] = "*";
          resHeaders["access-control-allow-headers"] = "*";
          resHeaders["access-control-allow-methods"] = "*";

          res.writeHead(response.status, resHeaders);
          headersSent = true;

          if (contentType.includes("text/event-stream") || contentType.includes("stream")) {
            // Stream the response
            const reader = response.body?.getReader();
            if (reader) {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(value);
              }
            }
            res.end();
          } else {
            const data = await response.arrayBuffer();
            res.end(Buffer.from(data));
          }
        } catch (err: unknown) {
          if (headersSent) {
            // Headers already sent, just close the connection
            res.end();
            return;
          }
          res.writeHead(502, {
            "Content-Type": "application/json",
            "access-control-allow-origin": "*",
          });
          res.end(
            JSON.stringify({
              error: "Proxy request failed",
              message: err instanceof Error ? err.message : String(err),
            }),
          );
        }
      });
    },
  };
}

export default defineConfig(async () => ({
  plugins: [react(), tailwindcss(), llmProxyPlugin()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
