"use client";

import type {ReactNode} from "react";
import {Button} from "@/components/ui/button";
import {Select,SelectGroup,SelectItem,SelectPopup,SelectTrigger,SelectValue} from "@/components/ui/select";
import {STATUS_LABELS,STATUS_ORDER,type FeedbackStatus} from "@/lib/feedback-data";
import {FEEDBACK_SORT_OPTIONS} from "@/lib/feedback-sort";
import styles from "./board-toolbar.module.css";

export type BoardStatusFilter = "all" | FeedbackStatus;
const statuses = (["all",...STATUS_ORDER] as const).map(value=>({value,label:value==="all"?"All":value==="shipped"?"Completed":STATUS_LABELS[value]}));

export function BoardToolbar({filter,onFilterChange,sort,onSortChange,children}:{filter:BoardStatusFilter;onFilterChange:(value:BoardStatusFilter)=>void;sort:string;onSortChange:(value:string)=>void;children:ReactNode}){
 const sortLabel=FEEDBACK_SORT_OPTIONS.find(option=>option.value===sort)?.label??"Trending";
 return <div className={styles.container}><div className={styles.toolbar}>
  <div className={styles.statusDropdown}>
   <Select items={statuses} value={filter} onValueChange={value=>{if(value)onFilterChange(value as BoardStatusFilter);}}>
    <SelectTrigger aria-label="Filter feedback by status" className={styles.statusTrigger}><SelectValue/></SelectTrigger>
    <SelectPopup>{statuses.map(status=><SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>)}</SelectPopup>
   </Select>
  </div>
  <div role="group" aria-label="Filter feedback by status" className={styles.chips}>
   {statuses.map(status=><Button key={status.value} aria-pressed={filter===status.value} onClick={()=>onFilterChange(status.value)} variant={filter===status.value?"default":"outline"} className="min-h-8 shrink-0 rounded-full px-3 shadow-none before:hidden">{status.label}</Button>)}
  </div>
  <Select items={FEEDBACK_SORT_OPTIONS} value={sort} onValueChange={value=>{if(value)onSortChange(value);}}>
   <SelectTrigger indicator="filter" aria-label={"Sort feedback: "+sortLabel} title={"Sort feedback: "+sortLabel} className={styles.sortTrigger}><SelectValue className="sr-only"/></SelectTrigger>
   <SelectPopup align="end"><SelectGroup>{FEEDBACK_SORT_OPTIONS.map(option=><SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectGroup></SelectPopup>
  </Select>
  <div className={styles.submit}>{children}</div>
 </div></div>;
}
