'use client';
import {captureAnalytics} from '@/lib/analytics';
import * as React from 'react';
import {useSearchParams} from 'next/navigation';
import {useBillingCache} from './billing-cache';
import {useProject} from './project-provider';
import {SettingGroup} from './settings-layout';
import {toastManager} from '@/components/ui/toast';
import {BrandLogo} from './brand-logo';
import {Button} from '@/components/ui/button';
import {Tabs,TabsList,TabsTab} from '@/components/ui/tabs';
import {loadBillingAction,checkoutAction,portalAction} from '@/server/actions/billing';
import {openBillingOverlay} from '@/lib/billing-overlay';
import {billingPlan,type BillingInterval} from '@/lib/billing';
type Summary=Extract<Awaited<ReturnType<typeof loadBillingAction>>,{ok:true}>['data'];
export function BillingSettings(){
 const {project,workspaceReady}=useProject();const params=useSearchParams();const cache=useBillingCache();
 const [summary,setSummary]=React.useState<Summary|null>(()=>cache?.get(project.id)??null),[pending,setPending]=React.useState(false),[attempt,setAttempt]=React.useState(0);
 const [interval,setInterval]=React.useState<BillingInterval>(params.get('interval')==='yearly'?'yearly':'monthly');
 const [awaitingConfirmation,setAwaitingConfirmation]=React.useState(false);
 const overlay=React.useRef<{close:()=>void}|null>(null);
 React.useEffect(()=>()=>{overlay.current?.close();overlay.current=null;},[project.id]);
 React.useEffect(()=>{
  if(!workspaceReady)return;let cancelled=false;
  const refresh=async()=>{try{const result=await loadBillingAction(project.id);if(cancelled)return;if(!result.ok)throw Error(result.error.message);cache?.set(project.id,result.data);setSummary(result.data);}catch(e){if(!cancelled)toastManager.add({id:'billing-load-error',type:'error',title:'Billing could not be loaded',description:e instanceof Error?e.message:'Try again.',actionProps:{children:'Retry',onClick:()=>setAttempt(value=>value+1)}});}};
  void refresh();const timer=window.setInterval(()=>{if(document.visibilityState==='visible')void refresh();},15_000);
  return()=>{cancelled=true;window.clearInterval(timer);};
 },[project.id,workspaceReady,attempt,cache]);
 async function open(kind:'checkout'|'portal'){
  if(pending)return;
  // Open during the click, before awaiting the server, so browsers allow the tab.
  const portalTab=kind==='portal'?window.open('about:blank','_blank'):null;
  if(kind==='portal'&&!portalTab){toastManager.add({type:'error',title:'Allow the billing tab',description:'Your browser blocked the new tab. Allow pop-ups for this site and try again.'});return;}
  if(portalTab){portalTab.opener=null;portalTab.document.title='Opening billing';portalTab.document.body.textContent='Opening secure billing…';}
  setPending(true);
  let portalTimeout:ReturnType<typeof setTimeout>|undefined;
  try{
   const result=await(kind==='checkout'?checkoutAction(project.id,interval):Promise.race([portalAction(project.id),new Promise<never>((_,reject)=>{portalTimeout=setTimeout(()=>reject(new Error('Billing took too long to respond. Please try again.')),30_000);})]));
   if(!result.ok)throw Error(result.error.message);
   if(kind==='portal'){if(!portalTab||portalTab.closed)throw Error('The billing tab was closed. Please try again.');portalTab.location.replace(result.data.url);return;}
   overlay.current=await openBillingOverlay(result.data.url,event=>{
    if(event.type==='checkout.closed'){overlay.current=null;setPending(false);setAttempt(value=>value+1);}
    if(event.type==='checkout.completed'){captureAnalytics('checkout_returned',{interval});setAwaitingConfirmation(true);setAttempt(value=>value+1);}
    if(['checkout.failed','checkout.error','checkout.expired'].includes(event.type)){
     toastManager.add({type:'error',title:event.type==='checkout.expired'?'Checkout expired':'Checkout could not be completed',description:'Please try again. Your subscription updates after billing confirmation.'});
    }
   });
   captureAnalytics('checkout_opened',{interval});
  }catch(e){portalTab?.close();toastManager.add({type:'error',title:kind==='checkout'?'Checkout could not be opened':'Billing portal could not be opened',description:e instanceof Error?e.message:'Please try again.'});setPending(false);}
  finally{if(portalTimeout)clearTimeout(portalTimeout);if(kind==='portal')setPending(false);}
 }
 const notice=React.useRef('');
 React.useEffect(()=>{
  if(!summary)return;
  const result=awaitingConfirmation?'returned':params.get('checkout');
  const key=`${project.id}:${result}:${summary.hasAccess}:${summary.status}`;
  if(notice.current===key)return;notice.current=key;
  if(result==='returned')toastManager.add({id:'billing-checkout-result',type:summary.hasAccess?'success':'info',title:summary.hasAccess?'Subscription confirmed':'Waiting for billing confirmation',description:summary.hasAccess?undefined:'This page updates automatically.'});
  else if(result==='canceled')toastManager.add({id:'billing-checkout-result',type:'info',title:'Checkout canceled'});
  else if(summary.status==='past_due')toastManager.add({id:'billing-payment-error',type:'error',title:'Payment needs attention',description:'Update your payment method in Manage subscription.'});
 },[summary,params,project.id,awaitingConfirmation]);
 const date=(value:string)=>new Intl.DateTimeFormat('en',{dateStyle:'medium'}).format(new Date(value));
 const needsCheckout=summary&&!['active','trialing','past_due','paused','unpaid'].includes(summary.status);
 const status=summary?.status==='trialing'?'Free trial':summary?.status==='active'?'Active':summary?.status==='past_due'?'Payment needs attention':summary?.status==='none'?'Not subscribed':summary?.status.replaceAll('_',' ');
 const planLabel=summary?.plan==='free'?'Free Plan':summary?.status==='trialing'?'Essentials · Free trial':'Essentials Plan';
 return <section className="mx-auto w-full max-w-[760px] px-6 pb-16 pt-8 antialiased sm:pt-14">
  <h1 className="mb-8 px-4 text-[26px] font-semibold leading-[1.5] tracking-[-0.65px]">Billing</h1>
  <div className="flex flex-col gap-5">
  {summary&&<>
   <div className="flex flex-col gap-3">
    {summary.owner&&needsCheckout&&<div className="flex justify-end"><Tabs value={interval} onValueChange={value=>{if(value==='monthly'||value==='yearly')setInterval(value);}}><TabsList size="sm" aria-label="Billing period"><TabsTab value="monthly">$7 monthly</TabsTab><TabsTab value="yearly">$70 yearly</TabsTab></TabsList></Tabs></div>}
    <div className="rounded-[18px] bg-background shadow-[inset_0_0_0_1px_var(--color-border)] dark:bg-card">
     <div className="flex items-center gap-3.5 px-4 py-3.5">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-muted text-foreground">
       <BrandLogo className="size-8"/>
      </div>
      <div className="min-w-0 flex-1"><p className="text-[13px] font-medium leading-[1.35] tracking-[-0.065px]">{planLabel}</p>{summary.status!=='none'&&<p className="mt-1 text-xs capitalize text-muted-foreground">{status}{summary.cancelAtPeriodEnd?' · Cancellation scheduled':''}</p>}</div>
     </div>
    </div>
    {summary.owner&&<div className="flex flex-wrap items-center gap-2.5 px-4">
     {needsCheckout&&<><Button size="sm" className="h-7 rounded-[10px] px-3 text-[13px]" disabled={pending||!summary.configured} onClick={()=>void open('checkout')}>{pending?'Opening…':summary.trialUsed?'Subscribe':'Get Free Trial'}</Button></>}
     {summary.canManage&&<Button size="sm" className="h-7 rounded-[10px] px-3 text-[13px]" disabled={pending||!summary.configured} onClick={()=>void open('portal')}>{pending?'Opening…':'Manage subscription'}</Button>}
     {summary.canManage&&!needsCheckout&&<Button variant="ghost" size="sm" className="h-7 rounded-[10px] px-3 text-[13px]" disabled={pending||!summary.configured} onClick={()=>void open('portal')}>{summary.cancelAtPeriodEnd?'Review cancellation':'Cancel subscription'}</Button>}
    </div>}
    {needsCheckout&&<p className="px-4 text-xs leading-5 text-muted-foreground">{summary.trialUsed?'Your trial has been used. Billing starts immediately at the selected price.':`${billingPlan.trialDays} days free. Card required. Cancel before the trial ends to avoid a charge.`}</p>}
    {!summary.configured&&<p className="px-4 text-xs text-muted-foreground">Billing setup is in progress.</p>}
    {!summary.owner&&<p className="px-4 text-xs text-muted-foreground">Only the workspace owner can manage billing.</p>}
    {summary.trialEnd&&summary.status==='trialing'&&<p className="px-4 text-xs text-muted-foreground">Trial ends {date(summary.trialEnd)}.</p>}
    {summary.periodEnd&&summary.status==='active'&&<p className="px-4 text-xs text-muted-foreground">{summary.cancelAtPeriodEnd?'Access until':'Next renewal'} {date(summary.periodEnd)} · {summary.interval==='yearly'?'$70 / year':'$7 / month'}</p>}
   </div>
   <SettingGroup title="Usage">
    <UsageRow title="Posts and voters" value="Unlimited"/>
    <div className="mx-4 h-px bg-border/60"/>
    <UsageRow title="Feedback boards" value={`${summary.boardCount} of ${summary.boardLimit}`} active={summary.boardCount>0}/>
    <div className="mx-4 h-px bg-border/60"/>
    <UsageRow title="Powered by badge" value={summary.hideAttribution?'Hidden':'Included'}/>
    <div className="mx-4 h-px bg-border/60"/>
    <UsageRow title="Data export" value="Coming soon"/>
    <div className="mx-4 h-px bg-border/60"/>
    <UsageRow title="Admin roles" value="Coming soon"/>
    <div className="mx-4 h-px bg-border/60"/>
    <UsageRow title="Integrations" value="Coming soon"/>
   </SettingGroup>
   <p className="px-4 text-[13px] font-medium leading-5 text-muted-foreground">Payments, invoices, payment methods, and cancellation are managed securely through Bachs.</p>
  </>}
 </div></section>;
}

function UsageRow({title,value,active=false}:{title:string;value:string;active?:boolean}){
 return <div className="flex items-center justify-between gap-4 px-4 py-3"><p className="text-[13px] font-medium tracking-[-0.065px]">{title}</p><div className="relative flex h-[22px] w-[148px] shrink-0 items-center justify-center overflow-hidden rounded-[7px] bg-muted text-[11px] font-medium tabular-nums tracking-[-0.055px] text-muted-foreground">{active&&<span className="absolute inset-y-[3px] left-[3px] w-1 rounded-sm bg-emerald-500"/>}<span>{value}</span></div></div>;
}
