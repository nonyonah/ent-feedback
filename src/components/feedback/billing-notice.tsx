'use client';
import * as React from 'react';
import Link from 'next/link';
import {useBillingCache} from './billing-cache';
import {useProject} from './project-provider';
import {loadBillingAction} from '@/server/actions/billing';
import {Button} from '@/components/ui/button';
export function BillingNotice(){
 const {project,boards,workspaceReady}=useProject();const cache=useBillingCache();
 const [notice,setNotice]=React.useState<{workspaceId:string;owner:boolean}|null>(null);
 React.useEffect(()=>{if(!workspaceReady||cache?.get(project.id)?.boardCount===boards.length)return;let canceled=false;void loadBillingAction(project.id).then(result=>{if(!canceled){if(result.ok)cache?.set(project.id,result.data);setNotice(result.ok&&result.data.boardCount>result.data.boardLimit?{workspaceId:project.id,owner:result.data.owner}:null);}}).catch(()=>{});return()=>{canceled=true;};},[project.id,workspaceReady,boards.length,cache]);
 const cached=cache?.get(project.id);const current=cached?.boardCount===boards.length?(cached.boardCount>cached.boardLimit?{workspaceId:project.id,owner:cached.owner}:null):notice;
 if(!current||current.workspaceId!==project.id)return null;
 return <div role="status" className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-muted px-4 py-3 text-[13px]"><span>This workspace is above its plan’s board limit. Existing boards and feedback remain available.</span>{current.owner?<Button size="sm" render={<Link href="/dashboard/settings/billing"/>}>Manage billing</Button>:<span className="text-muted-foreground">Ask the workspace owner to update billing.</span>}</div>;
}
