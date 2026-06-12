export const SHARE_LABEL_MAX_LENGTH = 80;
export const SHARE_DISPLAY_NAME_MAX_LENGTH = 80;
export const SHARE_NOTE_CONTENT_MAX_LENGTH = 1000;
export const SHARE_RATING_TEXT_MAX_LENGTH = 1000;

export type ShareLinkFieldErrors = {
  label?: string;
};

export type SharedNoteFieldErrors = {
  displayName?: string;
  content?: string;
  scope?: string;
};

export type SharedRatingFieldErrors = {
  displayName?: string;
  stopId?: string;
  stars?: string;
  text?: string;
};

export type ValidateCreateShareLinkInput = {
  label?: unknown;
};

export type ValidatedCreateShareLinkInput = {
  label: string | null;
};

export type ValidateSharedNoteInput = {
  displayName: unknown;
  content: unknown;
  dayId?: unknown;
  stopId?: unknown;
};

export type ValidatedSharedNoteInput = {
  displayName: string;
  content: string;
  dayId: string | null;
  stopId: string | null;
};

export type ValidateSharedRatingInput = {
  displayName: unknown;
  stopId: unknown;
  stars: unknown;
  text?: unknown;
};

export type ValidatedSharedRatingInput = {
  displayName: string;
  stopId: string;
  stars: number;
  text: string | null;
};

export function validateCreateShareLinkInput(input: ValidateCreateShareLinkInput):
  | { ok: true; value: ValidatedCreateShareLinkInput }
  | { ok: false; fieldErrors: ShareLinkFieldErrors } {
  const fieldErrors: ShareLinkFieldErrors = {};
  const label = optionalStringValue(input.label);

  if (label && label.length > SHARE_LABEL_MAX_LENGTH) {
    fieldErrors.label = "Keep labels to 80 characters or fewer.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return { ok: true, value: { label } };
}

export function validateSharedNoteInput(input: ValidateSharedNoteInput):
  | { ok: true; value: ValidatedSharedNoteInput }
  | { ok: false; fieldErrors: SharedNoteFieldErrors } {
  const fieldErrors: SharedNoteFieldErrors = {};
  const displayName = optionalStringValue(input.displayName);
  const content = optionalStringValue(input.content);
  const dayId = optionalStringValue(input.dayId);
  const stopId = optionalStringValue(input.stopId);

  validateDisplayName(displayName, fieldErrors);

  if (!content) {
    fieldErrors.content = "Add a note before saving.";
  } else if (content.length > SHARE_NOTE_CONTENT_MAX_LENGTH) {
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
      displayName: displayName as string,
      content: content as string,
      dayId,
      stopId,
    },
  };
}

export function validateSharedRatingInput(input: ValidateSharedRatingInput):
  | { ok: true; value: ValidatedSharedRatingInput }
  | { ok: false; fieldErrors: SharedRatingFieldErrors } {
  const fieldErrors: SharedRatingFieldErrors = {};
  const displayName = optionalStringValue(input.displayName);
  const stopId = optionalStringValue(input.stopId);
  const text = optionalStringValue(input.text);
  const stars = parseStars(input.stars);

  validateDisplayName(displayName, fieldErrors);

  if (!stopId) {
    fieldErrors.stopId = "Choose a stop to rate.";
  }
  if (stars === null) {
    fieldErrors.stars = "Choose a rating from 1 to 5 stars.";
  }
  if (text && text.length > SHARE_RATING_TEXT_MAX_LENGTH) {
    fieldErrors.text = "Keep rating notes to 1000 characters or fewer.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    value: {
      displayName: displayName as string,
      stopId: stopId as string,
      stars: stars as number,
      text,
    },
  };
}

function validateDisplayName(
  displayName: string | null,
  fieldErrors: { displayName?: string },
) {
  if (!displayName) {
    fieldErrors.displayName = "Add your display name before saving.";
  } else if (displayName.length > SHARE_DISPLAY_NAME_MAX_LENGTH) {
    fieldErrors.displayName = "Keep display names to 80 characters or fewer.";
  }
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
