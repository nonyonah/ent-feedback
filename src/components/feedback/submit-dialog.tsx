"use client";
import * as React from "react";
import {Dialog,DialogPopup,DialogTitle,DialogDescription} from "@/components/ui/dialog";
import {DialogTrigger} from "@/components/ui/dialog";
import {FeedbackForm} from "@/components/feedback/feedback-form";
export function SubmitDialog({trigger}:{trigger:React.ReactElement}){const [open,setOpen]=React.useState(false);return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger render={trigger}/><DialogPopup bottomStickOnMobile={false} showCloseButton={false} className="max-w-[600px] overflow-y-auto overscroll-contain rounded-xl border-border p-0 shadow-[0_20px_25px_-5px_#0000001A,0_8px_10px_-6px_#0000001A]"><DialogTitle className="sr-only">Create feedback</DialogTitle><DialogDescription className="sr-only">Share feedback with this workspace.</DialogDescription><FeedbackForm key={String(open)} onDone={()=>setOpen(false)}/></DialogPopup></Dialog>;}
