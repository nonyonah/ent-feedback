CREATE TABLE "billing_trial_claims" (
	"subject" text PRIMARY KEY NOT NULL,
	"checkout_attempt_id" uuid,
	"used_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "billing_trial_claims" ADD CONSTRAINT "billing_trial_claims_checkout_attempt_id_billing_checkouts_id_fk" FOREIGN KEY ("checkout_attempt_id") REFERENCES "public"."billing_checkouts"("id") ON DELETE set null ON UPDATE no action;