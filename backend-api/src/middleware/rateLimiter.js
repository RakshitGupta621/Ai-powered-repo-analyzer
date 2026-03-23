/**
 * Rate limiting middleware.
 * Different limits for different endpoint sensitivity:
 * - General API: 60 req/min
 * - Query (LLM calls): 10 req/min (costs money/quota)
 * - Ingest: 5 req/min (heavy processing)
 */

const rateLimit = require("express-rate-limit");
const config = require("../config");
const { tooManyRequests } = require("../utils/response");

const handler = (req, res) => tooManyRequests(res);

// General API limiter
const apiLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

// Strict limiter for LLM query calls
const queryLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
  keyGenerator: (req) => req.ip,
});

// Ingestion limiter (heavy processing)
const ingestLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

module.exports = { apiLimiter, queryLimiter, ingestLimiter };
