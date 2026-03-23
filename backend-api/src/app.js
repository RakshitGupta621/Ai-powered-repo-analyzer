/**
 * Express app factory.
 * Separated from server.js so tests can import the app without starting a server.
 */

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const morgan = require("morgan");

const config = require("./config");
const logger = require("./utils/logger");
const { apiLimiter } = require("./middleware/rateLimiter");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");

// Routes
const projectRoutes = require("./routes/projects");
const ingestRoutes  = require("./routes/ingest");
const queryRoutes   = require("./routes/query");
const fileRoutes    = require("./routes/files");
const chatRoutes    = require("./routes/chat");

function createApp() {
  const app = express();

  // ── Security headers ────────────────────────────────────────────────────────
  app.use(helmet());
  app.use(cors({
    origin: config.corsOrigins,
    methods: ["GET", "POST", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }));

  // ── Body parsing + compression ──────────────────────────────────────────────
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false }));
  app.use(compression());

  // ── Request logging ─────────────────────────────────────────────────────────
  if (config.env !== "test") {
    app.use(morgan("dev", {
      stream: { write: (msg) => logger.http(msg.trim()) },
    }));
  }

  // ── Global rate limit ───────────────────────────────────────────────────────
  app.use(config.apiPrefix, apiLimiter);

  // ── Health check (no rate limit) ────────────────────────────────────────────
  app.get("/health", (req, res) => {
    res.json({ status: "ok", service: "codebase-engine-api", env: config.env });
  });

  // ── API routes ──────────────────────────────────────────────────────────────
  app.use(`${config.apiPrefix}/projects`, projectRoutes);
  app.use(`${config.apiPrefix}/ingest`,   ingestRoutes);
  app.use(`${config.apiPrefix}/query`,    queryRoutes);
  app.use(`${config.apiPrefix}/files`,    fileRoutes);
  app.use(`${config.apiPrefix}/chat`,     chatRoutes);

  // ── 404 + Global error handler (must be last) ───────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
