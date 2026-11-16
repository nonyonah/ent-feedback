CREATE TABLE "operator_presence" (
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"app_seen_at" timestamp with time zone,
	"slack_checked_at" timestamp with time zone,
	"slack_online" boolean DEFAULT false NOT NULL,
	"slack_user_id" text,
	"slack_connection_version" text,
	CONSTRAINT "operator_presence_workspace_id_user_id_pk" PRIMARY KEY("workspace_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "operator_presence" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "operator_presence" ADD CONSTRAINT "operator_presence_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operator_presence" ADD CONSTRAINT "operator_presence_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;