'use client';

import {SampleBadge} from "@/components/feedback/sample-badge";
import {useRef,useState} from 'react';
import {searchExistingFeedbackAction} from '@/server/actions/feedback';
import {useProject} from './project-provider';
import {feedbackHref} from '@/lib/project-links';
import {FeedbackTypeLabel} from './feedback-type-label';
import {StatusLabel} from './status-label';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {ErrorNotice} from '@/components/ui/error-notice';
import {MagnifyingGlassIcon} from '@/components/icons';

type Match=Extract<Awaited<ReturnType<typeof searchExistingFeedbackAction>>,{ok:true}>['data'][number];
export function CheckExistingFeedback({onContinue,onOpen,onClose}:{onContinue:(query:string)=>void;onOpen?:(post:Match)=>void;onClose?:()=>void}){
 const {project}=useProject();const [query,setQuery]=useState(''),[matches,setMatches]=useState<Match[]>([]),[checked,setChecked]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');const searching=useRef(false);const revision=useRef(0);
 async function search(){if(query.trim().length<2||searching.current)return;const version=++revision.current;searching.current=true;setBusy(true);setError('');try{const result=await searchExistingFeedbackAction(project.id,query.trim());if(version!==revision.current)return;if(!result.ok)throw Error(result.error.message);setMatches(result.data);setChecked(query.trim());}catch(e){if(version===revision.current)setError(e instanceof Error?e.message:'Search couldn’t load. Try again.');}finally{searching.current=false;setBusy(false);}}
 const reviewed=checked===query.trim()&&checked.length>=2;
 return <section aria-label="Check existing feedback" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5"><h2 className="text-[15px] font-semibold">Has someone already shared this?</h2><p className="mt-2 text-[13px] leading-5 text-muted-foreground">Search feedback, bugs and feature requests first. If it exists, add your vote or a comment.</p><form onSubmit={event=>{event.preventDefault();void search();}} className="mt-4 flex items-center gap-2"><Input autoFocus aria-label="Search existing feedback" maxLength={160} value={query} onChange={event=>{revision.current++;setQuery(event.target.value);setError('');}} placeholder="Search for your idea or issue" className="min-w-0 flex-1"/><Button type="submit" aria-label="Search existing posts" loading={busy} disabled={busy||query.trim().length<2} className="shrink-0"><MagnifyingGlassIcon className="size-4"/>Search</Button></form>{error&&<ErrorNotice className="mt-3">{error}</ErrorNotice>}{reviewed&&<div aria-live="polite" className="mt-4"><p className="mb-3 text-xs text-muted-foreground">{matches.length?'Check these posts before creating another.':'No matching posts found. Try another search or create a new post.'}</p><ul className="space-y-2">{matches.map(post=><li key={post.id} className="rounded-xl bg-control-quiet p-3"><p className="break-words text-[13px] font-medium">{post.isSample && <SampleBadge/>}{post.title}</p><div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><FeedbackTypeLabel category={post.category}/><StatusLabel status={post.status}/><span>{post.votes} votes</span></div><Button className="mt-3" size="sm" variant="secondary" {...(onOpen?{onClick:()=>onOpen(post)}:{render:<a href={feedbackHref(project,post.id)}/>})}>Open existing post</Button></li>)}</ul></div>}<div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-border/60 pt-4">{onClose&&<Button variant="secondary" onClick={onClose}>Cancel</Button>}<Button disabled={!reviewed||busy||Boolean(error)} onClick={()=>onContinue(query.trim())}>Create a new post</Button></div></section>;
}
