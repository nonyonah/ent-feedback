"use client";
import {useFeedback} from "./feedback-provider";
import {cn} from "@/lib/utils";
export function TrendingBadge({id,className}:{id:string;className?:string}){
 const {trendingIds}=useFeedback();
 if(!trendingIds.has(id))return null;
 return <span data-slot="trending-badge" title="Among this board’s most active posts by votes and comments" className={cn("inline-flex w-fit shrink-0 items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium leading-4 text-primary-text",className)}>Trending</span>;
}
