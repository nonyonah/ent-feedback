CREATE TABLE "analytics_widget_installs" (
	"board_id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analytics_widget_installs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "analytics_widget_installs" ADD CONSTRAINT "analytics_widget_installs_board_id_workspace_id_boards_id_workspace_id_fk" FOREIGN KEY ("board_id","workspace_id") REFERENCES "public"."boards"("id","workspace_id") ON DELETE cascade ON UPDATE no action;