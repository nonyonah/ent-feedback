'use client';
import {useEffect,useRef} from 'react';
import {Dialog,DialogPopup,DialogHeader,DialogTitle,DialogDescription,DialogFooter} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
export function WidgetSubmitNotice({open,onOpenChange,onSearch,onWrite}:{open:boolean;onOpenChange:(open:boolean)=>void;onSearch:()=>void;onWrite:()=>void}){
 const action=useRef<'search'|'write'|null>(null);
 useEffect(()=>{if(open)action.current=null;},[open]);
 return <Dialog open={open} onOpenChange={onOpenChange} onOpenChangeComplete={visible=>{
  if(visible||!action.current)return;
  const next=action.current;action.current=null;
  if(next==='search')onSearch();else onWrite();
 }}><DialogPopup bottomStickOnMobile={false} className="w-[min(420px,calc(100vw-32px))] rounded-2xl">
  <DialogHeader><DialogTitle>Has someone already shared this?</DialogTitle><DialogDescription>Search feedback, bugs and feature requests first. If it exists, add your vote or a comment.</DialogDescription></DialogHeader>
  <DialogFooter><Button variant="secondary" onClick={()=>{action.current='search';onOpenChange(false);}}>Search feedback</Button><Button onClick={()=>{action.current='write';onOpenChange(false);}}>Start writing</Button></DialogFooter>
 </DialogPopup></Dialog>;
}
