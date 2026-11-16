ALTER TABLE "conversations" ADD COLUMN "team_read_sequence" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "visitor_read_sequence" bigint DEFAULT 0 NOT NULL;