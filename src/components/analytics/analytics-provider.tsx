'use client';
import * as React from 'react';
import Link from 'next/link';
import {useUser} from '@clerk/nextjs';
import {usePathname} from 'next/navigation';
import {Button} from '@/components/ui/button';
import {ANALYTICS_CHANGE,ANALYTICS_CONSENT_KEY,ANALYTICS_SETTINGS,ANALYTICS_PRIVACY_OVERRIDE_KEY,analyticsBlocked,analyticsConfigured,applyAnalyticsConsent,captureAnalytics,openAnalyticsSettings,readAnalyticsConsent,saveAnalyticsConsent,setAnalyticsIdentity} from '@/lib/analytics';
import {analyticsPage} from '@/lib/analytics-events';
export function AnalyticsPreferencesButton({className}:{className?:string}){
 return <button type="button" className={className??'rounded-lg text-[13px] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring'} onClick={openAnalyticsSettings}>Analytics preferences</button>;
}
export function AnalyticsProvider(){
 const path=usePathname();
 const {user,isLoaded}=useUser();
 const userId=isLoaded?user?.id??null:undefined;
 const [visible,setVisible]=React.useState(false);
 const [storageError,setStorageError]=React.useState(false);
 const [blocked,setBlocked]=React.useState(false);
 React.useEffect(()=>{
  let cancelled=false;
  const sync=(event?:Event)=>{
   if(event instanceof StorageEvent&&event.key!==null&&event.key!==ANALYTICS_CONSENT_KEY&&event.key!==ANALYTICS_PRIVACY_OVERRIDE_KEY)return;
   const consent=readAnalyticsConsent(),restricted=analyticsBlocked();
   setBlocked(restricted);
   setVisible(analyticsConfigured()&&analyticsPage(path)!==null&&(consent===null||(consent==='granted'&&restricted)));
   void setAnalyticsIdentity(userId).then(()=>{if(cancelled)return;return applyAnalyticsConsent(consent==='granted');}).then(()=>{if(!cancelled&&consent==='granted'&&analyticsPage(path))captureAnalytics('page_viewed',{page:analyticsPage(path)!});});
  };
  const open=()=>{setBlocked(analyticsBlocked());setVisible(analyticsPage(path)!==null);};
  sync();window.addEventListener('storage',sync);window.addEventListener(ANALYTICS_CHANGE,sync);window.addEventListener(ANALYTICS_SETTINGS,open);
  return()=>{cancelled=true;window.removeEventListener('storage',sync);window.removeEventListener(ANALYTICS_CHANGE,sync);window.removeEventListener(ANALYTICS_SETTINGS,open);};
 },[path,userId]);
 function choose(value:'granted'|'denied'){
  setStorageError(false);
  try{saveAnalyticsConsent(value);setVisible(false);}
  catch{void applyAnalyticsConsent(false);setStorageError(true);}
 }
 if(!visible)return null;
 return <section aria-label="Analytics preferences" className="fixed bottom-4 start-4 z-50 w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-border bg-popover p-4 text-popover-foreground shadow-lg"><h2 className="text-sm font-semibold">Help improve Ent</h2><p className="mt-2 text-[13px] leading-5 text-muted-foreground">Allow optional usage analytics? We don’t record sessions or collect feedback text. You can change this choice later. <Link href="/privacy" className="underline underline-offset-4">Privacy notice</Link></p>{blocked&&<p className="mt-2 text-[13px]">Your browser requests privacy. Analytics stays off unless you choose to allow it here.</p>}{storageError&&<p role="alert" className="mt-2 text-[13px] text-destructive-foreground">Your choice couldn’t be saved. Analytics stays off.</p>}<div className="mt-4 flex flex-wrap justify-end gap-2"><Button size="sm" variant="outline" onClick={()=>choose('denied')}>No thanks</Button><Button size="sm" disabled={!analyticsConfigured()} onClick={()=>choose('granted')}>Allow analytics</Button></div></section>;
}
