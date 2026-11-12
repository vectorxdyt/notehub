import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  // Bundle this chain so Firebase Auth does not require ESM-only jose at runtime.
  transpilePackages: ['firebase-admin', 'jwks-rsa', 'jose'],
  async headers() {
    return [{source:'/:path*',headers:[
      {key:'X-Content-Type-Options',value:'nosniff'},
      {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
      {key:'X-Frame-Options',value:'DENY'},
      {key:'Cross-Origin-Opener-Policy',value:'same-origin-allow-popups'},
      {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'}
    ]}];
  }
};
export default nextConfig;
