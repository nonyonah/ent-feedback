CREATE TABLE "feedback_tags" (
	"workspace_id" uuid NOT NULL,
	"feedback_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "feedback_tags_feedback_id_tag_id_pk" PRIMARY KEY("feedback_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_id_workspace_unique" UNIQUE("id","workspace_id"),
	CONSTRAINT "tags_name_check" CHECK (length(trim("tags"."name")) between 1 and 32)
);
--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN "category" text DEFAULT 'feedback' NOT NULL;--> statement-breakpoint
ALTER TABLE "feedback_tags" ADD CONSTRAINT "feedback_tags_feedback_id_workspace_id_feedback_id_workspace_id_fk" FOREIGN KEY ("feedback_id","workspace_id") REFERENCES "public"."feedback"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_tags" ADD CONSTRAINT "feedback_tags_tag_id_workspace_id_tags_id_workspace_id_fk" FOREIGN KEY ("tag_id","workspace_id") REFERENCES "public"."tags"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feedback_tags_workspace_tag_idx" ON "feedback_tags" USING btree ("workspace_id","tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_workspace_name_unique" ON "tags" USING btree ("workspace_id",lower("name"));--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_category_check" CHECK ("feedback"."category" in ('feedback', 'bug', 'feature_request'));