CREATE TABLE "chat_websites" (
	"workspace_id" uuid PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"pages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_websites" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "chat_settings" ADD COLUMN "operations" jsonb DEFAULT '{"mode":"always","timezone":"UTC","days":[1,2,3,4,5],"start":"09:00","end":"17:00","awayMessage":"Our team is away. Leave a message and we’ll reply when we’re back.","allOperators":true,"operatorIds":[]}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_websites" ADD CONSTRAINT "chat_websites_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;