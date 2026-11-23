CREATE TABLE "github_changelog_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"repository" text NOT NULL,
	"encrypted_secret" text NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "github_changelog_workspace_unique" UNIQUE("workspace_id")
);
--> statement-breakpoint
ALTER TABLE "github_changelog_connections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "github_changelog_receipts" (
	"connection_id" uuid NOT NULL,
	"pull_request_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "github_changelog_receipts_connection_id_pull_request_id_pk" PRIMARY KEY("connection_id","pull_request_id")
);
--> statement-breakpoint
ALTER TABLE "github_changelog_receipts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "github_changelog_connections" ADD CONSTRAINT "github_changelog_connections_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_changelog_connections" ADD CONSTRAINT "github_changelog_connections_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_changelog_receipts" ADD CONSTRAINT "github_changelog_receipts_connection_id_github_changelog_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."github_changelog_connections"("id") ON DELETE cascade ON UPDATE no action;