/* global Netlify */
import {documentationOrigin, documentationPath, documentationDestination, documentationRequestHeaders} from "../../src/lib/documentation-proxy.ts";

// Run before the Next adapter, which consumes Mintlify's `dpl` query parameter.
// Keep this a streaming public proxy: never forward Ent cookies or auth headers.
export default async function documentation(request, context) {
  const url = new URL(request.url);
  if (!documentationPath(url.pathname)) return context.next();
  const workspaceDomain = Netlify.env.get("NEXT_PUBLIC_WORKSPACE_BASE_DOMAIN");
  if (workspaceDomain && url.hostname.endsWith("." + workspaceDomain)) return new Response("Not found", {status: 404});
  const origin = documentationOrigin(Netlify.env.get("MINTLIFY_ORIGIN") ?? "");
  if (!origin) return new Response("Documentation is temporarily unavailable.", {status: 503});
  try {
    const upstream = await fetch(documentationDestination(url.pathname, url.search, origin), {
      method: request.method,
      headers: documentationRequestHeaders(request.headers, origin),
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      redirect: "manual",
    });
    const headers = new Headers(upstream.headers);
    headers.delete("set-cookie");
    headers.delete("content-length");
    headers.delete("content-encoding");
    return new Response(upstream.body, {status: upstream.status, headers});
  } catch {
    return new Response("Documentation could not load. Please try again.", {status: 502, headers: {"Cache-Control": "no-store"}});
  }
}
