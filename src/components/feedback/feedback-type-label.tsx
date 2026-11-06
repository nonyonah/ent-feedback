import {FEEDBACK_CATEGORIES,type FeedbackCategory} from '@/lib/feedback-data';
const dots:Record<FeedbackCategory,string>={feedback:'bg-type-feedback',bug:'bg-type-bug',feature_request:'bg-type-request'};
export function FeedbackTypeLabel({category}:{category:FeedbackCategory}){
 return <span className="inline-flex min-w-0 items-center gap-1.5"><span aria-hidden="true" data-feedback-type={category} className={'size-2 shrink-0 rounded-full '+dots[category]}/><span className="truncate">{FEEDBACK_CATEGORIES[category]}</span></span>;
}
