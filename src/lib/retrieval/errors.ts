import type { PlanningCategory, RetrievalError, RetrievalErrorCode } from "./types";

export class RetrievalProviderError extends Error {
  constructor(
    public readonly code: RetrievalErrorCode,
    message: string,
    public readonly category?: PlanningCategory,
  ) {
    super(message);
    this.name = "RetrievalProviderError";
  }
}

export function retrievalError(
  code: RetrievalErrorCode,
  message: string,
  category?: PlanningCategory,
): RetrievalError {
  return category ? { code, message, category } : { code, message };
}

export function publicProviderMessage(error: unknown, fallback: string) {
  if (error instanceof RetrievalProviderError) {
    return error.message;
  }

  return fallback;
}
