/// <reference types="node" />

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const MIME_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
};

type ServerOptions = {
  host: string;
  port: number;
};

function parseArgs(argv: string[]): ServerOptions {
  const options: ServerOptions = {
    host: "127.0.0.1",
    port: 8000,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--host") {
      const nextValue = argv[index + 1];
      if (!nextValue) {
        throw new Error("Missing value for '--host'");
      }
      options.host = nextValue;
      index += 1;
      continue;
    }
    if (arg === "--port") {
      const nextValue = argv[index + 1];
      if (!nextValue) {
        throw new Error("Missing value for '--port'");
      }
      const port = Number.parseInt(nextValue, 10);
      if (!Number.isFinite(port) || port <= 0) {
        throw new Error(`Invalid port '${nextValue}'`);
      }
      options.port = port;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument '${arg}'`);
  }

  return options;
}

const serverRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

function resolveFilePath(requestPath: string): string {
  const normalizedPath = requestPath === "/" ? "/index.html" : requestPath;
  const relativePath = normalizedPath.replace(/^\/+/, "");
  const targetPath = path.resolve(serverRoot, relativePath);
  if (!targetPath.startsWith(serverRoot)) {
    throw new Error("Path traversal is not allowed");
  }
  return targetPath;
}

async function loadResponseBody(requestPath: string) {
  let targetPath = resolveFilePath(requestPath);
  let targetStat = await stat(targetPath).catch(() => null);

  if (targetStat?.isDirectory()) {
    targetPath = path.join(targetPath, "index.html");
    targetStat = await stat(targetPath).catch(() => null);
  }

  if (!targetStat?.isFile()) {
    return null;
  }

  return {
    body: await readFile(targetPath),
    contentType:
      MIME_TYPES[path.extname(targetPath)] ?? "application/octet-stream",
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://static.local");
      const payload = await loadResponseBody(url.pathname);

      if (!payload) {
        // SPA fallback: serve index.html for unknown paths (client-side routing)
        const fallback = await loadResponseBody("/index.html");
        if (fallback) {
          response.writeHead(200, { "Content-Type": fallback.contentType, "Cache-Control": "no-cache" });
          response.end(fallback.body);
          return;
        }
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Not found");
        return;
      }

      response.writeHead(200, {
        "Content-Type": payload.contentType,
        "Cache-Control": "no-cache",
      });
      response.end(payload.body);
    } catch {
      response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Bad request");
    }
  });

  server.listen(options.port, options.host, () => {
    process.stdout.write(
      `Static server listening on http://${options.host}:${options.port}\n`,
    );
  });
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Error: ${message}\n`);
  process.exitCode = 1;
});
