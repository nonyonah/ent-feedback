import "server-only";

import { requireProviderEnv } from "@/server/env";
import { ServiceError } from "@/server/result";

type InvitationEmailInput = {
  to: string;
  workspaceName: string;
  inviterName: string;
  role: "admin" | "member";
  token: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendInvitationEmail(input: InvitationEmailInput): Promise<void> {
  const env = requireProviderEnv([
    "SENDBYTE_API_KEY",
    "EMAIL_FROM",
    "NEXT_PUBLIC_APP_URL",
  ] as const);
  const acceptUrl = new URL("/invitations/accept", env.NEXT_PUBLIC_APP_URL);
  acceptUrl.searchParams.set("token", input.token);

  const roleLabel = input.role === "admin" ? "an admin" : "a member";
  const text = [
    `${input.inviterName} invited you to join ${input.workspaceName} as ${roleLabel} on Ent.`,
    "",
    `Accept the invitation: ${acceptUrl.toString()}`,
    "",
    "This invitation expires in 7 days.",
  ].join("\n");

  const html = `
    <div style="font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;line-height:1.6;color:#171717;max-width:520px;margin:0 auto;padding:32px 24px">
      <p style="margin:0 0 8px;font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:#737373">Ent</p>
      <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3">Join ${escapeHtml(input.workspaceName)}</h1>
      <p style="margin:0 0 24px;color:#525252">${escapeHtml(input.inviterName)} invited you to join <strong>${escapeHtml(input.workspaceName)}</strong> as ${roleLabel}.</p>
      <a href="${acceptUrl.toString()}" style="display:inline-block;border-radius:10px;background:#7443e9;color:#ffffff;padding:10px 18px;text-decoration:none;font-weight:600;font-size:14px">Accept invitation</a>
      <p style="margin:24px 0 0;font-size:12px;color:#737373">This invitation expires in 7 days. If you were not expecting it, you can ignore this email.</p>
    </div>
  `.trim();

  await sendEmail({
    to: input.to,
    subject: `Join ${input.workspaceName} on Ent`,
    key: "invitation:" + input.token,
    text,
    html,
  });
}

type EmailInput = {
  to: string;
  subject: string;
  key: string;
  text: string;
  html: string;
};

async function sendEmail(input: EmailInput): Promise<void> {
  const env = requireProviderEnv(["SENDBYTE_API_KEY", "EMAIL_FROM"] as const);
  try {
    const response = await fetch("https://api.sendbyte.africa/v1/emails", {
      method: "POST",
      signal: AbortSignal.timeout(15_000),
      headers: {
        Authorization: `Bearer ${env.SENDBYTE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
        idempotency_key: input.key,
      }),
    });
    if (!response.ok) {
      throw new ServiceError("retryable", "Email delivery could not be completed.", {
        details: { provider: "sendbyte", status: response.status },
      });
    }
    const receipt: unknown = await response.json();
    if (!receipt || typeof receipt !== "object" || !("id" in receipt) ||
        typeof receipt.id !== "string" || !receipt.id.trim()) {
      throw new ServiceError("retryable", "The email provider did not confirm acceptance.");
    }
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    // Do not expose provider response bodies, addresses or credentials in errors.
    throw new ServiceError("retryable", "Email delivery could not be confirmed.");
  }
}

export async function sendActivityEmail(input: {
  to: string;
  subject: string;
  title: string;
  url: string;
  key: string;
}): Promise<void> {
  const preferences = "Manage notifications from the bell on your feedback board. Unfollow a post to stop status updates.";
  await sendEmail({
    to: input.to,
    subject: input.subject,
    key: input.key,
    text: `${input.subject}\n\n${input.title}\n\nOpen feedback: ${input.url}\n\n${preferences}`,
    html: `<div style="font:14px/1.5 Inter,system-ui,sans-serif;color:#171717;max-width:520px;margin:auto;padding:24px"><h1 style="font-size:16px">${escapeHtml(input.subject)}</h1><p>${escapeHtml(input.title)}</p><a style="color:#7443e9" href="${escapeHtml(input.url)}">Open feedback</a><p>${preferences}</p></div>`,
  });
}
