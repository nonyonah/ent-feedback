"use client";
import {useEffect} from 'react';
import {captureAnalyticsException} from '@/lib/analytics';
import {LoadFailure} from '@/components/ui/load-failure';
export default function ErrorPage({error,retry}:{error:Error;retry:()=>void}){
 useEffect(()=>{captureAnalyticsException(error);},[error]);
 return <main className="mx-auto w-full max-w-[720px] px-4 py-16"><LoadFailure resource="this page" onRetry={retry}/></main>;
}
