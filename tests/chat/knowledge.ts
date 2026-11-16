import assert from 'node:assert/strict';
import {friendlyReply,rankSources} from '@/lib/chat/contracts';
import {detectTopics,knowledgeTopics,conversationTopics} from '@/lib/chat/topics';
import {operationsSchema,teamAvailable} from '@/lib/chat/availability';
import {publicAddress,websiteUrl,extractPage,robotsAllows,crawlWebsite} from '@/server/chat/website';
export async function checkKnowledge(){
 assert.ok(detectTopics('How do I change my account password?').includes('account'));assert.ok(detectTopics('How do I change my account password?').includes('how-to'));assert.ok(detectTopics('Pricing and subscription billing').includes('pricing'));assert.ok(detectTopics('Please add an export feature request').includes('feature-request'));assert.deepEqual(detectTopics('A sunny afternoon'),[]);assert.deepEqual(conversationTopics(['billing'],'How do I update my password?'),['billing','account','how-to']);
 const topics=knowledgeTopics([{url:'https://product.example.org/pricing',title:'Pricing',text:'Plans and subscription billing.'},{url:'https://product.example.org/pricing',title:'Pricing',text:'Plans and subscription billing.'}]);assert.equal(topics.find(t=>t.id==='pricing')?.sourceCount,1);assert.equal(topics.some(t=>t.id==='security'),false);
 assert.ok(friendlyReply('Hello!')?.includes('happy to help'));assert.ok(friendlyReply('Thank you')?.includes('welcome'));assert.equal(friendlyReply('Hello, can you change my billing account?'),null);
 assert.equal(rankSources('How much is it?',[{text:'Pricing plans start at seven dollars.',score:80}]).length,1);
 const schedule=operationsSchema.parse({mode:'schedule',timezone:'Africa/Lagos',days:[1],start:'09:00',end:'17:00'});
 assert.equal(teamAvailable(schedule,new Date('2026-11-16T07:59:00Z')),false);assert.equal(teamAvailable(schedule,new Date('2026-11-16T08:00:00Z')),true);assert.equal(teamAvailable(schedule,new Date('2026-11-16T16:00:00Z')),false);assert.equal(teamAvailable(schedule,new Date('2026-11-17T09:00:00Z')),false);
 assert.equal(operationsSchema.safeParse({timezone:'invented'}).success,false);assert.equal(operationsSchema.safeParse({mode:'schedule',start:'17:00',end:'09:00'}).success,false);assert.equal(operationsSchema.safeParse({allOperators:false,operatorIds:[]}).success,false);
 const dst=operationsSchema.parse({mode:'schedule',timezone:'America/New_York',days:[1],start:'09:00',end:'17:00'});assert.equal(teamAvailable(dst,new Date('2026-07-06T13:00:00Z')),true);assert.equal(teamAvailable(dst,new Date('2026-11-16T13:00:00Z')),false);
 for(const ip of ['127.0.0.1','10.0.0.1','169.254.169.254','192.168.1.1','172.31.0.1','100.100.100.200','0.0.0.0','224.0.0.1','::1','::ffff:127.0.0.1'])assert.equal(publicAddress(ip),false,ip);assert.equal(publicAddress('1.1.1.1'),true);
 for(const url of ['http://example.org','https://localhost','https://127.0.0.1','https://2130706433','https://[::1]','https://example.org:8443','https://name:password@example.org','https://example.org/?token=secret'])assert.throws(()=>websiteUrl(url));
 assert.equal(robotsAllows('User-agent: *\nDisallow: /private\nAllow: /private/public','/private/secret'),false);assert.equal(robotsAllows('User-agent: *\nDisallow: /','/docs'),false);
 assert.equal(robotsAllows('User-agent: *\nDisallow: /*private*$', '/docs/private'),false);assert.equal(robotsAllows('User-agent: *\nDisallow: /\nUser-agent: EntKnowledgeBot\nAllow: /docs','/docs'),true);
 assert.equal(robotsAllows('User-agent: EntKnowledgeBot\nDisallow:\nUser-agent: *\nDisallow: /','/docs'),true);
 const start=new URL('https://product.example.org');const extracted=extractPage('<html><title>Pricing &amp; plans</title><script>do not import this</script><main>Only public product information. Contact owner@example.org.</main></html>',start);assert.ok(!extracted.text.includes('do not import')&&!extracted.text.includes('owner@example.org'));assert.equal(extracted.title,'Pricing & plans');
 const visited:string[]=[];const html='<title>Product</title><main>'+('Public product documentation and support details. '.repeat(8))+'</main><a href="/docs">Docs</a><a href="https://private.example.org/">Outside</a><a href="/private">Private</a><a href="/admin">Admin</a>';
 const result=await crawlWebsite(start.href,async(url)=>{visited.push(url.href);return {url,type:'text/html',body:url.pathname==='/robots.txt'?'User-agent: *\nDisallow: /private':html};});
 assert.equal(result.pages.length,2);assert.ok(!visited.some(url=>url.includes('/private')||url.includes('/admin')||url.includes('private.example.org')));
 const docsVisited:string[]=[];const docs=await crawlWebsite('https://docs.example.org/guides',async url=>{docsVisited.push(url.href);return {url,type:'text/html',body:url.pathname==='/robots.txt'?'':html+'<a href="/guides/setup">Set up</a><a href="/pricing">Pricing</a>'};},'path');assert.equal(docs.pages.length,2);assert.ok(!docsVisited.some(url=>url.endsWith('/pricing')||url.endsWith('/docs')));
 await assert.rejects(()=>crawlWebsite(start.href,async()=>{throw Error('Unavailable');}),/robots.txt/);
 console.log('PASS: working hours, timezone/DST boundaries, operator validation, SSRF addresses/URLs, robots rules, sanitized website extraction and bounded same-domain crawl.');
}
