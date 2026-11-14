'use client';

import * as React from 'react';
import Link from 'next/link';
import {useUser} from '@clerk/nextjs';
import {XIcon} from '@/components/icons';
import {Button} from '@/components/ui/button';
import {useSidebar} from '@/components/ui/sidebar';
import {loadBillingAction} from '@/server/actions/billing';
import {useBillingCache} from './billing-cache';
import {useProject} from './project-provider';

const SNOOZE_MS=7*24*60*60*1000;
type Summary=Extract<Awaited<ReturnType<typeof loadBillingAction>>,{ok:true}>['data'];

export function SidebarTrialReminder(){
 const {project,workspaceReady}=useProject();
 const {user}=useUser();
 const cache=useBillingCache();
 const {setOpenMobile}=useSidebar();
 const [state,setState]=React.useState<{workspaceId:string;summary:Summary}|null>(null);
 const [visibleKey,setVisibleKey]=React.useState<string|null>(null);
 const storageKey=user?`ent:trial-reminder:${user.id}:${project.id}`:null;

 React.useEffect(()=>{
  if(!workspaceReady||!storageKey)return;
  let cancelled=false;
  function checkSnooze(){
   let until=0;
   try{until=Number(localStorage.getItem(storageKey!))||0;}catch{/* Storage may be unavailable in private browsing. */}
   setVisibleKey(until<=Date.now()?storageKey:null);
  }
  async function refresh(){
   checkSnooze();
   try{
    const result=await loadBillingAction(project.id);
    if(cancelled||!result.ok)return;
    cache?.set(project.id,result.data);
    setState({workspaceId:project.id,summary:result.data});
   }catch{/* An optional reminder must not interrupt navigation. */}
  }
  checkSnooze();
  void refresh();
  const timer=window.setInterval(checkSnooze,60_000);
  window.addEventListener('focus',refresh);
  window.addEventListener('storage',checkSnooze);
  return()=>{cancelled=true;window.clearInterval(timer);window.removeEventListener('focus',refresh);window.removeEventListener('storage',checkSnooze);};
 },[project.id,workspaceReady,storageKey,cache]);

 // Re-read the shared cache on navigation so completed billing immediately hides the reminder.
 const summary=cache?.get(project.id)??(state?.workspaceId===project.id?state.summary:null);
 if(!storageKey||visibleKey!==storageKey||!summary?.owner||!summary.configured||summary.trialUsed||summary.hasAccess||summary.plan!=='free'||['active','trialing','past_due','paused','unpaid'].includes(summary.status))return null;

 function dismiss(){
  try{localStorage.setItem(storageKey!,String(Date.now()+SNOOZE_MS));}catch{/* Keep it dismissed for this mount if storage is blocked. */}
  setVisibleKey(null);
 }

 return <aside aria-label="Essentials free trial" className="relative mb-2 rounded-xl border border-sidebar-border bg-sidebar-accent/50 p-3">
  <Button type="button" variant="ghost" size="icon-sm" aria-label="Remind me in seven days" title="Remind me in seven days" onClick={dismiss} className="absolute right-1 top-1 size-7 text-muted-foreground after:absolute after:-inset-1.5"><XIcon className="size-3.5"/></Button>
  <p className="pr-5 text-[13px] font-semibold leading-5 text-sidebar-foreground">Try Essentials free</p>
  <p className="mt-1 text-[13px] leading-5 text-muted-foreground">14 days with 5 boards and no Powered by badge.</p>
  <Button size="sm" className="mt-3 w-full rounded-[10px] text-[13px] max-md:min-h-11" render={<Link href="/dashboard/settings/billing"/>} onClick={()=>setOpenMobile(false)}>Explore the free trial</Button>
  <p className="mt-2 text-[11px] leading-4 text-muted-foreground">Card required. Cancel before billing starts.</p>
 </aside>;
}
