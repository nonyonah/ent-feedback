'use client';
import {useRef} from 'react';
import {Dialog,DialogPopup,DialogHeader,DialogTitle,DialogDescription,DialogFooter} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {billingPlan,type BillingInterval} from '@/lib/billing';

export function TrialCardNotice({open,onOpenChange,onContinue,interval}:{open:boolean;onOpenChange:(open:boolean)=>void;onContinue:()=>void;interval:BillingInterval}){
 const proceed=useRef(false);
 return <Dialog open={open} onOpenChange={onOpenChange} onOpenChangeComplete={visible=>{
  // Finish dismissal and focus restoration before opening the provider overlay.
  if(!visible&&proceed.current){proceed.current=false;onContinue();}
 }}><DialogPopup bottomStickOnMobile={false} className="w-[min(420px,calc(100vw-32px))] rounded-2xl">
  <DialogHeader><DialogTitle>Before you start your trial</DialogTitle><DialogDescription>Our payment partner, Bachs, currently supports free trials with USD cards only. NGN cards, bank transfer and crypto are available for supported one-time payments.</DialogDescription></DialogHeader>
  <p className="text-[13px] leading-5 text-muted-foreground">Your card will be charged ${Number(billingPlan[interval])} per {interval==='yearly'?'year':'month'} after the {billingPlan.trialDays}-day trial unless you cancel before it ends.</p>
  <DialogFooter><Button variant="secondary" onClick={()=>onOpenChange(false)}>Not now</Button><Button onClick={()=>{if(proceed.current)return;proceed.current=true;onOpenChange(false);}}>Continue to checkout</Button></DialogFooter>
 </DialogPopup></Dialog>;
}
