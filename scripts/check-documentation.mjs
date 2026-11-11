import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {PLAN_LIMITS} from '../src/lib/plan-entitlements.ts';
import {billingPlan} from '../src/lib/billing.ts';
const root=resolve('documentation');
const config=JSON.parse(readFileSync(join(root,'docs.json'),'utf8'));
const pages=config.navigation.groups.flatMap(group=>group.pages);
assert.equal(new Set(pages).size,pages.length,'Duplicate navigation page');
let links=0;
for(const page of pages){
 const file=join(root,page+'.mdx');assert.ok(existsSync(file),'Missing page '+page);
 const source=readFileSync(file,'utf8');assert.match(source,/^---\ntitle: .+\ndescription: .+\n---/,'Missing page metadata '+page);
 const withoutCode=source.replace(/```[\s\S]*?```/g,'');
 for(const match of withoutCode.matchAll(/(?:href="|\]\()\/(?!\/)([^"\s)#]+)(?:#[^"\s)]*)?["\)]/g)){
  assert.ok(pages.includes(match[1])||existsSync(join(root,match[1])),'Broken internal link '+match[1]+' in '+page);links++;
 }
}
for(const file of readdirSync(root,{recursive:true}).filter(file=>file.endsWith('.mdx'))){assert.ok(pages.includes(file.replace(/\.mdx$/,'').replaceAll('\\','/')),'Unlisted public page '+file);}
for(const asset of [config.logo.light,config.logo.dark,config.favicon])assert.ok(existsSync(join(root,asset)),'Missing brand asset '+asset);
const pricing=readFileSync(join(root,'account/billing.mdx'),'utf8');
assert.ok(pricing.includes(`| Boards per workspace | ${PLAN_LIMITS.free.boards} | ${PLAN_LIMITS.essentials.boards} |`),'Board limits differ from app');
assert.ok(pricing.includes(`$${Number(billingPlan.monthly)}/month or $${Number(billingPlan.yearly)}/year`),'Prices differ from app');
assert.ok(pricing.includes(`**${billingPlan.trialDays}-day Essentials trial**`),'Trial differs from app');
console.log(JSON.stringify({pages:pages.length,internalLinks:links,branding:'passed',billingConsistency:'passed'}));
