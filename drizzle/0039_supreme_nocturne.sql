CREATE TABLE "workspace_weekly_summaries" (
	"workspace_id" uuid NOT NULL,
	"week_start" timestamp with time zone NOT NULL,
	"points" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"truncated" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_weekly_summaries_workspace_id_week_start_pk" PRIMARY KEY("workspace_id","week_start"),
	CONSTRAINT "weekly_summary_count_check" CHECK ("workspace_weekly_summaries"."count" between 0 and 40)
);
--> statement-breakpoint
ALTER TABLE "workspace_weekly_summaries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "workspace_weekly_summaries" ADD CONSTRAINT "workspace_weekly_summaries_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;