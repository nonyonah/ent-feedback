import {shortWorkspacePath} from './workspace-domain';
export const analyticsEvents = ['page_viewed','workspace_created','onboarding_completed','board_created','feedback_submitted','comment_submitted','vote_changed','checkout_opened','checkout_returned','signed_up','integration_enabled','status_changed','item_shipped','roadmap_edited','quick_tour_started','quick_tour_completed','quick_tour_skipped','docs_link_clicked','widget_loaded','widget_opened','widget_first_loaded','feedback_created','comment_added','vote_cast','roadmap_viewed','chat_started','chat_escalated','template_selected','sample_content_cleared','board_duplicated','setup_prompt_copied','preview_board_created','claim_link_opened','board_claimed','changelog_published'] as const;
export type AnalyticsEvent = typeof analyticsEvents[number];
export type AnalyticsProperties = {auth_state?:string;environment?:string;page?:string;surface?:string;source?:string;feedback_type?:string;has_attachment?:boolean;has_screenshot?:boolean;is_reply?:boolean;active?:boolean;is_external?:boolean;interval?:string;method?:string;type?:string;from?:string;to?:string;action?:string;origin_domain?:string};
export function analyticsPage(path:string){
  if(shortWorkspacePath(path)||path==='/changelog'||path.startsWith('/changelog/'))return null;
  if(path==='/claim'||path.startsWith('/claim/')||path.startsWith('/founder'))return null;
  if(path.startsWith('/api')||path.startsWith('/embed')||path.startsWith('/widget-preview')||path.startsWith('/p/')||path==='/boards'||path.startsWith('/boards/')||path==='/roadmap'||path.startsWith('/roadmap/')||path.startsWith('/items/')||path.startsWith('/following')||path.startsWith('/submit'))return null;
  if(path==='/'||path==='/landing-v2')return 'landing';
  if(path==='/pricing')return 'pricing';
  if(path.startsWith('/dashboard/settings'))return 'settings';
  if(path.startsWith('/dashboard'))return 'dashboard';
  if(path.startsWith('/onboarding')||path.startsWith('/registration'))return 'onboarding';
  if(path.startsWith('/auth')||path.startsWith('/invitations'))return 'auth';
  if(path==='/privacy'||path==='/terms')return 'other';
  return 'other';
}
export function safeAnalyticsProperties(input:Record<string,unknown>){
  const result:Record<string,string|boolean>={};
  const enums:Record<string,readonly string[]>={
    auth_state:['signed_in','guest'],
    environment:['production','development'],
    page:['landing','pricing','settings','dashboard','onboarding','auth','other'],
    surface:['dashboard','public_board','widget','board','roadmap','page'],
    source:['dashboard','public_board','widget','board','roadmap','page'],
    feedback_type:['feedback','bug','feature_request'],
    interval:['monthly','yearly'],
    method:['google','email'],
    type:['slack','discord','linear','github','saas','mobile','developer','blank'],
    from:['open','planned','in-progress','shipped'],
    to:['open','planned','in-progress','shipped'],
    action:['reorder','hide','note'],
  };
  for(const[key,values]of Object.entries(enums))if(typeof input[key]==='string'&&values.includes(input[key] as string))result[key]=input[key] as string;
  for(const key of ['has_attachment','has_screenshot','is_reply','active','is_external'])if(typeof input[key]==='boolean')result[key]=input[key] as boolean;
  if(typeof input.origin_domain==='string'&&input.origin_domain.length<=253&&/^(?:[a-z0-9-]+\.)+[a-z]{2,}$/i.test(input.origin_domain))result.origin_domain=input.origin_domain.toLowerCase();
  return result;
}
