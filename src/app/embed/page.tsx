import type {Viewport} from 'next';
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover'};
import { notFound } from "next/navigation";
import {headers} from 'next/headers';
import { EmbeddedBoard } from "@/components/feedback/embedded-board";
import { PublicWorkspaceBoundary } from "@/components/feedback/public-workspace-boundary";
import { getPublicWorkspace } from "@/server/public-workspace";
import {after} from 'next/server';
import {analyticsHostFromHeaders,isInternalAnalyticsHost,markWidgetFirstLoaded,trackServerAnalytics} from '@/lib/analytics/server';

export const instant = false;
export const metadata={robots:{index:false,follow:false}};

export default async function Page({ searchParams }: {
  searchParams: Promise<{ project?: string | string[]; board?: string | string[] }>;
}) {
  const query = await searchParams;
  if (typeof query.project !== "string" || !query.project) {
    return <main className="flex min-h-svh items-center justify-center p-6 text-center text-sm text-muted-foreground">A workspace is required to load this widget.</main>;
  }
  const workspace = await getPublicWorkspace(query.project);
  if (!workspace) notFound();
  const boardId=workspace.boards.find(board=>board.slug===query.board)?.id??workspace.boards[0]?.id;
  if(boardId){
   const host=analyticsHostFromHeaders(await headers()),isExternal=!isInternalAnalyticsHost(host);
   after(async()=>{
    trackServerAnalytics('widget_loaded',{origin_domain:host,is_external:isExternal},{boardId,defer:false});
    if(host)await markWidgetFirstLoaded({workspaceId:workspace.project.id,boardId,originDomain:host,isExternal}).catch(()=>{});
   });
  }
  return <PublicWorkspaceBoundary project={workspace.project} boards={workspace.boards} widget={workspace.widget}>
    <EmbeddedBoard boardSlug={typeof query.board === "string" ? query.board : undefined} />
  </PublicWorkspaceBoundary>;
}
