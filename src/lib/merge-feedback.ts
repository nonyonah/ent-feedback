import type {FeedbackItemData} from './feedback-data';
/** Keep explicitly loaded earlier activity through polling and one-post updates. */
export function mergeFeedbackItem(previous:FeedbackItemData|undefined,next:FeedbackItemData):FeedbackItemData{
 if(!previous)return next;
 const comments=[...new Map([...previous.comments,...next.comments].map(c=>[c.id,c])).values()];
 const statusHistory=[...new Map([...(previous.statusHistory??[]),...(next.statusHistory??[])].map(e=>[e.id,e])).values()];
 return {...next,comments,statusHistory,
  // Restart at the latest page boundary if new activity introduced a gap.
  // Deduplication makes repeated earlier pages safe; counts let complete
  // threads stay complete instead of repeatedly showing a load-more action.
  nextCommentCursor:comments.length>=(next.commentCount??Infinity)?null:next.nextCommentCursor,
  nextHistoryCursor:statusHistory.length>=(next.historyCount??Infinity)?null:next.nextHistoryCursor,
 };
}
