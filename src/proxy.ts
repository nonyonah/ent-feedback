import { clerkMiddleware } from "@clerk/nextjs/server";
import {workspaceBaseDomain,workspaceHandleFromHost} from "@/lib/workspace-domain";
import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";
import {documentationPath,documentationOrigin,documentationDestination,documentationRequestHeaders} from "@/lib/documentation-proxy";

const protectedPrefixes = ["/dashboard", "/onboarding", "/registration"];

const applicationProxy=clerkMiddleware(async (auth, request) => {
  const { pathname, search } = request.nextUrl;
  const domain=workspaceBaseDomain();
  const tenant=domain?workspaceHandleFromHost(request.headers.get("host")??"",domain):null;
  const hostname=(request.headers.get("host")??"").toLowerCase().split(":")[0];
  if(domain&&hostname.endsWith("."+domain)&&!tenant)return new NextResponse("Not found",{status:404});
  if(tenant){
    // Keep authentication and management on the configured app origin.
    if(!(pathname==="/auth/continue"&&request.nextUrl.searchParams.get("intent")==="public")&&["/auth","/dashboard","/registration","/onboarding","/invitations"].some(prefix=>pathname===prefix||pathname.startsWith(prefix+"/"))){
      const origin=process.env.NEXT_PUBLIC_APP_URL;
      if(!origin)return new NextResponse("Application origin is not configured.",{status:503});
      const destination=new URL(pathname+search,origin);
      const next=destination.searchParams.get("next");
      if(next&&/^\/(?:boards(?:\/|\?|$)|items\/|submit(?:\?|$)|following(?:\?|$))/.test(next))destination.searchParams.set("next","/p/"+tenant+next);
      else if(next==="/")destination.searchParams.set("next","/p/"+tenant+"/boards");
      return NextResponse.redirect(destination);
    }
    if(pathname==="/"||pathname==="/boards"||pathname.startsWith("/boards/")||pathname.startsWith("/items/")||pathname==="/submit"||pathname==="/following"){
      const rewritten=request.nextUrl.clone();
      rewritten.pathname="/p/"+tenant+(pathname==="/"?"/boards":pathname);
      return NextResponse.rewrite(rewritten);
    }
    if(pathname.startsWith("/p/"))return new NextResponse("Not found",{status:404});
  }

  if (protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    const { userId } = await auth();

    if (!userId) {
      const signInUrl = new URL("/auth", request.url);
      signInUrl.searchParams.set("next", `${pathname}${search}`);
      return NextResponse.redirect(signInUrl);
    }
  }
});


export default function proxy(request:NextRequest,event:NextFetchEvent){
  const path=request.nextUrl.pathname;
  if(documentationPath(path)){
    // Netlify's native docs edge proxy receives the untouched URL, including dpl.
    // The Next adapter normalizes that parameter before invoking this proxy.
    if(process.env.ENT_NATIVE_DOCS_PROXY === "true")return NextResponse.next();
    const base=workspaceBaseDomain();
    const tenant=base?workspaceHandleFromHost(request.headers.get('host')??'',base):null;
    if(tenant)return new NextResponse('Not found',{status:404});
    const origin=documentationOrigin();
    if(!origin)return new NextResponse('Documentation is temporarily unavailable.',{status:503,headers:{'Cache-Control':'no-store'}});
    return NextResponse.rewrite(documentationDestination(path,request.nextUrl.search,origin),{request:{headers:documentationRequestHeaders(request.headers,origin)}});
  }
  // Marketing entry points must remain accessible before a Clerk session exists.
  // Tenant roots still go through the workspace rewrite above.
  if (["/", "/pricing", "/privacy", "/terms", "/landing-v2"].includes(path)) {
    const base=workspaceBaseDomain();
    const tenant=base?workspaceHandleFromHost(request.headers.get("host")??"",base):null;
    if(!tenant)return NextResponse.next();
  }
  return applicationProxy(request,event);
}

export const config = {
  matcher: [
    "/docs/:path*",
    "/_mintlify/:path*",
    "/mintlify-assets/:path*",
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
