'use client';
import {useRef,useState} from 'react';
import {Composer,ComposerInput,ComposerActions,ComposerActionGroup,ComposerSubmit,getComposerText} from '@/components/ui/composer';
import {ActionButton} from '@/components/ui/action-button';
import {ComposerTools} from '@/components/feedback/composer-tools';
export function ChatComposer({value,onChange,onSend,busy,error,disabled,label,actionLabel,images,onImagesChange,compact=false}:{value:string;onChange:(value:string)=>void;onSend:()=>void;busy:boolean;error:boolean;disabled?:boolean;label:string;actionLabel:string;images:string[];onImagesChange:(images:string[])=>void;compact?:boolean}){
 const input=useRef<HTMLTextAreaElement|null>(null);const [reading,setReading]=useState(false);const blocked=busy||disabled||reading;const empty=!value.trim()&&!images.length;
 return <div className="shrink-0 px-4 pb-4 pt-3"><div className="mx-auto w-full max-w-2xl"><Composer value={value?[{type:'text',text:value}]:[]} onValueChange={next=>onChange(getComposerText(next).slice(0,3000))} onSubmit={()=>{if(!blocked&&!empty)onSend();}} allowEmpty={images.length>0} submitOnEnter="desktop" submitDisabled={blocked||empty} readOnly={busy} className={'gap-2 rounded-[20px] border-border/60 bg-muted/30 p-2 shadow-none before:hidden has-[[data-slot=composer-input]:focus-visible]:ring-2 has-[[data-slot=composer-input]:focus-visible]:ring-inset has-[[data-slot=composer-input]:focus-visible]:ring-ring [--composer-max-rows:4] '+(compact?'[--composer-min-rows:1]':'[--composer-min-rows:2]')}>
  <ComposerInput aria-label={label} placeholder="Write a message…" render={<textarea ref={input} maxLength={3000}/>} className={(compact?'min-h-9':'min-h-14')+' text-[13px] leading-6 [@media(pointer:coarse)]:text-base'}/>
  <ComposerActions className="mx-0 flex-wrap items-end"><ComposerTools value={value} onChange={onChange} inputRef={input} images={images} onImagesChange={onImagesChange} disabled={Boolean(busy||disabled)} onBusyChange={setReading}/><ComposerActionGroup align="end"><ComposerSubmit disabled={blocked||empty} render={<ActionButton size="sm" state={busy?'pending':error?'error':'idle'} pendingLabel="Sending…" retryLabel={actionLabel==='Send'?'Retry sending':'Retry reply'} className="rounded-full"/>}>{actionLabel}</ComposerSubmit></ComposerActionGroup></ComposerActions>
 </Composer></div></div>;
}
