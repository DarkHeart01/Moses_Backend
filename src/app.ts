import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { errorMiddleware } from './middleware/error.middleware';
import { loggingMiddleware } from './middleware/logging.middleware';
import routes from './routes';
import { logger } from './services/logger.service';

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3001;

// Apply middlewares
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(loggingMiddleware);

// Register routes
app.use('/api', routes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Error handling
app.use(errorMiddleware);

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export default app;
