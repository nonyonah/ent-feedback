'use client';
import type {PostHog} from 'posthog-js';
import {analyticsPage,safeAnalyticsProperties,type AnalyticsEvent,type AnalyticsProperties} from './analytics-events';
export const ANALYTICS_CONSENT_KEY='ent-analytics-consent:v1';
const SERVER_CONSENT_COOKIE='ent_analytics_consent';
function syncServerConsent(allowed:boolean){try{document.cookie=SERVER_CONSENT_COOKIE+'='+(allowed?['granted',...analyticsPrivacySignals()].join('.'):'')+'; Path=/; SameSite=Lax; Max-Age='+(allowed?'31536000':'0')+(location.protocol==='https:'?'; Secure':'');}catch{}}
export const ANALYTICS_PRIVACY_OVERRIDE_KEY='ent-analytics-privacy-override:v1';
export const ANALYTICS_CHANGE='ent-analytics-change';
export const ANALYTICS_SETTINGS='ent-analytics-settings';
let client:PostHog|undefined;
let permitted=false;
let generation=0;
let accountId:string|null|undefined;
let identityGeneration=0;
let identifiedAccountId:string|null|undefined;
let accountProperties:{email?:string;name?:string}={};
const ACCOUNT_PREFIX='ent-user-';
function syncClientIdentity(){
  if(!client||!permitted||accountId===undefined)return;
  const previous=client.get_distinct_id();
  if(previous.startsWith(ACCOUNT_PREFIX)&&previous!==accountId){client.reset(true);client.opt_in_capturing({captureEventName:false});identifiedAccountId=undefined;}
  if(accountId&&identifiedAccountId!==accountId){client.identify(accountId,accountProperties);identifiedAccountId=accountId;}
  if(!accountId)identifiedAccountId=null;
}
export async function setAnalyticsIdentity(userId:string|null|undefined,properties:{email?:string|null;name?:string|null}={}){
  const version=++identityGeneration;
  accountId=undefined;
  accountProperties={email:properties.email?.trim()||undefined,name:properties.name?.trim()||undefined};
  try{
   const digest=userId?await crypto.subtle.digest('SHA-256',new TextEncoder().encode('ent-analytics:v1:'+userId)):null;
   if(version!==identityGeneration)return;
   accountId=userId===undefined?undefined:digest?ACCOUNT_PREFIX+Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join(''):null;
   syncClientIdentity();
  }catch{accountId=undefined;}
}
export function analyticsConfigured(){return process.env.NEXT_PUBLIC_ANALYTICS_ENABLED==='true'&&Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY&&process.env.NEXT_PUBLIC_POSTHOG_HOST)&&(process.env.NODE_ENV==='production'||process.env.NEXT_PUBLIC_POSTHOG_ENABLE_IN_DEVELOPMENT==='true');}
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
  if(value==='granted')localStorage.setItem(ANALYTICS_PRIVACY_OVERRIDE_KEY,analyticsPrivacySignals().join(','));
  else localStorage.removeItem(ANALYTICS_PRIVACY_OVERRIDE_KEY);
  localStorage.setItem(ANALYTICS_CONSENT_KEY,value);
  window.dispatchEvent(new Event(ANALYTICS_CHANGE));
}
export function readAnalyticsConsent(): 'granted'|'denied'|null {try{const value=localStorage.getItem(ANALYTICS_CONSENT_KEY);return value==='granted'||value==='denied'?value:null;}catch{return null;}}
export async function applyAnalyticsConsent(allowed:boolean){
  const version=++generation;
  permitted=allowed&&!analyticsBlocked()&&analyticsConfigured()&&analyticsPage(location.pathname)!==null;
  syncServerConsent(permitted);
  if(!permitted){try{client?.stopSessionRecording();client?.opt_out_capturing();client?.reset();}catch{}return;}
  try{
   if(!client){
    const {default:posthog}=await import('posthog-js');
    if(version!==generation||!permitted)return;
    client=posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!,{
     api_host:'/ingest',
     ui_host:process.env.NEXT_PUBLIC_POSTHOG_HOST,
     defaults:'2026-08-30',
     capture_exceptions:true,
     session_recording:{maskAllInputs:true},
     persistence:'localStorage',cross_subdomain_cookie:false,
     person_profiles:'identified_only',respect_dnt:false, // Consent and privacy signals are enforced by analyticsBlocked().
     before_send:event=>{
      if(!event||!permitted||analyticsBlocked()||accountId===undefined)return null;
      if(event.event==='$exception'){
       event.properties={...event.properties,auth_state:accountId?'signed_in':'guest',$is_identified:Boolean(accountId),$process_person_profile:Boolean(accountId)};
       return event;
      }
      const safe=safeAnalyticsProperties(event.properties);
      for(const key of ['token','distinct_id','$device_id','$session_id','$window_id','$lib','$lib_version','$anon_distinct_id']){
       const value=event.properties[key];if(typeof value==='string')safe[key]=value;
      }
      if(event.event==='$pageview')for(const key of ['$current_url','$pathname','$host','$referrer'])if(typeof event.properties[key]==='string')safe[key]=event.properties[key];
      const set=event.properties.$set;
      const personProperties=event.event==='$identify'&&set&&typeof set==='object'&&!Array.isArray(set)?Object.fromEntries(Object.entries(set).filter(([key,value])=>(key==='email'||key==='name'||key==='is_internal')&&(typeof value==='string'||typeof value==='boolean'))):undefined;
      event.properties={...safe,...(personProperties?{$set:personProperties}:{}),auth_state:accountId?'signed_in':'guest',$is_identified:Boolean(accountId),$process_person_profile:Boolean(accountId)};delete event.$set_once;return event;
     },
    });
   }
   if(version!==generation||!permitted)return;
   client?.opt_in_capturing({captureEventName:false});
   syncClientIdentity();
  }catch{permitted=false;}
}
export function captureAnalyticsException(error:Error){
  if(!permitted||!client||analyticsBlocked())return;
  try{client.captureException(error);}catch{}
}
export function captureAnalytics(event:AnalyticsEvent,properties:AnalyticsProperties={}){
  if(!permitted||!client||accountId===undefined||analyticsBlocked()||analyticsPage(location.pathname)===null)return;
  try{client.capture(event,safeAnalyticsProperties({...properties,auth_state:accountId?'signed_in':'guest',environment:process.env.NODE_ENV==='production'?'production':'development'}));}catch{}
}
/** PostHog's own dashboards read $pageview, so every tracked page also reports one. */
export function capturePageview(){
  if(!permitted||!client||accountId===undefined||analyticsBlocked())return;
  try{client.capture('$pageview',{page:analyticsPage(location.pathname)??'other'});}catch{}
}
export function openAnalyticsSettings(){window.dispatchEvent(new Event(ANALYTICS_SETTINGS));}
