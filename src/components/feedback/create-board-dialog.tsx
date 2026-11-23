"use client";

import {ErrorNotice} from '@/components/ui/error-notice';
import Link from "next/link";
import {loadBillingAction} from "@/server/actions/billing";
import {ActionButton} from "@/components/ui/action-button";
import {toastManager} from "@/components/ui/toast";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogTrigger, DialogPopup, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { BoardMarkerPicker } from "@/components/feedback/board-marker-picker";
import { useProject } from "@/components/feedback/project-provider";
import { boardTemplateIds, boardTemplateLabels, type BoardTemplateId } from "@/lib/board-templates";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";

const templateOptions = boardTemplateIds.map(value => ({ value, label: boardTemplateLabels[value] }));

export function CreateBoardDialog({trigger}:{trigger:React.ReactElement}){
 const [template, setTemplate] = React.useState<BoardTemplateId>("saas");
 const {createBoard,boardsPending,project}=useProject();const [open,setOpen]=React.useState(false);const [name,setName]=React.useState("");const [marker,setMarker]=React.useState("#E5484D");const [error,setError]=React.useState("");const uid=React.useId();const [limit,setLimit]=React.useState<{count:number;max:number}|null>(null);
 React.useEffect(()=>{if(!open)return;let canceled=false;void loadBillingAction(project.id).then(result=>{if(!canceled&&result.ok)setLimit({count:result.data.boardCount,max:result.data.boardLimit});}).catch(()=>{if(!canceled)toastManager.add({type:"error",title:"Board allowance couldn’t be checked",description:"You can still try creating a board. Your plan limit will be checked when you submit."});});return()=>{canceled=true;};},[open,project.id]);
 const atLimit=Boolean(limit&&limit.count>=limit.max);
 function changeOpen(value:boolean){if(boardsPending)return;setOpen(value);if(value){setLimit(null);setTemplate("saas");setName("");setMarker("#E5484D");setError("");}}
 async function submit(event:React.FormEvent){event.preventDefault();if(boardsPending||!name.trim())return;setError("");try{await createBoard({template,name:name.trim(),color:marker.startsWith("#")?marker:"#737373",emoji:marker.startsWith("#")?undefined:marker});setOpen(false);toastManager.add({type:"success",title:"Board created"});}catch(error){setError(error instanceof Error?error.message:"Your board couldn’t be created. Please try again.");}}
 return <Dialog open={open} onOpenChange={changeOpen}><DialogTrigger disabled={boardsPending||project.role==='member'} render={trigger}/><DialogPopup bottomStickOnMobile={false} className="max-w-[440px] overflow-y-auto overscroll-contain border-0 shadow-[0_0_0_1px_#0000000d,0_1px_2px_#0000000a,0_8px_16px_-4px_#00000014,0_24px_48px_-12px_#0000002e]" closeProps={{className:"absolute end-3 top-3 size-9 max-sm:size-11 rounded-full text-muted-foreground"}}><form onSubmit={event=>void submit(event)}><fieldset disabled={boardsPending} className="contents"><DialogHeader className="gap-1 pe-14 pb-0"><DialogTitle className="text-[14px] font-semibold leading-5 tracking-[-0.15px]">Create feedback board</DialogTitle><DialogDescription className="text-[13px] leading-[1.45]">Group related feedback on its own board.</DialogDescription></DialogHeader><div className="grid grid-cols-[64px_minmax(0,1fr)] gap-x-2 gap-y-1.5 px-6 pb-6 pt-5"><label htmlFor={uid+"-marker"} className="text-xs font-medium text-foreground/80">Color</label><label htmlFor={uid+"-name"} className="text-xs font-medium text-foreground/80">Name</label><BoardMarkerPicker id={uid+"-marker"} value={marker} onChange={setMarker}/><Input autoFocus id={uid+"-name"} aria-invalid={Boolean(error)} aria-describedby={error?uid+"-error":undefined} required maxLength={60} placeholder="Feature request" value={name} onChange={event=>setName(event.target.value)} className="h-9 min-w-0 rounded-[10px] max-sm:h-11 [&_input]:h-full max-sm:[&_input]:text-base [&_input]:text-[13px]"/>
 <div className="col-span-2 mt-2 grid gap-1.5">
   <label htmlFor={uid+"-template"} className="text-xs font-medium text-foreground/80">Starter template</label>
   <Select items={templateOptions} value={template} onValueChange={value=>{if(value)setTemplate(value);}}>
     <SelectTrigger id={uid+"-template"} className="w-full"><SelectValue/></SelectTrigger>
     <SelectPopup>{templateOptions.map(option=><SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectPopup>
   </Select>
 </div>
 {atLimit&&<p className="col-span-2 text-[13px] text-muted-foreground">Your plan includes {limit?.max} {limit?.max===1?'board':'boards'}. <Link href="/dashboard/settings/billing" className="font-medium text-foreground underline underline-offset-4">{limit?.max===2?'Upgrade to Essentials':'Manage billing'}</Link></p>}{error&&<ErrorNotice id={uid+"-error"}  className="col-span-2 text-xs text-foreground">{error}</ErrorNotice>}</div><DialogFooter className="flex-row justify-end rounded-b-2xl bg-foreground/[0.02] py-3.5"><DialogClose render={<Button type="button" variant="secondary" size="sm" className="h-9 sm:h-9 max-sm:h-11 rounded-full px-3.5 text-[13px]"/>}>Cancel</DialogClose><ActionButton state={boardsPending?"pending":error?"error":"idle"} pendingLabel="Creating board…" retryLabel="Retry creating" type="submit" size="sm" disabled={!name.trim()||atLimit} className="h-9 sm:h-9 max-sm:h-11 rounded-full px-3.5 text-[13px]">Create</ActionButton></DialogFooter></fieldset></form></DialogPopup></Dialog>;
}
