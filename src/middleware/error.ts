import { Request, Response, NextFunction } from 'express';
import { MongoError } from 'mongodb';
import mongoose from 'mongoose';

export class AppError extends Error {
  statusCode: number;
  status: string;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

    Error.captureStackTrace(this, this.constructor);
  }
}

export function notFound(req: Request, res: Response, next: NextFunction) {
  const error = new AppError(`Not Found - ${req.originalUrl}`, 404);
  next(error);
}

export function errorHandler(
  err: Error | AppError | MongoError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      message: err.message,
      statusCode: err.statusCode,
      isOperational: err.isOperational,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(err.errors).map(error => error.message);
    return res.status(400).json({
      message: 'Validation Error',
      statusCode: 400,
      errors
    });
  }

  if (err instanceof MongoError) {
    if (err.code === 11000) {
      return res.status(400).json({
        message: 'Duplicate field value entered',
        statusCode: 400
      });
    }
  }

  // Default error
  console.error('Error:', err);
  res.status(500).json({
    message: 'Internal Server Error',
    statusCode: 500,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
} 