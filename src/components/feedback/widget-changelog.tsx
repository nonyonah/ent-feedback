'use client';
import * as React from 'react';
import {Button} from '@/components/ui/button';
import {Skeleton} from '@/components/ui/skeleton';
import {ErrorNotice} from '@/components/ui/error-notice';
import {ChangelogBody} from '@/components/changelog/changelog-body';
import {CaretLeftIcon} from '@/components/icons';
import {changelogCategoryLabels,changelogDayLabel} from '@/lib/changelog';

type WidgetChangelogEntry={slug:string;title:string;summary:string|null;body:string;category:keyof typeof changelogCategoryLabels;publishedAt:string|null;coverImage:string|null};

export function WidgetChangelog({projectKey,active}:{projectKey:string;active:boolean}){
  const [state,setState]=React.useState<{projectKey:string;entries:WidgetChangelogEntry[];error:string}|null>(null);
  const [open,setOpen]=React.useState<string|null>(null);
  const [attempt,retry]=React.useReducer(value=>value+1,0);

  React.useEffect(()=>{
    if(!active)return;
    let canceled=false;
    void fetch('/api/public/changelog?projectKey='+encodeURIComponent(projectKey),{cache:'no-store'})
      .then(response=>response.json())
      .then(result=>{
        if(canceled)return;
        if(result.ok===false)throw new Error(result.error?.message??'The changelog couldn’t be loaded.');
        setState({projectKey,entries:Array.isArray(result)?result:result.data??[],error:''});
      })
      .catch(error=>{if(!canceled)setState({projectKey,entries:[],error:error instanceof Error?error.message:'The changelog couldn’t be loaded.'});});
    return()=>{canceled=true;};
  },[active,projectKey,attempt]);

  const loaded=state?.projectKey===projectKey?state:null;
  const entry=loaded?.entries.find(item=>item.slug===open)??null;

  if(entry)return <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-5 pt-4">
    <Button variant="ghost" size="sm" className="-ms-2 mb-3 h-7 px-2 text-[13px] text-muted-foreground" onClick={()=>setOpen(null)}><CaretLeftIcon className="size-3.5"/>All updates</Button>
    {entry.coverImage&&<img src={entry.coverImage} alt="" className="mb-4 aspect-[2/1] w-full rounded-xl object-cover"/>}
    <p className="text-[11px] font-medium uppercase leading-4 tracking-[0.07em] text-muted-foreground">{entry.publishedAt?changelogDayLabel(entry.publishedAt):''} · {changelogCategoryLabels[entry.category]}</p>
    <h2 className="mt-1.5 break-words text-[20px] font-semibold leading-7 tracking-[-0.4px] [overflow-wrap:anywhere]">{entry.title}</h2>
    <div className="mt-3 text-[14px] leading-6"><ChangelogBody markdown={entry.body}/></div>
  </div>;

  return <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-5 pt-5">
    <h2 className="text-[22px] font-semibold leading-8 tracking-[-0.55px]">Changelog</h2>
    <p className="mt-1 text-[13px] leading-5 text-muted-foreground">What’s new and what changed.</p>
    {!loaded?<div role="status" aria-label="Loading changelog" className="mt-4 space-y-3">{[1,2,3].map(id=><div key={id} className="space-y-2 border-b border-border/60 pb-3"><Skeleton className="h-3 w-16 motion-reduce:animate-none"/><Skeleton className="h-4 w-3/4 motion-reduce:animate-none"/><Skeleton className="h-3 w-full motion-reduce:animate-none"/></div>)}</div>
      :loaded.error?<ErrorNotice className="mt-4 text-xs">{loaded.error}<Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={retry}>Try again</Button></ErrorNotice>
      :!loaded.entries.length?<p className="mt-6 text-sm leading-6 text-muted-foreground">No updates yet. Check back soon.</p>
      :<ul className="mt-2">{loaded.entries.map(item=><li key={item.slug} className="border-b border-border/60 last:border-0">
        <button type="button" className="flex w-full flex-col gap-1 rounded-lg py-3.5 text-start outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={()=>setOpen(item.slug)}>
          <span className="text-[11px] font-medium uppercase leading-4 tracking-[0.07em] text-muted-foreground">{item.publishedAt?changelogDayLabel(item.publishedAt):''} · {changelogCategoryLabels[item.category]}</span>
          <span className="text-[14px] font-semibold leading-5 tracking-[-0.15px]">{item.title}</span>
          {item.summary&&<span className="line-clamp-2 text-[13px] leading-5 text-muted-foreground">{item.summary}</span>}
        </button>
      </li>)}</ul>}
  </div>;
}
