import { AnalyticsProvider } from "@/components/analytics/analytics-provider";
import { MotionPolicy } from "@/components/ui/motion-policy";
import * as React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import {clerkAppearance} from "@/lib/clerk-appearance";
import "driver.js/dist/driver.css";
import "./globals.css";
import { FeedbackProvider } from "@/components/feedback/feedback-provider";
import { SiteHeader } from "@/components/feedback/site-header";
import { ToastProvider } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { ProjectProvider } from "@/components/feedback/project-provider";

const inter = Inter({ subsets: ["latin"], weight: "variable", display: "swap", variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Ent Feedback",
  description: "Share ideas, vote on what matters, and follow what ships.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      className={cn("h-full", "antialiased", "font-sans", inter.variable)}
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{__html: `(function(){var mode="system";try{var first=location.pathname.split("/")[1];if(!["","p","embed","widget-preview","items","submit","following"].includes(first)){var saved=localStorage.getItem("ent-theme");if(saved==="light"||saved==="dark")mode=saved;}}catch(e){}document.documentElement.classList.toggle("dark",mode==="dark"||(mode==="system"&&matchMedia("(prefers-color-scheme: dark)").matches));})()`}}/>
      </head>
      <body className="flex min-h-full flex-col">
        <MotionPolicy />
        <ClerkProvider signInUrl="/auth" signUpUrl="/auth?mode=signup" signInForceRedirectUrl="/auth/continue?intent=workspace" signUpForceRedirectUrl="/auth/continue?intent=workspace" appearance={clerkAppearance} afterSignOutUrl="/">
          <React.Suspense fallback={null}><AnalyticsProvider /></React.Suspense>
          <ProjectProvider><FeedbackProvider>
            <ToastProvider position="bottom-right">
              <SiteHeader />
              <div className="flex flex-1 flex-col">{children}</div>
            </ToastProvider>
          </FeedbackProvider></ProjectProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
