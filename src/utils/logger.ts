import { env } from "../config/env";

type LogLevel = "error" | "warn" | "info" | "debug";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: any;
}

// Format log entry for production (JSON)
function formatProductionLog(entry: LogEntry): string {
  return JSON.stringify(entry);
}

// Format log entry for development (readable)
function formatDevelopmentLog(entry: LogEntry): string {
  const { level, message, timestamp, data } = entry;
  const levelEmoji = {
    error: "✗",
    warn: "⚠",
    info: "ℹ",
    debug: "🔍",
  };

  let output = `${
    levelEmoji[level]
  } [${timestamp}] ${level.toUpperCase()}: ${message}`;

  if (data) {
    output += `\n${JSON.stringify(data, null, 2)}`;
  }

  return output;
}

// Core logging function
function log(level: LogLevel, message: string, data?: any): void {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    data,
  };

  const formattedLog =
    env.NODE_ENV === "production"
      ? formatProductionLog(entry)
      : formatDevelopmentLog(entry);

  // Output to appropriate stream
  if (level === "error") {
    console.error(formattedLog);
  } else {
    console.log(formattedLog);
  }
}

// Exported logging functions
export const logger = {
  error: (message: string, data?: any) => log("error", message, data),
  warn: (message: string, data?: any) => log("warn", message, data),
  info: (message: string, data?: any) => log("info", message, data),
  debug: (message: string, data?: any) => {
    if (env.NODE_ENV === "development") {
      log("debug", message, data);
    }
  },
};
