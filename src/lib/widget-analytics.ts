/** Only the embedding host can turn these bounded, content-free notifications into analytics. */
export function emitWidgetAnalytics(event:'roadmap_viewed'|'feedback_submitted'|'vote_cast'|'comment_submitted'|'chat_started'|'chat_escalated'){
 try{if(window.parent===window||!location.pathname.startsWith('/embed')||!document.referrer)return;window.parent.postMessage({type:'ent:analytics-event',event},new URL(document.referrer).origin);}catch{}
}
