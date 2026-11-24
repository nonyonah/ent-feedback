'use client';

import * as React from 'react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogTrigger,DialogPopup,DialogTitle,DialogDescription,DialogHeader,DialogFooter} from '@/components/ui/dialog';
import {ErrorNotice} from '@/components/ui/error-notice';
import {suggestPriorityHintsAction} from '@/server/actions/ai-feedback';
import {StatusLabel} from './status-label';

type Hints=Extract<Awaited<ReturnType<typeof suggestPriorityHintsAction>>,{ok:true}>['data'];
export function PriorityHints({workspaceId,onOpen}:{workspaceId:string;onOpen:(id:string)=>void}){
 const [open,setOpen]=React.useState(false),[busy,setBusy]=React.useState(false),[error,setError]=React.useState(''),[hints,setHints]=React.useState<Hints|null>(null);
 async function generate(){if(busy)return;setBusy(true);setError('');try{const result=await suggestPriorityHintsAction(workspaceId);if(!result.ok)throw Error(result.error.message);setHints(result.data);}catch(reason){setError(reason instanceof Error?reason.message:'Suggestions could not be generated.');}finally{setBusy(false);}}
 return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger render={<Button variant="outline" size="sm"/>}>Priority hints</DialogTrigger><DialogPopup className="max-h-[85dvh] max-w-lg overflow-y-auto"><DialogHeader><DialogTitle>Priority hints</DialogTitle><DialogDescription>AI reviews up to 25 unshipped requests with the most votes and a sample of recent comments. Suggestions do not change your roadmap.</DialogDescription></DialogHeader><div className="space-y-3 px-6 pb-5">{hints&&<div aria-live="polite">{hints.items.length?<><p className="mb-3 text-xs text-muted-foreground">Considered {hints.considered} requests. Review the reasons and supporting feedback before deciding.</p><ol className="space-y-2">{hints.items.map(item=><li key={item.id} className="rounded-lg bg-control-quiet p-3"><button type="button" className="text-left text-sm font-medium underline underline-offset-4" onClick={()=>{setOpen(false);onOpen(item.id);}}>{item.title}</button><div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground"><StatusLabel status={item.status}/><span>{item.votes} votes</span></div><p className="mt-2 break-words text-sm leading-5">{item.reason}</p></li>)}</ol></>:<p className="text-sm text-muted-foreground">No priority suggestions are available.</p>}</div>}{error&&<ErrorNotice className="text-sm">{error}</ErrorNotice>}</div><DialogFooter><Button variant="secondary" onClick={()=>setOpen(false)}>Close</Button><Button loading={busy} disabled={busy} onClick={()=>void generate()}>{hints?'Refresh hints':'Generate hints'}</Button></DialogFooter></DialogPopup></Dialog>;
}
