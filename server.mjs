import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { seedListings } from "./src/data/listings.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "data");
mkdirSync(dataDir, { recursive: true });
const app = express();
const db = new Database(path.join(dataDir, "mercasto.db"));
const PORT = Number(process.env.PORT || 4180);
const HOST = process.env.HOST || "127.0.0.1";
const CATEGORIES = new Set(["Productos","Motor","Inmuebles","Empleos","Servicios","Negocios","Turismo","Boletos"]);

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "32kb" }));
app.use("/api/", rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false }));

db.pragma("journal_mode = WAL");
db.exec(`CREATE TABLE IF NOT EXISTS listings (
 id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT DEFAULT '', price REAL NOT NULL,
 category TEXT NOT NULL, sub_category TEXT DEFAULT '', location TEXT DEFAULT '', company TEXT DEFAULT '',
 deal_type TEXT DEFAULT '', remote INTEGER, featured INTEGER DEFAULT 0, verified INTEGER DEFAULT 0,
 image_url TEXT DEFAULT '', created_date TEXT NOT NULL
)`);

const insert = db.prepare(`INSERT INTO listings
(id,title,description,price,category,sub_category,location,company,deal_type,remote,featured,verified,image_url,created_date)
VALUES (@id,@title,@description,@price,@category,@sub_category,@location,@company,@deal_type,@remote,@featured,@verified,@image_url,@created_date)`);

const cleanText = (value, max = 200) => String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
const normalize = (v) => ({
  id: v.id || randomUUID(), title: cleanText(v.title, 120), description: cleanText(v.description, 1500),
  price: Number(v.price), category: cleanText(v.category, 40), sub_category: cleanText(v.sub_category, 80),
  location: cleanText(v.location, 120), company: cleanText(v.company, 120), deal_type: cleanText(v.deal_type, 30),
  remote: v.remote == null ? null : Number(Boolean(v.remote)), featured: Number(Boolean(v.featured)),
  verified: Number(Boolean(v.verified)), image_url: cleanText(v.image_url, 500),
  created_date: v.created_date || new Date().toISOString()
});

const count = db.prepare("SELECT COUNT(*) AS n FROM listings").get().n;
if (count === 0) {
  const seed = db.transaction((rows) => rows.forEach((row) => insert.run(normalize(row))));
  seed(seedListings);
}

const toPublic = (row) => ({ ...row, remote: row.remote == null ? null : Boolean(row.remote),
  featured: Boolean(row.featured), verified: Boolean(row.verified) });

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.get("/api/listings", (_req, res) => {
  const rows = db.prepare("SELECT * FROM listings ORDER BY created_date DESC LIMIT 500").all();
  res.json(rows.map(toPublic));
});

app.post("/api/listings", rateLimit({ windowMs: 60_000, limit: 8 }), (req, res) => {
  const item = normalize(req.body || {});
  if (!item.title || !CATEGORIES.has(item.category)) return res.status(400).json({ error: "invalid_listing" });
  if (!Number.isFinite(item.price) || item.price < 0 || item.price > 1_000_000_000) return res.status(400).json({ error: "invalid_price" });
  item.featured = 0; item.verified = 0;
  insert.run(item);
  res.status(201).json(toPublic(item));
});

const distDir = path.join(__dirname, "dist");
app.use(express.static(distDir, { maxAge: "1h", index: false }));
app.get("/", (_req, res) => res.sendFile(path.join(distDir, "index.html")));
app.get("/*splat", (_req, res) => res.sendFile(path.join(distDir, "index.html")));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "server_error" });
});

app.listen(PORT, HOST, () => console.log(`Mercasto standalone on http://${HOST}:${PORT}`));
