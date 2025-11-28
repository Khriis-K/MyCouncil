import app from './app';
import { config } from './config';

const server = app.listen(config.port, () => {
  console.log(`Server running at http://localhost:${config.port}`);
});

// Keep the server running
server.on('error', (err) => {
  console.error('Server error:', err);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});
