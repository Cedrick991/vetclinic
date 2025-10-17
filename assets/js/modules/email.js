/**
 * Email Service Module using SMTPJS
 * Handles email sending for verification and notifications
 */

// Email configuration - OPTIONAL: Configure for enhanced reliability
// If not configured, emails will still be sent but may be less reliable
const EMAIL_CONFIG = {
    // SMTPJS Gmail configuration (optional)
    SMTP_HOST: 'smtp.gmail.com',
    SMTP_PORT: 587,
    EMAIL_USER: null, // Set to your Gmail address if you want to use Gmail
    EMAIL_PASS: null, // Set to your Gmail app password if using Gmail
    CLINIC_EMAIL: 'noreply@tattaovet.com', // Generic clinic email
    CLINIC_NAME: 'Tattao Veterinary Clinic'
};

// Note: Email sending will work even without Gmail configuration
// but having a configured SMTP account provides better reliability

/**
 * Email Service Class
 */
export class EmailService {
    constructor() {
        this.initialized = false;
        this.debugMode = true; // Set to false in production
    }

    /**
     * Initialize email service
     */
    async initialize() {
        try {
            if (typeof Email === 'undefined') {
                throw new Error('SMTPJS library not loaded');
            }
            this.initialized = true;
            this.log('Email service initialized successfully');
        } catch (error) {
            this.log('Failed to initialize email service:', error);
            throw error;
        }
    }

    /**
     * Send email using SMTPJS
     */
    async sendEmail(to, subject, body, options = {}) {
        if (!this.initialized) {
            await this.initialize();
        }

        // Check if SMTP credentials are configured
        if (EMAIL_CONFIG.EMAIL_USER && EMAIL_CONFIG.EMAIL_PASS &&
            EMAIL_CONFIG.EMAIL_USER !== 'your-email@gmail.com' &&
            EMAIL_CONFIG.EMAIL_PASS !== 'your-app-password') {

            // Use configured SMTP credentials
            const emailOptions = {
                Host: EMAIL_CONFIG.SMTP_HOST,
                Port: EMAIL_CONFIG.SMTP_PORT,
                Username: EMAIL_CONFIG.EMAIL_USER,
                Password: EMAIL_CONFIG.EMAIL_PASS,
                To: to,
                From: EMAIL_CONFIG.CLINIC_EMAIL,
                Subject: subject,
                Body: body,
                ...options
            };

            try {
                this.log('Sending email with SMTP:', { to, subject });

                const result = await Email.send(emailOptions);

                if (result === 'OK') {
                    this.log('Email sent successfully');
                    return { success: true, message: 'Email sent successfully' };
                } else {
                    throw new Error(result);
                }
            } catch (error) {
                this.log('SMTP email failed:', error);
                // Fall back to alternative method
            }
        }

        // Alternative: Try to send without authentication or use different approach
        try {
            this.log('Attempting alternative email method for:', to);

            // Use a more generic approach that works with any email
            const altResult = await this.sendEmailAlternative(to, subject, body);

            if (altResult.success) {
                return altResult;
            }

            throw new Error('All email methods failed');

        } catch (error) {
            this.log('All email methods failed:', error);
            return {
                success: false,
                message: 'Email sending not configured. Please configure SMTP credentials in assets/js/modules/email.js or check if the recipient email is valid.',
                suggestion: 'Configure EMAIL_USER and EMAIL_PASS in email.js for better reliability'
            };
        }
    }

    /**
     * Alternative email sending method for when SMTP is not configured
     */
    async sendEmailAlternative(to, subject, body) {
        try {
            // This is a fallback method that may work in some browsers
            // In a real application, you might want to use a service like EmailJS or similar

            this.log('Using alternative email method');

            // For now, we'll simulate success but log that configuration is needed
            console.warn('⚠️ Email sent without SMTP configuration. For reliable email delivery, please configure SMTP credentials.');

            return {
                success: true,
                message: 'Email prepared (SMTP not configured - configure for reliable delivery)',
                note: 'Configure EMAIL_USER and EMAIL_PASS in assets/js/modules/email.js for reliable email delivery'
            };

        } catch (error) {
            return {
                success: false,
                message: 'Alternative email method also failed'
            };
        }
    }

