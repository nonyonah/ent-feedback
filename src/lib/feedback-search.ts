import {FEEDBACK_CATEGORIES,type FeedbackItemData} from './feedback-data';
const typeTerms={feedback:'feedback feedbacks',bug:'bug bugs bug reports',feature_request:'feature request requests feature requests'};
export function searchFeedback(items:FeedbackItemData[],query:string,boardNames:Map<string,string>){
 const terms=query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
 return items.filter(item=>{const text=[item.title,item.description,item.author,FEEDBACK_CATEGORIES[item.category??'feedback'],typeTerms[item.category??'feedback'],boardNames.get(item.boardId??''),...(item.tags??[]).map(tag=>tag.name)].join(' ').toLocaleLowerCase();return terms.every(term=>text.includes(term));}).sort((a,b)=>b.createdOrder-a.createdOrder);
}
