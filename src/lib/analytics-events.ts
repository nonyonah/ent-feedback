/** Explicit event schema: no user content, identifiers or raw URLs. */
export const analyticsEvents = ['page_viewed','workspace_created','onboarding_completed','board_created','feedback_submitted','comment_submitted','vote_changed','checkout_opened','checkout_returned'] as const;
export type AnalyticsEvent = typeof analyticsEvents[number];
export type AnalyticsProperties = {auth_state?:string;environment?:string;page?:string;surface?:string;feedback_type?:string;has_attachment?:boolean;is_reply?:boolean;active?:boolean;interval?:string};
export function analyticsPage(path:string){
 if(path.startsWith('/embed')||path.startsWith('/widget-preview'))return null;
 if(path==='/')return 'landing';
 if(path==='/pricing')return 'pricing';
 if(path.startsWith('/dashboard/settings'))return 'settings';
 if(path.startsWith('/dashboard'))return 'dashboard';
 if(path.startsWith('/onboarding')||path.startsWith('/registration'))return 'onboarding';
 if(path.startsWith('/auth'))return 'auth';
 if(/\/items\//.test(path))return 'feedback_detail';
 if(/\/boards(?:\/|$)/.test(path))return 'public_board';
 return 'other';
}
export function safeAnalyticsProperties(input:Record<string,unknown>){
 const result:Record<string,string|boolean>={};
 const enums:Record<string,readonly string[]>={auth_state:['signed_in','guest'],environment:['production','development'],page:['landing','pricing','settings','dashboard','onboarding','auth','feedback_detail','public_board','other'],surface:['dashboard','public_board'],feedback_type:['feedback','bug','feature_request'],interval:['monthly','yearly']};
 for(const[key,values]of Object.entries(enums))if(typeof input[key]==='string'&&values.includes(input[key] as string))result[key]=input[key] as string;
 for(const key of ['has_attachment','is_reply','active'])if(typeof input[key]==='boolean')result[key]=input[key] as boolean;
 return result;
}
