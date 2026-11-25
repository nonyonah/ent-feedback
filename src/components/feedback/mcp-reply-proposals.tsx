'use client';
import * as React from 'react';
import {Button} from '@/components/ui/button';
import {ErrorNotice} from '@/components/ui/error-notice';
import {listMcpRepliesAction,reviewMcpReplyAction} from '@/server/actions/mcp-replies';

type Proposal=Extract<Awaited<ReturnType<typeof listMcpRepliesAction>>,{ok:true}>['data'][number];
export function McpReplyProposals({workspaceId,feedbackId,onPosted}:{workspaceId:string;feedbackId:string;onPosted:()=>void}){
 const [rows,setRows]=React.useState<Proposal[]>([]),[busy,setBusy]=React.useState(''),[error,setError]=React.useState('');
 React.useEffect(()=>{let active=true;void listMcpRepliesAction(workspaceId,feedbackId).then(result=>{if(active&&result.ok)setRows(result.data);}).catch(()=>{if(active)setError('Reply proposals could not be loaded.');});return()=>{active=false;};},[workspaceId,feedbackId]);
 async function review(id:string,decision:'approve'|'reject'){setBusy(id);setError('');try{const result=await reviewMcpReplyAction(workspaceId,feedbackId,id,decision);if(!result.ok)throw Error(result.error.message);setRows(current=>current.filter(row=>row.id!==id));if(decision==='approve')onPosted();}catch(reason){setError(reason instanceof Error?reason.message:'Could not review the reply.');}finally{setBusy('');}}
 if(!rows.length&&!error)return null;
 return <section aria-label="Agent reply proposals" className="space-y-3"><p className="text-xs font-medium text-muted-foreground">Agent reply proposals</p>{error&&<ErrorNotice>{error}</ErrorNotice>}{rows.map(row=><div key={row.id} className="space-y-3 rounded-2xl border border-border/60 bg-control-quiet/50 p-4"><p className="whitespace-pre-wrap break-words text-sm leading-6">{row.body}</p><div className="flex justify-end gap-2"><Button variant="ghost" size="sm" disabled={Boolean(busy)} onClick={()=>void review(row.id,'reject')}>Discard</Button><Button size="sm" loading={busy===row.id} disabled={Boolean(busy)} onClick={()=>void review(row.id,'approve')}>Post reply</Button></div></div>)}</section>;
}
