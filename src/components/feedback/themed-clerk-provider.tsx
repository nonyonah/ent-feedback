"use client";

import * as React from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk-appearance";

export function ThemedClerkProvider({children}: {children: React.ReactNode}) {
  const [colors, setColors] = React.useState(clerkAppearance.variables);
  React.useEffect(() => {
    function update() {
      const styles = getComputedStyle(document.documentElement);
      const token = (name: string) => styles.getPropertyValue(name).trim();
      // Pass resolved values: Clerk derives additional colors from these inputs.
      setColors({...clerkAppearance.variables,
        colorPrimary: token("--primary"), colorPrimaryForeground: token("--primary-foreground"),
        colorBackground: token("--control-surface"), colorForeground: token("--foreground"),
        colorMutedForeground: token("--muted-foreground"), colorNeutral: token("--foreground"),
        colorInput: token("--control-quiet"), colorInputForeground: token("--foreground"),
        colorBorder: token("--input"),
      });
    }
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {attributes: true, attributeFilter: ["class", "style"]});
    return () => observer.disconnect();
  }, []);
  return <ClerkProvider signInUrl="/auth" signUpUrl="/auth?mode=signup"
    signInForceRedirectUrl="/auth/continue?intent=workspace"
    signUpForceRedirectUrl="/auth/continue?intent=workspace"
    appearance={{...clerkAppearance, variables: colors}} afterSignOutUrl="/">{children}</ClerkProvider>;
}
