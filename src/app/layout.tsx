import {SupportWidget} from "@/components/support/support-widget";
import { AnalyticsProvider } from "@/components/analytics/analytics-provider";
import { MotionPolicy } from "@/components/ui/motion-policy";
import * as React from "react";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { ThemedClerkProvider } from "@/components/feedback/themed-clerk-provider";
import "driver.js/dist/driver.css";
import "./globals.css";
import { FeedbackProvider } from "@/components/feedback/feedback-provider";
import { SiteHeader } from "@/components/feedback/site-header";
import { ToastProvider } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { ProjectProvider } from "@/components/feedback/project-provider";

const allo = localFont({ src: "../../public/fonts/allo/AlloVariable.woff2", weight: "100 900", style: "normal", display: "swap", variable: "--font-allo" });

export const metadata: Metadata = {
  title: "Ent Feedback",
  description: "Share ideas, vote on what matters, and follow what ships.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      className={cn("h-full", "antialiased", "font-sans", allo.variable)}
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{__html: `(function(){var mode="system";try{var first=location.pathname.split("/")[1];if(!["","p","embed","widget-preview","items","submit","following"].includes(first)){var saved=localStorage.getItem("ent-theme");if(saved==="light"||saved==="dark")mode=saved;}}catch(e){}document.documentElement.classList.toggle("dark",mode==="dark"||(mode==="system"&&matchMedia("(prefers-color-scheme: dark)").matches));})()`}}/>
      </head>
      <body className="flex min-h-full flex-col">
        <MotionPolicy />
        <ThemedClerkProvider>
          <React.Suspense fallback={null}><AnalyticsProvider /></React.Suspense>
          <ProjectProvider><FeedbackProvider>
            <ToastProvider position="bottom-right">
              <SiteHeader />
              <React.Suspense fallback={null}><SupportWidget /></React.Suspense>
              <div className="flex flex-1 flex-col">{children}</div>
            </ToastProvider>
          </FeedbackProvider></ProjectProvider>
        </ThemedClerkProvider>
      </body>
    </html>
  );
}
