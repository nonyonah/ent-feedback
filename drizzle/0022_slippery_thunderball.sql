CREATE TABLE "voter_email_optouts" (
	"workspace_id" uuid NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "voter_email_optouts_workspace_id_email_pk" PRIMARY KEY("workspace_id","email")
);
--> statement-breakpoint
ALTER TABLE "voter_email_optouts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN "roadmap_visible" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN "roadmap_order" double precision;--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN "public_note" text;--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN "shipped_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN "shipped_notified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "voter_email_optouts" ADD CONSTRAINT "voter_email_optouts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feedback_roadmap_idx" ON "feedback" USING btree ("workspace_id","status","roadmap_order");--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_public_note_length" CHECK ("feedback"."public_note" is null or length("feedback"."public_note") <= 140);--> statement-breakpoint
-- Existing items start in vote order; timestamps are internal and never shown on cards.
WITH ranked AS (
 SELECT f.id, row_number() OVER (PARTITION BY f.workspace_id,f.status ORDER BY (SELECT count(*) FROM votes v WHERE v.feedback_id=f.id) DESC,f.created_at,f.id)-1 AS position
 FROM feedback f WHERE f.status IN ('planned','in-progress','shipped')
) UPDATE feedback SET roadmap_order=ranked.position FROM ranked WHERE feedback.id=ranked.id;
--> statement-breakpoint
UPDATE feedback SET shipped_at=updated_at WHERE status='shipped';
--> statement-breakpoint
CREATE OR REPLACE FUNCTION ent_roadmap_status() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  NEW.shipped_at := CASE WHEN NEW.status='shipped' THEN now() ELSE NULL END;
 ELSE
  IF NEW.status IS DISTINCT FROM OLD.status THEN
   NEW.shipped_at := CASE WHEN NEW.status='shipped' THEN now() ELSE NULL END;
  END IF;
 END IF;
 IF NEW.status <> 'open' AND (NEW.roadmap_order IS NULL OR (TG_OP='UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND NEW.roadmap_order IS NOT DISTINCT FROM OLD.roadmap_order)) THEN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.workspace_id::text || ':roadmap',0));
  SELECT coalesce(max(roadmap_order)+1,0) INTO NEW.roadmap_order FROM feedback WHERE workspace_id=NEW.workspace_id AND status=NEW.status AND id<>NEW.id;
 END IF;
 RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER feedback_roadmap_status BEFORE INSERT OR UPDATE ON feedback FOR EACH ROW EXECUTE FUNCTION ent_roadmap_status();
