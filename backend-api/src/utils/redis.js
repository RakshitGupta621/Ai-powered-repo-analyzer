const Redis = require("ioredis");
const config = require("../config");
const logger = require("./logger");

let client = null;

function getRedis() {
  if (client) return client;

  client = new Redis(config.redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times) => Math.min(times * 300, 3000),
  });

  client.on("connect", () => logger.info("Redis connected"));
  client.on("error", (err) => logger.error("Redis error", { err: err.message }));
  client.on("close", () => logger.warn("Redis closed"));

  return client;
}

function getBullMQConnection() {
  return new Redis(config.redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times) => Math.min(times * 300, 3000),
  });
}

const cacheGet = async (key) => {
  try {
    const val = await getRedis().get(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
};

const cacheSet = async (key, value, ttlSeconds = 300) => {
  try {
    await getRedis().setex(key, ttlSeconds, JSON.stringify(value));
  } catch (err) {
    logger.warn("Cache set failed", { key, err: err.message });
  }
};

const cacheDel = async (pattern) => {
  try {
    const keys = await getRedis().keys(pattern);
    if (keys.length > 0) await getRedis().del(...keys);
  } catch (err) {
    logger.warn("Cache delete failed", { pattern, err: err.message });
  }
};

const closeRedis = async () => {
  if (client) {
    await client.quit();
    client = null;
  }
};

module.exports = { getRedis, getBullMQConnection, cacheGet, cacheSet, cacheDel, closeRedis };