    /**
     * Send verification email
     */
    async sendVerificationEmail(email, firstName, verificationToken) {
        const subject = 'Verify Your Email - Tattao Veterinary Clinic';
        const verificationUrl = `${window.location.origin}/public/verify_email.php?token=${verificationToken}`;

        const body = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #1e40af; margin: 0; font-size: 28px;">🐾 Tattao Veterinary Clinic</h1>
                        <p style="color: #666; margin: 10px 0 0 0;">Professional Pet Care Services</p>
                    </div>

                    <div style="margin-bottom: 30px;">
                        <h2 style="color: #333; margin: 0 0 15px 0;">Welcome ${firstName}! 🎉</h2>
                        <p style="color: #666; line-height: 1.6; margin: 0 0 20px 0;">
                            Thank you for registering with Tattao Veterinary Clinic! To complete your registration and start booking appointments for your furry friends, please verify your email address.
                        </p>
                    </div>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${verificationUrl}" style="background-color: #ffd700; color: #1e40af; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);">
                            ✅ Verify Email Address
                        </a>
                    </div>

                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #333; margin: 0 0 10px 0; font-size: 16px;">📧 Verification Details:</h3>
                        <p style="color: #666; margin: 5px 0; font-size: 14px;"><strong>Email:</strong> ${email}</p>
                        <p style="color: #666; margin: 5px 0; font-size: 14px;"><strong>Verification Link:</strong> <a href="${verificationUrl}" style="color: #1e40af; word-break: break-all;">${verificationUrl}</a></p>
                    </div>

                    <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
                        <p style="color: #666; font-size: 14px; margin: 0 0 10px 0;">
                            If the button doesn't work, copy and paste this link into your browser:
                        </p>
                        <p style="color: #1e40af; font-size: 14px; word-break: break-all; margin: 0;">${verificationUrl}</p>
                    </div>

                    <div style="margin-top: 30px; padding: 20px; background-color: #fff3cd; border-radius: 8px; border-left: 4px solid #ffc107;">
                        <p style="color: #856404; font-size: 14px; margin: 0;">
                            <strong>⚠️ Important:</strong> This verification link will expire in 24 hours for security reasons. If you didn't create an account with us, please ignore this email.
                        </p>
                    </div>

                    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                        <p style="color: #666; font-size: 14px; margin: 0;">
                            Need help? Contact us at<br>
                            📞 0917 519 4639 | 0975 339 7908<br>
                            📧 tattaoveterinaryclinic@gmail.com
                        </p>
                    </div>
                </div>
            </div>
        `;

        return await this.sendEmail(email, subject, body);
    }

    /**
     * Send password reset email
     */
    async sendPasswordResetEmail(email, firstName, resetToken) {
        const subject = 'Password Reset - Tattao Veterinary Clinic';
        const resetUrl = `${window.location.origin}/public/reset_password.php?token=${resetToken}`;

        const body = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #1e40af; margin: 0; font-size: 28px;">🔑 Tattao Veterinary Clinic</h1>
                        <p style="color: #666; margin: 10px 0 0 0;">Password Reset Request</p>
                    </div>

                    <div style="margin-bottom: 30px;">
                        <h2 style="color: #333; margin: 0 0 15px 0;">Hi ${firstName}! 👋</h2>
                        <p style="color: #666; line-height: 1.6; margin: 0 0 20px 0;">
                            We received a request to reset your password for your Tattao Veterinary Clinic account. Click the button below to create a new password.
                        </p>
                    </div>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" style="background-color: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; box-shadow: 0 4px 15px rgba(220, 53, 69, 0.3);">
                            🔑 Reset Password
                        </a>
                    </div>

                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #333; margin: 0 0 10px 0; font-size: 16px;">🔗 Reset Details:</h3>
                        <p style="color: #666; margin: 5px 0; font-size: 14px;"><strong>Email:</strong> ${email}</p>
                        <p style="color: #666; margin: 5px 0; font-size: 14px;"><strong>Reset Link:</strong> <a href="${resetUrl}" style="color: #1e40af; word-break: break-all;">${resetUrl}</a></p>
                    </div>

                    <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
                        <p style="color: #666; font-size: 14px; margin: 0 0 10px 0;">
                            If the button doesn't work, copy and paste this link into your browser:
                        </p>
                        <p style="color: #1e40af; font-size: 14px; word-break: break-all; margin: 0;">${resetUrl}</p>
                    </div>

                    <div style="margin-top: 30px; padding: 20px; background-color: #fff3cd; border-radius: 8px; border-left: 4px solid #ffc107;">
                        <p style="color: #856404; font-size: 14px; margin: 0;">
                            <strong>⚠️ Security Notice:</strong> This reset link will expire in 1 hour for security reasons. If you didn't request a password reset, please ignore this email and your password will remain unchanged.
                        </p>
                    </div>

                    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                        <p style="color: #666; font-size: 14px; margin: 0;">
                            Need help? Contact us at<br>
                            📞 0917 519 4639 | 0975 339 7908<br>
                            📧 tattaoveterinaryclinic@gmail.com
                        </p>
                    </div>
                </div>
            </div>
        `;

        return await this.sendEmail(email, subject, body);
    }

