ALTER TABLE "chat_websites" ALTER COLUMN "url" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "chat_websites" ADD COLUMN "documentation_url" text;--> statement-breakpoint
ALTER TABLE "chat_websites" ADD COLUMN "documentation_pages" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_websites" ADD COLUMN "documentation_synced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "topic_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;