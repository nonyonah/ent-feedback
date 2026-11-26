import "server-only";

import { SeverityNumber } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";

const enabled = process.env.ANALYTICS_ENABLED === "true";
const token = process.env.POSTHOG_SERVER_KEY ?? process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host = process.env.POSTHOG_SERVER_HOST ?? process.env.NEXT_PUBLIC_POSTHOG_HOST;
let endpoint: string | undefined;
if (host) {
  try {
    endpoint = new URL("/i/v1/logs", host).toString();
  } catch {}
}

if (enabled && (!token || !endpoint) && process.env.NODE_ENV !== "production") {
  const variable = !token ? "POSTHOG_SERVER_KEY" : "POSTHOG_SERVER_HOST";
  console.warn(`${variable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${variable} is configured`);
}

const loggerProvider = enabled && token && endpoint
  ? new LoggerProvider({
      resource: resourceFromAttributes({ "service.name": "ent-feedback" }),
      processors: [new BatchLogRecordProcessor({
        exporter: new OTLPLogExporter({
          url: endpoint,
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        }),
      })],
    })
  : undefined;
const logger = loggerProvider?.getLogger("posthog-exporter");
let shutdownRegistered = false;

export function registerPostHogLogger() {
  if (!loggerProvider || shutdownRegistered) return;
  shutdownRegistered = true;
  process.once("beforeExit", () => {
    void loggerProvider.shutdown().catch(() => {});
  });
}

export function logPostHogOperation(operation: string) {
  logger?.emit({
    body: "Application operation completed",
    severityNumber: SeverityNumber.INFO,
    attributes: { operation, outcome: "succeeded" },
  });
}
