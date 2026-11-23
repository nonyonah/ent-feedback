CREATE TYPE "public"."changelog_status" AS ENUM('draft', 'scheduled', 'published');--> statement-breakpoint
ALTER TYPE "public"."changelog_category" ADD VALUE IF NOT EXISTS 'announcement';--> statement-breakpoint
CREATE TABLE "changelog_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"changelog_id" uuid NOT NULL,
	"feedback_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "changelog_feedback_pair_unique" UNIQUE("changelog_id","feedback_id")
);
--> statement-breakpoint
ALTER TABLE "changelog_entries" DROP CONSTRAINT IF EXISTS "changelog_entries_body_length";--> statement-breakpoint
ALTER TABLE "changelog_entries" ADD COLUMN "slug" text;--> statement-breakpoint
UPDATE "changelog_entries" SET "slug" = left(coalesce(nullif(trim(both '-' from regexp_replace(lower("title"), '[^a-z0-9]+', '-', 'g')), ''), 'update'), 60) || '-' || left("id"::text, 6);--> statement-breakpoint
UPDATE "changelog_entries" SET "slug" = "slug" || '-' || left("id"::text, 4) WHERE "slug" in (select "slug" from "changelog_entries" group by "slug" having count(*) > 1);--> statement-breakpoint
ALTER TABLE "changelog_entries" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "changelog_entries" ADD COLUMN "summary" text;--> statement-breakpoint
ALTER TABLE "changelog_entries" ADD COLUMN "status" "changelog_status" DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "changelog_entries" ADD COLUMN "scheduled_for" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "changelog_feedback" ADD CONSTRAINT "changelog_feedback_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changelog_entries" ADD CONSTRAINT "changelog_entries_id_workspace_id_unique" UNIQUE("id","workspace_id");--> statement-breakpoint
ALTER TABLE "changelog_feedback" ADD CONSTRAINT "changelog_feedback_entry_workspace_fk" FOREIGN KEY ("changelog_id","workspace_id") REFERENCES "public"."changelog_entries"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changelog_feedback" ADD CONSTRAINT "changelog_feedback_item_workspace_fk" FOREIGN KEY ("feedback_id","workspace_id") REFERENCES "public"."feedback"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "changelog_feedback_item_idx" ON "changelog_feedback" USING btree ("feedback_id");--> statement-breakpoint
CREATE INDEX "changelog_entries_scheduled_idx" ON "changelog_entries" USING btree ("status","scheduled_for");--> statement-breakpoint
ALTER TABLE "changelog_entries" ADD CONSTRAINT "changelog_entries_workspace_slug_unique" UNIQUE("workspace_id","slug");--> statement-breakpoint
ALTER TABLE "changelog_entries" ADD CONSTRAINT "changelog_entries_slug_format" CHECK ("changelog_entries"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length("changelog_entries"."slug") between 1 and 80);--> statement-breakpoint
ALTER TABLE "changelog_entries" ADD CONSTRAINT "changelog_entries_summary_length" CHECK ("changelog_entries"."summary" is null or length("changelog_entries"."summary") <= 300);--> statement-breakpoint
ALTER TABLE "changelog_entries" ADD CONSTRAINT "changelog_entries_body_length" CHECK (length("changelog_entries"."body") between 1 and 20000);--> statement-breakpoint
UPDATE "changelog_entries" SET "status" = 'published' WHERE "published_at" is not null;
