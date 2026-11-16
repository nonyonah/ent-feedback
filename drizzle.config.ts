import {databaseConnectionUrl} from "./src/server/db/connection";
import { config } from "dotenv";

import { defineConfig } from "drizzle-kit";

// Only this CLI process uses Drizzle Kit’s default-schema representation.
process.env.ENT_SCHEMA_GENERATION = "true";

config({ path: [".env.local", ".env"] });

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_MIGRATION_URL?.trim()||(process.env.DATABASE_URL?databaseConnectionUrl(process.env.DATABASE_URL,{direct:true}):""),
  },
  strict: true,
  verbose: true,
});
