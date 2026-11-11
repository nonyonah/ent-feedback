import {runNotificationSchedule} from './runner.mjs';
export default {
 async scheduled(_controller,env){
  try{const result=await runNotificationSchedule(env);console.log(JSON.stringify({event:'notification_maintenance',...result}));}
  catch{console.error(JSON.stringify({event:'notification_maintenance_failed'}));throw new Error('Notification maintenance failed');}
 },
} satisfies ExportedHandler<Env>;
