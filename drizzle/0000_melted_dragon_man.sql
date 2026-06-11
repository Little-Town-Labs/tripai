CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"day_id" uuid,
	"stop_id" uuid,
	"author_owner_id" uuid,
	"author_share_link_id" uuid,
	"author_display_name" text NOT NULL,
	"content" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notes_single_nested_scope" CHECK (not ("notes"."day_id" is not null and "notes"."stop_id" is not null)),
	CONSTRAINT "notes_author_present" CHECK (num_nonnulls("notes"."author_owner_id", "notes"."author_share_link_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "owners" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "owners_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "photo_metadata" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"day_id" uuid,
	"stop_id" uuid,
	"author_owner_id" uuid,
	"author_share_link_id" uuid,
	"author_display_name" text NOT NULL,
	"storage_key" text,
	"caption" text,
	"status" text DEFAULT 'pending_upload' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "photo_metadata_single_nested_scope" CHECK (not ("photo_metadata"."day_id" is not null and "photo_metadata"."stop_id" is not null)),
	CONSTRAINT "photo_metadata_author_present" CHECK (num_nonnulls("photo_metadata"."author_owner_id", "photo_metadata"."author_share_link_id") = 1),
	CONSTRAINT "photo_metadata_status" CHECK ("photo_metadata"."status" in ('pending_upload', 'uploaded', 'removed')),
	CONSTRAINT "photo_metadata_uploaded_has_storage" CHECK ("photo_metadata"."status" <> 'uploaded' or "photo_metadata"."storage_key" is not null)
);
--> statement-breakpoint
CREATE TABLE "ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"stop_id" uuid NOT NULL,
	"author_owner_id" uuid,
	"author_share_link_id" uuid,
	"author_display_name" text,
	"stars" integer NOT NULL,
	"text" text,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ratings_stars_range" CHECK ("ratings"."stars" between 1 and 5),
	CONSTRAINT "ratings_author_present" CHECK (num_nonnulls("ratings"."author_owner_id", "ratings"."author_share_link_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "share_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"label" text,
	"created_by_owner_id" uuid NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "share_links_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "stops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"day_id" uuid NOT NULL,
	"revision_id" uuid,
	"stable_stop_key" text NOT NULL,
	"order_index" integer NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"google_place_id" text,
	"lat" double precision,
	"lng" double precision,
	"address" text,
	"eta" timestamp with time zone,
	"description" text,
	"tips" text,
	"price_level" integer,
	"google_rating" double precision,
	"hours_summary" text,
	"phone" text,
	"website" text,
	"checked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stops_order_non_negative" CHECK ("stops"."order_index" >= 0),
	CONSTRAINT "stops_type" CHECK ("stops"."type" in ('drive', 'fuel', 'restaurant', 'attraction', 'hotel', 'rest', 'park', 'other')),
	CONSTRAINT "stops_place_required" CHECK ("stops"."type" in ('drive', 'rest') or "stops"."google_place_id" is not null),
	CONSTRAINT "stops_google_rating_range" CHECK ("stops"."google_rating" is null or ("stops"."google_rating" >= 0 and "stops"."google_rating" <= 5)),
	CONSTRAINT "stops_price_level_range" CHECK ("stops"."price_level" is null or ("stops"."price_level" >= 1 and "stops"."price_level" <= 4))
);
--> statement-breakpoint
CREATE TABLE "trip_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"revision_id" uuid,
	"day_number" integer NOT NULL,
	"date" date NOT NULL,
	"label" text NOT NULL,
	"from_location" text,
	"to_location" text,
	"total_miles" integer,
	"drive_time_minutes" integer,
	"ai_summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trip_days_day_positive" CHECK ("trip_days"."day_number" > 0),
	CONSTRAINT "trip_days_route_non_negative" CHECK (("trip_days"."total_miles" is null or "trip_days"."total_miles" >= 0) and ("trip_days"."drive_time_minutes" is null or "trip_days"."drive_time_minutes" >= 0))
);
--> statement-breakpoint
CREATE TABLE "trip_intakes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid,
	"origin_address" text NOT NULL,
	"destination_area" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"party_adults" integer DEFAULT 0 NOT NULL,
	"party_children" integer DEFAULT 0 NOT NULL,
	"children_ages" integer[] DEFAULT '{}'::integer[] NOT NULL,
	"interests" text[] DEFAULT '{}'::text[] NOT NULL,
	"budget_level" text NOT NULL,
	"dietary_needs" text[] DEFAULT '{}'::text[] NOT NULL,
	"mobility_notes" text,
	"travel_style" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trip_intakes_valid_dates" CHECK ("trip_intakes"."end_date" >= "trip_intakes"."start_date"),
	CONSTRAINT "trip_intakes_party_present" CHECK ("trip_intakes"."party_adults" + "trip_intakes"."party_children" > 0),
	CONSTRAINT "trip_intakes_party_non_negative" CHECK ("trip_intakes"."party_adults" >= 0 and "trip_intakes"."party_children" >= 0),
	CONSTRAINT "trip_intakes_budget_level" CHECK ("trip_intakes"."budget_level" in ('budget', 'moderate', 'premium')),
	CONSTRAINT "trip_intakes_travel_style" CHECK ("trip_intakes"."travel_style" in ('packed', 'relaxed', 'balanced'))
);
--> statement-breakpoint
CREATE TABLE "trip_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"revision_number" integer NOT NULL,
	"kind" text NOT NULL,
	"parent_revision_id" uuid,
	"status" text NOT NULL,
	"summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"committed_at" timestamp with time zone,
	CONSTRAINT "trip_revisions_number_positive" CHECK ("trip_revisions"."revision_number" > 0),
	CONSTRAINT "trip_revisions_kind" CHECK ("trip_revisions"."kind" in ('initial', 'pre_purchase', 'post_purchase', 'mid_trip')),
	CONSTRAINT "trip_revisions_status" CHECK ("trip_revisions"."status" in ('draft', 'current', 'superseded', 'discarded'))
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"intake_id" uuid,
	"current_revision_id" uuid,
	"title" text NOT NULL,
	"summary" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"stripe_session_id" text,
	"price_cents" integer,
	"planning_revisions_used" integer DEFAULT 0 NOT NULL,
	"mid_trip_revisions_used" integer DEFAULT 0 NOT NULL,
	"purchased_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trips_status" CHECK ("trips"."status" in ('draft', 'purchased', 'active', 'completed', 'deleted')),
	CONSTRAINT "trips_price_non_negative" CHECK ("trips"."price_cents" is null or "trips"."price_cents" >= 0),
	CONSTRAINT "trips_revision_counts_non_negative" CHECK ("trips"."planning_revisions_used" >= 0 and "trips"."mid_trip_revisions_used" >= 0)
);
--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_day_id_trip_days_id_fk" FOREIGN KEY ("day_id") REFERENCES "public"."trip_days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_stop_id_stops_id_fk" FOREIGN KEY ("stop_id") REFERENCES "public"."stops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_author_owner_id_owners_id_fk" FOREIGN KEY ("author_owner_id") REFERENCES "public"."owners"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_author_share_link_id_share_links_id_fk" FOREIGN KEY ("author_share_link_id") REFERENCES "public"."share_links"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_metadata" ADD CONSTRAINT "photo_metadata_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_metadata" ADD CONSTRAINT "photo_metadata_day_id_trip_days_id_fk" FOREIGN KEY ("day_id") REFERENCES "public"."trip_days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_metadata" ADD CONSTRAINT "photo_metadata_stop_id_stops_id_fk" FOREIGN KEY ("stop_id") REFERENCES "public"."stops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_metadata" ADD CONSTRAINT "photo_metadata_author_owner_id_owners_id_fk" FOREIGN KEY ("author_owner_id") REFERENCES "public"."owners"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_metadata" ADD CONSTRAINT "photo_metadata_author_share_link_id_share_links_id_fk" FOREIGN KEY ("author_share_link_id") REFERENCES "public"."share_links"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_stop_id_stops_id_fk" FOREIGN KEY ("stop_id") REFERENCES "public"."stops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_author_owner_id_owners_id_fk" FOREIGN KEY ("author_owner_id") REFERENCES "public"."owners"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_author_share_link_id_share_links_id_fk" FOREIGN KEY ("author_share_link_id") REFERENCES "public"."share_links"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_created_by_owner_id_owners_id_fk" FOREIGN KEY ("created_by_owner_id") REFERENCES "public"."owners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stops" ADD CONSTRAINT "stops_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stops" ADD CONSTRAINT "stops_day_id_trip_days_id_fk" FOREIGN KEY ("day_id") REFERENCES "public"."trip_days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stops" ADD CONSTRAINT "stops_revision_id_trip_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."trip_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_days" ADD CONSTRAINT "trip_days_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_days" ADD CONSTRAINT "trip_days_revision_id_trip_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."trip_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_intakes" ADD CONSTRAINT "trip_intakes_owner_id_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_owner_id_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_intake_id_trip_intakes_id_fk" FOREIGN KEY ("intake_id") REFERENCES "public"."trip_intakes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notes_trip_idx" ON "notes" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "notes_stop_idx" ON "notes" USING btree ("stop_id");--> statement-breakpoint
CREATE INDEX "photo_metadata_trip_idx" ON "photo_metadata" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "photo_metadata_stop_idx" ON "photo_metadata" USING btree ("stop_id");--> statement-breakpoint
CREATE INDEX "ratings_trip_idx" ON "ratings" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "ratings_stop_idx" ON "ratings" USING btree ("stop_id");--> statement-breakpoint
CREATE INDEX "share_links_trip_idx" ON "share_links" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "share_links_owner_idx" ON "share_links" USING btree ("created_by_owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stops_day_order_idx" ON "stops" USING btree ("day_id","revision_id","order_index");--> statement-breakpoint
CREATE INDEX "stops_trip_idx" ON "stops" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "stops_stable_key_idx" ON "stops" USING btree ("trip_id","stable_stop_key");--> statement-breakpoint
CREATE UNIQUE INDEX "trip_days_trip_revision_day_idx" ON "trip_days" USING btree ("trip_id","revision_id","day_number");--> statement-breakpoint
CREATE INDEX "trip_days_trip_idx" ON "trip_days" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "trip_intakes_owner_idx" ON "trip_intakes" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "trip_revisions_trip_number_idx" ON "trip_revisions" USING btree ("trip_id","revision_number");--> statement-breakpoint
CREATE UNIQUE INDEX "trip_revisions_one_current_idx" ON "trip_revisions" USING btree ("trip_id") WHERE "trip_revisions"."status" = 'current';--> statement-breakpoint
CREATE INDEX "trip_revisions_trip_idx" ON "trip_revisions" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "trips_owner_idx" ON "trips" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "trips_intake_idx" ON "trips" USING btree ("intake_id");--> statement-breakpoint
ALTER TABLE "trip_revisions" ADD CONSTRAINT "trip_revisions_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_current_revision_id_trip_revisions_id_fk" FOREIGN KEY ("current_revision_id") REFERENCES "public"."trip_revisions"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "tripai";
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "tripai"."current_owner_id"()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('tripai.owner_id', true), '')::uuid
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "tripai"."owns_trip"(target_trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM "public"."trips"
    WHERE "trips"."id" = target_trip_id
      AND "trips"."owner_id" = "tripai"."current_owner_id"()
      AND "trips"."deleted_at" IS NULL
  )
