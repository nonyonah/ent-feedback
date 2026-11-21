import type { NextConfig } from "next";

const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST?.replace(/\/+$/, "");

const nextConfig: NextConfig = {
  // Bake this routing flag in: Netlify build variables aren't all runtime envs.
  env: { ENT_NATIVE_DOCS_PROXY: process.env.NETLIFY === "true" ? "true" : "false" },
  /* config options here */
  async rewrites() {
    return posthogHost ? [{ source: "/ingest/:path*", destination: `${posthogHost}/:path*` }] : [];
  },
  async headers() {
    const headers = [
      {key:'X-Content-Type-Options',value:'nosniff'},
      {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
      {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'},
      {key:'Content-Security-Policy',value:"frame-ancestors 'self'"},
      ...(process.env.NODE_ENV==='production'?[{key:'Strict-Transport-Security',value:'max-age=31536000'}]:[]),
    ];
    return [
      {source:'/:path*',headers},
      // The widget is intentionally embeddable on customers’ websites.
      {source:'/embed',headers:[{key:'Content-Security-Policy',value:'frame-ancestors *'}]},
    ];
  },
  cacheComponents: true,
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  partialPrefetching: true,
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
