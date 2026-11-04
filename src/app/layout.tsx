import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { FeedbackProvider } from "@/components/feedback/feedback-provider";
import { SiteHeader } from "@/components/feedback/site-header";
import { ToastProvider } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { ProjectProvider } from "@/components/feedback/project-provider";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

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
      <body className="flex min-h-full flex-col">
        <ProjectProvider><FeedbackProvider>
          <ToastProvider position="bottom-right">
            <SiteHeader />
            <div className="flex flex-1 flex-col">{children}</div>
          </ToastProvider>
        </FeedbackProvider></ProjectProvider>
      </body>
    </html>
  );
}
