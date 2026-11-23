'use client';

import {SampleBadge} from "@/components/feedback/sample-badge";
import {ErrorNotice} from '@/components/ui/error-notice';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {Dialog,DialogPopup,DialogTitle} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {FeedbackForm} from '@/components/feedback/feedback-form';
import {useFeedback} from '@/components/feedback/feedback-provider';
import {useProject} from '@/components/feedback/project-provider';
import {feedbackHref} from '@/lib/project-links';
import {chatRequest,unwrap} from '@/lib/chat/client';
import {linkConversationFeedbackAction,similarConversationRequestsAction} from '@/server/actions/chat';
import type {Idea} from '@/lib/chat/contracts';
export function IdeaDialog({idea,conversation,onClose}:{idea:Idea;conversation:{id:string;token?:string};onClose:()=>void}){
 const {items,vote}=useFeedback();const {project}=useProject();const [creating,setCreating]=useState(false);const [query,setQuery]=useState(idea.title);const [error,setError]=useState('');const [busy,setBusy]=useState('');
 const [matches,setMatches]=useState<{id:string;isSample:boolean;title:string;boardId:string;votes:number}[]>([]);const [searching,setSearching]=useState(true);const [searchAttempt,setSearchAttempt]=useState(0);
 useEffect(()=>{const controller=new AbortController();const timer=setTimeout(async()=>{if(query.trim().length<3){setMatches([]);setSearching(false);return;}setSearching(true);try{const data=conversation.token?await chatRequest<typeof matches>(`/api/chat/${project.id}/${conversation.id}/feedback?q=${encodeURIComponent(query)}`,{headers:{Authorization:'Bearer '+conversation.token}},controller.signal):unwrap(await similarConversationRequestsAction(project.id,conversation.id,query));if(!controller.signal.aborted){setMatches(data);setError('');}}catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Similar requests could not be loaded.');}finally{if(!controller.signal.aborted)setSearching(false);}},300);return()=>{clearTimeout(timer);controller.abort();};},[query,project.id,conversation.id,conversation.token,searchAttempt]);

 async function link(id:string){setBusy(id);setError('');try{if(conversation.token)await chatRequest(`/api/chat/${project.id}/${conversation.id}/feedback`,{method:'POST',headers:{Authorization:'Bearer '+conversation.token},body:JSON.stringify({feedbackId:id,messageId:idea.messageId})});else unwrap(await linkConversationFeedbackAction(project.id,conversation.id,id,idea.messageId));onClose();}catch(e){setError(e instanceof Error?e.message:'The request could not be linked.');}finally{setBusy('');}}
 return <Dialog open onOpenChange={open=>{if(!open)onClose();}}><DialogPopup className="w-[min(600px,calc(100vw-32px))] max-w-none overflow-hidden p-0"><DialogTitle className="px-5 pt-5 text-sm font-semibold">{creating?'Create a feature request':'Check existing requests'}</DialogTitle>{creating?<FeedbackForm initialDraft={idea} conversation={{...conversation,messageId:idea.messageId}} onDone={onClose}/>:<div className="space-y-4 p-5"><p className="text-sm text-muted-foreground">An existing request may already cover your idea.</p><Input aria-label="Find similar feature requests" maxLength={200} value={query} onChange={e=>setQuery(e.target.value)}/><ul className="space-y-3">{matches.map(p=>{const current=items.find(item=>item.id===p.id);return <li key={p.id} className="rounded-xl border border-border/60 p-3"><p className="text-sm font-medium">{p.isSample&&<SampleBadge/>}{p.title}</p><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" render={<Link target="_blank" rel="noopener" href={feedbackHref(project,p.id)}/>}>{current?'Open':'Open & vote'}</Button>{current&&<Button size="sm" variant="outline" aria-pressed={current?.voted} onClick={()=>vote(p.id)}>{current?.voted?'Voted':'Vote'} · {current?.votes??p.votes}</Button>}<Button loading={busy===p.id} disabled={Boolean(busy)} size="sm" onClick={()=>void link(p.id)}>{busy===p.id?'Linking…':'Link request'}</Button></div></li>;})}</ul>{searching&&<p role="status" className="text-xs text-muted-foreground">Finding similar requests…</p>}{!searching&&!matches.length&&!error&&<p className="text-sm text-muted-foreground">No similar requests found.</p>}{error&&<ErrorNotice  className="text-sm text-foreground">{error}<Button variant="ghost" size="sm" onClick={()=>setSearchAttempt(n=>n+1)}>Retry search</Button></ErrorNotice>}<div className="flex justify-end border-t border-border/60 pt-4"><Button disabled={searching||Boolean(error)} onClick={()=>setCreating(true)}>Create a new request</Button></div></div>}</DialogPopup></Dialog>;
}
