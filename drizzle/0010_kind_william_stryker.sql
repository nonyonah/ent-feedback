ALTER TABLE "billing_checkouts" ADD COLUMN "mode" text DEFAULT 'subscription' NOT NULL;--> statement-breakpoint
ALTER TABLE "billing_checkouts" ADD COLUMN "amount" text;--> statement-breakpoint
ALTER TABLE "billing_checkouts" ADD COLUMN "payment_id" text;--> statement-breakpoint
ALTER TABLE "billing_checkouts" ADD COLUMN "paid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "billing_checkouts" ADD COLUMN "access_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "workspace_subscriptions" ADD COLUMN "prepaid_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "workspace_subscriptions" ADD COLUMN "prepaid_interval" text;--> statement-breakpoint
ALTER TABLE "billing_checkouts" ADD CONSTRAINT "billing_checkouts_payment_id_unique" UNIQUE("payment_id");