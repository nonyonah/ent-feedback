'use client';
import * as React from 'react';
import {loadSubscriptionManagementAction,manageSubscriptionAction} from '@/server/actions/billing';
import {Dialog,DialogPopup,DialogHeader,DialogTitle,DialogDescription,DialogFooter,DialogTrigger} from '@/components/ui/dialog';
import {Select,SelectTrigger,SelectValue,SelectPopup,SelectItem} from '@/components/ui/select';
import {Button} from '@/components/ui/button';
import {ActionButton} from '@/components/ui/action-button';
import {Skeleton} from '@/components/ui/skeleton';
import {CheckIcon} from '@/components/icons';
import {toastManager} from '@/components/ui/toast';
import type {BillingInterval} from '@/lib/billing';
import type {BillingSummary} from '@/server/billing/summary';
type Management=Extract<Awaited<ReturnType<typeof loadSubscriptionManagementAction>>,{ok:true}>['data'];
const control='h-9 sm:h-9 max-sm:h-11 rounded-[10px] text-[13px]';
const periods=[{value:'monthly',label:'Monthly · $7 / month'},{value:'yearly',label:'Yearly · $70 / year'}];
export function ManageSubscriptionDialog({workspaceId,onUpdated,disabled=false}:{workspaceId:string;onUpdated:(summary:BillingSummary)=>void;disabled?:boolean}){
 const [open,setOpen]=React.useState(false),[data,setData]=React.useState<Management|null>(null),[loading,setLoading]=React.useState(false),[error,setError]=React.useState(''),[pending,setPending]=React.useState<'interval'|'cancel'|null>(null),[confirmCancel,setConfirmCancel]=React.useState(false),[interval,setInterval]=React.useState<BillingInterval>('monthly');
 const generation=React.useRef(0),busy=React.useRef(false),onUpdatedRef=React.useRef(onUpdated);React.useEffect(()=>{onUpdatedRef.current=onUpdated;},[onUpdated]);
 React.useEffect(()=>()=>{generation.current++;},[workspaceId]);
 async function refresh(){
  const token=++generation.current;setLoading(true);setError('');
  try{const result=await loadSubscriptionManagementAction(workspaceId);if(token!==generation.current)return;if(!result.ok)throw Error(result.error.message);setData(result.data);setInterval(result.data.pendingInterval??(result.data.summary.interval==='yearly'?'yearly':'monthly'));onUpdatedRef.current(result.data.summary);}
  catch(e){if(token===generation.current)setError(e instanceof Error?e.message:'Subscription could not be loaded. Try again.');}
  finally{if(token===generation.current)setLoading(false);}
 }
 function changeOpen(next:boolean){if(busy.current)return;if(!next){generation.current++;setOpen(false);return;}setData(null);setConfirmCancel(false);setOpen(true);void refresh();}
 async function submit(kind:'interval'|'cancel'){
  if(busy.current||loading)return;busy.current=true;setPending(kind);setError('');
  try{
   const result=await manageSubscriptionAction(workspaceId,kind==='cancel'?{kind}:{kind,interval});
   if(!result.ok)throw Error(result.error.message);
   setData(result.data);setConfirmCancel(false);onUpdatedRef.current(result.data.summary);
   toastManager.add({type:'success',title:kind==='cancel'?(result.data.summary.status==='canceled'?'Subscription canceled':'Cancellation scheduled'):'Billing period updated',description:kind==='interval'&&result.data.pendingChange?'The new billing period starts at your next renewal.':undefined});
  }catch(e){const message=e instanceof Error?e.message:'Billing did not confirm the request. Refresh and try again.';setError(message);toastManager.add({type:'error',title:kind==='cancel'?'Cancellation not confirmed':'Plan change not confirmed',description:message});}
  finally{busy.current=false;setPending(null);}
 }
 const summary=data?.summary,current=summary?.interval==='yearly'?'yearly':'monthly';
 const cancelled=summary?.status==='canceled'||summary?.cancelAtPeriodEnd;
 const canChange=Boolean(summary&&['active','trialing'].includes(summary.status)&&!cancelled&&!data?.pendingChange);
 const end=summary?.status==='trialing'?summary.trialEnd:summary?.periodEnd;
 const date=end?new Intl.DateTimeFormat('en',{dateStyle:'medium'}).format(new Date(end)):null;
 return <Dialog open={open} onOpenChange={changeOpen}>
  <DialogTrigger disabled={disabled} render={<Button size="sm" className="h-7 rounded-[10px] px-3 text-[13px]"/>}>Manage subscription</DialogTrigger>
  <DialogPopup bottomStickOnMobile={false} showCloseButton={!pending} className="max-w-[440px] overflow-y-auto overscroll-contain" closeProps={{className:'absolute end-3 top-3 size-9 max-sm:size-11'}}>
   <DialogHeader className="gap-1 pe-14 pb-0"><DialogTitle className="text-[14px] font-semibold leading-5">{confirmCancel?'Cancel subscription?':'Manage subscription'}</DialogTitle><DialogDescription className="text-[13px] leading-[1.5]">{confirmCancel?'Stop future renewals. Your feedback stays available.':'Manage the billing period for Essentials.'}</DialogDescription></DialogHeader>
   <div className="min-w-0 space-y-5 px-6 pb-6 pt-5" aria-busy={loading||Boolean(pending)}>
    {loading?<div role="status" className="space-y-3"><span className="sr-only">Loading subscription</span><Skeleton className="h-16 rounded-xl motion-reduce:animate-none"/><Skeleton className="h-11 rounded-[10px] motion-reduce:animate-none"/></div>:summary?<>
     <div className="rounded-xl bg-control-quiet p-3.5"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[13px] font-semibold">Essentials</p><span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs font-medium"><CheckIcon className="size-3.5"/>{summary.status==='trialing'?'Free trial':summary.status==='active'?'Current plan':summary.status==='canceled'?'Canceled':'Subscription'}</span></div><p className="mt-1 text-[13px] text-muted-foreground">{current==='yearly'?'$70 / year':'$7 / month'}{date?` · ${cancelled?'Access until':summary.status==='trialing'?'Trial ends':'Renews'} ${date}`:''}</p></div>
     {confirmCancel?<p className="text-[13px] leading-[1.6] text-muted-foreground">{date?`Essentials stays available until ${date}. After that, the workspace returns to the Free plan with 2 boards.`:'The workspace returns to the Free plan when the current period ends.'} Existing feedback remains readable.{summary.status==='trialing'?' Canceling now prevents the trial renewal charge.':''}</p>:<>
      <div className="space-y-1.5"><label id="subscription-period-label" className="text-xs font-medium">Billing period</label><Select disabled={Boolean(pending)||!canChange} value={interval} items={periods} onValueChange={value=>{if(value==='monthly'||value==='yearly')setInterval(value);}}><SelectTrigger aria-labelledby="subscription-period-label" className={control+' w-full min-w-0'}><SelectValue/></SelectTrigger><SelectPopup>{periods.map(period=><SelectItem key={period.value} value={period.value}><span className="flex w-full flex-wrap items-center gap-x-2 gap-y-1">{period.label}{current===period.value&&<span className="text-xs text-muted-foreground">· Current</span>}{data.pendingInterval===period.value&&<span className="text-xs text-muted-foreground">· Scheduled</span>}</span></SelectItem>)}</SelectPopup></Select><p className="text-xs leading-5 text-muted-foreground">{cancelled?(summary.status==='canceled'?'This subscription has ended.':'Cancellation is scheduled. There will be no renewal.'):data.pendingChange?(data.pendingInterval?`${data.pendingInterval==='yearly'?'Yearly':'Monthly'} billing is scheduled for the next renewal.`:'A billing-period change is scheduled for the next renewal.'):canChange?'Changes start at your next renewal. No charge today.':'Resolve any payment issue before changing the billing period.'}</p></div>
      {!cancelled&&<div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[13px] text-muted-foreground">Want to stop renewing?</p><Button disabled={Boolean(pending)} variant="ghost" className={control+' text-destructive-foreground'} onClick={()=>setConfirmCancel(true)}>Cancel subscription</Button></div>}
     </>}
    </>:null}
    {error&&<div className="space-y-2"><p role="alert" className="text-[13px] leading-5 text-destructive-foreground">{error}</p><Button variant="secondary" className={control} disabled={Boolean(pending)||loading} onClick={()=>{setConfirmCancel(false);void refresh();}}>Refresh subscription</Button></div>}
   </div>
   <DialogFooter className="flex-row flex-wrap justify-end gap-2">
    <Button variant="secondary" className={control} disabled={Boolean(pending)} onClick={()=>confirmCancel?setConfirmCancel(false):changeOpen(false)}>{confirmCancel?'Keep subscription':'Done'}</Button>
    {confirmCancel?<ActionButton className={control} variant="destructive" state={pending==='cancel'?'pending':'idle'} pendingLabel="Canceling renewal…" disabled={Boolean(pending)||loading} onClick={()=>void submit('cancel')}>Confirm cancellation</ActionButton>:canChange&&<ActionButton className={control} state={pending==='interval'?'pending':'idle'} pendingLabel="Updating billing period…" disabled={Boolean(pending)||loading||interval===current||Boolean(error)} onClick={()=>void submit('interval')}>Save changes</ActionButton>}
   </DialogFooter>
  </DialogPopup>
 </Dialog>;
}
