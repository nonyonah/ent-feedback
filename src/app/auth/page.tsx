import { auth } from "@clerk/nextjs/server";
import { AuthWidget } from "@/components/feedback/auth-widget";
import { redirect } from "next/navigation";

import { safeRedirectPath } from "@/lib/safe-redirect";
import {authIntent,authContinuation,publicReturnPath} from "@/lib/auth-flow";

export const instant = false;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; mode?: string | string[]; intent?:string|string[] }>;
}) {
  const params = await searchParams;
  const intent=authIntent(params.intent);
  const next = intent==="public"?publicReturnPath(params.next):safeRedirectPath(params.next,"/dashboard/boards");
  const mode = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const isSignUp = mode === "signup" || mode === "sign-up";
  const { userId } = await auth();

  if (userId) {
    redirect(authContinuation(intent,next));
  }

  return (
    <main className="flex min-h-svh flex-1 items-center justify-center bg-background p-4">
      <div className="flex w-full justify-center">
        <AuthWidget isSignUp={isSignUp} next={next} intent={intent} />
      </div>
    </main>
  );
}
