"use client";

import dynamic from "next/dynamic";
import {authContinuation,type AuthIntent} from "@/lib/auth-flow";

function LoadingAuth() {
  return <p role="status" className="text-sm text-muted-foreground">Loading…</p>;
}

// Clerk's loaded state can differ between the server render and client-side
// navigation. Mount its imperative UI only in the browser, outside hydration.
const SignIn = dynamic(() => import("@clerk/nextjs").then(module => module.SignIn), {
  ssr: false,
  loading: LoadingAuth,
});
const SignUp = dynamic(() => import("@clerk/nextjs").then(module => module.SignUp), {
  ssr: false,
  loading: LoadingAuth,
});

export function AuthWidget({ isSignUp, next, intent="workspace" }: { isSignUp: boolean; next: string; intent?:AuthIntent }) {
  const query = new URLSearchParams({intent,next}).toString();
  const signInRedirect = authContinuation(intent,next);
  const signUpRedirect = authContinuation(intent,next);

  return isSignUp ? (
    <SignUp
      routing="hash"
      signInUrl={`/auth?${query}`}
      signInForceRedirectUrl={signInRedirect}
      forceRedirectUrl={signUpRedirect}
      fallbackRedirectUrl={signUpRedirect}
    />
  ) : (
    <SignIn
      routing="hash"
      signUpUrl={`/auth?mode=signup&${query}`}
      signUpForceRedirectUrl={signUpRedirect}
      forceRedirectUrl={signInRedirect}
      fallbackRedirectUrl={signInRedirect}
    />
  );
}
