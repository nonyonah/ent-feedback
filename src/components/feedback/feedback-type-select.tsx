"use client";
import {Select,SelectTrigger,SelectValue,SelectPopup,SelectItem} from '@/components/ui/select';
import {FeedbackTypeLabel} from "./feedback-type-label";
import {FEEDBACK_CATEGORIES,type FeedbackCategory} from '@/lib/feedback-data';
export function FeedbackTypeSelect({value,onChange,disabled=false,compact=false}:{value:FeedbackCategory;onChange:(value:FeedbackCategory)=>void;disabled?:boolean;compact?:boolean}){
 return <Select disabled={disabled} value={value} items={Object.entries(FEEDBACK_CATEGORIES).map(([value,label])=>({value,label}))} onValueChange={value=>{if(value)onChange(value as FeedbackCategory);}}><SelectTrigger aria-label="Feedback type" className={compact?"h-7 min-h-7 w-auto min-w-0 rounded-2xl border-border/60 bg-control-quiet py-0.75 text-[13px] shadow-none":"h-8 w-40 rounded-[10px] bg-control-quiet text-[13px]"}><SelectValue>{value=><FeedbackTypeLabel category={value as FeedbackCategory}/>}</SelectValue></SelectTrigger><SelectPopup>{Object.keys(FEEDBACK_CATEGORIES).map(value=><SelectItem key={value} value={value}><FeedbackTypeLabel category={value as keyof typeof FEEDBACK_CATEGORIES}/></SelectItem>)}</SelectPopup></Select>;
}
