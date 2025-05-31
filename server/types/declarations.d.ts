// Type declarations for modules without TypeScript definitions

declare module 'compression' {
  import { RequestHandler } from 'express';
  function compression(options?: any): RequestHandler;
  export = compression;
}

declare module './routes/api' {
  import { Router } from 'express';
  const apiRouter: Router;
  export default apiRouter;
}

declare module './lib/rate-limiter' {
  import { RequestHandler } from 'express';
  export const rateLimiter: RequestHandler;
  export const authRateLimiter: RequestHandler;
  export const resourceIntensiveRateLimiter: RequestHandler;
  export default rateLimiter;
}

declare module './lib/logger' {
  export const logger: {
    info: (message: string, ...args: any[]) => void;
    error: (message: string, ...args: any[]) => void;
    warn: (message: string, ...args: any[]) => void;
    debug: (message: string, ...args: any[]) => void;
  };
} 