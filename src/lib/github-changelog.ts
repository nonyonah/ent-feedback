import {createHmac,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import {slugifyChangelogTitle,type ChangelogCategory} from './changelog';
export function validGithubSignature(body:string,signature:string,secret:string){
 if(!/^sha256=[a-f0-9]{64}$/i.test(signature))return false;
 return timingSafeEqual(createHmac('sha256',secret).update(body,'utf8').digest(),Buffer.from(signature.slice(7),'hex'));
}
const pullRequest=z.object({action:z.string(),repository:z.object({full_name:z.string()}),pull_request:z.object({id:z.number().int().positive(),number:z.number().int().positive(),merged:z.boolean(),title:z.string(),body:z.string().nullable(),html_url:z.string(),labels:z.array(z.object({name:z.string()})).default([]),base:z.object({ref:z.string()}),draft:z.boolean().optional()})});
/** A PR can provide a dedicated customer-facing section without AI processing. */
export function githubChangelogBody(description:string|null){
 const source=description?.trim()??'',lines=source.split(/\r?\n/);let fence=false,start=-1,end=lines.length,level=0;
 for(let i=0;i<lines.length;i++){
  if(/^\s*(?:```|~~~)/.test(lines[i])){fence=!fence;continue;}
  if(fence)continue;
  const header=lines[i].match(/^\s*(#{1,6})\s+(.+?)\s*#*\s*$/);if(!header)continue;
  if(start<0&&/^(?:changelog|user[- ]facing changes?)$/i.test(header[2].trim())){start=i+1;level=header[1].length;continue;}
  if(start>=0&&header[1].length<=level){end=i;break;}
 }
 const selected=start<0?source:lines.slice(start,end).join('\n').replace(/<!--[\s\S]*?-->/g,'').trim();
 return selected.slice(0,19000)||'Describe the change for your users before publishing.';
}
export function githubChangelogDraft(payload:unknown,repository:string){
 const parsed=pullRequest.safeParse(payload);if(!parsed.success)return null;const event=parsed.data,pr=event.pull_request;
 if(event.action!=='closed'||!pr.merged||event.repository.full_name.toLowerCase()!==repository.toLowerCase()||pr.labels.some(label=>/^(skip-changelog|internal|chore)$/i.test(label.name)))return null;
 const title=pr.title.trim().slice(0,120);if(!title)return null;
 const labels=pr.labels.map(label=>label.name.toLowerCase());let category:ChangelogCategory='improvement';
 if(labels.some(label=>['feature','enhancement','new-feature'].includes(label)))category='new-feature';else if(labels.some(label=>['bug','bugfix','bug-fix','fix'].includes(label)))category='bug-fix';else if(labels.includes('documentation'))category='documentation';else if(labels.includes('performance'))category='performance';
 const body=githubChangelogBody(pr.body);
 return {id:String(pr.id),title,body,category,slug:slugifyChangelogTitle(title),number:pr.number};
}

/** GitHub's list endpoint supplies merged_at rather than the webhook's merged flag. */
export function githubHistoricalChangelogDraft(pullRequest:unknown,repository:string){
 const merged=z.object({merged_at:z.string().datetime().nullable()}).passthrough().safeParse(pullRequest);
 if(!merged.success||!merged.data.merged_at)return null;
 const draft=githubChangelogDraft({action:'closed',repository:{full_name:repository},pull_request:{...merged.data,merged:true}},repository);
 return draft?{...draft,mergedAt:merged.data.merged_at}:null;
}