$$;
--> statement-breakpoint
ALTER TABLE "owners" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "owners" FORCE ROW LEVEL SECURITY;
ALTER TABLE "trip_intakes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "trip_intakes" FORCE ROW LEVEL SECURITY;
ALTER TABLE "trips" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "trips" FORCE ROW LEVEL SECURITY;
ALTER TABLE "trip_revisions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "trip_revisions" FORCE ROW LEVEL SECURITY;
ALTER TABLE "trip_days" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "trip_days" FORCE ROW LEVEL SECURITY;
ALTER TABLE "stops" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stops" FORCE ROW LEVEL SECURITY;
ALTER TABLE "notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notes" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ratings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ratings" FORCE ROW LEVEL SECURITY;
ALTER TABLE "photo_metadata" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "photo_metadata" FORCE ROW LEVEL SECURITY;
ALTER TABLE "share_links" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "share_links" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "owners_owner_all" ON "owners" FOR ALL USING ("id" = "tripai"."current_owner_id"()) WITH CHECK ("id" = "tripai"."current_owner_id"());
--> statement-breakpoint
CREATE POLICY "trip_intakes_owner_all" ON "trip_intakes" FOR ALL USING ("owner_id" = "tripai"."current_owner_id"()) WITH CHECK ("owner_id" = "tripai"."current_owner_id"());
--> statement-breakpoint
CREATE POLICY "trips_owner_all" ON "trips" FOR ALL USING ("owner_id" = "tripai"."current_owner_id"() AND "deleted_at" IS NULL) WITH CHECK ("owner_id" = "tripai"."current_owner_id"());
--> statement-breakpoint
CREATE POLICY "trip_revisions_owner_all" ON "trip_revisions" FOR ALL USING ("tripai"."owns_trip"("trip_id")) WITH CHECK ("tripai"."owns_trip"("trip_id"));
--> statement-breakpoint
CREATE POLICY "trip_days_owner_all" ON "trip_days" FOR ALL USING ("tripai"."owns_trip"("trip_id")) WITH CHECK ("tripai"."owns_trip"("trip_id"));
--> statement-breakpoint
CREATE POLICY "stops_owner_all" ON "stops" FOR ALL USING ("tripai"."owns_trip"("trip_id")) WITH CHECK ("tripai"."owns_trip"("trip_id"));
--> statement-breakpoint
CREATE POLICY "notes_owner_all" ON "notes" FOR ALL USING ("tripai"."owns_trip"("trip_id")) WITH CHECK ("tripai"."owns_trip"("trip_id") AND "author_owner_id" = "tripai"."current_owner_id"());
--> statement-breakpoint
CREATE POLICY "ratings_owner_all" ON "ratings" FOR ALL USING ("tripai"."owns_trip"("trip_id")) WITH CHECK ("tripai"."owns_trip"("trip_id") AND "author_owner_id" = "tripai"."current_owner_id"());
--> statement-breakpoint
CREATE POLICY "photo_metadata_owner_all" ON "photo_metadata" FOR ALL USING ("tripai"."owns_trip"("trip_id")) WITH CHECK ("tripai"."owns_trip"("trip_id") AND "author_owner_id" = "tripai"."current_owner_id"());
--> statement-breakpoint
CREATE POLICY "share_links_owner_all" ON "share_links" FOR ALL USING ("tripai"."owns_trip"("trip_id")) WITH CHECK ("tripai"."owns_trip"("trip_id") AND "created_by_owner_id" = "tripai"."current_owner_id"());
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tripai_app') THEN
    CREATE ROLE tripai_app;
  END IF;
