"use client";
import * as React from "react";
import {Dialog,DialogPopup,DialogTitle,DialogDescription} from "@/components/ui/dialog";
import {FeedbackForm} from "@/components/feedback/feedback-form";
import {WidgetSubmitNotice} from "@/components/feedback/widget-submit-notice";
import {OPEN_FEEDBACK_SEARCH_EVENT} from "@/components/feedback/request-search";
import {useProject} from "@/components/feedback/project-provider";
export function SubmitDialog({trigger}:{trigger:React.ReactElement<{onClick?:React.MouseEventHandler<HTMLElement>}>}){
 const {widgetSettings}=useProject();
 const [noticeOpen,setNoticeOpen]=React.useState(false);
 const [formOpen,setFormOpen]=React.useState(false);
 const startWriting=()=>setFormOpen(true);
 const start=()=>{if(widgetSettings.submitNotice)setNoticeOpen(true);else startWriting();};
 return <>
  {React.cloneElement(trigger,{onClick:start})}
  <WidgetSubmitNotice open={noticeOpen} onOpenChange={setNoticeOpen} onSearch={()=>window.dispatchEvent(new Event(OPEN_FEEDBACK_SEARCH_EVENT))} onWrite={startWriting}/>
  <Dialog open={formOpen} onOpenChange={setFormOpen}>
   <DialogPopup bottomStickOnMobile={false} showCloseButton={false} className="max-w-[600px] overflow-y-auto overscroll-contain rounded-xl border-border p-0 shadow-[0_20px_25px_-5px_#0000001A,0_8px_10px_-6px_#0000001A]">
    <DialogTitle className="sr-only">Create feedback</DialogTitle>
    <DialogDescription className="sr-only">Share feedback with this workspace.</DialogDescription>
    <FeedbackForm skipCheckExisting onDone={()=>setFormOpen(false)}/>
   </DialogPopup>
  </Dialog>
 </>;
}
