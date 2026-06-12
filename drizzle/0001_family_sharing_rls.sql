CREATE POLICY "trip_revisions_share_select" ON "trip_revisions" FOR SELECT USING ("tripai"."can_share_trip"("trip_id"));
--> statement-breakpoint
CREATE POLICY "notes_owner_moderate_share_contributions" ON "notes" FOR UPDATE USING (
  "tripai"."owns_trip"("trip_id")
  AND "author_share_link_id" IS NOT NULL
) WITH CHECK (
  "tripai"."owns_trip"("trip_id")
  AND "author_share_link_id" IS NOT NULL
);
--> statement-breakpoint
CREATE POLICY "ratings_owner_moderate_share_contributions" ON "ratings" FOR UPDATE USING (
  "tripai"."owns_trip"("trip_id")
  AND "author_share_link_id" IS NOT NULL
) WITH CHECK (
  "tripai"."owns_trip"("trip_id")
  AND "author_share_link_id" IS NOT NULL
);
