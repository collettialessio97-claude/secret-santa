// Server locale per provare l'app senza Netlify: `npm run dev` → http://localhost:8888
import http from "node:http";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { join, extname, normalize } from "node:path";
import config from "./config.mjs";
import { createApi } from "./netlify/functions/lib/core.mjs";

const DATA = ".data";
const fileOf = (k) => join(DATA, encodeURIComponent(k) + ".json");
const store = {
  async get(k) { try { return JSON.parse(await readFile(fileOf(k), "utf8")); } catch { return null; } },
  async setJSON(k, v, o = {}) {
    await mkdir(DATA, { recursive: true });
    if (o.onlyIfNew && (await this.get(k))) return { modified: false };
    await writeFile(fileOf(k), JSON.stringify(v));
    return { modified: true };
  },
  async delete(k) { await rm(fileOf(k), { force: true }); },
};
const api = createApi({ store, config, adminKey: process.env.ADMIN_KEY || "dev" });
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon" };

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname.startsWith("/api/")) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const r = await api(new Request(url, { method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks) }));
    res.writeHead(r.status, Object.fromEntries(r.headers));
    return res.end(Buffer.from(await r.arrayBuffer()));
  }
  const p = normalize(url.pathname === "/" ? "/index.html" : url.pathname).replace(/^(\.\.[/\\])+/, "");
  try {
    const body = await readFile(join("public", p));
    res.writeHead(200, { "content-type": types[extname(p)] || "application/octet-stream" });
    res.end(body);
  } catch { res.writeHead(404); res.end("404"); }
}).listen(process.env.PORT || 8888, () => console.log(`🎄 http://localhost:${process.env.PORT || 8888}  (admin key: ${process.env.ADMIN_KEY || "dev"})`));
