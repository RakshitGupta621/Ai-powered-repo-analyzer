/**
 * Redis client singleton using ioredis.
 * Separate instances for BullMQ (queue) and cache to avoid conflicts.
 */

const Redis = require("ioredis");
const config = require("../config");
const logger = require("./logger");

let _cacheClient = null;

function getRedis() {
  if (_cacheClient) return _cacheClient;

  _cacheClient = new Redis(config.redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times) => Math.min(times * 300, 3000),
  });

  _cacheClient.on("connect",  () => logger.info("Redis connected"));
  _cacheClient.on("error",    (err) => logger.error("Redis error", { err: err.message }));
  _cacheClient.on("close",    () => logger.warn("Redis connection closed"));

  return _cacheClient;
}

/** Returns a fresh Redis connection for BullMQ (needs its own instance). */
function getBullMQConnection() {
  return new Redis(config.redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times) => Math.min(times * 300, 3000),
  });
}

async function cacheGet(key) {
  try {
    const val = await getRedis().get(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

async function cacheSet(key, value, ttlSeconds = 300) {
  try {
    await getRedis().setex(key, ttlSeconds, JSON.stringify(value));
  } catch (err) {
    logger.warn("Cache set failed", { key, err: err.message });
  }
}

async function cacheDel(pattern) {
  try {
    const keys = await getRedis().keys(pattern);
    if (keys.length > 0) await getRedis().del(...keys);
  } catch (err) {
    logger.warn("Cache delete failed", { pattern, err: err.message });
  }
}

async function closeRedis() {
  if (_cacheClient) {
    await _cacheClient.quit();
    _cacheClient = null;
  }
}

module.exports = { getRedis, getBullMQConnection, cacheGet, cacheSet, cacheDel, closeRedis };
