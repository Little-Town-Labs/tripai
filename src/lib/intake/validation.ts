export const intakeInterests = [
  "Scenic stops",
  "Museums",
  "Nature",
  "Local food",
  "Indoor backup",
  "Low walking",
] as const;

export const budgetLevels = ["budget", "moderate", "premium"] as const;
export const travelStyles = ["relaxed", "balanced", "packed"] as const;

export type BudgetLevel = (typeof budgetLevels)[number];
export type TravelStyle = (typeof travelStyles)[number];

export type TripIntakeValues = {
  originAddress: string;
  destinationArea: string;
  startDate: string;
  endDate: string;
  partyAdults: number;
  partyChildren: number;
  childrenAges: number[];
  interests: string[];
  budgetLevel: BudgetLevel;
  dietaryNeeds: string[];
  mobilityNotes: string | null;
  travelStyle: TravelStyle;
};

export type IntakeFieldErrors = Partial<Record<string, string[]>>;

export type IntakeValidationResult =
  | { ok: true; values: TripIntakeValues }
  | { ok: false; fieldErrors: IntakeFieldErrors; values: Record<string, string | string[]> };

type IntakeInput = Record<string, unknown>;

function stringValue(value: unknown) {
  if (Array.isArray(value)) {
    return stringValue(value[0]);
  }
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function stringArray(value: unknown) {
  const values = Array.isArray(value) ? value : [value];
  return values
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function splitList(value: unknown) {
  return stringValue(value)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseWholeNumber(value: string) {
  if (!/^\d+$/.test(value)) {
    return Number.NaN;
  }
  return Number(value);
}

function parseChildrenAges(value: unknown) {
  const raw = stringValue(value);
  if (!raw) {
    return [];
  }
  return raw.split(",").map((entry) => Number(entry.trim()));
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));
}

function tripLengthDays(startDate: string, endDate: string) {
  const start = Date.parse(`${startDate}T00:00:00.000Z`);
  const end = Date.parse(`${endDate}T00:00:00.000Z`);
  return Math.floor((end - start) / 86_400_000) + 1;
}

function appendAdditionalConstraints(mobilityNotes: string, additionalConstraints: string) {
  if (!additionalConstraints) {
    return mobilityNotes || null;
  }
  const constraints = `Additional constraints: ${additionalConstraints}`;
  return mobilityNotes ? `${mobilityNotes}\n\n${constraints}` : constraints;
}

function publicValues(input: IntakeInput): Record<string, string | string[]> {
  return {
    originAddress: stringValue(input.originAddress),
    destinationArea: stringValue(input.destinationArea),
    startDate: stringValue(input.startDate),
    endDate: stringValue(input.endDate),
    partyAdults: stringValue(input.partyAdults),
    partyChildren: stringValue(input.partyChildren),
    childrenAges: stringValue(input.childrenAges),
    interests: stringArray(input.interests),
    budgetLevel: stringValue(input.budgetLevel),
    dietaryNeeds: stringValue(input.dietaryNeeds),
    mobilityNotes: stringValue(input.mobilityNotes),
    travelStyle: stringValue(input.travelStyle),
    additionalConstraints: stringValue(input.additionalConstraints),
  };
}

export function validateTripIntakeInput(input: IntakeInput): IntakeValidationResult {
  const errors: IntakeFieldErrors = {};
  const originAddress = stringValue(input.originAddress);
  const destinationArea = stringValue(input.destinationArea);
  const startDate = stringValue(input.startDate);
  const endDate = stringValue(input.endDate);
  const partyAdultsRaw = stringValue(input.partyAdults);
  const partyChildrenRaw = stringValue(input.partyChildren);
  const partyAdults = parseWholeNumber(partyAdultsRaw);
  const partyChildren = parseWholeNumber(partyChildrenRaw);
  const childrenAges = parseChildrenAges(input.childrenAges);
  const interests = stringArray(input.interests);
  const budgetLevel = stringValue(input.budgetLevel);
  const dietaryNeeds = splitList(input.dietaryNeeds);
  const mobilityNotes = stringValue(input.mobilityNotes);
  const travelStyle = stringValue(input.travelStyle);
  const additionalConstraints = stringValue(input.additionalConstraints);

  if (!originAddress) {
    errors.originAddress = ["Enter a starting point."];
  }
  if (!destinationArea) {
    errors.destinationArea = ["Enter a destination area."];
  }
  if (!isIsoDate(startDate)) {
    errors.startDate = ["Enter a valid start date."];
  }
  if (!isIsoDate(endDate)) {
    errors.endDate = ["Enter a valid end date."];
  }
  if (isIsoDate(startDate) && isIsoDate(endDate)) {
    const length = tripLengthDays(startDate, endDate);
    if (length < 1) {
      errors.endDate = ["End date must be the same as or after the start date."];
    } else if (length > 21) {
      errors.endDate = ["TripAI can plan trips up to 21 days for this MVP."];
    }
  }
  if (!Number.isInteger(partyAdults) || partyAdults < 0) {
    errors.partyAdults = ["Adults must be 0 or more."];
  }
  if (!Number.isInteger(partyChildren) || partyChildren < 0) {
    errors.partyChildren = ["Children must be 0 or more."];
  }
  if (Number.isInteger(partyAdults) && Number.isInteger(partyChildren) && partyAdults + partyChildren <= 0) {
    errors.partyAdults = ["At least one traveler is required."];
  }
  if (Number.isInteger(partyChildren) && partyChildren > 0) {
    const validAges = childrenAges.every((age) => Number.isInteger(age) && age >= 0 && age <= 17);
    if (childrenAges.length !== partyChildren || !validAges) {
      errors.childrenAges = ["Enter one age for each child."];
    }
  }
  if (Number.isInteger(partyChildren) && partyChildren === 0 && childrenAges.length > 0) {
    errors.childrenAges = ["Remove child ages when no children are traveling."];
  }
  if (!budgetLevels.includes(budgetLevel as BudgetLevel)) {
    errors.budgetLevel = ["Choose a budget preference."];
  }
  if (!travelStyles.includes(travelStyle as TravelStyle)) {
    errors.travelStyle = ["Choose a travel pace."];
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      fieldErrors: errors,
      values: publicValues(input),
    };
  }

  return {
    ok: true,
    values: {
      originAddress,
      destinationArea,
      startDate,
      endDate,
      partyAdults,
      partyChildren,
      childrenAges,
      interests,
      budgetLevel: budgetLevel as BudgetLevel,
      dietaryNeeds,
      mobilityNotes: appendAdditionalConstraints(mobilityNotes, additionalConstraints),
      travelStyle: travelStyle as TravelStyle,
    },
  };
}
