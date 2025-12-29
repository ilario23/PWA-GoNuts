import { toast } from "sonner";

/**
 * Error severity levels for categorizing errors
 */
export type ErrorSeverity = "info" | "warning" | "error" | "critical";

/**
 * Error context for better debugging
 */
export interface ErrorContext {
  /** Component or hook where error occurred */
  source: string;
  /** Operation being performed */
  operation?: string;
  /** Additional metadata */
  meta?: Record<string, unknown>;
}

/**
 * Standardized application error
 */
export class AppError extends Error {
  public readonly severity: ErrorSeverity;
  public readonly context: ErrorContext;
  public readonly originalError?: unknown;
  public readonly timestamp: string;

  constructor(
    message: string,
    severity: ErrorSeverity = "error",
    context: ErrorContext,
    originalError?: unknown
  ) {
    super(message);
    this.name = "AppError";
    this.severity = severity;
    this.context = context;
    this.originalError = originalError;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Options for error handling
 */
export interface HandleErrorOptions {
  /** Show toast notification to user */
  showToast?: boolean;
  /** Custom toast message (otherwise uses error message) */
  toastMessage?: string;
  /** Log to console */
  logToConsole?: boolean;
  /** Rethrow the error after handling */
  rethrow?: boolean;
}

const defaultOptions: HandleErrorOptions = {
  showToast: true,
  logToConsole: true,
  rethrow: false,
};

/**
 * Centralized error handler for consistent error management across the app.
 *
 * @example
 * // In a hook
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   handleError(error, 'error', { source: 'useTransactions', operation: 'create' });
 * }
 *
 * @example
 * // Silent logging (no toast)
 * handleError(error, 'warning', { source: 'sync' }, { showToast: false });
 */
export function handleError(
  error: unknown,
  severity: ErrorSeverity,
  context: ErrorContext,
  options: HandleErrorOptions = {}
): AppError {
  const opts = { ...defaultOptions, ...options };

  // Normalize error to AppError
  const appError = normalizeError(error, severity, context);

  // Log to console
  if (opts.logToConsole) {
    logError(appError);
  }

  // Show toast notification
  if (opts.showToast) {
    showErrorToast(appError, opts.toastMessage);
  }

  // Send to error tracking service in production
  if (import.meta.env.PROD && severity === "critical") {
    // TODO: Send to Sentry, LogRocket, etc.
    // sendToErrorTracking(appError);
  }

  if (opts.rethrow) {
    throw appError;
  }

  return appError;
}

/**
 * Convert any error to AppError
 */
function normalizeError(
  error: unknown,
  severity: ErrorSeverity,
  context: ErrorContext
): AppError {
  if (error instanceof AppError) {
    return error;
  }

  let message: string;

  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === "string") {
    message = error;
  } else {
    message = "An unexpected error occurred";
  }

  return new AppError(message, severity, context, error);
}

/**
 * Log error to console with structured format
 */
function logError(error: AppError): void {
  const logData = {
    message: error.message,
    severity: error.severity,
    source: error.context.source,
    operation: error.context.operation,
    meta: error.context.meta,
    timestamp: error.timestamp,
    stack: error.stack,
  };

  const prefix = `[${error.context.source}${error.context.operation ? `:${error.context.operation}` : ""
    }]`;

  switch (error.severity) {
    case "info":
      console.info(prefix, error.message, logData);
      break;
    case "warning":
      console.warn(prefix, error.message, logData);
      break;
    case "error":
    case "critical":
      console.error(prefix, error.message, logData);
      break;
  }
}

/**
 * Show appropriate toast based on severity
 */
function showErrorToast(error: AppError, customMessage?: string): void {
  const message = customMessage || error.message;

  switch (error.severity) {
    case "info":
      toast.info(message);
      break;
    case "warning":
      toast.warning(message);
      break;
    case "error":
    case "critical":
      toast.error(message);
      break;
  }
}

/**
 * Helper to create error handler with preset context.
 * Useful for hooks/components to avoid repetitive context.
 *
 * @example
 * const handleErr = createErrorHandler('useTransactions');
 * handleErr(error, 'error', { operation: 'create' });
 */
export function createErrorHandler(source: string) {
  return (
    error: unknown,
    severity: ErrorSeverity = "error",
    context: Omit<ErrorContext, "source"> = {},
    options: HandleErrorOptions = {}
  ): AppError => {
    return handleError(error, severity, { ...context, source }, options);
  };
}

/**
 * Wrapper for async functions with automatic error handling.
 *
 * @example
 * const safeDelete = withErrorHandling(
 *   deleteTransaction,
 *   { source: 'useTransactions', operation: 'delete' }
 * );
 * await safeDelete(id); // Errors are automatically handled
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context: ErrorContext,
  options: HandleErrorOptions = {}
): T {
  return (async (
    ...args: Parameters<T>
  ): Promise<ReturnType<T> | undefined> => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error, "error", context, options);
      return undefined;
    }
  }) as T;
}

/**
 * Success notification helper for consistency
 */
export function notifySuccess(message: string): void {
  toast.success(message);
}

/**
 * Info notification helper
 */
export function notifyInfo(message: string): void {
  toast.info(message);
}

/**
 * Warning notification helper
 */
export function notifyWarning(message: string): void {
  toast.warning(message);
}
