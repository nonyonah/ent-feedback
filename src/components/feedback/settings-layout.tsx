'use client';
import {useEffect,useId} from 'react';
import {PreviewNote} from '@/components/feedback/page-shell';
import {Skeleton} from '@/components/ui/skeleton';
import {toastManager} from '@/components/ui/toast';

/** The footer always starts 16px below its fields, including flex parents with a gap. */
export function SettingsActions({children,parentGap=0}:{children:React.ReactNode;parentGap?:number}){
 return <div data-slot="settings-actions" className="flex min-w-0 flex-wrap items-center justify-end gap-2 px-4" style={{marginTop:16-parentGap}}>{children}</div>;
}
export function SettingsPage({title,children,showPreviewNote=false}:{title:string;children:React.ReactNode;showPreviewNote?:boolean}){
 return <section data-slot="settings-page" aria-label={title+' settings'} className="mx-auto w-full max-w-[760px] px-4 pb-16 pt-8 sm:px-6 sm:pt-12"><h1 className="mb-7 px-4 text-[20px] font-semibold leading-7 tracking-[-0.4px]">{title}</h1><div className="flex min-w-0 flex-col gap-8">{children}</div>{showPreviewNote&&<div className="mt-8 px-4"><PreviewNote/></div>}</section>;
}
export function SettingGroup({title,children}:{title:React.ReactNode;children:React.ReactNode}){
 const id=useId();return <section data-slot="settings-group" aria-labelledby={id} className="flex min-w-0 flex-col gap-3"><h2 id={id} className="px-4 text-[13px] font-medium leading-5 tracking-[-0.065px]">{title}</h2><div data-slot="settings-card" className="min-w-0 rounded-[18px] border border-border/60 bg-background dark:bg-card">{children}</div></section>;
}
export function SettingRow({title,description,children}:{title:React.ReactNode;description:string;children:React.ReactNode}){
 return <div data-slot="settings-row" className="flex min-w-0 flex-wrap items-center justify-between gap-x-5 gap-y-3 px-4 py-4"><div className="min-w-[min(100%,180px)] flex-1"><p className="text-[13px] font-medium leading-5">{title}</p><p className="mt-1 break-words text-[13px] leading-5 text-muted-foreground">{description}</p></div><div data-slot="settings-control" className="min-w-0 max-w-full shrink-0">{children}</div></div>;
}
export function SettingsLoading(){return <div aria-label="Loading settings" aria-busy="true" role="status" className="space-y-8">{[0,1].map(n=><div key={n} className="space-y-3"><Skeleton className="ml-4 h-4 w-24"/><Skeleton className="h-32 w-full rounded-[18px]"/></div>)}</div>;}
/** Save failures belong to their action; drafts remain available for a retry. */
export function SettingsSaveFeedback({error}:{error?:string}){
 const id=useId();useEffect(()=>{if(!error)return;let active=true;queueMicrotask(()=>{if(active)toastManager.add({id:'settings-save-'+id,type:'error',title:'Changes could not be saved',description:error});});return()=>{active=false;toastManager.close('settings-save-'+id);};},[error,id]);return null;
}
