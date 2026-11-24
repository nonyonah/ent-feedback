import {z} from 'zod';

const suggestion=z.object({category:z.enum(['feedback','bug','feature_request','question']),tagIds:z.array(z.uuid()).max(10)}).strict();
export function verifiedClassification(raw:unknown,allowed:Set<string>){
 const value=suggestion.parse(raw);
 return {category:value.category,tagIds:[...new Set(value.tagIds)].filter(id=>allowed.has(id))};
}
