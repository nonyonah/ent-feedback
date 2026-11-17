import {z} from 'zod';
const clock=z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const operationsSchema=z.object({
 mode:z.enum(['always','schedule','away']).default('always'),
 timezone:z.string().max(80).refine(value=>{try{new Intl.DateTimeFormat('en',{timeZone:value});return true;}catch{return false;}},'Choose a valid timezone.').default('UTC'),
 days:z.array(z.number().int().min(0).max(6)).max(7).default([1,2,3,4,5]),
 start:clock.default('09:00'),end:clock.default('17:00'),
 awayMessage:z.string().trim().min(1).max(240).default('Our team is away. Leave a message and we’ll reply when we’re back.'),
 allOperators:z.boolean().default(true),operatorIds:z.array(z.uuid()).max(100).default([]),
}).strict().superRefine((value,ctx)=>{if(value.mode==='schedule'&&(!value.days.length||value.start>=value.end))ctx.addIssue({code:'custom',message:'Choose working days and an end time after the start time.'});});
export type ChatOperations=z.infer<typeof operationsSchema>;
export const defaultOperations=operationsSchema.parse({});
export function teamAvailable(operations:ChatOperations,now=new Date()){
 if(operations.mode!=='schedule')return operations.mode==='always';
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:operations.timezone,weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
 const part=(name:string)=>parts.find(p=>p.type===name)?.value??'';
 const day=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(part('weekday'));
 const time=part('hour')+':'+part('minute');return operations.days.includes(day)&&time>=operations.start&&time<operations.end;
}
