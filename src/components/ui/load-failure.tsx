'use client';
import {useEffect,useId,useRef} from 'react';
import {Button} from '@/components/ui/button';
import {toastManager} from '@/components/ui/toast';

/** Background failures use a retry toast. An unavailable view retains a quiet recovery path. */
export function LoadFailure({resource,onRetry,refresh=false,enabled=true}:{resource:string;onRetry:()=>void;refresh?:boolean;enabled?:boolean}){
 const id=useId(),retry=useRef(onRetry);useEffect(()=>{retry.current=onRetry;},[onRetry]);
 const title=(refresh?'Couldn’t refresh ':'Couldn’t load ')+resource;
 useEffect(()=>{if(!enabled)return;let active=true;const toastId='load-failure-'+id;queueMicrotask(()=>{if(active)toastManager.add({id:toastId,type:'error',title,description:refresh?'Your current view is still available. Check your connection and retry.':'Check your connection and retry.',actionProps:{children:'Retry',onClick:()=>retry.current()}});});return()=>{active=false;toastManager.close(toastId);};},[id,title,refresh,enabled]);
 if(refresh)return null;
 return <div role="status" aria-label={resource+' unavailable'} className="mx-auto flex max-w-sm flex-col items-center gap-3 px-4 py-12 text-center"><p className="text-[14px] font-medium text-foreground">This view is unavailable</p><p className="text-[13px] leading-5 text-muted-foreground">Reconnect to load {resource}.</p><Button variant="secondary" size="sm" onClick={onRetry}>Reload {resource}</Button></div>;
}
