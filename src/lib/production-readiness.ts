type Check = {id:string;status:'pass'|'blocked'|'manual';message:string};

/** Return configuration verdicts only. Never return environment values or secrets. */
export function productionReadiness(env:Record<string,string|undefined>):Check[]{
 const checks:Check[]=[];
 const add=(id:string,ok:boolean,message:string)=>checks.push({id,status:ok?'pass':'blocked',message});
 function publicOrigin(raw:string|undefined){
  try{const url=new URL(raw??'');return url.protocol==='https:'&&!url.username&&!url.password&&url.pathname==='/'&&!url.search&&!url.hash&&!/(^|\.)(localhost|example\.(com|org|net)|ngrok(-free)?\.(app|io)|trycloudflare\.com)$/.test(url.hostname)&&!/^\d+\.\d+\.\d+\.\d+$/.test(url.hostname)&&url.hostname.includes('.');}catch{return false;}
 }
 add('app-origin',publicOrigin(env.NEXT_PUBLIC_APP_URL),'Use a permanent HTTPS app origin, without a path or test tunnel.');
 add('billing-return',publicOrigin(env.BACHS_RETURN_ORIGIN??env.NEXT_PUBLIC_APP_URL),'Billing must return to a permanent HTTPS origin.');
 add('database',Boolean(env.DATABASE_URL),'Configure the production PostgreSQL database.');
 add('clerk-live',Boolean(env.CLERK_SECRET_KEY?.startsWith('sk_live_')&&env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_live_')),'Use matching Clerk production credentials.');
 add('bachs-live',Boolean(env.BACHS_API_KEY?.startsWith('sk_live_')),'Use a live Bachs API key.');
 add('bachs-webhook',Boolean(env.BACHS_WEBHOOK_SECRET&&env.BACHS_ORGANIZATION_ID),'Configure the live Bachs webhook secret and organization.');
 add('bachs-products',['BACHS_MONTHLY_PRODUCT_ID','BACHS_YEARLY_PRODUCT_ID','BACHS_MONTHLY_TRIAL_PRODUCT_ID','BACHS_YEARLY_TRIAL_PRODUCT_ID'].every(key=>env[key]?.startsWith('prod_')),'Configure monthly/yearly products with and without trials.');
 add('email',Boolean(env.SENDBYTE_API_KEY&&env.EMAIL_FROM),'Configure Sendbyte and the sender address.');
 add('storage',['R2_ACCOUNT_ID','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY','R2_BUCKET'].every(key=>Boolean(env[key])),'Configure the production R2 bucket and credentials.');
 add('scheduler-secret',(env.CRON_SECRET?.length??0)>=32,'Configure a scheduler secret with at least 32 characters.');
 checks.push({id:'provider-verification',status:'manual',message:'Verify live product prices/trials, sender domain, webhook delivery, and production database/storage isolation.'},{id:'scheduler',status:'manual',message:'Deploy the recurring worker and verify a real notification reaches the recipient inbox.'},{id:'release-acceptance',status:'manual',message:'Complete subscription lifecycle, legal pages, mobile, keyboard and screen-reader acceptance checks.'});
 return checks;
}
