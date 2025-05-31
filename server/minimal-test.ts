import express from 'express';
import { AddressInfo } from 'net';

const app = express();

// Debug middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
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

app.get('/', (req, res) => {
  console.log('Root endpoint called');
  res.json({ status: 'ok', message: 'Server is running' });
});

app.get('/health', (req, res) => {
  console.log('Health endpoint called');
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Health check successful'
  });
});

const port = 8080;
const host = '127.0.0.1';

try {
  const server = app.listen(port, host, () => {
    const address = server.address() as AddressInfo;
    console.log('Server started successfully');
    console.log(`Server is running at http://${host}:${port}`);
    console.log('Available endpoints:');
    console.log(`- GET http://${host}:${port}/`);
    console.log(`- GET http://${host}:${port}/health`);
  });

  server.on('error', (error: any) => {
    console.error('Server error:', error);
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use`);
    }
    process.exit(1);
  });

  // Log when requests are received
  app.use((req, res, next) => {
    console.log(`Incoming ${req.method} request to ${req.url}`);
    next();
  });
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
} 