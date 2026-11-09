'use client';
import {loadBachs,type Bachs,type BachsCheckoutEvent} from '@bachs/js';
let initialized:Promise<Bachs>|null=null;
let initializedOrigin:string|null=null;
export async function openBillingOverlay(checkoutUrl:string,onEvent:(event:BachsCheckoutEvent)=>void){
 const url=new URL(checkoutUrl);
 if(url.protocol!=='https:'||url.username||url.password||url.port||!['checkout.bachs.io','sandbox-checkout.bachs.io'].includes(url.hostname))throw Error('Invalid checkout destination. Please try again.');
 if(initializedOrigin&&initializedOrigin!==url.origin)throw Error('The billing environment changed. Refresh this page and try again.');
 if(!initialized){initializedOrigin=url.origin;initialized=loadBachs({baseUrl:url.origin}).then(client=>client.Initialize({baseUrl:url.origin})).catch(error=>{initialized=null;initializedOrigin=null;throw error;});}
 const client=await initialized;
 return client.Checkout.open({checkoutUrl,onEvent,options:{showCloseButton:true,autoCloseOnComplete:true}});
}
