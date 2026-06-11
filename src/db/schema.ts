import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  doublePrecision,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const owners = pgTable("owners", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  ...timestamps,
});

export const tripIntakes = pgTable(
  "trip_intakes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").references(() => owners.id, { onDelete: "cascade" }),
    originAddress: text("origin_address").notNull(),
    destinationArea: text("destination_area").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    partyAdults: integer("party_adults").notNull().default(0),
    partyChildren: integer("party_children").notNull().default(0),
    childrenAges: integer("children_ages").array().notNull().default(sql`'{}'::integer[]`),
    interests: text("interests").array().notNull().default(sql`'{}'::text[]`),
    budgetLevel: text("budget_level").notNull(),
    dietaryNeeds: text("dietary_needs").array().notNull().default(sql`'{}'::text[]`),
    mobilityNotes: text("mobility_notes"),
    travelStyle: text("travel_style").notNull(),
    ...timestamps,
  },
  (table) => [
    index("trip_intakes_owner_idx").on(table.ownerId),
    check("trip_intakes_valid_dates", sql`${table.endDate} >= ${table.startDate}`),
    check("trip_intakes_party_present", sql`${table.partyAdults} + ${table.partyChildren} > 0`),
    check("trip_intakes_party_non_negative", sql`${table.partyAdults} >= 0 and ${table.partyChildren} >= 0`),
    check("trip_intakes_budget_level", sql`${table.budgetLevel} in ('budget', 'moderate', 'premium')`),
    check("trip_intakes_travel_style", sql`${table.travelStyle} in ('packed', 'relaxed', 'balanced')`),
  ],
);

export const tripRevisions = pgTable(
  "trip_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id").notNull(),
    revisionNumber: integer("revision_number").notNull(),
    kind: text("kind").notNull(),
    parentRevisionId: uuid("parent_revision_id"),
    status: text("status").notNull(),
    summary: text("summary"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    committedAt: timestamp("committed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("trip_revisions_trip_number_idx").on(table.tripId, table.revisionNumber),
    uniqueIndex("trip_revisions_one_current_idx")
      .on(table.tripId)
      .where(sql`${table.status} = 'current'`),
    index("trip_revisions_trip_idx").on(table.tripId),
    check("trip_revisions_number_positive", sql`${table.revisionNumber} > 0`),
    check("trip_revisions_kind", sql`${table.kind} in ('initial', 'pre_purchase', 'post_purchase', 'mid_trip')`),
    check("trip_revisions_status", sql`${table.status} in ('draft', 'current', 'superseded', 'discarded')`),
  ],
);

export const trips = pgTable(
  "trips",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").notNull().references(() => owners.id, { onDelete: "cascade" }),
    intakeId: uuid("intake_id").references(() => tripIntakes.id, { onDelete: "set null" }),
    currentRevisionId: uuid("current_revision_id"),
    title: text("title").notNull(),
    summary: text("summary"),
    status: text("status").notNull().default("draft"),
    stripeSessionId: text("stripe_session_id"),
    priceCents: integer("price_cents"),
    planningRevisionsUsed: integer("planning_revisions_used").notNull().default(0),
    midTripRevisionsUsed: integer("mid_trip_revisions_used").notNull().default(0),
    purchasedAt: timestamp("purchased_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("trips_owner_idx").on(table.ownerId),
    index("trips_intake_idx").on(table.intakeId),
    check("trips_status", sql`${table.status} in ('draft', 'purchased', 'active', 'completed', 'deleted')`),
    check("trips_price_non_negative", sql`${table.priceCents} is null or ${table.priceCents} >= 0`),
    check("trips_revision_counts_non_negative", sql`${table.planningRevisionsUsed} >= 0 and ${table.midTripRevisionsUsed} >= 0`),
  ],
);

export const tripDays = pgTable(
  "trip_days",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
    revisionId: uuid("revision_id").references(() => tripRevisions.id, { onDelete: "cascade" }),
    dayNumber: integer("day_number").notNull(),
    date: date("date").notNull(),
    label: text("label").notNull(),
    fromLocation: text("from_location"),
    toLocation: text("to_location"),
    totalMiles: integer("total_miles"),
    driveTimeMinutes: integer("drive_time_minutes"),
    aiSummary: text("ai_summary"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("trip_days_trip_revision_day_idx").on(table.tripId, table.revisionId, table.dayNumber),
    index("trip_days_trip_idx").on(table.tripId),
    check("trip_days_day_positive", sql`${table.dayNumber} > 0`),
    check("trip_days_route_non_negative", sql`(${table.totalMiles} is null or ${table.totalMiles} >= 0) and (${table.driveTimeMinutes} is null or ${table.driveTimeMinutes} >= 0)`),
  ],
);

