import mongoose, { Document, Model, Schema } from 'mongoose';
import crypto from 'crypto';

export interface IOTP extends Document {
  value: string;
  type: 'email' | 'sms';
  destination: string;
  verified: boolean;
  expiresAt: Date;
  markVerified(): Promise<void>;
}

interface IOTPModel extends Model<IOTP> {
  generateOTP(): string;
}

const otpSchema = new Schema<IOTP>({
  value: {
    type: String,
    required: true,
    default: function() {
      return (this.constructor as IOTPModel).generateOTP();
    }
  },
  type: {
    type: String,
    required: true,
    enum: ['email', 'sms']
  },
  destination: {
    type: String,
    required: true
  },
  verified: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    required: true,
    default: function() {
      return new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    }
  }
});

// Indexes for quick lookups and cleanup
otpSchema.index({ value: 1, type: 1 });
otpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 300 }); // 5 minutes

// Methods
otpSchema.methods.isValid = function(): boolean {
  return !this.verified && new Date() < this.expiresAt;
};

otpSchema.methods.markVerified = async function(): Promise<void> {
  this.verified = true;
  await this.save();
};

// Statics
otpSchema.statics.generateOTP = function(): string {
  return crypto.randomInt(100000, 999999).toString();
};

export const OTP = mongoose.model<IOTP, IOTPModel>('OTP', otpSchema); 