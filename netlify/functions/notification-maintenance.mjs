import {timingSafeEqual} from 'node:crypto';
import {runNotificationSchedule} from '../../tools/notification-scheduler/src/runner.mjs';

export async function executeNotificationMaintenance(request,env,transport=fetch){
 const secret=env.CRON_SECRET;
 const expected=secret&&secret.length>=32?Buffer.from(`Bearer ${secret}`):null;
 const received=Buffer.from(request.headers.get('authorization')||'');
 if(!expected||expected.length!==received.length||!timingSafeEqual(expected,received))return {authorized:false};
 return runNotificationSchedule({ENABLED:'true',APP_ORIGIN:env.URL||env.NEXT_PUBLIC_APP_URL,CRON_SECRET:secret},transport);
}
export default async function notificationMaintenance(request){
 try{const result=await executeNotificationMaintenance(request,process.env);console.log(JSON.stringify({event:'notification_maintenance',...result}));}
 catch{throw Error('Notification maintenance failed');}
}
export const config={background:true};
