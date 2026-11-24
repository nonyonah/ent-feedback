CREATE TABLE "mcp_draft_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"author_user_id" uuid,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"feedback_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"changelog_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mcp_draft_proposal_status_check" CHECK ("mcp_draft_proposals"."status" in ('pending','approved','rejected')),
	CONSTRAINT "mcp_draft_proposal_title_check" CHECK (length("mcp_draft_proposals"."title") between 1 and 120),
	CONSTRAINT "mcp_draft_proposal_body_check" CHECK (length("mcp_draft_proposals"."body") between 1 and 5000)
);
--> statement-breakpoint
ALTER TABLE "mcp_draft_proposals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "mcp_draft_proposals" ADD CONSTRAINT "mcp_draft_proposals_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_draft_proposals" ADD CONSTRAINT "mcp_draft_proposals_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_draft_proposals" ADD CONSTRAINT "mcp_draft_proposals_changelog_id_changelog_entries_id_fk" FOREIGN KEY ("changelog_id") REFERENCES "public"."changelog_entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mcp_draft_proposals_workspace_status_idx" ON "mcp_draft_proposals" USING btree ("workspace_id","status","created_at");