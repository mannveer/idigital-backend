import { Schema, model, Document } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  description: string;
  price: number;
  fileType: string;
  fileSize: string;
  author: string;
  thumbnailUrl: string;
  sampleImages: string[];
  fileUrl: string;
  featured: boolean;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  fileType: { type: String, required: true },
  fileSize: { type: String, required: true },
  author: { type: String, required: true },
  thumbnailUrl: { type: String, required: true },
  sampleImages: [{ type: String }],
  fileUrl: { type: String, required: true },
  featured: { type: Boolean, default: false },
  category: { type: String, required: true },
}, {
  timestamps: true
});

export const Product = model<IProduct>('Product', productSchema); 