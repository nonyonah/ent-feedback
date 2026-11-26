export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { registerPostHogLogger } = await import("@/lib/analytics/logs");
  registerPostHogLogger();
}
