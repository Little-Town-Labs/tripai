import type { GenerationFailure, GenerationFailureCode, GenerationStage } from "./types";

export class GenerationProviderError extends Error {
  constructor(
    public readonly code: GenerationFailureCode,
    message: string,
  ) {
    super(message);
    this.name = "GenerationProviderError";
  }
}

export function generationFailure(
  code: GenerationFailureCode,
  stage: GenerationStage,
  message: string,
  retryable = false,
): GenerationFailure {
  return { code, stage, message, retryable };
}

export function safeFailureFromError(
  error: unknown,
  stage: GenerationStage,
  fallbackMessage: string,
): GenerationFailure {
  if (error instanceof GenerationProviderError) {
    return generationFailure(error.code, stage, error.message, error.code === "PROVIDER_ERROR");
  }

  return generationFailure("PROVIDER_ERROR", stage, fallbackMessage, true);
}