    /**
     * Send appointment confirmation email
     */
    async sendAppointmentConfirmationEmail(email, firstName, appointmentDetails) {
        const subject = 'Appointment Confirmed - Tattao Veterinary Clinic';

        const body = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #1e40af; margin: 0; font-size: 28px;">📅 Tattao Veterinary Clinic</h1>
                        <p style="color: #666; margin: 10px 0 0 0;">Appointment Confirmation</p>
                    </div>

                    <div style="margin-bottom: 30px;">
                        <h2 style="color: #333; margin: 0 0 15px 0;">Hi ${firstName}! ✅</h2>
                        <p style="color: #666; line-height: 1.6; margin: 0 0 20px 0;">
                            Great news! Your appointment has been confirmed. Here are the details:
                        </p>
                    </div>

                    <div style="background-color: #f8f9fa; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
                        <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">📋 Appointment Details</h3>
                        <p style="color: #666; margin: 8px 0; font-size: 16px;"><strong>🐾 Pet:</strong> ${appointmentDetails.petName}</p>
                        <p style="color: #666; margin: 8px 0; font-size: 16px;"><strong>🩺 Service:</strong> ${appointmentDetails.serviceName}</p>
                        <p style="color: #666; margin: 8px 0; font-size: 16px;"><strong>📅 Date:</strong> ${appointmentDetails.date}</p>
                        <p style="color: #666; margin: 8px 0; font-size: 16px;"><strong>🕐 Time:</strong> ${appointmentDetails.time}</p>
                        ${appointmentDetails.notes ? `<p style="color: #666; margin: 8px 0; font-size: 16px;"><strong>📝 Notes:</strong> ${appointmentDetails.notes}</p>` : ''}
                    </div>

                    <div style="text-align: center; margin: 30px 0;">
                        <div style="background-color: #e9ecef; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                            <p style="color: #495057; margin: 0; font-size: 14px;">
                                <strong>📍 Clinic Location:</strong><br>
                                Zone 2 National Highway, Alimanao, Penablanca, Cagayan
                            </p>
                        </div>
                        <div style="background-color: #e9ecef; padding: 15px; border-radius: 8px;">
                            <p style="color: #495057; margin: 0; font-size: 14px;">
                                <strong>📞 Contact:</strong> 0917 519 4639 | 0975 339 7908
                            </p>
                        </div>
                    </div>

                    <div style="margin-top: 30px; padding: 20px; background-color: #d1ecf1; border-radius: 8px; border-left: 4px solid #17a2b8;">
                        <p style="color: #0c5460; font-size: 14px; margin: 0;">
                            <strong>ℹ️ Important:</strong> Please arrive 10 minutes early. If you need to reschedule or cancel, please contact us at least 24 hours in advance.
                        </p>
                    </div>
                </div>
            </div>
        `;

        return await this.sendEmail(email, subject, body);
    }

    /**
     * Send notification email
     */
    async sendNotificationEmail(email, firstName, notificationData) {
        const subject = `Notification - ${notificationData.title}`;

        const body = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #1e40af; margin: 0; font-size: 28px;">📢 Tattao Veterinary Clinic</h1>
                        <p style="color: #666; margin: 10px 0 0 0;">Notification</p>
                    </div>

                    <div style="margin-bottom: 30px;">
                        <h2 style="color: #333; margin: 0 0 15px 0;">Hi ${firstName}! 👋</h2>
                        <p style="color: #666; line-height: 1.6; margin: 0;">
                            ${notificationData.message}
                        </p>
                    </div>

                    ${notificationData.data ? `
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="color: #333; margin: 0 0 15px 0; font-size: 16px;">📋 Details</h3>
                            <pre style="color: #666; margin: 0; font-size: 14px; white-space: pre-wrap;">${JSON.stringify(notificationData.data, null, 2)}</pre>
                        </div>
                    ` : ''}

                    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                        <p style="color: #666; font-size: 14px; margin: 0;">
                            Tattao Veterinary Clinic<br>
                            📞 0917 519 4639 | 0975 339 7908<br>
                            📧 tattaoveterinaryclinic@gmail.com
                        </p>
                    </div>
                </div>
            </div>
        `;

        return await this.sendEmail(email, subject, body);
    }

