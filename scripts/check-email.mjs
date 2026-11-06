import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import esbuild from 'esbuild';

const output = join(mkdtempSync(join(tmpdir(), 'ent-email-check-')), 'email.cjs');
await esbuild.build({
  entryPoints: ['src/server/email.ts'], bundle: true, platform: 'node', format: 'cjs', outfile: output,
  plugins: [{ name: 'boundaries', setup(build) {
    build.onResolve({ filter: /^(server-only|@\/server\/env)$/ }, a => ({ path: a.path, namespace: 'mock' }));
    build.onLoad({ filter: /.*/, namespace: 'mock' }, a => ({ contents: a.path === 'server-only' ? '' : `export function requireProviderEnv(){return {SENDBYTE_API_KEY:'test-key',EMAIL_FROM:'Ent <noreply@example.com>',NEXT_PUBLIC_APP_URL:'https://example.com'}}`, loader: 'js' }));
  } }],
});
const { sendActivityEmail, sendInvitationEmail } = createRequire(import.meta.url)(output);
const originalFetch = globalThis.fetch;
let requests = [];
try {
  globalThis.fetch = async (url, options) => {
    requests.push({ url, ...options, body: JSON.parse(options.body) });
    return Response.json({ id: 'email-accepted' });
  };
  const input = { to: 'reader@example.com', subject: '<Status>', title: '<script>unsafe</script>', url: 'https://example.com/post?a=1&b=2', key: 'notification:stable-id' };
  await sendActivityEmail(input);
  await sendActivityEmail(input);
  assert.equal(requests[0].url, 'https://api.sendbyte.africa/v1/emails');
  assert.equal(requests[0].headers.Authorization, 'Bearer test-key');
  assert.equal(requests[0].body.idempotency_key, requests[1].body.idempotency_key);
  assert.equal(requests[0].body.to, input.to);
  assert.ok(requests[0].body.html.includes('&lt;script&gt;'));
  assert.ok(!requests[0].body.html.includes('<script>'));
  assert.ok(requests[0].signal instanceof AbortSignal);
  await sendInvitationEmail({ to: input.to, workspaceName: 'Workspace', inviterName: 'Owner', role: 'member', token: 'stable-token' });
  assert.equal(requests.at(-1).body.idempotency_key, 'invitation:stable-token');
  for (const response of [Response.json({ secret: 'private-provider-detail' }, { status: 429 }), Response.json({}), new Response('invalid-json')]) {
    globalThis.fetch = async () => response;
    await assert.rejects(sendActivityEmail(input), error => error.code === 'retryable' && !error.message.includes('private-provider-detail'));
  }
  globalThis.fetch = async () => { throw new Error('private-provider-detail'); };
  await assert.rejects(sendActivityEmail(input), error => error.code === 'retryable' && !error.message.includes('private-provider-detail'));
  console.log('PASS Sendbyte: endpoint, authorization, stable retry keys, HTML escaping, timeout, acceptance receipts and safe failure handling. No emails sent.');
} finally { globalThis.fetch = originalFetch; }
