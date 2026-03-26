require("dotenv").config();

const required = (key) => {
  const val = process.env[key];
  if (!val) throw new Error(`Missing env var: ${key}`);
  return val;
};

const optional = (key, def) => process.env[key] ?? def;

const config = {
  // ── App ────────────────────────────────────────────────────────────────────
  env: optional("NODE_ENV", "development"),
  port: parseInt(optional("PORT", "3001"), 10),
  apiPrefix: "/api",

  // ── Redis ──────────────────────────────────────────────────────────────────
  redisUrl: optional("REDIS_URL", "redis://localhost:6379"),

  // ── AI Service (FastAPI) ──────────────────────────────────────────────────
  aiServiceUrl: optional("AI_SERVICE_URL", "http://localhost:8001"),
  internalApiKey: required("INTERNAL_API_KEY"),

  // ── Upload ────────────────────────────────────────────────────────────────
  uploadDir: optional("UPLOAD_DIR", require("path").join(__dirname, "../../uploads")),
  maxUploadMb: parseInt(optional("MAX_UPLOAD_MB", "50"), 10),

  // ── Rate limiting ──────────────────────────────────────────────────────────
  rateLimitWindowMs: parseInt(optional("RATE_LIMIT_WINDOW_MS", "60000"), 10),
  rateLimitMax: parseInt(optional("RATE_LIMIT_MAX", "60"), 10),

  // ── Cache TTL (seconds) ────────────────────────────────────────────────────
  queryCacheTtl: parseInt(optional("QUERY_CACHE_TTL", "300"), 10),

  // ── Security ──────────────────────────────────────────────────────────────
  corsOrigins: optional("CORS_ORIGINS", "http://localhost:3000").split(","),
};

module.exports = config;


