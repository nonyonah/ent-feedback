// Read-only Slack calls. Never return provider bodies or credentials to visitors.
export async function readSlackPresence(token:string,email:string,userId?:string|null,transport:typeof fetch=fetch){
 async function call(method:string,params:Record<string,string>){
  const url=new URL('https://slack.com/api/'+method);url.search=new URLSearchParams(params).toString();
  const response=await transport(url,{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:AbortSignal.timeout(3000)});
  if(!response.ok)throw Error('Slack presence unavailable');
  const data=await response.json();if(!data.ok)throw Error('Slack presence unavailable');return data;
 }
 let id=userId;
 if(!id){const data=await call('users.lookupByEmail',{email});if(data.user?.deleted||data.user?.is_bot||data.user?.is_restricted||data.user?.is_ultra_restricted||data.user?.profile?.email?.toLowerCase()!==email.toLowerCase())return {userId:null,online:false};id=data.user?.id;}
 if(typeof id!=='string'||!/^[UW][A-Z0-9]+$/.test(id))return {userId:null,online:false};
 const data=await call('users.getPresence',{user:id});return {userId:id,online:data.presence==='active'};
}
