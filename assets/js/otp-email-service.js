/**
 * OTP Email Service using SMTP.js
 * Handles sending OTP codes via email for 2FA and password reset
 *
 * SETUP INSTRUCTIONS:
 * ===================
 * Choose one of these options to enable email functionality:
 *
 * OPTION 1: Development Mode (Recommended for testing)
 *    - The service works automatically with mock emails
 *    - No configuration needed
 *    - Check browser console for "sent" emails
 *    - Set developmentMode = false to disable
 *
 * OPTION 2: Gmail Setup (For production):
 *    1. Go to https://smtpjs.com/ and create an account
 *    2. Get your SecureToken from the dashboard
 *    3. Enable 2FA on your Gmail account
 *    4. Generate an App Password: https://support.google.com/accounts/answer/185833
 *
 * OPTION 3: Update Configuration:
 *    - Replace "your-email@gmail.com" with your Gmail address
 *    - Replace "your-app-password" with your Gmail App Password
 *    - Replace "your-smtpjs-token" with your SMTP.js SecureToken
 *    - Set developmentMode = false
 *
 * OPTION 4: Runtime Configuration:
 *    window.configureEmailService({
 *      Username: 'your-email@gmail.com',
 *      Password: 'your-app-password',
 *      SecureToken: 'your-smtpjs-token'
 *    });
 *
 * The service works in development mode by default with no setup required!
 */

class OTPEmailService {
  constructor() {
    // Development mode: Use mock email service for testing
    this.developmentMode = true;

    // SMTP.js configuration - UPDATE THESE WITH YOUR EMAIL SETTINGS
    this.smtpConfig = {
      Host: "smtp.gmail.com",
      Username: "your-email@gmail.com", // Replace with your email
      Password: "your-app-password", // Replace with your app password
      Port: 587,
      SecureToken: "your-smtpjs-token" // Get from https://smtpjs.com/
    };

    this.initialized = false;
    this.emailConfigured = false;
    this.init();
  }

  init() {
    // Check if SMTP.js is loaded
    if (typeof Email !== 'undefined') {
      this.initialized = true;
      console.log('✅ SMTP.js loaded successfully');
    } else {
      console.warn('⚠️ SMTP.js not loaded. Email functionality will not work.');
    }

    // Check if email configuration is properly set up
    if (this.smtpConfig.Username === 'your-email@gmail.com' ||
        this.smtpConfig.Password === 'your-app-password' ||
        this.smtpConfig.SecureToken === 'your-smtpjs-token') {

      if (this.developmentMode) {
        this.emailConfigured = true;
        console.log('🚀 Development Mode: Using mock email service');
        console.log('📧 Real emails will be simulated in console logs');
        console.log('🔧 To enable real emails, configure smtpConfig in otp-email-service.js');
      } else {
        this.emailConfigured = false;
        console.warn('⚠️ Email service not configured. Please update the SMTP configuration in otp-email-service.js');
        console.warn('📧 To configure email:');
        console.warn('   1. Go to https://smtpjs.com/ and get your SecureToken');
        console.warn('   2. Update the smtpConfig in otp-email-service.js with your email credentials');
        console.warn('   3. Use Gmail with App Password for best compatibility');
        console.warn('🚀 Or enable developmentMode for testing without email setup');
      }
    } else {
      this.emailConfigured = true;
      console.log('✅ OTP Email Service configured and ready');
    }
  }

  /**
   * Send OTP for 2FA login
   */
  async send2FAOTP(email, userName, otpCode) {
    if (!this.initialized && !this.developmentMode) {
      return {
        success: false,
        message: 'Email service not available. Please contact support for assistance.',
        error: 'SMTP_NOT_LOADED'
      };
    }

    if (!this.emailConfigured && !this.developmentMode) {
      return {
        success: false,
        message: 'Email service not configured. Please contact support for assistance.',
        error: 'EMAIL_NOT_CONFIGURED'
      };
    }

    const subject = '🔐 Your 2FA Verification Code - Tattao Veterinary Clinic';
    const htmlBody = this.create2FAEmailTemplate(userName, otpCode);

    return await this.sendEmail(email, subject, htmlBody, 'Two-Factor Authentication');
  }

