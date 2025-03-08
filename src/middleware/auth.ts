import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import { User } from '../models';

interface JwtPayload {
  userId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        phone?: string;
      };
    }
  }
}

export async function auth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      throw new Error();
    }

    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    const user = await User.findById(decoded.userId);

    if (!user) {
      throw new Error();
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      phone: user.phone
    };

    next();
  } catch (error) {
    res.status(401).json({ message: 'Please authenticate' });
  }
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  auth(req, res, (error) => {
    if (error) {
      // Continue without user authentication
      next();
    } else {
      next();
    }
  });
} 