import express from 'express';

const app = express();

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`[DEBUG] ${req.method} ${req.url}`);
  next();
});

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Basic health check endpoint
app.get('/', (req, res) => {
  console.log('[HEALTH] Root endpoint called');
  res.json({ status: 'ok' });
});

app.get('/health', (req, res) => {
  console.log('[HEALTH] Health check endpoint called');
  res.json({ status: 'ok' });
});

app.get('/api/health', (req, res) => {
  console.log('[HEALTH] API health check endpoint called');
  res.json({ status: 'ok' });
});

// Start server
const port = 3002;
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`[SERVER] Test server running on port ${port}`);
  console.log('[SERVER] Available routes:');
  console.log('GET /');
  console.log('GET /health');
  console.log('GET /api/health');
});

// Error handling
server.on('error', (error: any) => {
  console.error('[SERVER] Error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`[SERVER] Port ${port} is already in use`);
  }
  process.exit(1);
}); 