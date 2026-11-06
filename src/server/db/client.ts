import "server-only";

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { getServerEnv } from "@/server/env";
import * as schema from "@/server/db/schema";

export type Database = NodePgDatabase<typeof schema>;

type DatabaseState = {
  pool: Pool;
  db: Database;
};

const globalForDatabase = globalThis as unknown as {
  __entFeedbackDatabase?: DatabaseState;
};

function createDatabaseState(): DatabaseState {
  const env = getServerEnv();
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  pool.on("error", (error) => {
    console.error("Unexpected PostgreSQL pool error", error);
  });

  return {
    pool,
    db: drizzle(pool, { schema }),
  };
}

export function getDb(): Database {
  if (!globalForDatabase.__entFeedbackDatabase) {
    globalForDatabase.__entFeedbackDatabase = createDatabaseState();
  }

  return globalForDatabase.__entFeedbackDatabase.db;
}

export function getPool(): Pool {
  if (!globalForDatabase.__entFeedbackDatabase) {
    globalForDatabase.__entFeedbackDatabase = createDatabaseState();
  }

  return globalForDatabase.__entFeedbackDatabase.pool;
}

export async function closeDb(): Promise<void> {
  if (!globalForDatabase.__entFeedbackDatabase) {
    return;
  }

  await globalForDatabase.__entFeedbackDatabase.pool.end();
  globalForDatabase.__entFeedbackDatabase = undefined;
}

export { schema };
