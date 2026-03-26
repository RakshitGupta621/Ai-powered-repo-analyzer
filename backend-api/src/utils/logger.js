const { createLogger, format, transports } = require("winston");
const config = require("../config");

const isDev = config.env !== "production";

const logger = createLogger({
  level: isDev ? "debug" : "info",
  format: isDev
    ? format.combine(
        format.colorize(),
        format.timestamp({ format: "HH:mm:ss" }),
        format.errors({ stack: true }),
        format.printf(({ level, message, timestamp, stack, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
          return `${timestamp} [${level}] ${stack || message}${metaStr}`;
        })
      )
    : format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.json()
      ),
  transports: [new transports.Console()],
});

module.exports = logger;
