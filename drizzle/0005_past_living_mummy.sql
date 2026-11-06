ALTER TABLE "workspaces" ALTER COLUMN "accent_color" SET DEFAULT '#7443e9';
--> statement-breakpoint
UPDATE "workspaces" SET "accent_color" = '#7443e9', "updated_at" = now() WHERE lower("accent_color") = '#6247aa';
