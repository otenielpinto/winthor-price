import winston from "winston";
import path from "path";
import util from "util";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOGGERS = {};

function createLogger(loggerKey) {
  loggerKey = loggerKey.replace(":", ""); //fix para windows
  if (!loggerKey.endsWith(".log")) loggerKey = loggerKey + ".log";

  const logger = winston.createLogger({
    format: winston.format.combine(
      winston.format.errors({ stack: true }),
      winston.format.simple()
    ),
    transports: [
      new winston.transports.File({
        filename: path.resolve(__dirname, "..", "..", "logs", loggerKey),
        maxsize: 1024 * 1024,
        maxFiles: 1,
        tailable: true,
      }),
    ],
  });

  if (process.env.NODE_ENV !== "production") {
    logger.add(
      new winston.transports.Console({
        format: winston.format.simple(),
      })
    );
  }

  return logger;
}

export default (loggerKey, data) => {
  try {
    loggerKey = loggerKey.replace(":", "").replace(".log", "");

    let logger = LOGGERS[loggerKey];
    if (!logger) {
      logger = createLogger(loggerKey);
      LOGGERS[loggerKey] = logger;
    }

    if (data instanceof Error) {
      logger.info(new Date().toISOString());
      return logger.error(data);
    } else if (typeof data === "object") {
      return logger.info(new Date().toISOString() + " - " + util.inspect(data));
    } else return logger.info(new Date().toISOString() + " - " + data);
  } catch (err) {
    console.error(err, loggerKey, data);
  }
};
