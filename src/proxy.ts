import { clerkMiddleware } from "@clerk/nextjs/server";
import {workspaceBaseDomain,workspaceHandleFromHost} from "@/lib/workspace-domain";
import { NextResponse } from "next/server";

const protectedPrefixes = ["/dashboard", "/onboarding", "/registration"];

export default clerkMiddleware(async (auth, request) => {
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

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