  /**
   * Send OTP for forgot password
   */
  async sendPasswordResetOTP(email, userName, otpCode) {
    if (!this.initialized && !this.developmentMode) {
      return {
        success: false,
        message: 'Email service not available. Please contact support for assistance.',
        error: 'SMTP_NOT_LOADED'
      };
    }

    if (!this.emailConfigured && !this.developmentMode) {
      return {
        success: false,
        message: 'Email service not configured. Please contact support for assistance.',
        error: 'EMAIL_NOT_CONFIGURED'
      };
    }

    const subject = '🔑 Password Reset Code - Tattao Veterinary Clinic';
    const htmlBody = this.createPasswordResetEmailTemplate(userName, otpCode);

    return await this.sendEmail(email, subject, htmlBody, 'Password Reset');
  }

  /**
   * Send email using SMTP.js or mock service for development
   */
  async sendEmail(to, subject, htmlBody, type) {
    try {
      // Use mock service in development mode or when email not configured
      if (this.developmentMode || !this.emailConfigured) {
        return await this.sendMockEmail(to, subject, htmlBody, type);
      }

      console.log(`📧 Sending ${type} email to:`, to);

      const result = await Email.send({
        ...this.smtpConfig,
        To: to,
        From: this.smtpConfig.Username,
        Subject: subject,
        Body: htmlBody
      });

      console.log('📧 SMTP.js result:', result);

      if (result === 'OK') {
        console.log(`✅ ${type} email sent successfully to:`, to);
        return {
          success: true,
          message: `${type} email sent successfully`,
          recipient: to
        };
      } else {
        console.error(`❌ Failed to send ${type} email:`, result);
        return {
          success: false,
          message: `Failed to send ${type} email: ${result}`,
          error: result
        };
      }

    } catch (error) {
      console.error(`❌ Error sending ${type} email:`, error);
      return {
        success: false,
        message: `Error sending ${type} email: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Mock email service for development and testing
   */
  async sendMockEmail(to, subject, htmlBody, type) {
    console.log(`🚀 [MOCK EMAIL] ${type} email would be sent to:`, to);
    console.log(`🚀 [MOCK EMAIL] Subject:`, subject);

    // Extract OTP code from email body for logging
    const otpMatch = htmlBody.match(/(\d{6})/);
    if (otpMatch) {
      console.log(`🚀 [MOCK EMAIL] OTP Code: ${otpMatch[1]}`);
    }

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log(`✅ [MOCK EMAIL] ${type} email "sent" successfully to:`, to);

    return {
      success: true,
      message: `${type} email sent successfully (Development Mode)`,
      recipient: to,
      mock: true
    };
  }

  /**
   * Create HTML template for 2FA OTP email
   */
  create2FAEmailTemplate(userName, otpCode) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>2FA Verification Code</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f7fa; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 30px; text-align: center; }
          .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
          .content { padding: 40px; }
          .otp-container { background: #f8fafc; border: 2px dashed #3b82f6; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0; }
          .otp-code { font-size: 32px; font-weight: bold; color: #1e40af; letter-spacing: 8px; margin: 10px 0; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
          .btn { display: inline-block; background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🐾 Tattao Veterinary Clinic</div>
            <p>Two-Factor Authentication</p>
          </div>
          <div class="content">
            <h2>Hello ${userName}! 👋</h2>
            <p>You're trying to sign in to your account. Please use the verification code below:</p>
            
            <div class="otp-container">
              <p style="margin: 0; font-size: 14px; color: #64748b;">Your 6-digit verification code is:</p>
              <div class="otp-code">${otpCode}</div>
              <p style="margin: 0; font-size: 12px; color: #64748b;">This code expires in 5 minutes</p>
            </div>
            
            <div class="warning">
              <strong>🔐 Security Notice:</strong><br>
              • This code is valid for 5 minutes only<br>
              • Never share this code with anyone<br>
              • If you didn't request this, please secure your account immediately
            </div>
            
            <p>If you're having trouble, contact our support team or use one of your backup codes.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Tattao Veterinary Clinic. All rights reserved.</p>
            <p>Zone 2 National Highway, Alimanao, Penablanca, Cagayan</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Create HTML template for password reset OTP email
   */
  createPasswordResetEmailTemplate(userName, otpCode) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Code</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f7fa; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #dc2626, #ef4444); color: white; padding: 30px; text-align: center; }
          .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
          .content { padding: 40px; }
          .otp-container { background: #fef2f2; border: 2px dashed #dc2626; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0; }
          .otp-code { font-size: 32px; font-weight: bold; color: #dc2626; letter-spacing: 8px; margin: 10px 0; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
          .btn { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🐾 Tattao Veterinary Clinic</div>
            <p>Password Reset Request</p>
          </div>
          <div class="content">
            <h2>Hello ${userName}! 👋</h2>
            <p>You requested to reset your password. Please use the verification code below to proceed:</p>
            
            <div class="otp-container">
              <p style="margin: 0; font-size: 14px; color: #64748b;">Your password reset code is:</p>
              <div class="otp-code">${otpCode}</div>
              <p style="margin: 0; font-size: 12px; color: #64748b;">This code expires in 5 minutes</p>
            </div>
            
            <div class="warning">
              <strong>🔐 Security Notice:</strong><br>
              • This code is valid for 5 minutes only<br>
              • Use this code only on the official Tattao Vet Clinic website<br>
              • If you didn't request this reset, please ignore this email and secure your account
            </div>
            
            <p>After entering this code, you'll be able to create a new password for your account.</p>
            
            <p>If you're having trouble, please contact our support team at <strong>0917-519-4639</strong>.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Tattao Veterinary Clinic. All rights reserved.</p>
            <p>Zone 2 National Highway, Alimanao, Penablanca, Cagayan</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Update SMTP configuration
   */
  updateConfig(newConfig) {
    this.smtpConfig = { ...this.smtpConfig, ...newConfig };
    console.log('📧 SMTP configuration updated');
  }

  /**
   * Test email configuration
   */
  async testEmailConfig(testEmail) {
    const testOTP = '123456';
    const result = await this.send2FAOTP(testEmail, 'Test User', testOTP);
    return result;
  }

  /**
   * Check if email service is ready to use
   */
  isReady() {
    return this.initialized && this.emailConfigured;
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      configured: this.emailConfigured,
      ready: this.isReady(),
      smtpjsLoaded: typeof Email !== 'undefined'
    };
  }

  /**
   * Configure email service with proper credentials
   */
  configureEmail(config) {
    const required = ['Username', 'Password', 'SecureToken'];
    const missing = required.filter(field => !config[field]);

    if (missing.length > 0) {
      console.error('❌ Missing required email configuration:', missing);
      return false;
    }

    this.smtpConfig = { ...this.smtpConfig, ...config };
    this.emailConfigured = true;
    this.developmentMode = false; // Disable development mode when real config is provided

    console.log('✅ Email service configured successfully');
    return true;
  }

  /**
   * Enable or disable development mode
   */
  setDevelopmentMode(enabled) {
    this.developmentMode = enabled;
    if (enabled) {
      this.emailConfigured = true;
      console.log('🚀 Development mode enabled - using mock email service');
    } else {
      console.log('📧 Development mode disabled - real email service will be used');
      // Re-check if we have real configuration
      this.init();
    }
  }
}

// Create global instance
window.otpEmailService = new OTPEmailService();

// Add configuration helpers to global scope
window.configureEmailService = function(config) {
  return window.otpEmailService.configureEmail(config);
};

window.setEmailDevelopmentMode = function(enabled) {
  return window.otpEmailService.setDevelopmentMode(enabled);
};

window.getEmailServiceStatus = function() {
  return window.otpEmailService.getStatus();
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OTPEmailService;
}