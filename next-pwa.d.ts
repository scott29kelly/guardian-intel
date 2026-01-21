declare module 'next-pwa' {
  import type { NextConfig } from 'next';
  
  interface PWAConfig {
    dest?: string;
    disable?: boolean;
    register?: boolean;
    scope?: string;
    sw?: string;
    skipWaiting?: boolean;
    reloadOnOnline?: boolean;
    cacheOnFrontEndNav?: boolean;
    fallbacks?: {
      document?: string;
      image?: string;
      audio?: string;
      video?: string;
      font?: string;
    };
    cacheStartUrl?: boolean;
    dynamicStartUrl?: boolean;
    dynamicStartUrlRedirect?: string;
    buildExcludes?: (string | RegExp)[];
    runtimeCaching?: any[];
    publicExcludes?: string[];
    extendDefaultRuntimeCaching?: boolean;
  }
  
  function withPWA(config: PWAConfig): (nextConfig: NextConfig) => NextConfig;
  export default withPWA;
}

