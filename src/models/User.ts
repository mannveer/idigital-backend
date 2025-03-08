import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email?: string;
  phone?: string;
  purchases: mongoose.Types.ObjectId[];
  createdAt: Date;
  lastLogin: Date;
}

const userSchema = new Schema({
  email: { 
    type: String, 
    unique: true, 
    sparse: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v: string) {
        return v === undefined || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Invalid email format'
    }
  },
  phone: { 
    type: String, 
    unique: true, 
    sparse: true,
    trim: true,
    validate: {
      validator: function(v: string) {
        return v === undefined || /^\+[1-9]\d{1,14}$/.test(v);
      },
      message: 'Invalid phone number format'
    }
  },
  purchases: [{ 
    type: Schema.Types.ObjectId, 
    ref: 'Purchase' 
  }],
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  lastLogin: Date
}, {
  timestamps: true
});

// Ensure either email or phone is provided
userSchema.pre('save', function(next) {
  if (!this.email && !this.phone) {
    next(new Error('Either email or phone is required'));
  }
  next();
});

export const User = mongoose.model<IUser>('User', userSchema); 