/**
 * Structured logger for CloudBridge.
 * Wraps console with levels, timestamps, and context.
 * In production, this could be swapped for a transport to Datadog/Sentry/etc.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private format(level: LogLevel, message: string, data?: LogContext): string {
    const timestamp = new Date().toISOString();
    const base = `[${timestamp}] [${level.toUpperCase()}] [${this.context}] ${message}`;
    if (data && Object.keys(data).length > 0) {
      return `${base} ${JSON.stringify(data)}`;
    }
    return base;
  }

  debug(message: string, data?: LogContext): void {
    if (process.env.NODE_ENV === "development") {
      console.debug(this.format("debug", message, data));
    }
  }

  info(message: string, data?: LogContext): void {
    console.info(this.format("info", message, data));
  }

  warn(message: string, data?: LogContext): void {
    console.warn(this.format("warn", message, data));
  }

  error(message: string, error?: unknown, data?: LogContext): void {
    const errorInfo: LogContext = { ...data };
    if (error instanceof Error) {
      errorInfo.errorMessage = error.message;
      errorInfo.stack = error.stack;
    } else if (error) {
      errorInfo.error = String(error);
    }
    console.error(this.format("error", message, errorInfo));
  }
}

/**
 * Create a logger instance with a specific context label.
 * Usage: const log = createLogger("TelegramService");
 */
export function createLogger(context: string): Logger {
  return new Logger(context);
}
