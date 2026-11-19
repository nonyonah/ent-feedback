CREATE TABLE "connected_apps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"external_id" text NOT NULL,
	"label" text NOT NULL,
	"encrypted_credentials" text,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"connected" boolean DEFAULT true NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "connected_apps_workspace_provider_unique" UNIQUE("workspace_id","provider"),
	CONSTRAINT "connected_apps_provider_check" CHECK ("connected_apps"."provider" in ('linear','discord'))
);
--> statement-breakpoint
ALTER TABLE "connected_apps" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "discord_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"event_key" text NOT NULL,
	"message_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"conversation_id" uuid,
	"feedback_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discord_delivery_event_unique" UNIQUE("connection_id","event_key"),
	CONSTRAINT "discord_delivery_message_unique" UNIQUE("connection_id","message_id"),
	CONSTRAINT "discord_delivery_target_check" CHECK (num_nonnulls("discord_deliveries"."feedback_id","discord_deliveries"."conversation_id")=1)
);
--> statement-breakpoint
ALTER TABLE "discord_deliveries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "discord_identities" (
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"discord_user_id" text NOT NULL,
	CONSTRAINT "discord_identities_workspace_id_user_id_pk" PRIMARY KEY("workspace_id","user_id"),
	CONSTRAINT "discord_identity_external_unique" UNIQUE("workspace_id","discord_user_id")
);
--> statement-breakpoint
ALTER TABLE "discord_identities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "linear_issue_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"feedback_id" uuid NOT NULL,
	"issue_id" text NOT NULL,
	"identifier" text NOT NULL,
	"url" text NOT NULL,
	"synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "linear_issue_feedback_unique" UNIQUE("connection_id","feedback_id"),
	CONSTRAINT "linear_issue_external_unique" UNIQUE("connection_id","issue_id")
);
--> statement-breakpoint
ALTER TABLE "linear_issue_links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "connected_apps" ADD CONSTRAINT "connected_apps_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connected_apps" ADD CONSTRAINT "connected_apps_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discord_deliveries" ADD CONSTRAINT "discord_deliveries_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discord_deliveries" ADD CONSTRAINT "discord_deliveries_connection_id_connected_apps_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."connected_apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discord_deliveries" ADD CONSTRAINT "discord_deliveries_feedback_id_workspace_id_feedback_id_workspace_id_fk" FOREIGN KEY ("feedback_id","workspace_id") REFERENCES "public"."feedback"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discord_deliveries" ADD CONSTRAINT "discord_deliveries_conversation_id_workspace_id_conversations_id_workspace_id_fk" FOREIGN KEY ("conversation_id","workspace_id") REFERENCES "public"."conversations"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discord_identities" ADD CONSTRAINT "discord_identities_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discord_identities" ADD CONSTRAINT "discord_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linear_issue_links" ADD CONSTRAINT "linear_issue_links_connection_id_connected_apps_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."connected_apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linear_issue_links" ADD CONSTRAINT "linear_issue_links_feedback_id_workspace_id_feedback_id_workspace_id_fk" FOREIGN KEY ("feedback_id","workspace_id") REFERENCES "public"."feedback"("id","workspace_id") ON DELETE cascade ON UPDATE no action;