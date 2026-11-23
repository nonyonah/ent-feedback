"use client";
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {useSettingsHref} from './use-settings-href';

/** Redirect legacy settings links to the remembered section. */
export default function SettingsRedirect(){
 const href=useSettingsHref();
 const router=useRouter();
 useEffect(()=>{router.replace(href);},[href,router]);
 return null;
}
