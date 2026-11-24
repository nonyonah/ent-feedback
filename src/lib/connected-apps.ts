import {z} from 'zod';
export const connectedProviderSchema=z.enum(['linear','discord']);
export type ConnectedProvider=z.infer<typeof connectedProviderSchema>;
export const linearSettingsSchema=z.object({autoCreate:z.boolean().default(false),teamId:z.uuid(),states:z.object({open:z.uuid(),planned:z.uuid(),'in-progress':z.uuid(),shipped:z.uuid()})}).refine(value=>new Set(Object.values(value.states)).size===4,'Choose a different Linear state for each Ent status.');
export type LinearSettings=z.infer<typeof linearSettingsSchema>;
export const discordSettingsSchema=z.object({feedback:z.boolean().default(true),conversations:z.boolean().default(true),statuses:z.boolean().default(true)});
export function linearDestination(value:string){try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='linear.app'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
