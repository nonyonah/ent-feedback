CREATE TABLE "guest_email_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"subject_id" uuid NOT NULL,
	"requester_hash" text NOT NULL,
	"email" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guest_email_subject_unique" UNIQUE("workspace_id","kind","subject_id"),
	CONSTRAINT "guest_email_kind_check" CHECK ("guest_email_verifications"."kind" in ('feedback','chat'))
);
--> statement-breakpoint
ALTER TABLE "guest_email_verifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "guest_email_verifications" ADD CONSTRAINT "guest_email_verifications_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "guest_email_token_idx" ON "guest_email_verifications" USING btree ("token_hash");