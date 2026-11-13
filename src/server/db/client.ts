import "server-only";

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import type { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { Pool } from "pg";

import { getServerEnv } from "@/server/env";
import * as schema from "@/server/db/schema";

export type Database = NodePgDatabase<typeof schema>;

/** The transaction handle handed to a `db.transaction()` callback. */
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

/**
 * A handle that can run queries on either the pool or an open transaction.
 * Services must accept this and must never call `getDb()` while a transaction
 * is open: the pool would hand out a second connection and exhaust it.
 */
export type Queryable = PgDatabase<NodePgQueryResultHKT, typeof schema>;

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
    // Every request must fit in a single connection. A transaction holds one
    // connection for its whole lifetime, so a nested query on the pool would
    // wait for a second slot and deadlock the pool once every slot is busy.
    max: env.DATABASE_POOL_MAX,
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
