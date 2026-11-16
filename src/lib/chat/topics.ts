// Topic labels come from a fixed product-support vocabulary. Public source text
// provides evidence; it cannot inject instructions or arbitrary labels into UI.
export const CHAT_TOPICS=[
 {id:'pricing',label:'Pricing',pattern:/\b(pric(?:e|es|ing)|plans?|costs?|free trial|how much|how expensive)\b/i},
 {id:'account',label:'Account',pattern:/\b(accounts?|sign[ -]?in|log[ -]?in|password|profile|sign[ -]?up|registration)\b/i},
 {id:'billing',label:'Billing',pattern:/\b(billing|bills?|invoices?|payments?|subscriptions?|refunds?|cancel(?:lation|ing)?)\b/i},
 {id:'how-to',label:'How-to',pattern:/\b(how[ -]to|how (?:do|does|can|should|to|would)|getting started|get started|step[ -]by[ -]step|tutorials?|guides?|set[ -]?up|configuration)\b/i},
 {id:'feature-request',label:'Feature request',pattern:/\b(feature requests?|suggest(?:ion|ions)?|ideas?|wish ?lists?|please add|could you add|would love|can you add)\b/i},
 {id:'troubleshooting',label:'Troubleshooting',pattern:/\b(troubleshoot(?:ing)?|errors?|bugs?|not working|doesn.t work|broken|crash(?:es|ing)?)\b/i},
 {id:'integrations',label:'Integrations',pattern:/\b(integrations?|webhooks?|slack|discord|connect apps?)\b/i},
 {id:'security',label:'Security',pattern:/\b(security|privacy|encryption|two[ -]factor|data protection|permissions?)\b/i},
 {id:'installation',label:'Installation',pattern:/\b(install(?:ation|ing)?|embed(?:ding|ded)?|widget|npm|sdk)\b/i},
 {id:'data',label:'Data & exports',pattern:/\b(exports?|imports?|backups?|download data|csv)\b/i},
] as const;
export type ChatTopicId=typeof CHAT_TOPICS[number]['id'];
export function topicLabel(id:string){return CHAT_TOPICS.find(topic=>topic.id===id)?.label??'General';}
export function detectTopics(text:string):ChatTopicId[]{return CHAT_TOPICS.filter(topic=>topic.pattern.test(text.slice(0,30000))).map(topic=>topic.id);}
export function knowledgeTopics(pages:{url:string;title:string;text:string}[]){
 return CHAT_TOPICS.flatMap(topic=>{const sources=new Set(pages.filter(page=>topic.pattern.test(page.title+' '+page.url+' '+page.text.slice(0,14400))).map(page=>page.url));return sources.size?[{id:topic.id,label:topic.label,sourceCount:sources.size}]:[];});
}
export function conversationTopics(previous:string[],text:string){return [...new Set([...previous,...detectTopics(text)])].filter(id=>CHAT_TOPICS.some(topic=>topic.id===id)).slice(0,10);}
