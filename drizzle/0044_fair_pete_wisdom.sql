CREATE TABLE "mcp_reply_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"feedback_id" uuid NOT NULL,
	"author_user_id" uuid,
	"body" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mcp_reply_proposal_status_check" CHECK ("mcp_reply_proposals"."status" in ('pending','approved','rejected')),
	CONSTRAINT "mcp_reply_proposal_body_check" CHECK (length("mcp_reply_proposals"."body") between 1 and 5000)
);
--> statement-breakpoint
ALTER TABLE "mcp_reply_proposals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "mcp_reply_proposals" ADD CONSTRAINT "mcp_reply_proposals_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_reply_proposals" ADD CONSTRAINT "mcp_reply_proposals_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_reply_proposals" ADD CONSTRAINT "mcp_reply_proposals_feedback_id_workspace_id_feedback_id_workspace_id_fk" FOREIGN KEY ("feedback_id","workspace_id") REFERENCES "public"."feedback"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mcp_reply_proposals_target_idx" ON "mcp_reply_proposals" USING btree ("workspace_id","feedback_id","status");