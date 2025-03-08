import nodemailer from 'nodemailer';
import { IProduct } from '../../models/Product';
import { IPurchase } from '../../models/Purchase';
import config from '../../config';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport(config.email.smtp);
  }

  private async sendEmail(options: EmailOptions): Promise<void> {
    await this.transporter.sendMail({
      from: config.email.from,
      ...options
    });
  }

  async sendOTP(email: string, otp: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Your OTP Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Your OTP Code</h1>
          <p>Your verification code is:</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 24px; letter-spacing: 5px; margin: 20px 0;">
            <strong>${otp}</strong>
          </div>
          <p>This code will expire in 5 minutes.</p>
          <p style="color: #666; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
        </div>
      `
    });
  }

  async sendPurchaseConfirmation(
    email: string,
    purchase: IPurchase & { product: IProduct }
  ): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Purchase Confirmation',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Thank you for your purchase!</h1>
          <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
            <h2 style="margin-top: 0;">${purchase.product.name}</h2>
            <p><strong>Amount paid:</strong> $${purchase.amount.toFixed(2)}</p>
            <p><strong>Order ID:</strong> ${purchase._id}</p>
            <p><strong>Purchase Date:</strong> ${new Date(purchase.createdAt).toLocaleDateString()}</p>
          </div>
          <div style="margin: 20px 0;">
            <p>You can download your purchase from your account dashboard or by clicking the button below:</p>
            <a href="/dashboard/purchases/${purchase._id}" style="display: inline-block; background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
              View Purchase
            </a>
          </div>
          <div style="color: #666; font-size: 12px; margin-top: 20px;">
            <p>Download link expires on: ${new Date(purchase.expiresAt).toLocaleDateString()}</p>
            <p>Maximum downloads allowed: ${purchase.maxDownloads}</p>
          </div>
        </div>
      `
    });
  }

  async sendDownloadLink(
    email: string,
    downloadUrl: string,
    expiresIn: number
  ): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Your Download Link',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Your Download is Ready</h1>
          <p>Click the button below to download your purchase:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${downloadUrl}" style="display: inline-block; background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
              Download Now
            </a>
          </div>
          <p style="color: #666;">This link will expire in ${Math.floor(expiresIn / 3600)} hours.</p>
          <p style="color: #666; font-size: 12px;">For security reasons, please do not share this link with others.</p>
        </div>
      `
    });
  }
}

export const emailService = new EmailService(); 