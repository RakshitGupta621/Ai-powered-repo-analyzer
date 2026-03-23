/**
 * Centralized logger using Winston.
 * - Development: colorized console output
 * - Production: structured JSON logs
 */

const { createLogger, format, transports } = require("winston");
const config = require("../config");

const { combine, timestamp, printf, colorize, json, errors } = format;

// Human-readable format for dev
const devFormat = combine(
  colorize(),
  timestamp({ format: "HH:mm:ss" }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} [${level}] ${stack || message}${metaStr}`;
  })
);

// Structured JSON for production
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

const logger = createLogger({
  level: config.env === "production" ? "info" : "debug",
  format: config.env === "production" ? prodFormat : devFormat,
  transports: [new transports.Console()],
});

module.exports = logger;
