import express, { type Express } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "../dist/public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(
    express.static(distPath, {
      // Add proper caching headers for static assets
      etag: true,
      lastModified: true,
      maxAge: process.env.NODE_ENV === "production" ? "1d" : "0",
      setHeaders: (res, path) => {
        // Set proper MIME types for different file extensions
        if (path.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css; charset=utf-8');
        } else if (path.endsWith('.js')) {
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        } else if (path.endsWith('.html')) {
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
        } else if (path.endsWith('.json')) {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
        } else if (path.endsWith('.png')) {
          res.setHeader('Content-Type', 'image/png');
        } else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
          res.setHeader('Content-Type', 'image/jpeg');
        } else if (path.endsWith('.gif')) {
          res.setHeader('Content-Type', 'image/gif');
        } else if (path.endsWith('.svg')) {
          res.setHeader('Content-Type', 'image/svg+xml');
        } else if (path.endsWith('.ico')) {
          res.setHeader('Content-Type', 'image/x-icon');
        } else if (path.endsWith('.woff') || path.endsWith('.woff2')) {
          res.setHeader('Content-Type', 'font/woff2');
        }
        
        // Add caching headers
        if (process.env.NODE_ENV === "production") {
          // Cache for 1 day with revalidation
          res.setHeader('Cache-Control', 'public, max-age=86400, must-revalidate');
          res.setHeader('Vary', 'Accept-Encoding');
        } else {
          // No caching in development
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
      }
    }),
  );

  // Special handling for /login, /auth, and other client-side routes to prevent redirect loops
  const clientRoutes = ['/login', '/auth', '/dashboard', '/profile', '/admin', '/pricing'];
  
  clientRoutes.forEach(route => {
    app.get(`${route}`, (req, res) => {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.resolve(distPath, "index.html"));
    });
    
    // Also handle routes with trailing slash and potential subroutes
    app.get(`${route}/*`, (req, res) => {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  });

  // Skip handling for API routes
  app.use("*", (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }
    
    // Log the catch-all route being accessed
    console.log(`[STATIC] Serving index.html for route: ${req.originalUrl}`);
    
    // Set proper content type for HTML
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
