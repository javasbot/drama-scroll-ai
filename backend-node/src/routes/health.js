import { Router } from 'express';

export const healthRouter = Router();

const startTime = Date.now();

healthRouter.get('/', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'drama-scroll-node',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

export default healthRouter;
