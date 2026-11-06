CREATE TYPE "public"."attachment_status" AS ENUM('pending', 'attached', 'expired');--> statement-breakpoint
CREATE TYPE "public"."feedback_status" AS ENUM('open', 'planned', 'in-progress', 'shipped');--> statement-breakpoint
CREATE TYPE "public"."integration_authorization_state" AS ENUM('disconnected', 'pending', 'connected', 'error');--> statement-breakpoint
CREATE TYPE "public"."integration_provider" AS ENUM('slack', 'discord', 'email');--> statement-breakpoint
CREATE TYPE "public"."integration_scope" AS ENUM('personal', 'workspace');--> statement-breakpoint
CREATE TYPE "public"."invitation_state" AS ENUM('pending', 'accepted', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('pending', 'running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."notification_event_type" AS ENUM('new_feedback', 'feedback_comment', 'comment_reply', 'comment_reaction', 'feedback_reaction');--> statement-breakpoint
CREATE TYPE "public"."widget_details_mode" AS ENUM('none', 'optional', 'required');--> statement-breakpoint
CREATE TYPE "public"."widget_reply_time" AS ENUM('automatic', 'day', 'days', 'week');--> statement-breakpoint
CREATE TYPE "public"."workspace_role" AS ENUM('owner', 'admin', 'member');--> statement-breakpoint
CREATE TYPE "public"."workspace_theme" AS ENUM('dynamic', 'light', 'dark');--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"feedback_id" uuid,
	"comment_id" uuid,
	"storage_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"width" integer,
	"height" integer,
	"uploaded_by_user_id" uuid,
	"guest_actor_id" uuid,
	"status" "attachment_status" DEFAULT 'pending' NOT NULL,
	"attached_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attachments_storage_key_unique" UNIQUE("storage_key"),
	CONSTRAINT "attachments_mime_type_check" CHECK ("attachments"."mime_type" in ('image/png', 'image/jpeg', 'image/webp', 'image/gif')),
	CONSTRAINT "attachments_byte_size_check" CHECK ("attachments"."byte_size" > 0 and "attachments"."byte_size" <= 2097152),
	CONSTRAINT "attachments_single_uploader_check" CHECK (num_nonnulls("attachments"."uploaded_by_user_id", "attachments"."guest_actor_id") = 1),
	CONSTRAINT "attachments_parent_state_check" CHECK (("attachments"."status" = 'attached' and num_nonnulls("attachments"."feedback_id", "attachments"."comment_id") = 1 and "attachments"."attached_at" is not null) or ("attachments"."status" <> 'attached' and "attachments"."feedback_id" is null and "attachments"."comment_id" is null and "attachments"."attached_at" is null))
);
--> statement-breakpoint
CREATE TABLE "boards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"handle" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"color" text DEFAULT '#737373' NOT NULL,
	"emoji" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "boards_workspace_handle_unique" UNIQUE("workspace_id","handle"),
	CONSTRAINT "boards_id_workspace_id_unique" UNIQUE("id","workspace_id"),
	CONSTRAINT "boards_handle_format_check" CHECK (length("handle") between 2 and 64 and "handle" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "boards_color_check" CHECK ("boards"."color" ~ '^#[0-9a-fA-F]{6}$'),
	CONSTRAINT "boards_position_check" CHECK ("boards"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "clerk_webhook_events" (
	"event_id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"feedback_id" uuid NOT NULL,
	"parent_comment_id" uuid,
	"author_user_id" uuid,
	"guest_name" text,
	"guest_email" text,
	"body" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comments_id_workspace_id_unique" UNIQUE("id","workspace_id"),
	CONSTRAINT "comments_id_feedback_id_unique" UNIQUE("id","feedback_id"),
	CONSTRAINT "comments_body_not_empty_check" CHECK (length(trim("comments"."body")) between 1 and 10000),
	CONSTRAINT "comments_guest_email_normalized_check" CHECK ("comments"."guest_email" is null or "comments"."guest_email" = lower("comments"."guest_email"))
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"board_id" uuid NOT NULL,
	"author_user_id" uuid,
	"guest_name" text,
	"guest_email" text,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"status" "feedback_status" DEFAULT 'open' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feedback_id_workspace_id_unique" UNIQUE("id","workspace_id"),
	CONSTRAINT "feedback_title_not_empty_check" CHECK (length(trim("feedback"."title")) between 1 and 200),
	CONSTRAINT "feedback_guest_email_normalized_check" CHECK ("feedback"."guest_email" is null or "feedback"."guest_email" = lower("feedback"."guest_email"))
);
--> statement-breakpoint
CREATE TABLE "follows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"feedback_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "follows_feedback_user_unique" UNIQUE("feedback_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "guest_actors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guest_actors_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "guest_actors_id_workspace_id_unique" UNIQUE("id","workspace_id")
);
--> statement-breakpoint
CREATE TABLE "integration_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"provider" "integration_provider" NOT NULL,
	"scope" "integration_scope" DEFAULT 'workspace' NOT NULL,
	"owner_user_id" uuid,
	"authorization_state" "integration_authorization_state" DEFAULT 'disconnected' NOT NULL,
	"encrypted_secret_ref" text,
	"allowed_channels" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "integration_connections_owner_scope_check" CHECK (("integration_connections"."scope" = 'personal' and "integration_connections"."owner_user_id" is not null) or ("integration_connections"."scope" = 'workspace' and "integration_connections"."owner_user_id" is null))
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" "workspace_role" DEFAULT 'member' NOT NULL,
	"inviter_user_id" uuid,
	"state" "invitation_state" DEFAULT 'pending' NOT NULL,
	"token_hash" text NOT NULL,
	"accepted_by_user_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "email_normalized_check" CHECK ("email" = lower("email")),
	CONSTRAINT "invitations_role_not_owner_check" CHECK ("invitations"."role" <> 'owner')
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "job_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"last_error" text,
	"dedupe_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "jobs_attempts_check" CHECK ("jobs"."attempts" >= 0 and "jobs"."attempts" <= "jobs"."max_attempts"),
	CONSTRAINT "jobs_max_attempts_check" CHECK ("jobs"."max_attempts" > 0)
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"notification_email" text,
	"new_feedback" boolean DEFAULT true NOT NULL,
	"feedback_comments" boolean DEFAULT true NOT NULL,
	"comment_replies" boolean DEFAULT true NOT NULL,
	"comment_reactions" boolean DEFAULT true NOT NULL,
	"feedback_reactions" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_preferences_user_unique" UNIQUE("user_id"),
	CONSTRAINT "notification_preferences_email_normalized_check" CHECK ("notification_preferences"."notification_email" is null or "notification_preferences"."notification_email" = lower("notification_preferences"."notification_email"))
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_user_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"feedback_id" uuid,
	"comment_id" uuid,
	"event_type" "notification_event_type" NOT NULL,
	"dedupe_key" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notifications_dedupe_key_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
CREATE TABLE "reactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"feedback_id" uuid,
	"comment_id" uuid,
	"user_id" uuid,
	"guest_actor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reactions_single_target_check" CHECK (num_nonnulls("reactions"."feedback_id", "reactions"."comment_id") = 1),
	CONSTRAINT "reactions_single_actor_check" CHECK (num_nonnulls("reactions"."user_id", "reactions"."guest_actor_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"feedback_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"previous_status" "feedback_status",
	"new_status" "feedback_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "status_history_changed_check" CHECK ("status_history"."previous_status" is null or "status_history"."previous_status" <> "status_history"."new_status")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"email" text,
	"name" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_user_id_unique" UNIQUE("clerk_user_id"),
	CONSTRAINT "users_clerk_user_id_not_empty_check" CHECK (length(trim("users"."clerk_user_id")) > 0),
	CONSTRAINT "users_email_normalized_check" CHECK ("users"."email" is null or "users"."email" = lower("users"."email"))
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"feedback_id" uuid NOT NULL,
	"user_id" uuid,
	"guest_actor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "votes_single_actor_check" CHECK (num_nonnulls("votes"."user_id", "votes"."guest_actor_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "widget_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"board_id" uuid,
	"enabled" boolean DEFAULT true NOT NULL,
	"details" "widget_details_mode" DEFAULT 'optional' NOT NULL,
	"collect_email" boolean DEFAULT true NOT NULL,
	"collect_name" boolean DEFAULT false NOT NULL,
	"greeting" text DEFAULT '' NOT NULL,
	"reply_time" "widget_reply_time" DEFAULT 'automatic' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "widget_settings_greeting_length_check" CHECK (length("widget_settings"."greeting") <= 500)
);
--> statement-breakpoint
CREATE TABLE "workspace_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "workspace_role" DEFAULT 'member' NOT NULL,
	"status" "membership_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_members_workspace_user_unique" UNIQUE("workspace_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"handle" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"website" text,
	"accent_color" text DEFAULT '#262626' NOT NULL,
	"logo_url" text,
	"theme" "workspace_theme" DEFAULT 'dynamic' NOT NULL,
	"hide_attribution" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspaces_handle_unique" UNIQUE("handle"),
	CONSTRAINT "workspaces_handle_format_check" CHECK (length("handle") between 2 and 64 and "handle" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "workspaces_accent_color_check" CHECK ("workspaces"."accent_color" ~ '^#[0-9a-fA-F]{6}$')
);
--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_feedback_workspace_fk" FOREIGN KEY ("feedback_id","workspace_id") REFERENCES "public"."feedback"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_comment_workspace_fk" FOREIGN KEY ("comment_id","workspace_id") REFERENCES "public"."comments"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_guest_actor_workspace_fk" FOREIGN KEY ("guest_actor_id","workspace_id") REFERENCES "public"."guest_actors"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boards" ADD CONSTRAINT "boards_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_feedback_workspace_fk" FOREIGN KEY ("feedback_id","workspace_id") REFERENCES "public"."feedback"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_comment_fk" FOREIGN KEY ("parent_comment_id","feedback_id") REFERENCES "public"."comments"("id","feedback_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_board_workspace_fk" FOREIGN KEY ("board_id","workspace_id") REFERENCES "public"."boards"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_feedback_workspace_fk" FOREIGN KEY ("feedback_id","workspace_id") REFERENCES "public"."feedback"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_actors" ADD CONSTRAINT "guest_actors_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_inviter_user_id_users_id_fk" FOREIGN KEY ("inviter_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_accepted_by_user_id_users_id_fk" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_feedback_workspace_fk" FOREIGN KEY ("feedback_id","workspace_id") REFERENCES "public"."feedback"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_comment_workspace_fk" FOREIGN KEY ("comment_id","workspace_id") REFERENCES "public"."comments"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_feedback_workspace_fk" FOREIGN KEY ("feedback_id","workspace_id") REFERENCES "public"."feedback"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_comment_workspace_fk" FOREIGN KEY ("comment_id","workspace_id") REFERENCES "public"."comments"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_guest_actor_workspace_fk" FOREIGN KEY ("guest_actor_id","workspace_id") REFERENCES "public"."guest_actors"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_history" ADD CONSTRAINT "status_history_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_history" ADD CONSTRAINT "status_history_feedback_workspace_fk" FOREIGN KEY ("feedback_id","workspace_id") REFERENCES "public"."feedback"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_feedback_workspace_fk" FOREIGN KEY ("feedback_id","workspace_id") REFERENCES "public"."feedback"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_guest_actor_workspace_fk" FOREIGN KEY ("guest_actor_id","workspace_id") REFERENCES "public"."guest_actors"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "widget_settings" ADD CONSTRAINT "widget_settings_workspace_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "widget_settings" ADD CONSTRAINT "widget_settings_board_workspace_fk" FOREIGN KEY ("board_id","workspace_id") REFERENCES "public"."boards"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attachments_feedback_id_idx" ON "attachments" USING btree ("feedback_id");--> statement-breakpoint
CREATE INDEX "attachments_comment_id_idx" ON "attachments" USING btree ("comment_id");--> statement-breakpoint
CREATE INDEX "attachments_status_expires_at_idx" ON "attachments" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "boards_workspace_position_idx" ON "boards" USING btree ("workspace_id","position");--> statement-breakpoint
CREATE INDEX "comments_feedback_created_at_idx" ON "comments" USING btree ("feedback_id","created_at");--> statement-breakpoint
CREATE INDEX "feedback_board_created_at_idx" ON "feedback" USING btree ("board_id","created_at");--> statement-breakpoint
CREATE INDEX "feedback_board_status_created_at_idx" ON "feedback" USING btree ("board_id","status","created_at");--> statement-breakpoint
CREATE INDEX "feedback_workspace_created_at_idx" ON "feedback" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "feedback_search_idx" ON "feedback" USING gin (to_tsvector('english', "title" || ' ' || "body"));--> statement-breakpoint
CREATE INDEX "follows_user_id_idx" ON "follows" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "guest_actors_workspace_id_idx" ON "guest_actors" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "integration_connections_workspace_provider_unique" ON "integration_connections" USING btree ("workspace_id","provider") WHERE "integration_connections"."scope" = 'workspace';--> statement-breakpoint
CREATE UNIQUE INDEX "integration_connections_personal_provider_unique" ON "integration_connections" USING btree ("workspace_id","provider","owner_user_id") WHERE "integration_connections"."scope" = 'personal';--> statement-breakpoint
CREATE INDEX "integration_connections_workspace_idx" ON "integration_connections" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_pending_workspace_email_unique" ON "invitations" USING btree ("workspace_id","email") WHERE "invitations"."state" = 'pending';--> statement-breakpoint
CREATE INDEX "invitations_workspace_state_idx" ON "invitations" USING btree ("workspace_id","state");--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_dedupe_key_unique" ON "jobs" USING btree ("dedupe_key") WHERE "jobs"."dedupe_key" is not null;--> statement-breakpoint
CREATE INDEX "jobs_status_run_at_idx" ON "jobs" USING btree ("status","run_at");--> statement-breakpoint
CREATE INDEX "notifications_recipient_created_at_idx" ON "notifications" USING btree ("recipient_user_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_recipient_read_at_idx" ON "notifications" USING btree ("recipient_user_id","read_at");--> statement-breakpoint
CREATE UNIQUE INDEX "reactions_feedback_user_unique" ON "reactions" USING btree ("feedback_id","user_id") WHERE "reactions"."feedback_id" is not null and "reactions"."user_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "reactions_feedback_guest_actor_unique" ON "reactions" USING btree ("feedback_id","guest_actor_id") WHERE "reactions"."feedback_id" is not null and "reactions"."guest_actor_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "reactions_comment_user_unique" ON "reactions" USING btree ("comment_id","user_id") WHERE "reactions"."comment_id" is not null and "reactions"."user_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "reactions_comment_guest_actor_unique" ON "reactions" USING btree ("comment_id","guest_actor_id") WHERE "reactions"."comment_id" is not null and "reactions"."guest_actor_id" is not null;--> statement-breakpoint
CREATE INDEX "reactions_feedback_id_idx" ON "reactions" USING btree ("feedback_id");--> statement-breakpoint
CREATE INDEX "reactions_comment_id_idx" ON "reactions" USING btree ("comment_id");--> statement-breakpoint
CREATE INDEX "status_history_feedback_created_at_idx" ON "status_history" USING btree ("feedback_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email") WHERE "users"."email" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "votes_feedback_user_unique" ON "votes" USING btree ("feedback_id","user_id") WHERE "votes"."user_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "votes_feedback_guest_actor_unique" ON "votes" USING btree ("feedback_id","guest_actor_id") WHERE "votes"."guest_actor_id" is not null;--> statement-breakpoint
CREATE INDEX "votes_feedback_id_idx" ON "votes" USING btree ("feedback_id");--> statement-breakpoint
CREATE INDEX "votes_user_id_idx" ON "votes" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "widget_settings_workspace_scope_unique" ON "widget_settings" USING btree ("workspace_id") WHERE "widget_settings"."board_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "widget_settings_board_scope_unique" ON "widget_settings" USING btree ("workspace_id","board_id") WHERE "widget_settings"."board_id" is not null;--> statement-breakpoint
CREATE INDEX "workspace_members_user_id_idx" ON "workspace_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "workspace_members_workspace_role_idx" ON "workspace_members" USING btree ("workspace_id","role");