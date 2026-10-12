#!/usr/bin/env node
/**
 * Minimal static file server for previewing dist/ locally.
 *
 * Dependency-free, like build.js — avoids relying on `python3 -m http.server`,
 * which isn't installed on every machine (Windows ships a Store-alias stub
 * that errors instead of running Python).
 *
 * Usage: node serve.js [port] [directory]
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname } from "node:path";

const port = Number(process.argv[2]) || 3000;
const root = process.argv[3] || "dist";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

async function resolveFile(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  let candidate = join(root, decoded);

  try {
    const info = await stat(candidate);
    if (info.isDirectory()) candidate = join(candidate, "index.html");
  } catch {
    if (!extname(candidate)) candidate = `${candidate}.html`;
  }

  return candidate;
}

const server = createServer(async (req, res) => {
  const filePath = await resolveFile(req.url || "/");

  try {
    const body = await readFile(filePath);
    res.writeHead(200, { "Content-Type": MIME_TYPES[extname(filePath)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 Not Found");
  }
});

server.listen(port, () => {
  console.log(`Serving ${root}/ at http://localhost:${port}`);
});
