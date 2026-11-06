"use client";
import {useEffect,useSyncExternalStore} from 'react';
import {useUser} from '@clerk/nextjs';
const sections=['branding','account','widget'];
function subscribe(listener:()=>void){window.addEventListener('ent-settings-section',listener);return()=>window.removeEventListener('ent-settings-section',listener);}
export function useSettingsHref(){
 const {user}=useUser();const key='ent-last-settings:'+(user?.id??'guest');
 const href=useSyncExternalStore(subscribe,()=>{try{const section=sessionStorage.getItem(key);if(section&&sections.includes(section))return '/dashboard/settings/'+section;}catch{}return '/dashboard/settings/branding';},()=>'/dashboard/settings/branding');
 return href;
}
export function useRememberSettingsSection(section:string){
 const {user}=useUser();const key='ent-last-settings:'+(user?.id??'guest');
 useEffect(()=>{if(!sections.includes(section))return;try{sessionStorage.setItem(key,section);window.dispatchEvent(new Event('ent-settings-section'));}catch{}},[key,section]);
}
