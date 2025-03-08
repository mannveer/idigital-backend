import mongoose, { Document, Schema } from 'mongoose';

export interface IOTP extends Document {
  value: string;
  otp: string;
  type: 'email' | 'phone';
  expiresAt: Date;
  verified: boolean;
  createdAt: Date;
}

const otpSchema = new Schema({
  value: {
    type: String,
    required: [true, 'Email or phone is required'],
    trim: true
  },
  otp: {
    type: String,
    required: [true, 'OTP is required'],
    trim: true,
    length: [6, 'OTP must be 6 characters long']
  },
  type: {
    type: String,
    enum: ['email', 'phone'],
    required: [true, 'Type is required']
  },
  expiresAt: {
    type: Date,
    required: [true, 'Expiry time is required'],
    index: { expires: 0 }
  },
  verified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for quick lookups and cleanup
otpSchema.index({ value: 1, otp: 1 });
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
  return Math.random().toString().substr(2, 6);
};

otpSchema.statics.createOTP = async function(
  value: string,
  type: 'email' | 'phone'
): Promise<IOTP> {
  const otp = this.generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  return this.create({
    value,
    otp,
    type,
    expiresAt
  });
};

export const OTP = mongoose.model<IOTP>('OTP', otpSchema); 