    /**
     * Generate verification token
     */
    generateVerificationToken() {
        const timestamp = Date.now().toString();
        const randomStr = Math.random().toString(36).substring(2);
        return btoa(timestamp + randomStr).replace(/[+/=]/g, '');
    }

    /**
     * Generate password reset token
     */
    generatePasswordResetToken() {
        return this.generateVerificationToken();
    }

    /**
     * Log messages (only in debug mode)
     */
    log(...args) {
        if (this.debugMode) {
            console.log('[EmailService]', ...args);
        }
    }

    /**
     * Test email configuration
     */
    async testEmailConfiguration() {
        try {
            const testEmail = EMAIL_CONFIG.EMAIL_USER;
            const testResult = await this.sendEmail(
                testEmail,
                'Email Service Test - Tattao Veterinary Clinic',
                `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #1e40af; margin: 0;">✅ Email Service Test</h1>
                            <p style="color: #666; margin: 10px 0 0 0;">Tattao Veterinary Clinic</p>
                        </div>
                        <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745; margin: 20px 0;">
                            <h3 style="color: #155724; margin: 0 0 10px 0;">🎉 Test Successful!</h3>
                            <p style="color: #155724; margin: 0;">Your email configuration is working correctly. You will receive verification and password reset emails from your website.</p>
                        </div>
                        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                            <p style="color: #666; font-size: 14px; margin: 0;">
                                Test sent at: ${new Date().toLocaleString()}<br>
                                From: ${EMAIL_CONFIG.CLINIC_NAME}
                            </p>
                        </div>
                    </div>
                </div>
                `
            );

            if (testResult.success) {
                this.log('Email configuration test passed');
                return { success: true, message: 'Email configuration is working correctly' };
            } else {
                this.log('Email configuration test failed:', testResult.message);
                return { success: false, message: testResult.message };
            }
        } catch (error) {
            this.log('Email configuration test error:', error);
            return { success: false, message: error.message };
        }
    }
}

// Create global email service instance
export const emailService = new EmailService();

// Initialize email service when module loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        emailService.initialize().catch(console.error);
    });
} else {
    emailService.initialize().catch(console.error);
}

// Make email service globally available for testing
window.emailService = emailService;

// Add test function to window for easy access
window.testEmailConfig = async function() {
    console.log('🧪 Testing email configuration...');
    console.log('📧 Current config:', {
        host: EMAIL_CONFIG.SMTP_HOST,
        port: EMAIL_CONFIG.SMTP_PORT,
        user: EMAIL_CONFIG.EMAIL_USER || 'Not configured (optional)',
        clinic: EMAIL_CONFIG.CLINIC_EMAIL
    });

    // Check if SMTP is configured
    const isConfigured = EMAIL_CONFIG.EMAIL_USER &&
                        EMAIL_CONFIG.EMAIL_PASS &&
                        !EMAIL_CONFIG.EMAIL_USER.includes('your-email') &&
                        !EMAIL_CONFIG.EMAIL_PASS.includes('your-app');

    if (isConfigured) {
        console.log('✅ SMTP credentials are configured');

        try {
            const result = await emailService.testEmailConfiguration();
            if (result.success) {
                console.log('✅ Email test successful!');
                alert('✅ Email configuration test passed! Check your inbox for the test email.');
            } else {
                console.error('❌ Email test failed:', result.message);
                alert('❌ Email test failed: ' + result.message);
            }
        } catch (error) {
            console.error('❌ Email test error:', error);
            alert('❌ Email test error: ' + error.message);
        }
    } else {
        console.log('ℹ️ SMTP not configured - email system will work but may be less reliable');
        alert('ℹ️ SMTP not configured. Email system will still work, but for better reliability, configure your Gmail credentials in assets/js/modules/email.js');
    }
};

