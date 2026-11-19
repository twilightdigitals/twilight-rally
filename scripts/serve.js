/** Dependency-free, development-only static file server. */
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || 5173);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".wav": "audio/wav",
  ".json": "application/json; charset=utf-8",
};

const cache = new Map();

http
  .createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(
        new URL(request.url, "http://localhost").pathname,
      );
      const relative = pathname === "/" ? "/index.html" : pathname;
      const filename = path.resolve(root, `.${relative}`);
      if (
        !filename.startsWith(`${root}${path.sep}`) ||
        filename.includes(`${path.sep}node_modules${path.sep}`)
      ) {
        response.writeHead(403).end("Forbidden");
        return;
      }
      let contents = cache.get(filename);
      if (!contents) {
        const file = await stat(filename);
        if (!file.isFile()) throw new Error("Not a file");
        contents = await readFile(filename);
        cache.set(filename, contents);
      }
      response.writeHead(200, {
        "Content-Type":
          mime[path.extname(filename)] || "application/octet-stream",
        "Content-Length": contents.length,
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
      });
      response.end(contents);
    } catch (err) {
      console.error("SERVE ERROR:", request.url, err.message);
      response.writeHead(404).end("Not found");
    }
  })
  .listen(port, "0.0.0.0", () => {
    console.log(`Twilight Rally is running at http://localhost:${port}`);
  });
