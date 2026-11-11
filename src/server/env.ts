import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
  DATABASE_URL: z.url(),
  CLERK_SECRET_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1).optional(),
  CLERK_WEBHOOK_SIGNING_SECRET: z.string().min(1).optional(),
  INTEGRATION_ENCRYPTION_KEY: z.string().optional(),
  SLACK_CLIENT_ID: z.string().optional(),
  SLACK_CLIENT_SECRET: z.string().optional(),
  DISCORD_CLIENT_ID: z.string().optional(),
  DISCORD_CLIENT_SECRET: z.string().optional(),
  R2_ACCOUNT_ID: z.string().min(1).optional(),
  R2_ACCESS_KEY_ID: z.string().min(1).optional(),
  R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  R2_BUCKET: z.string().min(1).optional(),
  R2_PUBLIC_BASE_URL: z.url().optional(),
  CRON_SECRET: z.string().min(32).optional(),
  SENDBYTE_API_KEY: z.string().min(1).optional(),
  LIFECYCLE_EMAILS_ENABLED: z.enum(["true","false"]).default("false"),
  EMAIL_UNSUBSCRIBE_SECRET: z.string().min(32).optional(),
  EMAIL_FROM: z.string().min(1).optional(),
  BACHS_RETURN_ORIGIN:z.url().optional(),
  BACHS_API_KEY:z.string().optional(),
  BACHS_WEBHOOK_SECRET:z.string().optional(),
  BACHS_ORGANIZATION_ID:z.string().optional(),
  BACHS_MONTHLY_PRODUCT_ID:z.string().optional(),
  BACHS_YEARLY_PRODUCT_ID:z.string().optional(),
  BACHS_MONTHLY_TRIAL_PRODUCT_ID:z.string().optional(),
  BACHS_YEARLY_TRIAL_PRODUCT_ID:z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  // Next reloads .env.local during development; do not retain a stale snapshot.
  if (cached && process.env.NODE_ENV === "production") {
    return cached;
  }

  const parsed = serverEnvSchema.safeParse(
    Object.fromEntries(
      Object.entries(process.env).map(([key, value]) => [
        key,
        value === "" ? undefined : value,
      ]),
    ),
  );

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid server environment: ${issues}`);
  }

  cached = parsed.data;
  return cached;
}

export function isClerkConfigured(): boolean {
  return Boolean(
    process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  );
}

export function requireProviderEnv<K extends keyof ServerEnv>(
  keys: readonly K[],
): Pick<ServerEnv, K> {
  const env = getServerEnv();
  const missing = keys.filter((key) => !env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing provider configuration: ${missing.join(", ")}`);
  }

  return Object.fromEntries(keys.map((key) => [key, env[key]])) as Pick<ServerEnv, K>;
}
