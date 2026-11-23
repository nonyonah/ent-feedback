'use client';
import {TrialCardNotice} from './trial-card-notice';
import {captureAnalytics} from '@/lib/analytics';
import * as React from 'react';
import {ErrorNotice} from '@/components/ui/error-notice';
import {Skeleton} from '@/components/ui/skeleton';
import {usePathname,useRouter,useSearchParams} from 'next/navigation';
import {useUser} from '@clerk/nextjs';
import {useBillingCache} from './billing-cache';
import {useProject} from './project-provider';
import {LoadFailure} from '@/components/ui/load-failure';
import {SettingsPage,SettingGroup} from './settings-layout';
import {toastManager} from '@/components/ui/toast';
import {BrandLogo} from './brand-logo';
import {Button} from '@/components/ui/button';
import {Tabs,TabsList,TabsTab} from '@/components/ui/tabs';
import {loadBillingAction,checkoutAction} from '@/server/actions/billing';
import {ManageSubscriptionDialog} from './manage-subscription-dialog';
import {openBillingOverlay} from '@/lib/billing-overlay';
import {billingPlan,type BillingInterval,type BillingMode} from '@/lib/billing';
type Summary=Extract<Awaited<ReturnType<typeof loadBillingAction>>,{ok:true}>['data'];
export function BillingSettings(){
 const {project,projects,switchProject,workspaceReady}=useProject();const params=useSearchParams();const pathname=usePathname();const router=useRouter();const requested=params.get('workspace');const valid=Boolean(projects?.some(workspace=>workspace.id===requested));
 React.useEffect(()=>{if(!requested||!valid)return;if(project.id!==requested)switchProject(requested);else{const query=new URLSearchParams(params.toString());query.delete('workspace');router.replace(pathname+(query.size?'?'+query.toString():''));}},[requested,valid,project.id,switchProject,params,pathname,router]);
 if(!workspaceReady||(requested&&valid&&requested!==project.id))return <div aria-label="Loading billing" className="space-y-4 p-4"><Skeleton className="h-24 w-full"/><Skeleton className="h-40 w-full"/></div>;
 if(requested&&!valid)return <ErrorNotice className="m-4">This billing workspace is not available to your account.</ErrorNotice>;
 return <WorkspaceBillingSettings key={project.id}/>;
}
function WorkspaceBillingSettings(){
 const {project,boards,workspaceReady}=useProject();const params=useSearchParams();const cache=useBillingCache();const {user}=useUser();
 const trialNoticeKey=user?`ent:trial-notice:${user.id}:${project.id}`:null;
 const trialNoticeAcknowledged=()=>{if(!trialNoticeKey)return false;try{return localStorage.getItem(trialNoticeKey)==='1';}catch{return false;}};
 const acknowledgeTrialNotice=()=>{if(!trialNoticeKey)return;try{localStorage.setItem(trialNoticeKey,'1');}catch{}};
 const [summary,setSummary]=React.useState<Summary|null>(()=>cache?.get(project.id)??null),[pending,setPending]=React.useState(false),[attempt,setAttempt]=React.useState(0);
 const [interval,setInterval]=React.useState<BillingInterval>(params.get('interval')==='yearly'?'yearly':'monthly');
 const [loadError,setLoadError]=React.useState('');
 const [trialNoticeOpen,setTrialNoticeOpen]=React.useState(false);
 const [awaitingConfirmation,setAwaitingConfirmation]=React.useState<{mode:BillingMode;previousUntil:string|null}|null>(null);
 const effectiveMode:BillingMode=summary?.prepaidActive?'prepaid':'subscription';
 const summaryRevision=React.useRef(0);
 const overlay=React.useRef<{close:()=>void}|null>(null);
 React.useEffect(()=>()=>{overlay.current?.close();overlay.current=null;},[project.id]);
 React.useEffect(()=>{
  if(!workspaceReady)return;let cancelled=false;
  const refresh=async()=>{const version=summaryRevision.current;try{const result=await loadBillingAction(project.id);if(cancelled||version!==summaryRevision.current)return;if(!result.ok)throw Error(result.error.message);cache?.set(project.id,result.data);setSummary(result.data);setLoadError('');}catch(e){if(!cancelled)setLoadError(e instanceof Error?e.message:'Billing could not be loaded.');}};
  void refresh();const timer=window.setInterval(()=>{if(document.visibilityState==='visible')void refresh();},15_000);
  return()=>{cancelled=true;window.clearInterval(timer);};
 },[project.id,workspaceReady,attempt,cache,boards.length]);
 async function openCheckout(checkoutMode:BillingMode=effectiveMode){
  if(pending)return;
  setPending(true);
  try{
   const result=await checkoutAction(project.id,interval,checkoutMode);
   if(!result.ok)throw Error(result.error.message);
   overlay.current=await openBillingOverlay(result.data.url,event=>{
    if(event.type==='checkout.closed'){overlay.current=null;setPending(false);setAttempt(value=>value+1);}
    if(event.type==='checkout.completed'){captureAnalytics('checkout_returned',{interval});setAwaitingConfirmation({mode:checkoutMode,previousUntil:summary?.prepaidUntil??null});setAttempt(value=>value+1);}
    if(['checkout.failed','checkout.error','checkout.expired'].includes(event.type)){
     toastManager.add({type:'error',title:event.type==='checkout.expired'?'Checkout expired':'Checkout could not be completed',description:'Please try again. Your subscription updates after billing confirmation.'});
    }
   });
   captureAnalytics('checkout_opened',{interval});
  }catch(e){toastManager.add({type:'error',title:'Checkout could not be opened',description:e instanceof Error?e.message:'Please try again.'});setPending(false);}
 }
 function updateSummary(next:Summary){summaryRevision.current++;cache?.set(project.id,next);setSummary(next);}

 const notice=React.useRef('');
 React.useEffect(()=>{
  if(!summary)return;
  const result=awaitingConfirmation?'returned':params.get('checkout');
  const confirmed=awaitingConfirmation?.mode==='prepaid'?Boolean(summary.prepaidUntil&&summary.prepaidUntil!==awaitingConfirmation.previousUntil):summary.hasAccess;
  const key=`${project.id}:${result}:${summary.hasAccess}:${summary.status}:${summary.prepaidUntil}`;
  if(notice.current===key)return;notice.current=key;
  if(result==='returned'&&!awaitingConfirmation&&params.get('billing_mode')==='prepaid'){toastManager.add({id:'billing-checkout-result',type:'info',title:'Payment submitted',description:'Confirmed prepaid access appears below.'});return;}
  if(result==='returned')toastManager.add({id:'billing-checkout-result',type:confirmed?'success':'info',title:confirmed?'Essentials confirmed':'Waiting for payment confirmation',description:confirmed?undefined:'This page updates automatically.'});
  else if(result==='canceled')toastManager.add({id:'billing-checkout-result',type:'info',title:'Checkout canceled'});
  else if(summary.status==='past_due')toastManager.add({id:'billing-payment-error',type:'error',title:'Payment needs attention',description:'Use the payment recovery link from Bachs, or contact support.'});
 },[summary,params,project.id,awaitingConfirmation]);
 const date=(value:string)=>new Intl.DateTimeFormat('en',{dateStyle:'medium'}).format(new Date(value));
 const needsCheckout=summary&&!['active','trialing','past_due','paused','unpaid'].includes(summary.status);
 const status=summary?.status==='trialing'?'Free trial':summary?.status==='active'?'Active':summary?.status==='past_due'?'Payment needs attention':summary?.status==='prepaid'?'Prepaid · No automatic renewal':summary?.status==='none'?'Not subscribed':summary?.status.replaceAll('_',' ');
 const planLabel=summary?.plan==='free'?'Free Plan':summary?.status==='trialing'?'Essentials · Free trial':'Essentials Plan';
 return <SettingsPage title="Billing">
  {loadError&&<LoadFailure resource="billing" refresh={Boolean(summary)} onRetry={()=>{setLoadError('');setAttempt(value=>value+1);}}/>}
  {!summary&&!loadError&&<div role="status" aria-label="Loading billing" className="space-y-6"><Skeleton className="h-24 w-full rounded-[18px]"/><Skeleton className="h-64 w-full rounded-[18px]"/></div>}
  <div className="flex flex-col gap-5">
  {summary&&<>
   <div className="flex flex-col gap-3">
    {summary.owner&&needsCheckout&&<div className="flex justify-end"><Tabs value={interval} onValueChange={value=>{if(value==='monthly'||value==='yearly')setInterval(value);}}><TabsList size="sm" aria-label="Billing period"><TabsTab value="monthly" disabled={pending}>$7 monthly</TabsTab><TabsTab value="yearly" disabled={pending}>$70 yearly</TabsTab></TabsList></Tabs></div>}

    <div className="rounded-[18px] bg-background shadow-[inset_0_0_0_1px_var(--color-border)] dark:bg-card">
     <div className="flex items-center gap-3.5 px-4 py-3.5">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-muted text-foreground">
       <BrandLogo className="size-8"/>
      </div>
      <div className="min-w-0 flex-1"><p className="text-[13px] font-medium leading-[1.35] tracking-[-0.065px]">{planLabel}</p>{summary.status!=='none'&&<p className="mt-1 text-xs capitalize text-muted-foreground">{status}{summary.cancelAtPeriodEnd?' · Cancellation scheduled':''}</p>}</div>
     </div>
    </div>
    {summary.owner&&<div className="flex flex-wrap items-center gap-2.5 px-4">
     {needsCheckout&&<Button loading={pending} size="sm" className="h-9 max-sm:h-11 rounded-[10px] px-4 text-[13px]" disabled={pending||!summary.configured} onClick={()=>{if(summary.trialUsed||summary.prepaidActive)void openCheckout('prepaid');else if(trialNoticeAcknowledged())void openCheckout('subscription');else setTrialNoticeOpen(true);}}>{pending?'Opening…':summary.prepaidActive?'Extend Essentials':summary.trialUsed?`Pay $${interval==='yearly'?'70':'7'}`:'Start free trial'}</Button>}
     {summary.canManage&&<ManageSubscriptionDialog key={project.id} workspaceId={project.id} onUpdated={updateSummary} disabled={pending||!summary.configured}/>}

    </div>}
    {needsCheckout&&<p className="px-4 text-xs leading-5 text-muted-foreground">{effectiveMode==='prepaid'?'Pay upfront. No free trial or automatic renewal. Choose your currency and an available payment method in checkout. Any bank conversion or processing fees are shown there.':summary.trialUsed?'Your free trial has already been used. Pay once to continue; no automatic renewal.':`${billingPlan.trialDays} days free. Free trial available once per account and workspace, with a USD card only. Cancel before the trial ends to avoid a charge.`}</p>}
    {!summary.configured&&<p className="px-4 text-xs text-muted-foreground">Billing setup is in progress.</p>}
    {!summary.owner&&<p className="px-4 text-xs text-muted-foreground">Only the workspace owner can manage billing.</p>}
    {summary.status==='prepaid'&&summary.prepaidUntil&&<p className="px-4 text-xs text-muted-foreground">Prepaid access until {date(summary.prepaidUntil)}. Added time starts after your remaining prepaid access.</p>}
    {summary.trialEnd&&summary.status==='trialing'&&<p className="px-4 text-xs text-muted-foreground">Trial ends {date(summary.trialEnd)}.</p>}
    {summary.periodEnd&&summary.status==='active'&&<p className="px-4 text-xs text-muted-foreground">{summary.cancelAtPeriodEnd?'Access until':'Next renewal'} {date(summary.periodEnd)} · {summary.interval==='yearly'?'$70 / year':'$7 / month'}</p>}
   </div>
   <SettingGroup title="Usage">
    <UsageRow title="Posts and voters" value="Unlimited"/>
    <div className="mx-4 h-px bg-border/60"/>
    <UsageRow title="Feedback boards" value={`${summary.boardCount} of ${summary.boardLimit}`} usage={{count:summary.boardCount,limit:summary.boardLimit}}/>
    <div className="mx-4 h-px bg-border/60"/>
    <UsageRow title="Powered by badge" value={summary.hideAttribution?'Hidden':'Included'}/>
    <div className="mx-4 h-px bg-border/60"/>
    <UsageRow title="Data export" value="Coming soon"/>
    <div className="mx-4 h-px bg-border/60"/>
    <UsageRow title="Admin roles" value="Coming soon"/>
    <div className="mx-4 h-px bg-border/60"/>
    <UsageRow title="Slack integration" value="Available"/>
   </SettingGroup>
   <p className="px-4 text-[13px] font-medium leading-5 text-muted-foreground">Subscription changes are processed securely by Bachs.</p>
  </>}
 </div><TrialCardNotice open={trialNoticeOpen} onOpenChange={setTrialNoticeOpen} interval={interval} onContinue={()=>{acknowledgeTrialNotice();void openCheckout('subscription');}}/></SettingsPage>;
}

function UsageRow({title,value,usage}:{title:string;value:string;usage?:{count:number;limit:number}}){
 const percent=usage&&usage.limit>0?Math.max(0,Math.min(100,usage.count/usage.limit*100)):0;
 return <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4"><p className="text-[13px] font-medium tracking-[-0.065px]">{title}</p><div role={usage?'progressbar':undefined} aria-label={usage?title:undefined} aria-valuemin={usage?0:undefined} aria-valuemax={usage?.limit} aria-valuenow={usage?Math.min(usage.count,usage.limit):undefined} aria-valuetext={usage?value:undefined} className="relative flex h-[22px] w-[148px] shrink-0 items-center justify-center overflow-hidden rounded-[7px] bg-muted text-[11px] font-medium tabular-nums tracking-[-0.055px] text-muted-foreground">{usage&&<span aria-hidden="true" className="absolute inset-[3px] overflow-hidden rounded-[4px]"><span className="block h-full rounded-[4px] bg-emerald-600" style={{width:`${percent}%`}}/></span>}<span className={usage?`relative ${percent>=100?'text-white':'text-muted-foreground'}`:undefined}>{value}</span></div></div>;
}
