CREATE TABLE "preview_claims" (
	"workspace_id" uuid PRIMARY KEY NOT NULL,
	"board_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"prospect_name" text,
	"expires_at" timestamp with time zone NOT NULL,
	"claimed_at" timestamp with time zone,
	CONSTRAINT "preview_claims_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN "is_sample" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN "starting_votes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "widget_installed_domain" text;--> statement-breakpoint
ALTER TABLE "preview_claims" ADD CONSTRAINT "preview_claims_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preview_claims" ADD CONSTRAINT "preview_claims_board_id_workspace_id_boards_id_workspace_id_fk" FOREIGN KEY ("board_id","workspace_id") REFERENCES "public"."boards"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_starting_votes_nonnegative" CHECK ("feedback"."starting_votes" >= 0);