'use client';

import {useState} from 'react';
import {loadWidgetTrendingAction} from '@/server/actions/feedback';
import {useChatPolling} from '@/lib/chat/client';
import type {ChatWidgetConfiguration} from '@/lib/chat/contracts';
import type {FeedbackStatus} from '@/lib/feedback-data';
import {Avatar,AvatarFallback,AvatarImage} from '@/components/ui/avatar';
import {ArrowUpIcon,CaretRightIcon,ChatIcon,EnvelopeSimpleIcon} from '@/components/icons';
import {StatusLabel} from './status-label';
import {Skeleton} from '@/components/ui/skeleton';
import {ErrorNotice} from '@/components/ui/error-notice';
import {Button} from '@/components/ui/button';

type Trending={id:string;boardId:string;title:string;status:FeedbackStatus;votes:number;author?:string;avatarUrl?:string|null};
export function WidgetHome({workspaceId,active,configuration,chatEnabled,draft,onDraft,onChat,onReport,onFeedback,onSeeAll}:{workspaceId:string;active:boolean;configuration?:ChatWidgetConfiguration;chatEnabled:boolean;draft:string;onDraft:(value:string)=>void;onChat:()=>void;onReport:()=>void;onFeedback:(item:Trending)=>void;onSeeAll:()=>void}){
 const [result,setResult]=useState<{workspaceId:string;items:Trending[]}|null>(null);
 const poll=useChatPolling(async signal=>{const response=await loadWidgetTrendingAction(workspaceId);if(signal.aborted)return;if(!response.ok)throw Error(response.error.message);setResult({workspaceId,items:response.data});},active,30000,workspaceId);
 const items=result?.workspaceId===workspaceId?result.items:null;
 const team=configuration?.operators??[];
 return <section aria-label="Widget home" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-5 pt-[128px]">
  <div className="px-1.5"><h2 className="text-[26px] font-semibold leading-8 tracking-[-0.7px]">Hi there <span aria-hidden="true">👋</span></h2><p className="text-[26px] font-semibold leading-8 tracking-[-0.7px] text-muted-foreground">How can we help?</p></div>
  {chatEnabled&&<div className="mt-6 rounded-[18px] bg-control-quiet p-4">
   <div className="flex items-center gap-2">{team.length>0?<div className="flex -space-x-1.5">{team.slice(0,3).map(member=><Avatar key={member.id} title={member.name} className="size-7 ring-2 ring-control-quiet"><AvatarImage src={member.avatarUrl??undefined} alt={member.name}/><AvatarFallback seed={member.id}/></Avatar>)}</div>:<ChatIcon className="size-6 text-muted-foreground"/>}<span className="text-xs text-muted-foreground">{configuration?.availability?.available?'Online now':team.length?'Away':'Leave us a message'}</span></div>
   <h3 className="mt-3.5 text-[15px] font-semibold leading-5">Send us a message</h3><p className="mt-1 text-[13px] leading-5 text-muted-foreground">Ask a question or share what you need.</p>
   <form onSubmit={event=>{event.preventDefault();onChat();}} className="mt-3.5 flex min-h-11 items-center gap-2 rounded-xl bg-background pl-3.5 pr-1.5 focus-within:ring-2 focus-within:ring-inset focus-within:ring-ring"><input aria-label="Start a live chat" placeholder="Write a message…" maxLength={3000} value={draft} onChange={event=>onDraft(event.target.value)} className="min-w-0 flex-1 bg-transparent py-2.5 text-[13px] outline-none placeholder:text-muted-foreground"/><button type="submit" aria-label="Continue to live chat" className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"><CaretRightIcon className="size-4"/></button></form>
  </div>}
  <button type="button" onClick={onReport} className="mt-2 flex min-h-14 w-full items-center gap-3 rounded-2xl bg-control-quiet px-4 py-3 text-start outline-none hover:bg-control-hover focus-visible:ring-2 focus-visible:ring-ring"><EnvelopeSimpleIcon className="size-[22px] shrink-0"/><span className="flex-1 text-[15px] font-semibold">Submit report</span><CaretRightIcon className="size-3.5 text-muted-foreground"/></button>
  <div className="mb-2 mt-7 flex items-center justify-between gap-3"><h3 className="text-xs font-medium text-muted-foreground">Trending feedback</h3><button type="button" onClick={onSeeAll} className="flex min-h-8 items-center gap-1 rounded-lg px-1 text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">See all<CaretRightIcon className="size-3"/></button></div>
  {poll.error?<ErrorNotice>{poll.error}<Button variant="ghost" size="sm" onClick={poll.retry}>Retry</Button></ErrorNotice>:!items?<div aria-label="Loading trending feedback" role="status" className="space-y-3 rounded-2xl bg-control-quiet p-4"><Skeleton className="h-8 w-full"/><Skeleton className="h-8 w-4/5"/></div>:items.length?<ul className="overflow-hidden rounded-2xl bg-control-quiet">{items.map(item=><li key={item.id} className="border-b border-border/60 last:border-0"><button type="button" onClick={()=>onFeedback(item)} className="flex min-h-[68px] w-full items-center gap-3 px-4 py-3 text-start outline-none hover:bg-control-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"><Avatar className="size-7 shrink-0"><AvatarImage src={item.avatarUrl??undefined} alt=""/><AvatarFallback seed={item.author??item.id}/></Avatar><span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium leading-5">{item.title}</span><span className="mt-1 block text-xs text-muted-foreground"><StatusLabel status={item.status}/></span></span><span aria-label={item.votes+' votes'} className="flex h-8 min-w-14 shrink-0 items-center justify-center gap-1.5 rounded-full border border-border px-2 text-xs font-medium tabular-nums"><ArrowUpIcon className="size-3"/>{item.votes}</span></button></li>)}</ul>:<p className="rounded-2xl bg-control-quiet p-4 text-[13px] leading-5 text-muted-foreground">Your workspace’s ideas will appear here.</p>}
 </section>;
}