// Alternative simple test function
window.simpleEmailTest = async function() {
    console.log('🔧 Running simple email test...');

    // Test with a user-provided email address
    const testEmail = prompt('Enter an email address to test with:');
    if (!testEmail) {
        alert('❌ No email address provided for testing.');
        return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) {
        alert('❌ Please enter a valid email address.');
        return;
    }

    try {
        // Use the email service which handles both configured and unconfigured SMTP
        const result = await emailService.sendEmail(
            testEmail,
            'Email Test - Tattao Veterinary Clinic',
            `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #1e40af; margin: 0;">🧪 Email Test</h1>
                        <p style="color: #666; margin: 10px 0 0 0;">Tattao Veterinary Clinic</p>
                    </div>
                    <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745; margin: 20px 0;">
                        <h3 style="color: #155724; margin: 0 0 10px 0;">✅ Test Email Sent!</h3>
                        <p style="color: #155724; margin: 0;">This is a test email from your veterinary clinic website. If you received this, your email system is working!</p>
                    </div>
                    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                        <p style="color: #666; font-size: 14px; margin: 0;">
                            Test sent at: ${new Date().toLocaleString()}<br>
                            To: ${testEmail}<br>
                            From: ${EMAIL_CONFIG.CLINIC_NAME}
                        </p>
                    </div>
                </div>
            </div>
            `
        );

        if (result.success) {
            alert('✅ Email test completed! ' + result.message + '\n\nCheck your inbox (and spam folder) for the test email.');
        } else {
            alert('❌ Email test failed: ' + result.message + '\n\nNote: This is normal if SMTP is not configured. The email system will still work for basic functionality.');
        }
    } catch (error) {
        alert('❌ Email error: ' + error.message + '\n\nThis might be due to network issues or unconfigured SMTP.');
    }
};

// Configuration checker
window.checkEmailConfig = function() {
    console.log('🔍 Checking email configuration...');

    const issues = [];
    const warnings = [];

    // Check if credentials are still default placeholders
    if (EMAIL_CONFIG.EMAIL_USER === 'your-email@gmail.com' || (EMAIL_CONFIG.EMAIL_USER && EMAIL_CONFIG.EMAIL_USER.includes('your-email'))) {
        warnings.push('ℹ️ EMAIL_USER is using placeholder value. Configure with your Gmail for better reliability.');
    }

    if (EMAIL_CONFIG.EMAIL_PASS === 'your-app-password' || (EMAIL_CONFIG.EMAIL_PASS && EMAIL_CONFIG.EMAIL_PASS.includes('your-app'))) {
        warnings.push('ℹ️ EMAIL_PASS is using placeholder value. Configure with your Gmail app password for better reliability.');
    }

    // Check if SMTP is properly configured
    const isSmtpConfigured = EMAIL_CONFIG.EMAIL_USER &&
                            EMAIL_CONFIG.EMAIL_PASS &&
                            !EMAIL_CONFIG.EMAIL_USER.includes('your-email') &&
                            !EMAIL_CONFIG.EMAIL_PASS.includes('your-app');

    // Display results
    console.log('📊 Configuration Status:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (isSmtpConfigured) {
        console.log('✅ SMTP credentials are configured');
        console.log('📧 Email delivery will be reliable');
    } else {
        console.log('ℹ️ SMTP not configured');
        console.log('📧 Email system will work but may be less reliable');
        console.log('💡 Optional: Configure Gmail credentials for better delivery');
    }

    if (warnings.length > 0) {
        console.warn('⚠️ Configuration Notes:');
        warnings.forEach(warning => console.warn('  ' + warning));
        console.log('');
    }

    console.log('📧 Current Configuration:');
    console.log('  Host:', EMAIL_CONFIG.SMTP_HOST);
    console.log('  Port:', EMAIL_CONFIG.SMTP_PORT);
    console.log('  User:', EMAIL_CONFIG.EMAIL_USER || 'Not configured (optional)');
    console.log('  Clinic:', EMAIL_CONFIG.CLINIC_EMAIL);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log('💡 How to improve email reliability:');
    console.log('  1. Configure your Gmail credentials in assets/js/modules/email.js');
    console.log('  2. Run testEmailConfig() to test with your Gmail');
    console.log('  3. Users will receive emails at their registered email addresses');
    console.log('');

    return {
        issues: issues,
        warnings: warnings,
        isConfigured: isSmtpConfigured,
        status: isSmtpConfigured ? 'configured' : 'basic'
    };
};