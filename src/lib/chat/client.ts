'use client';
import {useEffect,useRef,useState} from 'react';
import type {Result} from '@/server/result';
export async function chatRequest<T>(url:string,init:RequestInit={},signal?:AbortSignal):Promise<T>{
 const controller=new AbortController();const abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)controller.abort();const timer=setTimeout(abort,25000);
 try{const response=await fetch(url,{...init,cache:'no-store',signal:controller.signal,headers:{'Content-Type':'application/json',...init.headers}});const result=await response.json() as Result<T>;if(!result.ok)throw Error(result.error.message);if(!response.ok)throw Error('Chat could not be reached. Try again.');return result.data;}catch(error){if(controller.signal.aborted&&!signal?.aborted)throw Error('The connection timed out. Your message can be retried.');throw error;}finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}
export function unwrap<T>(result:Result<T>){if(!result.ok)throw Error(result.error.message);return result.data;}
// A self-scheduling timer means a slow request can never overlap the next poll.
// Visibility pauses work; failed polls back off while keeping existing messages.
export function useChatPolling(load:(signal:AbortSignal)=>Promise<void>,enabled=true,interval=3000){
 const [error,setError]=useState('');const [attempt,setAttempt]=useState(0);const loadRef=useRef(load);useEffect(()=>{loadRef.current=load;},[load]);
 useEffect(()=>{if(!enabled)return;let cancelled=false,running=false,failures=0;let timer:ReturnType<typeof setTimeout>|undefined;let controller:AbortController|undefined;
 async function poll(){if(cancelled||running||document.hidden)return;running=true;controller=new AbortController();try{await loadRef.current(controller.signal);if(!cancelled){setError('');failures=0;}}catch(error){if(!cancelled&&!controller.signal.aborted){setError(error instanceof Error?error.message:'The conversation could not be refreshed.');failures++;}}finally{running=false;if(!cancelled&&!document.hidden)timer=setTimeout(poll,Math.min(30000,interval*2**Math.min(failures,4)));}}
 function visibility(){if(document.hidden){clearTimeout(timer);controller?.abort();}else{clearTimeout(timer);void poll();}}
 document.addEventListener('visibilitychange',visibility);void poll();return()=>{cancelled=true;clearTimeout(timer);controller?.abort();document.removeEventListener('visibilitychange',visibility);};
 },[enabled,interval,attempt]);return {error,retry:()=>setAttempt(a=>a+1)};
}
