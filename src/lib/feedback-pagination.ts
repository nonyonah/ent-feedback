import {z} from 'zod';
export const FEEDBACK_PAGE_SIZE=25;
export const ACTIVITY_PAGE_SIZE=20;
const cursorSchema=z.object({at:z.iso.datetime(),id:z.uuid()}).strict();
export function parseFeedbackCursor(value?:string){return value?z.string().max(160).transform((text,ctx)=>{try{return JSON.parse(text);}catch{ctx.addIssue({code:'custom',message:'Invalid page cursor.'});return z.NEVER;}}).pipe(cursorSchema).parse(value):undefined;}
export function feedbackCursor(row:{id:string;created:Date;cursorAt?:string}){return JSON.stringify({at:row.cursorAt??row.created.toISOString(),id:row.id});}
