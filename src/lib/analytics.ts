'use client';
import type {PostHog} from 'posthog-js';
import {analyticsEvents,analyticsPage,safeAnalyticsProperties,type AnalyticsEvent,type AnalyticsProperties} from './analytics-events';
export const ANALYTICS_CONSENT_KEY='ent-analytics-consent:v1';
export const ANALYTICS_PRIVACY_OVERRIDE_KEY='ent-analytics-privacy-override:v1';
export const ANALYTICS_CHANGE='ent-analytics-change';
export const ANALYTICS_SETTINGS='ent-analytics-settings';
let client:PostHog|undefined;
let permitted=false;
let generation=0;
let accountId:string|null|undefined;
let identityGeneration=0;
const ACCOUNT_PREFIX='ent-user-';
function syncClientIdentity(){
 if(!client||!permitted||accountId===undefined)return;
 const previous=client.get_distinct_id();
 // Reset before switching accounts or returning to guest activity: never merge two accounts.
 if(previous.startsWith(ACCOUNT_PREFIX)&&previous!==accountId){client.reset(true);client.opt_in_capturing({captureEventName:false});}
 if(accountId&&client.get_distinct_id()!==accountId)client.identify(accountId);
}
export async function setAnalyticsIdentity(userId:string|null|undefined){
 const version=++identityGeneration;
 accountId=undefined; // Drop events while auth loads or the new identity is being resolved.
 try{
  const digest=userId?await crypto.subtle.digest('SHA-256',new TextEncoder().encode('ent-analytics:v1:'+userId)):null;
  if(version!==identityGeneration)return;
  accountId=userId===undefined?undefined:digest?ACCOUNT_PREFIX+Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join(''):null;
  syncClientIdentity();
 }catch{accountId=undefined;}
}
export function analyticsConfigured(){return Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY&&process.env.NEXT_PUBLIC_POSTHOG_HOST)&&(process.env.NODE_ENV==='production'||process.env.NEXT_PUBLIC_POSTHOG_ENABLE_IN_DEVELOPMENT==='true');}
export function analyticsPrivacySignals(){
 if(typeof navigator==='undefined')return [];
 return [navigator.doNotTrack==='1'?'dnt':null,(navigator as Navigator&{globalPrivacyControl?:boolean}).globalPrivacyControl===true?'gpc':null].filter((value):value is string=>value!==null);
}
export function analyticsBlocked(){
 const signals=analyticsPrivacySignals();
 if(!signals.length)return false;
 try{const acknowledged=localStorage.getItem(ANALYTICS_PRIVACY_OVERRIDE_KEY)?.split(',')??[];return signals.some(signal=>!acknowledged.includes(signal));}catch{return true;}
}
export function saveAnalyticsConsent(value:'granted'|'denied'){
 // Acknowledge only the signals present at this explicit choice. A new signal blocks again.
 if(value==='granted')localStorage.setItem(ANALYTICS_PRIVACY_OVERRIDE_KEY,analyticsPrivacySignals().join(','));
 else localStorage.removeItem(ANALYTICS_PRIVACY_OVERRIDE_KEY);
 localStorage.setItem(ANALYTICS_CONSENT_KEY,value);
 window.dispatchEvent(new Event(ANALYTICS_CHANGE));
}
export function readAnalyticsConsent(): 'granted'|'denied'|null {try{const value=localStorage.getItem(ANALYTICS_CONSENT_KEY);return value==='granted'||value==='denied'?value:null;}catch{return null;}}
export async function applyAnalyticsConsent(allowed:boolean){
 const version=++generation;
 permitted=allowed&&!analyticsBlocked()&&analyticsConfigured()&&analyticsPage(location.pathname)!==null;
 if(!permitted){try{client?.opt_out_capturing();client?.reset();}catch{}return;}
 try{
  if(!client){
   const {default:posthog}=await import('posthog-js');
   if(version!==generation||!permitted)return;
   client=posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!,{
    api_host:process.env.NEXT_PUBLIC_POSTHOG_HOST,
    autocapture:false,capture_pageview:false,capture_pageleave:false,
    disable_session_recording:true,disable_surveys:true,
    capture_performance:false,capture_exceptions:false,
    advanced_disable_flags:true,disable_external_dependency_loading:true,
    opt_out_capturing_by_default:true,opt_out_persistence_by_default:true,
    persistence:'localStorage',cross_subdomain_cookie:false,
    person_profiles:'identified_only',respect_dnt:false,
    before_send:event=>{
     if(!event||!permitted||analyticsBlocked()||accountId===undefined||(!analyticsEvents.includes(event.event as AnalyticsEvent)&&event.event!=='$identify'))return null;
     // Strip SDK-added URL, referrer, title and other automatic properties too.
     const safe=safeAnalyticsProperties(event.properties);
     for(const key of ['token','distinct_id','$device_id','$session_id','$window_id','$lib','$lib_version','$anon_distinct_id']){
      const value=event.properties[key];if(typeof value==='string')safe[key]=value;
     }
     event.properties={...safe,auth_state:accountId?'signed_in':'guest',$is_identified:Boolean(accountId),$process_person_profile:Boolean(accountId)};delete event.$set;delete event.$set_once;return event;
    },
   });
  }
  if(version!==generation||!permitted)return;
  client?.opt_in_capturing({captureEventName:false});
  syncClientIdentity();
 }catch{permitted=false;/* Analytics must never interrupt product actions. */}
}
export function captureAnalytics(event:AnalyticsEvent,properties:AnalyticsProperties={}){
 if(!permitted||!client||accountId===undefined||analyticsBlocked()||analyticsPage(location.pathname)===null)return;
 try{client.capture(event,safeAnalyticsProperties({...properties,auth_state:accountId?'signed_in':'guest',environment:process.env.NODE_ENV==='production'?'production':'development'}));}catch{}
}
export function openAnalyticsSettings(){window.dispatchEvent(new Event(ANALYTICS_SETTINGS));}
