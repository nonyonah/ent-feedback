// Generate local, credential-free previews. Does not send mail.
import {mkdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {lifecycleCopy,lifecycleEmail,activityEmail} from '../src/server/emails/templates.ts';
const directory=resolve(process.argv[2]||'/tmp/ent-email-previews');
await mkdir(directory,{recursive:true});
const templates=Object.keys(lifecycleCopy).map(kind=>({name:kind,...lifecycleEmail({kind,appOrigin:'https://ent.riftlabs.xyz',unsubscribeUrl:'https://example.com/unsubscribe-preview'})}));
templates.push({name:'reply',...activityEmail({subject:'Someone replied to your comment',title:'A conversation you’re part of has a new reply. Open the feedback to read it and respond.',url:'https://ent.riftlabs.xyz/dashboard'})});
for(const template of templates){await writeFile(join(directory,template.name+'.html'),template.html);await writeFile(join(directory,template.name+'.txt'),template.subject+'\n\n'+template.text);}
await writeFile(join(directory,'index.html'),'<!doctype html><html lang="en"><meta charset="utf-8"><title>Ent email previews</title><body style="font:16px/1.6 system-ui;max-width:640px;margin:60px auto;padding:20px"><h1>Ent email previews</h1><p>Local previews only. No messages sent.</p><ul>'+templates.map(t=>`<li><a href="${t.name}.html">${t.subject}</a></li>`).join('')+'</ul></body></html>');
console.log(`Rendered ${templates.length} email previews: ${join(directory,'index.html')}`);
