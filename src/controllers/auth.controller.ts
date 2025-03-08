import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User, OTP } from '../models';
import { emailService } from '../services/email/EmailService';
import { AppError } from '../middleware/error';
import config from '../config';

export class AuthController {
  async sendOTP(req: Request, res: Response) {
    const { type, value } = req.body;

    if (!type || !value) {
      throw new AppError('Type and value are required', 400);
    }

    if (!['email', 'phone'].includes(type)) {
      throw new AppError('Invalid type. Must be email or phone', 400);
    }

    // Validate format
    if (type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      throw new AppError('Invalid email format', 400);
    }
    if (type === 'phone' && !/^\+[1-9]\d{1,14}$/.test(value)) {
      throw new AppError('Invalid phone number format', 400);
    }

    // Create OTP
    const otp = await OTP.createOTP(value, type as 'email' | 'phone');

    // Send OTP
    if (type === 'email') {
      await emailService.sendOTP(value, otp.otp);
    } else {
      // Implement SMS service here
      throw new AppError('SMS service not implemented', 501);
    }

    res.status(200).json({
      message: `OTP sent to your ${type}`,
      expiresIn: 300 // 5 minutes
    });
  }

  async verifyOTP(req: Request, res: Response) {
    const { type, value, otp } = req.body;

    if (!type || !value || !otp) {
      throw new AppError('Type, value and OTP are required', 400);
    }

    // Find and validate OTP
    const otpRecord = await OTP.findOne({
      value,
      otp,
      type,
      verified: false,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      throw new AppError('Invalid or expired OTP', 400);
    }

    // Mark OTP as verified
    await otpRecord.markVerified();

    // Find or create user
    let user = await User.findOne({ [type]: value });
    if (!user) {
      user = await User.create({ [type]: value });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.status(200).json({
      message: 'Successfully authenticated',
      token,
      user: {
        id: user._id,
        email: user.email,
        phone: user.phone
      }
    });
  }

  async getProfile(req: Request, res: Response) {
    const user = await User.findById(req.user!.id)
      .select('-__v')
      .populate({
        path: 'purchases',
        select: 'product amount status createdAt expiresAt downloadCount maxDownloads',
        populate: {
          path: 'product',
          select: 'name thumbnailUrl fileType'
        }
      });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.status(200).json(user);
  }

  async logout(req: Request, res: Response) {
    // In a real application, you might want to invalidate the token
    // by adding it to a blacklist or implementing a token revocation mechanism
    res.status(200).json({ message: 'Successfully logged out' });
  }
} 