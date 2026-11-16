'use client';

import Script from 'next/script';
import {usePathname} from 'next/navigation';
import {useEffect,useRef,useSyncExternalStore} from 'react';

const subscribe=()=>()=>{};
function isApplicationHost(){
 const origin=process.env.NEXT_PUBLIC_APP_URL;
 if(!origin||['localhost','127.0.0.1'].includes(window.location.hostname))return true;
 try{return window.location.hostname===new URL(origin).hostname;}catch{return false;}
}

export function SupportWidget(){
 const pathname=usePathname();
 const workspace=process.env.NEXT_PUBLIC_SUPPORT_WORKSPACE_SLUG||'elf-workspace';
 const board=process.env.NEXT_PUBLIC_SUPPORT_BOARD_SLUG||'product';
 const applicationHost=useSyncExternalStore(subscribe,isApplicationHost,()=>false);
 const visible=Boolean(applicationHost&&workspace&&board&&(pathname==='/'||pathname==='/pricing'||pathname==='/dashboard'||pathname?.startsWith('/dashboard/')));
 const visibility=useRef(visible);
 useEffect(()=>{
  visibility.current=visible;
  const root=document.getElementById('ent-feedback-widget');
  if(root)root.hidden=!visible;
  window.dispatchEvent(new CustomEvent('ent:host-visibility',{detail:{visible}}));
 },[visible]);
 if(!visible)return null;
 return <Script id="ent-support-widget-loader" src="/widget.js" data-project={workspace} data-board={board} strategy="afterInteractive" onReady={()=>{
  const root=document.getElementById('ent-feedback-widget');
  if(root)root.hidden=!visibility.current;
  window.dispatchEvent(new CustomEvent('ent:host-visibility',{detail:{visible:visibility.current}}));
 }}/>;
}
