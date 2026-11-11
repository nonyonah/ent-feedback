import {createHmac,timingSafeEqual} from 'node:crypto';
export function lifecycleUnsubscribeToken(userId: string, secret: string): string {
  if(secret.length<32) throw new Error('Email unsubscribe secret is not configured');
  return createHmac('sha256',secret).update('ent-lifecycle-v1:'+userId).digest('hex');
}
export function verifyLifecycleUnsubscribe(userId: string, token: string, secret: string): boolean {
  if(!/^[0-9a-f-]{36}$/i.test(userId)||!/^[0-9a-f]{64}$/.test(token)||secret.length<32) return false;
  return timingSafeEqual(Buffer.from(token,'hex'),Buffer.from(lifecycleUnsubscribeToken(userId,secret),'hex'));
}
