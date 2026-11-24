CREATE TABLE "feedback_ai_suggestions" (
	"workspace_id" uuid NOT NULL,
	"feedback_id" uuid NOT NULL,
	"category" text NOT NULL,
	"tag_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source_updated_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feedback_ai_suggestions_workspace_id_feedback_id_pk" PRIMARY KEY("workspace_id","feedback_id"),
	CONSTRAINT "feedback_ai_suggestion_category_check" CHECK ("feedback_ai_suggestions"."category" in ('feedback','bug','feature_request','question'))
);
--> statement-breakpoint
ALTER TABLE "feedback_ai_suggestions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "feedback_ai_suggestions" ADD CONSTRAINT "feedback_ai_suggestions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_ai_suggestions" ADD CONSTRAINT "feedback_ai_suggestions_feedback_id_workspace_id_feedback_id_workspace_id_fk" FOREIGN KEY ("feedback_id","workspace_id") REFERENCES "public"."feedback"("id","workspace_id") ON DELETE cascade ON UPDATE no action;