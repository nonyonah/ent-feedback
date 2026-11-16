/** Short inbox timestamps. The full date remains available on the time element. */
export function conversationTime(value:string|Date,now:number):string{
 const elapsed=Math.max(0,now-new Date(value).getTime());
 const minutes=Math.floor(elapsed/60000);
 if(minutes<1)return 'Now';
 if(minutes<60)return `${minutes} ${minutes===1?'min':'mins'} ago`;
 const hours=Math.floor(minutes/60);
 if(hours<24)return `${hours} ${hours===1?'hour':'hours'} ago`;
 const days=Math.floor(hours/24);
 return `${days} ${days===1?'day':'days'} ago`;
}
