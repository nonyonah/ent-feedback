'use client';
import * as React from 'react';
import Link from 'next/link';
import {useProject} from './project-provider';
import {loadBillingAction} from '@/server/actions/billing';
import {Button} from '@/components/ui/button';
export function BillingNotice(){
 const {project,workspaceReady}=useProject();
 const [notice,setNotice]=React.useState<{workspaceId:string;owner:boolean}|null>(null);
 React.useEffect(()=>{if(!workspaceReady)return;let canceled=false;void loadBillingAction(project.id).then(result=>{if(!canceled)setNotice(result.ok&&result.data.boardCount>result.data.boardLimit?{workspaceId:project.id,owner:result.data.owner}:null);}).catch(()=>{});return()=>{canceled=true;};},[project.id,workspaceReady]);
 if(!notice||notice.workspaceId!==project.id)return null;
 return <div role="status" className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-muted px-4 py-3 text-[13px]"><span>This workspace is above its plan’s board limit. Existing boards and feedback remain available.</span>{notice.owner?<Button size="sm" render={<Link href="/dashboard/settings/billing"/>}>Manage billing</Button>:<span className="text-muted-foreground">Ask the workspace owner to update billing.</span>}</div>;
}
