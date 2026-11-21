"use client";
import * as React from "react";
import {Dialog,DialogPopup,DialogTitle,DialogDescription} from "@/components/ui/dialog";
import {FeedbackForm} from "@/components/feedback/feedback-form";
import {CheckExistingFeedback} from "@/components/feedback/check-existing-feedback";
import {WidgetSubmitNotice} from "@/components/feedback/widget-submit-notice";
export function SubmitDialog({trigger}:{trigger:React.ReactElement<{onClick?:React.MouseEventHandler<HTMLElement>}>}){
 const [noticeOpen,setNoticeOpen]=React.useState(false);
 const [formOpen,setFormOpen]=React.useState(false);
 const [mode,setMode]=React.useState<"search"|"write">("write");
 const [query,setQuery]=React.useState("");
 const openForm=(next:"search"|"write")=>{setMode(next);setQuery("");setFormOpen(true);};
 return <>
  {React.cloneElement(trigger,{onClick:()=>setNoticeOpen(true)})}
  <WidgetSubmitNotice open={noticeOpen} onOpenChange={setNoticeOpen} onSearch={()=>openForm("search")} onWrite={()=>openForm("write")}/>
  <Dialog open={formOpen} onOpenChange={setFormOpen}>
   <DialogPopup bottomStickOnMobile={false} showCloseButton={false} className="max-w-[600px] overflow-y-auto overscroll-contain rounded-xl border-border p-0 shadow-[0_20px_25px_-5px_#0000001A,0_8px_10px_-6px_#0000001A]">
    <DialogTitle className="sr-only">{mode==="search"?"Check existing feedback":"Create feedback"}</DialogTitle>
    <DialogDescription className="sr-only">{mode==="search"?"Search feedback, bugs and feature requests first.":"Share feedback with this workspace."}</DialogDescription>
    {mode==="search"
     ?<CheckExistingFeedback key={query||"search"} onClose={()=>setFormOpen(false)} onContinue={value=>{setQuery(value);setMode("write");}}/>
     :<FeedbackForm key={query||"write"} skipCheckExisting initialDraft={query?{title:query,description:""}:undefined} onDone={()=>setFormOpen(false)}/>}
   </DialogPopup>
  </Dialog>
 </>;
}
