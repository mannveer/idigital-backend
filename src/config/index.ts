import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

const config = {
  server: {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
  },

  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/digital-marketplace',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },

  storage: {
    provider: process.env.STORAGE_PROVIDER || 'local',
    aws: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
      bucketName: process.env.AWS_BUCKET_NAME,
    },
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET,
    },
    local: {
      uploadDir: path.join(__dirname, '../../uploads'),
      tempDir: path.join(__dirname, '../../temp'),
    },
  },

  email: {
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    },
    from: process.env.SMTP_FROM,
  },

  upload: {
    maxSize: parseInt(process.env.MAX_FILE_SIZE || '100000000', 10),
    allowedTypes: (process.env.ALLOWED_FILE_TYPES || '')
      .split(',')
      .map(type => type.trim()),
  },
};

export default config; 