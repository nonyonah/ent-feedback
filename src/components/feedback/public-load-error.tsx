'use client';
import {LoadFailure} from '@/components/ui/load-failure';
export function PublicLoadError(props:{resource:'feedback'|'roadmap';onRetry:()=>void;refresh?:boolean}){return <LoadFailure {...props}/>;}
