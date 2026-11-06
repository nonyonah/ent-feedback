CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN "merged_into_id" uuid;--> statement-breakpoint
CREATE INDEX "rate_limits_expiry_idx" ON "rate_limits" USING btree ("expires_at");--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_merged_target_fk" FOREIGN KEY ("merged_into_id","workspace_id") REFERENCES "public"."feedback"("id","workspace_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_merge_not_self_check" CHECK ("feedback"."merged_into_id" is null or "feedback"."merged_into_id" <> "feedback"."id");