import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';
import { IProduct } from './Product';

export interface IPurchase extends Document {
  user: IUser['_id'];
  product: IProduct['_id'];
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  paymentId?: string;
  downloadCount: number;
  maxDownloads: number;
  expiresAt: Date;
  createdAt: Date;
}

const purchaseSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required']
  },
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product reference is required']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  paymentId: {
    type: String,
    sparse: true
  },
  downloadCount: {
    type: Number,
    default: 0,
    min: 0
  },
  maxDownloads: {
    type: Number,
    default: 3,
    min: 1
  },
  expiresAt: {
    type: Date,
    required: [true, 'Expiry date is required']
  }
}, {
  timestamps: true
});

// Index for quick lookups
purchaseSchema.index({ user: 1, product: 1 });
purchaseSchema.index({ paymentId: 1 }, { sparse: true });

// Methods
purchaseSchema.methods.canDownload = function(): boolean {
  return (
    this.status === 'completed' &&
    this.downloadCount < this.maxDownloads &&
    new Date() < this.expiresAt
  );
};

purchaseSchema.methods.incrementDownloadCount = async function(): Promise<void> {
  this.downloadCount += 1;
  await this.save();
};

// Virtuals
purchaseSchema.virtual('isExpired').get(function(): boolean {
  return new Date() > this.expiresAt;
});

purchaseSchema.virtual('remainingDownloads').get(function(): number {
  return Math.max(0, this.maxDownloads - this.downloadCount);
});

export const Purchase = mongoose.model<IPurchase>('Purchase', purchaseSchema); 