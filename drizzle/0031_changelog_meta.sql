CREATE TYPE "public"."changelog_category" AS ENUM('new-feature', 'improvement', 'bug-fix', 'performance', 'documentation');--> statement-breakpoint
ALTER TABLE "changelog_entries" ADD COLUMN "category" "changelog_category" DEFAULT 'new-feature' NOT NULL;--> statement-breakpoint
ALTER TABLE "changelog_entries" ADD COLUMN "author_user_id" uuid;--> statement-breakpoint
ALTER TABLE "changelog_entries" ADD CONSTRAINT "changelog_entries_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;