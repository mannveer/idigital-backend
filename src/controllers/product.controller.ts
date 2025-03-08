import { Request, Response } from 'express';
import { Product } from '../models/Product';
import { storage } from '../services/storage';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/AppError';

export class ProductController {
  async getProducts(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const category = req.query.category as string;

    const query: any = {};

    if (search) {
      query.$text = { $search: search };
    }

    if (category) {
      query.category = category;
    }

    const [products, total] = await Promise.all([
      Product.find(query)
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Product.countDocuments(query)
    ]);

    res.status(200).json({
      products,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  }

  async getProduct(req: Request, res: Response) {
    const product = await Product.findById(req.params.id);

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    res.status(200).json(product);
  }

  async createProduct(req: Request, res: Response) {
    if (!req.file) {
      throw new AppError('Product file is required', 400);
    }

    const {
      name,
      description,
      price,
      author,
      sampleImages = []
    } = req.body;

    // Upload main file
    const fileResult = await storage.uploadFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    // Create product
    const product = await Product.create({
      name,
      description,
      price: parseFloat(price),
      fileType: req.file.mimetype,
      fileSize: `${(req.file.size / 1024 / 1024).toFixed(2)} MB`,
      author,
      thumbnailUrl: sampleImages[0] || '',
      sampleImages,
      fileUrl: fileResult.url
    });

    res.status(201).json(product);
  }

  async updateProduct(req: Request, res: Response) {
    const updates = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    // If new file is uploaded
    if (req.file) {
      // Upload new file
      const fileResult = await storage.uploadFile(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );

      // Delete old file
      await storage.deleteFile(product.fileUrl);

      // Update file related fields
      updates.fileUrl = fileResult.url;
      updates.fileType = req.file.mimetype;
      updates.fileSize = `${(req.file.size / 1024 / 1024).toFixed(2)} MB`;
    }

    // Update product
    Object.assign(product, updates);
    await product.save();

    res.status(200).json(product);
  }

  async deleteProduct(req: Request, res: Response) {
    const product = await Product.findById(req.params.id);

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    // Delete file from storage
    await storage.deleteFile(product.fileUrl);

    // Delete product
    await product.deleteOne();

    res.status(200).json({ message: 'Product deleted successfully' });
  }

  async uploadSampleImages(req: Request, res: Response) {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      throw new AppError('Sample images are required', 400);
    }

    const uploadPromises = (req.files as Express.Multer.File[]).map(file =>
      storage.uploadFile(file.buffer, file.originalname, file.mimetype)
    );

    const results = await Promise.all(uploadPromises);
    const urls = results.map(result => result.url);

    res.status(200).json({ urls });
  }
} 