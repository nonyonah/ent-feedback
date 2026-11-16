CREATE TABLE "chat_faqs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_faq_lengths" CHECK (length("chat_faqs"."question") between 1 and 200 and length("chat_faqs"."answer") between 1 and 3000)
);
--> statement-breakpoint
ALTER TABLE "chat_faqs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"sequence" bigserial NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" text NOT NULL,
	"body" text NOT NULL,
	"request_id" uuid NOT NULL,
	"source_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"suggestion" jsonb,
	"author_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_messages_request_role_unique" UNIQUE("conversation_id","request_id","role"),
	CONSTRAINT "chat_messages_role_check" CHECK ("chat_messages"."role" in ('visitor','assistant','team')),
	CONSTRAINT "chat_messages_body_length" CHECK (length("chat_messages"."body") between 1 and 4000)
);
--> statement-breakpoint
ALTER TABLE "chat_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "chat_settings" (
	"workspace_id" uuid PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"slack_escalations" boolean DEFAULT true NOT NULL,
	"slack_followups" boolean DEFAULT true NOT NULL,
	"slack_feedback" boolean DEFAULT false NOT NULL,
	"slack_statuses" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "conversation_feedback" (
	"workspace_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"feedback_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_feedback_conversation_id_feedback_id_pk" PRIMARY KEY("conversation_id","feedback_id")
);
--> statement-breakpoint
ALTER TABLE "conversation_feedback" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"email" text,
	"status" text DEFAULT 'open' NOT NULL,
	"mode" text DEFAULT 'ai' NOT NULL,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"preview" text DEFAULT '' NOT NULL,
	"unread" boolean DEFAULT false NOT NULL,
	"generation_id" uuid,
	"generation_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversations_id_workspace_unique" UNIQUE("id","workspace_id"),
	CONSTRAINT "conversations_token_unique" UNIQUE("token_hash"),
	CONSTRAINT "conversations_status_check" CHECK ("conversations"."status" in ('open','escalated','resolved')),
	CONSTRAINT "conversations_mode_check" CHECK ("conversations"."mode" in ('ai','human'))
);
--> statement-breakpoint
ALTER TABLE "conversations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "chat_faqs" ADD CONSTRAINT "chat_faqs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_workspace_id_conversations_id_workspace_id_fk" FOREIGN KEY ("conversation_id","workspace_id") REFERENCES "public"."conversations"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_settings" ADD CONSTRAINT "chat_settings_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_feedback" ADD CONSTRAINT "conversation_feedback_conversation_id_workspace_id_conversations_id_workspace_id_fk" FOREIGN KEY ("conversation_id","workspace_id") REFERENCES "public"."conversations"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_feedback" ADD CONSTRAINT "conversation_feedback_feedback_id_workspace_id_feedback_id_workspace_id_fk" FOREIGN KEY ("feedback_id","workspace_id") REFERENCES "public"."feedback"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_faqs_workspace_idx" ON "chat_faqs" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "chat_messages_cursor_idx" ON "chat_messages" USING btree ("conversation_id","sequence");--> statement-breakpoint
CREATE INDEX "conversations_inbox_idx" ON "conversations" USING btree ("workspace_id","status","last_activity_at");