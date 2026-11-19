-- Open items participate only in the owner roadmap. Preserve existing positions.
WITH ranked AS (
 SELECT f.id, row_number() OVER (PARTITION BY f.workspace_id ORDER BY (SELECT count(*) FROM votes v WHERE v.feedback_id=f.id) DESC,f.created_at,f.id)-1 AS position
 FROM feedback f WHERE f.status='open'
) UPDATE feedback SET roadmap_order=ranked.position FROM ranked WHERE feedback.id=ranked.id AND feedback.roadmap_order IS NULL;
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
 IF (NEW.roadmap_order IS NULL OR (TG_OP='UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND NEW.roadmap_order IS NOT DISTINCT FROM OLD.roadmap_order)) THEN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.workspace_id::text || ':roadmap',0));
  SELECT coalesce(max(roadmap_order)+1,0) INTO NEW.roadmap_order FROM feedback WHERE workspace_id=NEW.workspace_id AND status=NEW.status AND id<>NEW.id;
 END IF;
 RETURN NEW;
END;
$$;
