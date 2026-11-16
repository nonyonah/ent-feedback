CREATE TABLE "chat_uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"uploader_user_id" uuid,
	"storage_key" text NOT NULL,
	"request_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_uploads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "slack_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"thread_ts" text NOT NULL,
	"conversation_id" uuid,
	"feedback_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "slack_threads_channel_ts_unique" UNIQUE("connection_id","channel","thread_ts"),
	CONSTRAINT "slack_threads_one_target" CHECK (num_nonnulls("slack_threads"."conversation_id","slack_threads"."feedback_id")=1)
);
--> statement-breakpoint
ALTER TABLE "slack_threads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "chat_uploads" ADD CONSTRAINT "chat_uploads_uploader_user_id_users_id_fk" FOREIGN KEY ("uploader_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_uploads" ADD CONSTRAINT "chat_uploads_conversation_id_workspace_id_conversations_id_workspace_id_fk" FOREIGN KEY ("conversation_id","workspace_id") REFERENCES "public"."conversations"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slack_threads" ADD CONSTRAINT "slack_threads_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slack_threads" ADD CONSTRAINT "slack_threads_connection_id_integration_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."integration_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_uploads_request_idx" ON "chat_uploads" USING btree ("conversation_id","request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "slack_threads_conversation_unique" ON "slack_threads" USING btree ("connection_id","conversation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "slack_threads_feedback_unique" ON "slack_threads" USING btree ("connection_id","feedback_id");