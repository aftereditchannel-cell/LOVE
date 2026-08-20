import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  // Never expose internal errors to client
  res.status(500).json({
    error: 'Internal server error',
    // Only show details in development
    ...(process.env.NODE_ENV === 'development' && { details: err.message }),
  });
}
