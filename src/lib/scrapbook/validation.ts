export const NOTE_CONTENT_MAX_LENGTH = 1000;
export const RATING_TEXT_MAX_LENGTH = 1000;

export type NoteFieldErrors = {
  content?: string;
  scope?: string;
};

export type RatingFieldErrors = {
  stopId?: string;
  stars?: string;
  text?: string;
};

export type ValidateNoteInput = {
  content: unknown;
  dayId?: unknown;
  stopId?: unknown;
};

export type ValidatedNoteInput = {
  content: string;
  dayId: string | null;
  stopId: string | null;
};

export type ValidateRatingInput = {
  stopId: unknown;
  stars: unknown;
  text?: unknown;
};

export type ValidatedRatingInput = {
  stopId: string;
  stars: number;
  text: string | null;
};

export function validateNoteInput(input: ValidateNoteInput):
  | { ok: true; value: ValidatedNoteInput }
  | { ok: false; fieldErrors: NoteFieldErrors } {
  const fieldErrors: NoteFieldErrors = {};
  const content = stringValue(input.content).trim();
  const dayId = optionalStringValue(input.dayId);
  const stopId = optionalStringValue(input.stopId);

  if (!content) {
    fieldErrors.content = "Add a note before saving.";
  } else if (content.length > NOTE_CONTENT_MAX_LENGTH) {
    fieldErrors.content = "Keep notes to 1000 characters or fewer.";
  }

  if (dayId && stopId) {
    fieldErrors.scope = "Choose a day or a stop, not both.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    value: {
      content,
      dayId,
      stopId,
    },
  };
}

export function validateRatingInput(input: ValidateRatingInput):
  | { ok: true; value: ValidatedRatingInput }
  | { ok: false; fieldErrors: RatingFieldErrors } {
  const fieldErrors: RatingFieldErrors = {};
  const stopId = optionalStringValue(input.stopId);
  const text = stringValue(input.text).trim();
  const stars = parseStars(input.stars);

  if (!stopId) {
    fieldErrors.stopId = "Choose a stop to rate.";
  }
  if (stars === null) {
    fieldErrors.stars = "Choose a rating from 1 to 5 stars.";
  }
  if (text.length > RATING_TEXT_MAX_LENGTH) {
    fieldErrors.text = "Keep rating notes to 1000 characters or fewer.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    value: {
      stopId: stopId as string,
      stars: stars as number,
      text: text || null,
    },
  };
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function optionalStringValue(value: unknown) {
  const text = stringValue(value).trim();
  return text || null;
}

function parseStars(value: unknown) {
  const raw = stringValue(value).trim();
  if (!/^[1-5]$/.test(raw)) {
    return null;
  }
  return Number.parseInt(raw, 10);
}
