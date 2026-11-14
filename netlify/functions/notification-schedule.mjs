// Netlify's scheduled functions have a 30s limit. Dispatch to a protected
// background function, which waits for the bounded Next maintenance request.
export async function dispatchNotificationMaintenance(env,transport=fetch){
 const secret=env.CRON_SECRET;
 if(!secret||secret.length<32)throw Error('Scheduler secret is not configured');
 const origin=new URL(env.URL||env.NEXT_PUBLIC_APP_URL);
 if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw Error('Invalid scheduler origin');
 const response=await transport(new URL('/.netlify/functions/notification-maintenance',origin),{method:'POST',headers:{Authorization:`Bearer ${secret}`},redirect:'error',signal:AbortSignal.timeout(20_000)});
 await response.body?.cancel();
 if(response.status!==202)throw Error('Maintenance dispatch was not accepted');
}
export default async function notificationSchedule(){await dispatchNotificationMaintenance(process.env);}
export const config={schedule:'*/5 * * * *'};
