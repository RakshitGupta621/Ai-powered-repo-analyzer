/**
 * Server entry point.
 */

require("dotenv").config();

const createApp = require("./app");
const config = require("./config");
const logger = require("./utils/logger");
const { getRedis, closeRedis } = require("./utils/redis");
const { startWorker, stopWorker } = require("./jobs/ingestionQueue");

const app = createApp();

async function start() {
  // Test Redis connection
  try {
    const redis = getRedis();
    await redis.ping();
    logger.info("Redis connected successfully");
  } catch (err) {
    logger.error(
      "Cannot connect to Redis. Make sure Redis is running.\n" +
      "  Mac:   brew services start redis\n" +
      "  Linux: sudo service redis start\n" +
      "  Or use Upstash: https://upstash.com (set REDIS_URL in .env)",
      { err: err.message }
    );
    process.exit(1);
  }

  startWorker();

  const server = app.listen(config.port, () => {
    logger.info(`🚀 API server running → http://localhost:${config.port}`);
    logger.info(`   Health check    → http://localhost:${config.port}/health`);
    logger.info(`   AI service      → ${config.aiServiceUrl}`);
  });

  async function shutdown(signal) {
    logger.info(`${signal} — shutting down`);
    server.close(async () => {
      await stopWorker();
      await closeRedis();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000);
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT",  () => shutdown("SIGINT"));
  process.on("uncaughtException", (err) => {
    logger.error("Uncaught exception", { err: err.message, stack: err.stack });
    process.exit(1);
  });
  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection", { reason: String(reason) });
    process.exit(1);
  });
}

start();
