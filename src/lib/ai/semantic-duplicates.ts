import {z} from 'zod';
const resultSchema=z.object({ids:z.array(z.string().uuid()).max(8)}).strict();
/** Never trust model-supplied IDs; return only candidates from this request. */
export function verifiedDuplicateIds(output:unknown,allowed:ReadonlySet<string>){
 const parsed=resultSchema.safeParse(output);if(!parsed.success)return [];
 return [...new Set(parsed.data.ids)].filter(id=>allowed.has(id));
}
