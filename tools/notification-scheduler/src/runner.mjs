/**
 * @param {Record<'APP_ORIGIN'|'ENABLED'|'CRON_SECRET', string>} env
 * @param {typeof fetch} transport
 */
export async function runNotificationSchedule(env, transport = fetch){
 if(env.ENABLED!=='true')return {enabled:false};
 const origin=new URL(env.APP_ORIGIN);
 if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw new Error('Invalid scheduler origin');
 if(!env.CRON_SECRET||env.CRON_SECRET.length<32)throw new Error('Scheduler secret is not configured');
 const response=await transport(new URL('/api/internal/notification-jobs',origin),{method:'POST',headers:{Authorization:`Bearer ${env.CRON_SECRET}`},signal:AbortSignal.timeout(55_000),redirect:'error'});
 const status=response.status;
 await response.body?.cancel();
 if(!response.ok)throw new Error(`Notification maintenance returned HTTP ${status}`);
 return {enabled:true,status};
}
