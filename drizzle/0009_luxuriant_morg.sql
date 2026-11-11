CREATE TABLE "lifecycle_email_state" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"enrolled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_active_at" timestamp with time zone DEFAULT now() NOT NULL,
	"onboarding_started_at" timestamp with time zone,
	"onboarding_completed_at" timestamp with time zone,
	"opted_out_at" timestamp with time zone,
	"welcome_eligible" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lifecycle_email_state" ADD CONSTRAINT "lifecycle_email_state_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lifecycle_email_state_active_idx" ON "lifecycle_email_state" USING btree ("last_active_at");