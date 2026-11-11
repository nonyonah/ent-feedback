/** Shared, dependency-free HTML/text emails. Never interpolate unescaped user content. */
export type EmailTemplate = {subject: string; html: string; text: string};
export type LifecycleEmail = 'welcome' | 'onboarding_reminder' | 'first_board_reminder' | 'getting_value' | 'inactive';
export const lifecycleCopy: Record<LifecycleEmail, {subject: string; heading: string; body: string; action: string; path: string}> = {
  welcome: {subject: 'Welcome to Ent', heading: 'A home for your users’ ideas.', body: 'Collect feedback, spot bugs, and see what people want next. Start with a workspace, then create a board to bring the conversation together.', action: 'Set up your workspace', path: '/auth/continue'},
  onboarding_reminder: {subject: 'Your workspace is waiting', heading: 'Pick up where you left off.', body: 'Finish setting up your workspace when you’re ready. It gives your feedback a home and a link you can share.', action: 'Continue setup', path: '/auth/continue'},
  first_board_reminder: {subject: 'Ready for your first feedback board?', heading: 'Make room for the first idea.', body: 'Create a board for feedback, bugs, or feature requests. Then share its link or add the widget to your site.', action: 'Create a board', path: '/dashboard'},
  getting_value: {subject: 'Your board is ready. Invite the conversation.', heading: 'Give your users a way in.', body: 'Share your board link or install the feedback widget. Votes and replies help you understand which ideas matter, and statuses keep everyone in the loop.', action: 'Open your workspace', path: '/dashboard'},
  inactive: {subject: 'Ready to hear what’s next?', heading: 'Your feedback has a home.', body: 'Come back to your boards when you’re ready. Review ideas, reply to a conversation, or share your board again. We’ll keep this short.', action: 'Open Ent', path: '/dashboard'},
};
export function escapeEmailHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}
function safeUrl(value: string): string {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Invalid email link');
  return escapeEmailHtml(url.href);
}
/** Mirrors Ent's 10px buttons, neutral cards, logo-only header and 500/600 type. */
export function emailLayout(input: {subject: string; heading: string; body: string; action: string; url: string; footer: string; unsubscribeUrl?: string}): EmailTemplate {
  const e = escapeEmailHtml;
  const href = safeUrl(input.url);
  const origin = new URL(input.url).origin;
  const logo = safeUrl(new URL('/brand/ent-mark.png',origin).href);
  const unsubscribe = input.unsubscribeUrl ? safeUrl(input.unsubscribeUrl) : undefined;
  return {
    subject: input.subject,
    text: `${input.heading}\n\n${input.body}\n\n${input.action}: ${input.url}\n\n${input.footer}${input.unsubscribeUrl ? '\nStop these emails: ' + input.unsubscribeUrl : ''}\n\nRift Labs · Nigeria · nonyonah@gmail.com`,
    html: `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">
<title>${e(input.subject)}</title>
<style>
  :root{color-scheme:light dark;supported-color-schemes:light dark}
  @media(prefers-color-scheme:dark){
    .email-bg{background:#171717!important}.email-card{background:#222222!important;border-color:#363636!important}
    .email-heading{color:#e8e8e8!important}.email-copy{color:#d0d0d0!important}.email-muted{color:#ababab!important}
    .email-button{background:#e8e8e8!important;border-color:#e8e8e8!important;box-shadow:none!important}.email-button a{color:#212529!important}
  }
  @media(max-width:420px){.email-outer{padding:24px 16px!important}.email-inner{padding:24px!important}.email-heading{font-size:24px!important}}
</style></head>
<body class="email-bg" style="margin:0;background:#f7f7f7;color:#292929;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-weight:500">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${e(input.body)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td class="email-outer" align="center" style="padding:40px 20px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px">
<tr><td class="email-card email-inner" style="padding:28px;background:#ffffff;border:1px solid #e5e5e5;border-radius:18px">
<a href="${safeUrl(origin)}" style="display:inline-block;margin:0 0 28px;text-decoration:none" aria-label="Ent Feedback"><img src="${logo}" alt="Ent Feedback" width="40" height="40" style="display:block;width:40px;height:40px;object-fit:contain;border:0"></a>
<h1 class="email-heading" style="margin:0 0 12px;color:#292929;font-size:26px;font-weight:600;letter-spacing:-.65px;line-height:1.25">${e(input.heading)}</h1>
<p class="email-copy" style="margin:0 0 24px;font-size:14px;font-weight:500;line-height:1.65;color:#525252">${e(input.body)}</p>
<table role="presentation" cellspacing="0" cellpadding="0"><tr><td class="email-button" bgcolor="#212529" style="background:#212529;border:1px solid #212529;border-radius:10px;box-shadow:inset 0 1px 0 #ffffff29,0 1px 2px #21252924"><a href="${href}" style="display:inline-block;padding:9px 15px;color:#ffffff;text-decoration:none;font-size:13px;font-weight:500;line-height:20px">${e(input.action)}</a></td></tr></table>
</td></tr>
<tr><td class="email-muted" style="padding:16px 12px;font-size:12px;font-weight:500;line-height:1.6;color:#686868">
<p style="margin:0 0 8px">${e(input.footer)}</p>
${unsubscribe ? `<p style="margin:0 0 12px"><a class="email-muted" href="${unsubscribe}" style="color:#686868;text-decoration:underline">Stop these emails</a></p>` : ''}
<p style="margin:0">Rift Labs · Nigeria · <a class="email-muted" href="mailto:nonyonah@gmail.com" style="color:#686868;text-decoration:underline">Contact support</a></p>
</td></tr></table></td></tr></table></body></html>`,
  };
}
export function lifecycleEmail(input: {kind: LifecycleEmail; appOrigin: string; unsubscribeUrl: string}): EmailTemplate {
  const copy = lifecycleCopy[input.kind];
  return emailLayout({...copy, url: new URL(copy.path, input.appOrigin).href, unsubscribeUrl: input.unsubscribeUrl, footer: 'A little help with your Ent workspace. You can stop these emails without changing your feedback notifications.'});
}
export function activityEmail(input: {subject: string; title: string; url: string}): EmailTemplate {
  return emailLayout({subject: input.subject, heading: input.subject, body: input.title, action: 'Open feedback', url: input.url, footer: 'Manage notifications from the bell on your feedback board. Unfollow a post to stop status updates.'});
}
