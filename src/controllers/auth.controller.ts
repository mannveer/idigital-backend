import { Request, Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { User, OTP } from '../models';
import { emailService } from '../services/email/EmailService';
import { SMSService } from '../services/sms/SMSService';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/AppError';
import config from '../config';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = 24 * 60 * 60; // 1 day in seconds

const smsService = new SMSService();

export const sendOTP = catchAsync(async (req: Request, res: Response) => {
  const { type, destination } = req.body;

  if (!type || !destination) {
    throw new AppError('Type and destination are required', 400);
  }

  const otp = await OTP.create({
    type,
    destination,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
  });

  // Send OTP based on type
  if (type === 'email') {
    await emailService.sendOTP(destination, otp.value);
  } else if (type === 'sms') {
    await smsService.sendOTP(destination, otp.value);
  } else {
    throw new AppError('Invalid OTP type', 400);
  }

  res.status(200).json({
    status: 'success',
    message: `OTP sent successfully via ${type}`,
  });
});

export const verifyOTP = catchAsync(async (req: Request, res: Response) => {
  const { type, destination, otp } = req.body;

  if (!type || !destination || !otp) {
    throw new AppError('Type, destination and OTP are required', 400);
  }

  const otpDoc = await OTP.findOne({
    type,
    destination,
    value: otp,
    verified: false,
    expiresAt: { $gt: new Date() }
  });

  if (!otpDoc) {
    throw new AppError('Invalid or expired OTP', 400);
  }

  await otpDoc.markVerified();

  // Find or create user
  let user = await User.findOne({ [type]: destination });
  if (!user) {
    user = await User.create({ [type]: destination });
  }

  const signOptions: SignOptions = { expiresIn: JWT_EXPIRES_IN };
  const token = jwt.sign(
    { id: user._id },
    JWT_SECRET,
    signOptions
  );

  res.status(200).json({
    status: 'success',
    token,
    data: { user }
  });
});

export class AuthController {
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