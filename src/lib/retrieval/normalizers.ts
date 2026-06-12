import { createHash } from "node:crypto";

import type {
  CacheKind,
  MobilityCategory,
  NormalizedRetrievalRequest,
  RetrievalContextInput,
} from "./types";

export function normalizeRetrievalInput(input: RetrievalContextInput): NormalizedRetrievalRequest {
  return {
    originAddress: normalizeLocation(input.originAddress),
    destinationArea: normalizeLocation(input.destinationArea),
    startDate: input.startDate,
    endDate: input.endDate,
    partyAdults: input.partyAdults,
    partyChildren: input.partyChildren,
    childrenAges: [...input.childrenAges].sort((a, b) => a - b),
    interests: normalizeList(input.interests),
    budgetLevel: input.budgetLevel,
    dietaryNeeds: normalizeList(input.dietaryNeeds),
    mobilityCategory: categorizeMobility(input.mobilityNotes),
    travelStyle: input.travelStyle,
  };
}

export function createCacheKey(kind: CacheKind, material: unknown) {
  const digest = createHash("sha256").update(stableStringify(material)).digest("hex");
  return `${kind}:${digest}`;
}

function normalizeLocation(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\bfl\b/gi, "FL")
    .replace(/\bmo\b/gi, "MO")
    .replace(/\borlando, FL\b/i, "Orlando, FL");
}

function normalizeList(values: string[]) {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))].sort();
}

function categorizeMobility(value?: string | null): MobilityCategory {
  const normalized = value?.toLowerCase() ?? "";
  if (!normalized.trim()) return "none";
  if (normalized.includes("stroller")) return "stroller";
  if (
    normalized.includes("wheelchair") ||
    normalized.includes("mobility") ||
    normalized.includes("accessible") ||
    normalized.includes("accessibility")
  ) {
    return "accessibility";
  }
  return "general";
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}
