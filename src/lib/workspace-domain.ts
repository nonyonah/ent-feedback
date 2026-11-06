export const reservedWorkspaceHandles = new Set(['www','app','api','admin','auth','dashboard','account','accounts','clerk','support','help','status','mail','email','assets','static','cdn','docs','blog','billing','embed','widget','onboarding','registration']);
export function validWorkspaceHandle(value:string){return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value)&&value.length>=2&&value.length<=40&&!reservedWorkspaceHandles.has(value);}
export function normalizeWorkspaceName(value:string){return value.trim().replace(/\s+/g,' ');}
export function workspaceBaseDomain(){const domain=process.env.NEXT_PUBLIC_WORKSPACE_BASE_DOMAIN?.trim().toLowerCase();return domain&&/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9-]+$/.test(domain)?domain:null;}
export function workspacePublicUrl(handle:string,path='/',origin=''){const domain=workspaceBaseDomain();if(!domain)return origin+'/p/'+encodeURIComponent(handle)+(path==='/'?'/boards':path);const url=new URL(origin||'https://'+domain);url.hostname=handle+'.'+domain;return url.origin+path;}
export function workspaceHandleFromHost(host:string,baseDomain:string){const hostname=host.toLowerCase().split(':')[0];const suffix='.'+baseDomain.toLowerCase();if(!hostname.endsWith(suffix))return null;const handle=hostname.slice(0,-suffix.length);return validWorkspaceHandle(handle)?handle:null;}

export function validNewWorkspaceDomain(value:string){return value.length>=5&&validWorkspaceHandle(value);}

export const defaultWorkspaceBaseDomain='feedback.riftlabs.xyz';
export function workspaceDomainAddress(handle:string,path='/'){return 'https://'+handle+'.'+(workspaceBaseDomain()??defaultWorkspaceBaseDomain)+path;}
