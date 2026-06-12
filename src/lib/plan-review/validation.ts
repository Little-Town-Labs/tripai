export type RevisionRequestValidationResult =
  | { ok: true; value: string }
  | { ok: false; fieldErrors: { requestText: string } };

export function validateRevisionRequestText(value: unknown): RevisionRequestValidationResult {
  if (typeof value !== "string") {
    return invalid("Tell TripAI what you would like to change.");
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return invalid("Tell TripAI what you would like to change.");
  }
  if (trimmed.length < 10) {
    return invalid("Add a little more detail so we can revise the plan.");
  }
  if (trimmed.length > 1000) {
    return invalid("Keep revision requests under 1,000 characters.");
  }

  return { ok: true, value: trimmed };
}

function invalid(message: string): RevisionRequestValidationResult {
  return { ok: false, fieldErrors: { requestText: message } };
}
