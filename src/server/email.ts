import "server-only";

import { requireProviderEnv } from "@/server/env";
import { ServiceError } from "@/server/result";
import {activityEmail,lifecycleEmail,emailLayout,trialEmail,type LifecycleEmail,type TrialEmailKind} from "@/server/emails/templates";

type InvitationEmailInput = {
  to: string;
  workspaceName: string;
  inviterName: string;
  role: "admin" | "member";
  token: string;
};

export async function sendInvitationEmail(input: InvitationEmailInput): Promise<void> {
  const env = requireProviderEnv([
    "SENDBYTE_API_KEY",
    "EMAIL_FROM",
    "NEXT_PUBLIC_APP_URL",
  ] as const);
  const acceptUrl = new URL("/invitations/accept", env.NEXT_PUBLIC_APP_URL);
  acceptUrl.searchParams.set("token", input.token);

  const roleLabel = input.role === "admin" ? "an admin" : "a member";
  await sendEmail({
    to: input.to,
    key: "invitation:" + input.token,
    ...emailLayout({
      subject: `Join ${input.workspaceName} on Ent`,
      heading: `Join ${input.workspaceName}`,
      body: `${input.inviterName} invited you to join ${input.workspaceName} as ${roleLabel}.`,
      action: "Accept invitation",
      url: acceptUrl.toString(),
      footer: "This invitation expires in 7 days. If you were not expecting it, you can ignore this email.",
    }),
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
  await sendEmail({to: input.to, key: input.key, ...activityEmail(input)});
}

export async function sendLifecycleEmail(input: {to:string;kind:LifecycleEmail;appOrigin:string;unsubscribeUrl:string;key:string}):Promise<void>{
  await sendEmail({to:input.to,key:input.key,...lifecycleEmail(input)});
}
export async function sendTrialEmail(input:{to:string;key:string;kind:TrialEmailKind;workspaceName:string;trialEnd:string;cancelAtPeriodEnd:boolean;appOrigin:string}):Promise<void>{
 await sendEmail({to:input.to,key:input.key,...trialEmail(input)});
}