END
$$;
--> statement-breakpoint
GRANT tripai_app TO neondb_owner;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO tripai_app;
GRANT USAGE ON SCHEMA tripai TO tripai_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO tripai_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO tripai_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA tripai TO tripai_app;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "tripai"."current_share_token_hash"()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('tripai.share_token_hash', true), '')
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "tripai"."can_share_trip"(target_trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, tripai
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM "public"."share_links"
    JOIN "public"."trips" ON "trips"."id" = "share_links"."trip_id"
    WHERE "share_links"."trip_id" = target_trip_id
      AND "share_links"."token_hash" = "tripai"."current_share_token_hash"()
      AND "share_links"."revoked_at" IS NULL
      AND "trips"."deleted_at" IS NULL
  )
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "tripai"."current_share_link_id"(target_trip_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, tripai
AS $$
  SELECT "share_links"."id"
  FROM "public"."share_links"
  JOIN "public"."trips" ON "trips"."id" = "share_links"."trip_id"
  WHERE "share_links"."trip_id" = target_trip_id
    AND "share_links"."token_hash" = "tripai"."current_share_token_hash"()
    AND "share_links"."revoked_at" IS NULL
    AND "trips"."deleted_at" IS NULL
  LIMIT 1
$$;
--> statement-breakpoint
CREATE POLICY "trips_share_select" ON "trips" FOR SELECT USING ("tripai"."can_share_trip"("id"));
--> statement-breakpoint
CREATE POLICY "trip_days_share_select" ON "trip_days" FOR SELECT USING ("tripai"."can_share_trip"("trip_id"));
--> statement-breakpoint
CREATE POLICY "stops_share_select" ON "stops" FOR SELECT USING ("tripai"."can_share_trip"("trip_id"));
--> statement-breakpoint
CREATE POLICY "notes_share_select" ON "notes" FOR SELECT USING ("tripai"."can_share_trip"("trip_id"));
--> statement-breakpoint
CREATE POLICY "ratings_share_select" ON "ratings" FOR SELECT USING ("tripai"."can_share_trip"("trip_id"));
--> statement-breakpoint
CREATE POLICY "photo_metadata_share_select" ON "photo_metadata" FOR SELECT USING ("tripai"."can_share_trip"("trip_id"));
--> statement-breakpoint
CREATE POLICY "notes_share_insert" ON "notes" FOR INSERT WITH CHECK (
  "tripai"."can_share_trip"("trip_id")
  AND "author_owner_id" IS NULL
  AND "author_share_link_id" = "tripai"."current_share_link_id"("trip_id")
);
--> statement-breakpoint
CREATE POLICY "ratings_share_insert" ON "ratings" FOR INSERT WITH CHECK (
  "tripai"."can_share_trip"("trip_id")
  AND "author_owner_id" IS NULL
  AND "author_share_link_id" = "tripai"."current_share_link_id"("trip_id")
);
--> statement-breakpoint
CREATE POLICY "photo_metadata_share_insert" ON "photo_metadata" FOR INSERT WITH CHECK (
  "tripai"."can_share_trip"("trip_id")
  AND "author_owner_id" IS NULL
  AND "author_share_link_id" = "tripai"."current_share_link_id"("trip_id")
);
--> statement-breakpoint
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA tripai TO tripai_app;
