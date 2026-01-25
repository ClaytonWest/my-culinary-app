export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const ErrorCodes = {
  UNAUTHORIZED: "UNAUTHORIZED",
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMIT: "RATE_LIMIT_EXCEEDED",
  VALIDATION: "VALIDATION_ERROR",
  AI_UNAVAILABLE: "AI_SERVICE_UNAVAILABLE",
  AI_TIMEOUT: "AI_TIMEOUT",
  INVALID_IMAGE: "INVALID_IMAGE",
  DIETARY_CONFLICT: "DIETARY_CONFLICT",
  OFF_TOPIC: "OFF_TOPIC_REQUEST",
} as const;

export function createError(
  code: keyof typeof ErrorCodes,
  message: string,
  retryable = false
): AppError {
  const statusCodes: Record<string, number> = {
    UNAUTHORIZED: 401,
    NOT_FOUND: 404,
    RATE_LIMIT: 429,
    VALIDATION: 400,
    AI_UNAVAILABLE: 503,
    AI_TIMEOUT: 504,
    OFF_TOPIC: 400,
  };

  return new AppError(message, code, statusCodes[code] || 400, retryable);
}
