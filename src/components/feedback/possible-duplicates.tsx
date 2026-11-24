'use client';

import * as React from 'react';
import {Button} from '@/components/ui/button';
import {ErrorNotice} from '@/components/ui/error-notice';
import {searchExistingFeedbackAction} from '@/server/actions/feedback';
import {StatusLabel} from './status-label';
import {Dialog,DialogPopup,DialogTitle,DialogDescription,DialogFooter} from '@/components/ui/dialog';
import {mergeFeedbackAction} from '@/server/actions/merge-feedback';

type Match=Extract<Awaited<ReturnType<typeof searchExistingFeedbackAction>>,{ok:true}>['data'][number];

/** Suggestions are advisory. Selecting one never merges or modifies either post. */
export function PossibleDuplicates({workspaceId,id,title,onOpen,onMerged}:{workspaceId:string;id:string;title:string;onOpen:(id:string)=>void;onMerged:(id:string)=>void}){
 const [matches,setMatches]=React.useState<Match[]|null>(null),[error,setError]=React.useState(''),[busy,setBusy]=React.useState(false);
 const [target,setTarget]=React.useState<Match|null>(null),[merging,setMerging]=React.useState(false),[mergeError,setMergeError]=React.useState('');
 const scope=React.useRef(workspaceId+':'+id);
 React.useLayoutEffect(()=>{scope.current=workspaceId+':'+id;},[workspaceId,id]);
 async function search(){
  if(busy)return;
  const key=workspaceId+':'+id;setBusy(true);setError('');
  try{const result=await searchExistingFeedbackAction(workspaceId,title);if(scope.current!==key)return;if(!result.ok)throw Error(result.error.message);setMatches(result.data.filter(candidate=>candidate.id!==id));}
  catch(reason){if(scope.current===key)setError(reason instanceof Error?reason.message:'Could not find similar requests.');}
  finally{if(scope.current===key)setBusy(false);}
 }
 async function merge(){if(!target||merging)return;setMerging(true);setMergeError('');try{const result=await mergeFeedbackAction(workspaceId,id,target.id);if(!result.ok)throw Error(result.error.message);onMerged(target.id);}catch(reason){setMergeError(reason instanceof Error?reason.message:'The requests could not be merged.');}finally{setMerging(false);}}
 return <section className="mt-6 border-t border-border/60 pt-4" aria-label="Possible duplicate requests">
  <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-xs font-medium text-muted-foreground">Possible duplicates</h3><Button type="button" variant="outline" size="sm" loading={busy} onClick={()=>void search()}>{matches?'Check again':'Find similar requests'}</Button></div>
  {error&&<ErrorNotice className="mt-3 text-xs">{error}</ErrorNotice>}
  {matches&&<div aria-live="polite" className="mt-3">{matches.length?<><p className="mb-2 text-xs text-muted-foreground">Review these possible duplicates. They are not merged automatically.</p><ul className="space-y-2">{matches.map(match=><li key={match.id} className="rounded-lg bg-control-quiet p-3"><button type="button" className="break-words text-left text-sm font-medium underline underline-offset-4" onClick={()=>onOpen(match.id)}>{match.title}</button><div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground"><StatusLabel status={match.status}/><span>{match.votes} votes</span></div><Button type="button" variant="secondary" size="sm" className="mt-2" onClick={()=>{setMergeError('');setTarget(match);}}>Merge into this request</Button></li>)}</ul></>:<p className="text-xs text-muted-foreground">No similar requests found.</p>}</div>}
  <Dialog open={Boolean(target)} onOpenChange={open=>{if(!open&&!merging)setTarget(null);}}><DialogPopup className="max-w-md"><div className="p-6"><DialogTitle>Merge requests?</DialogTitle><DialogDescription className="mt-2">“{title}” will be merged into “{target?.title}”. The destination keeps its title and status. Votes, discussion and links are combined. This cannot be undone.</DialogDescription>{mergeError&&<ErrorNotice className="mt-3">{mergeError}</ErrorNotice>}</div><DialogFooter><Button variant="secondary" disabled={merging} onClick={()=>setTarget(null)}>Cancel</Button><Button loading={merging} disabled={merging} onClick={()=>void merge()}>Merge requests</Button></DialogFooter></DialogPopup></Dialog>
 </section>;
}
