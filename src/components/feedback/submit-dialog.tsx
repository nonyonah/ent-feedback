"use client";
import * as React from "react";
import { Dialog, DialogDescription, DialogHeader, DialogPanel, DialogPopup, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FeedbackForm } from "@/components/feedback/feedback-form";
export function SubmitDialog({ trigger }: { trigger: React.ReactElement }) {
  const [open, setOpen] = React.useState(false);
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger render={trigger} /><DialogPopup className="sm:max-w-[480px]"><DialogHeader><DialogTitle>Share an idea</DialogTitle><DialogDescription>Tell us what would make Ent better. One idea at a time.</DialogDescription></DialogHeader><DialogPanel><FeedbackForm key={String(open)} onDone={() => setOpen(false)} /></DialogPanel></DialogPopup></Dialog>;
}
