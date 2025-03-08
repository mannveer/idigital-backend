import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import { config } from 'dotenv';
import cors from 'cors';
import { ProductController } from './controllers/product.controller';
import { auth, handleUploadError } from './middleware';
import { storage } from './services/storage';
import { StorageService } from './services/storage/StorageService';
import { LocalStorageService } from './services/storage/LocalStorageService';

// Load environment variables
config();

// Create Express app
const app = express();

// Configure CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:4200', 'http://127.0.0.1:4200'],
  credentials: true
}));

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '100000000', 10) // Default 100MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || '')
      .split(',')
      .map(type => type.trim());

    if (allowedTypes.length === 0 || allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/temp', express.static(path.join(__dirname, '../temp')));

// Initialize controllers
const productController = new ProductController();

// Product routes
app.get('/api/products', productController.getProducts.bind(productController));
app.get('/api/products/:id', productController.getProduct.bind(productController));
app.post(
  '/api/products',
  auth,
  upload.single('file'),
  handleUploadError,
  productController.createProduct.bind(productController)
);
app.put(
  '/api/products/:id',
  auth,
  upload.single('file'),
  handleUploadError,
  productController.updateProduct.bind(productController)
);
app.delete(
  '/api/products/:id',
  auth,
  productController.deleteProduct.bind(productController)
);
app.post(
  '/api/products/sample-images',
  auth,
  upload.array('images', 5),
  handleUploadError,
  productController.uploadSampleImages.bind(productController)
);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(err.statusCode || 500).json({
    status: err.status || 'error',
    message: err.message || 'Internal server error'
  });
});

// Schedule cleanup of temporary files for local storage
if ('cleanupTempFiles' in storage) {
  setInterval(() => {
    storage.cleanupTempFiles().catch(console.error);
  }, 3600000); // Run every hour
}

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/digital-marketplace')
  .then(() => {
    console.log('Connected to MongoDB');
    
    // Start server
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }); 