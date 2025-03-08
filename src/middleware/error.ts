import { Request, Response, NextFunction } from 'express';
import { MongoError } from 'mongodb';
import mongoose from 'mongoose';
import { AppError } from '../utils/AppError';

export function notFound(req: Request, res: Response, next: NextFunction) {
  const error = new AppError(`Not Found - ${req.originalUrl}`, 404);
  next(error);
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = (err as AppError).statusCode || 500;
  const status = (err as AppError).status || 'error';

  res.status(statusCode).json({
    status,
    error: {
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }
  });
};

export function errorHandlerMongo(
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