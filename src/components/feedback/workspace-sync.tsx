"use client";

import {DashboardLoading} from "./dashboard-loading";
import * as React from "react";
import { useRouter } from "next/navigation";

import {
  useProject,
  type FeedbackBoard,
  type Project,
  type WorkspaceRole,
} from "@/components/feedback/project-provider";

type ApiWorkspace = {
  id: string;
  name: string;
  handle: string;
  description: string;
  website: string | null;
  accentColor: string;
  logoUrl: string | null;
  theme: "dynamic" | "light" | "dark";
  hideAttribution: boolean;
  role: WorkspaceRole;
  boards: {
    id: string;
    name: string;
    handle: string;
    description: string;
    color: string;
    emoji: string | null;
    position: number;
  }[];
};

type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

function toProject(workspace: ApiWorkspace): Project {
  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.handle,
    description: workspace.description,
    accent: workspace.accentColor,
    logo: workspace.logoUrl ?? "",
    theme: workspace.theme,
    hideAttribution: workspace.hideAttribution,
    website: workspace.website ?? undefined,
    role: workspace.role,
  };
}

function toBoards(workspace: ApiWorkspace): FeedbackBoard[] {
  return workspace.boards.map((board) => ({
    id: board.id,
    projectId: workspace.id,
    name: board.name,
    slug: board.handle,
    description: board.description,
    color: board.color,
    emoji: board.emoji ?? undefined,
  }));
}

export function WorkspaceSync({ redirectWhenEmpty = false, initialWorkspaces }: { redirectWhenEmpty?: boolean; initialWorkspaces?: ApiWorkspace[] }) {
  const router = useRouter();
  const { hydrateWorkspaces } = useProject();
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    if(initialWorkspaces){hydrateWorkspaces(initialWorkspaces.map(toProject),initialWorkspaces.flatMap(toBoards));return;}

    async function load() {
      try {
        const response = await fetch("/api/workspaces", {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });

        if (response.status === 401) {
          const next = `${window.location.pathname}${window.location.search}`;
          router.replace(`/auth?next=${encodeURIComponent(next)}`);
          return;
        }

        const payload = (await response.json()) as ApiResult<ApiWorkspace[]>;

        if (!payload.ok) {
          if (!cancelled) setFailed(true);
          return;
        }

        if (cancelled) return;

        hydrateWorkspaces(
          payload.data.map(toProject),
          payload.data.flatMap(toBoards),
        );

        if (redirectWhenEmpty && payload.data.length === 0) {
          router.replace("/registration");
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [hydrateWorkspaces, redirectWhenEmpty, router,initialWorkspaces]);

  if (!failed) {
    return null;
  }

  return (
    <p role="alert" className="px-4 py-3 text-xs text-destructive-foreground">
      Workspaces could not be loaded. Refresh the page to try again.
    </p>
  );
}

export function WorkspaceGate({ children }: { children: React.ReactNode }) {
  const { workspaceReady, projects } = useProject();

  if (!workspaceReady || projects.length === 0) {
    return <DashboardLoading/>;
  }

  return <>{children}</>;
}
