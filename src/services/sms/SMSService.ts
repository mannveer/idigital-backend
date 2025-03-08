export class SMSService {
  async sendOTP(phoneNumber: string, otp: string): Promise<void> {
    // For now, just log the OTP
    console.log(`Sending OTP ${otp} to ${phoneNumber}`);
    // TODO: Implement actual SMS sending logic
  }
} 