export const stops = pgTable(
  "stops",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
    dayId: uuid("day_id").notNull().references(() => tripDays.id, { onDelete: "cascade" }),
    revisionId: uuid("revision_id").references(() => tripRevisions.id, { onDelete: "cascade" }),
    stableStopKey: text("stable_stop_key").notNull(),
    orderIndex: integer("order_index").notNull(),
    name: text("name").notNull(),
    type: text("type").notNull(),
    googlePlaceId: text("google_place_id"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    address: text("address"),
    eta: timestamp("eta", { withTimezone: true }),
    description: text("description"),
    tips: text("tips"),
    priceLevel: integer("price_level"),
    googleRating: doublePrecision("google_rating"),
    hoursSummary: text("hours_summary"),
    phone: text("phone"),
    website: text("website"),
    checked: boolean("checked").notNull().default(false),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("stops_day_order_idx").on(table.dayId, table.revisionId, table.orderIndex),
    index("stops_trip_idx").on(table.tripId),
    index("stops_stable_key_idx").on(table.tripId, table.stableStopKey),
    check("stops_order_non_negative", sql`${table.orderIndex} >= 0`),
    check("stops_type", sql`${table.type} in ('drive', 'fuel', 'restaurant', 'attraction', 'hotel', 'rest', 'park', 'other')`),
    check("stops_place_required", sql`${table.type} in ('drive', 'rest') or ${table.googlePlaceId} is not null`),
    check("stops_google_rating_range", sql`${table.googleRating} is null or (${table.googleRating} >= 0 and ${table.googleRating} <= 5)`),
    check("stops_price_level_range", sql`${table.priceLevel} is null or (${table.priceLevel} >= 1 and ${table.priceLevel} <= 4)`),
  ],
);

export const shareLinks = pgTable(
  "share_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    label: text("label"),
    createdByOwnerId: uuid("created_by_owner_id").notNull().references(() => owners.id, { onDelete: "cascade" }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("share_links_trip_idx").on(table.tripId),
    index("share_links_owner_idx").on(table.createdByOwnerId),
  ],
);

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
    dayId: uuid("day_id").references(() => tripDays.id, { onDelete: "cascade" }),
    stopId: uuid("stop_id").references(() => stops.id, { onDelete: "cascade" }),
    authorOwnerId: uuid("author_owner_id").references(() => owners.id, { onDelete: "set null" }),
    authorShareLinkId: uuid("author_share_link_id").references(() => shareLinks.id, { onDelete: "set null" }),
    authorDisplayName: text("author_display_name").notNull(),
    content: text("content").notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("notes_trip_idx").on(table.tripId),
    index("notes_stop_idx").on(table.stopId),
    check("notes_single_nested_scope", sql`not (${table.dayId} is not null and ${table.stopId} is not null)`),
    check("notes_author_present", sql`num_nonnulls(${table.authorOwnerId}, ${table.authorShareLinkId}) = 1`),
  ],
);

export const ratings = pgTable(
  "ratings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
    stopId: uuid("stop_id").notNull().references(() => stops.id, { onDelete: "cascade" }),
    authorOwnerId: uuid("author_owner_id").references(() => owners.id, { onDelete: "set null" }),
    authorShareLinkId: uuid("author_share_link_id").references(() => shareLinks.id, { onDelete: "set null" }),
    authorDisplayName: text("author_display_name"),
    stars: integer("stars").notNull(),
    text: text("text"),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("ratings_trip_idx").on(table.tripId),
    index("ratings_stop_idx").on(table.stopId),
    check("ratings_stars_range", sql`${table.stars} between 1 and 5`),
    check("ratings_author_present", sql`num_nonnulls(${table.authorOwnerId}, ${table.authorShareLinkId}) = 1`),
  ],
);

export const photoMetadata = pgTable(
  "photo_metadata",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
    dayId: uuid("day_id").references(() => tripDays.id, { onDelete: "cascade" }),
    stopId: uuid("stop_id").references(() => stops.id, { onDelete: "cascade" }),
    authorOwnerId: uuid("author_owner_id").references(() => owners.id, { onDelete: "set null" }),
    authorShareLinkId: uuid("author_share_link_id").references(() => shareLinks.id, { onDelete: "set null" }),
    authorDisplayName: text("author_display_name").notNull(),
    storageKey: text("storage_key"),
    caption: text("caption"),
    status: text("status").notNull().default("pending_upload"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("photo_metadata_trip_idx").on(table.tripId),
    index("photo_metadata_stop_idx").on(table.stopId),
    check("photo_metadata_single_nested_scope", sql`not (${table.dayId} is not null and ${table.stopId} is not null)`),
    check("photo_metadata_author_present", sql`num_nonnulls(${table.authorOwnerId}, ${table.authorShareLinkId}) = 1`),
    check("photo_metadata_status", sql`${table.status} in ('pending_upload', 'uploaded', 'removed')`),
    check("photo_metadata_uploaded_has_storage", sql`${table.status} <> 'uploaded' or ${table.storageKey} is not null`),
  ],
);
