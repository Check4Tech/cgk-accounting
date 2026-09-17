/**
 * Minimal static preview server for local development.
 *
 *   node tools/dev-server.mjs        # http://localhost:8080
 *   node tools/dev-server.mjs 3000
 *
 * Serves the repository root, maps /foo to /foo.html, and falls back to
 * 404.html — roughly matching how Netlify serves the deployed site. It does
 * not apply the security headers from netlify.toml; use `netlify dev` for that.
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.argv[2]) || 8080;

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

async function resolveFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0].split("#")[0]);
  const candidates = [clean, clean + ".html", path.posix.join(clean, "index.html")];

  for (const candidate of candidates) {
    const abs = path.join(root, path.normalize(candidate));
    if (!abs.startsWith(root)) continue; // no traversal outside the site
    try {
      const info = await stat(abs);
      if (info.isFile()) return abs;
    } catch {
      /* try the next candidate */
    }
  }
  return null;
}

createServer(async (req, res) => {
  const file = await resolveFile(req.url === "/" ? "/index.html" : req.url);

  if (!file) {
    const notFound = path.join(root, "404.html");
    res.writeHead(404, { "Content-Type": types[".html"] });
    res.end(await readFile(notFound).catch(() => "404"));
    return;
  }

  res.writeHead(200, {
    "Content-Type": types[path.extname(file)] || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  res.end(await readFile(file));
}).listen(port, () => {
  console.log(`CGK Accounting Services → http://localhost:${port}`);
});
