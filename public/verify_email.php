<?php
/**
 * Email Verification Page
 * Handles email verification for new user accounts
 */

require_once '../src/config.php';
require_once '../src/auth/auth.php';

$auth = new Auth();
$message = '';
$messageType = 'info';

if (isset($_GET['token'])) {
    $token = trim($_GET['token']);

    if (empty($token)) {
        $message = 'Invalid verification token.';
        $messageType = 'error';
    } else {
        $result = $auth->verifyEmail($token);

        if ($result['success']) {
            $message = $result['message'];
            $messageType = 'success';
        } else {
            $message = $result['message'];
            $messageType = 'error';
        }
    }
} else {
    $message = 'No verification token provided.';
    $messageType = 'error';
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verification - Tattoo Veterinary Clinic</title>
    <link rel="stylesheet" href="../assets/css/style.min.css">
    <style>
        .verification-container {
            max-width: 600px;
            margin: 100px auto;
            padding: 40px;
            background: white;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            text-align: center;
        }

        .verification-icon {
            font-size: 4em;
            margin-bottom: 20px;
        }

        .success { color: #27ae60; }
        .error { color: #e74c3c; }
        .info { color: #3498db; }

        .verification-message {
            font-size: 1.2em;
            margin-bottom: 30px;
            line-height: 1.6;
        }

        .verification-actions {
            margin-top: 30px;
        }

        .btn {
            display: inline-block;
            padding: 12px 30px;
            background: linear-gradient(135deg, #ffd700, #ff9900);
            color: #001f54;
            text-decoration: none;
            border-radius: 25px;
            font-weight: bold;
            margin: 0 10px;
            transition: all 0.3s ease;
            border: none;
            cursor: pointer;
            font-size: 14px;
        }

        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(255,215,0,0.4);
        }

        .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }

        .btn-secondary {
            background: #3498db;
            color: white;
        }

        .btn-secondary:hover {
            background: #2980b9;
        }

        .verification-info {
            background: rgba(255, 215, 0, 0.1);
            border: 1px solid rgba(255, 215, 0, 0.3);
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
            text-align: left;
        }

        .verification-info h3 {
            color: #ffd700;
            margin: 0 0 10px 0;
            font-size: 16px;
        }

        .verification-info p {
            color: rgba(255, 255, 255, 0.9);
            margin: 5px 0;
            font-size: 14px;
            line-height: 1.5;
        }

        .loading-spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: #ffd700;
            animation: spin 1s ease-in-out infinite;
            margin-right: 8px;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="verification-container">
        <div class="verification-icon <?php echo $messageType; ?>">
            <?php
            switch ($messageType) {
                case 'success':
                    echo '✅';
                    break;
                case 'error':
                    echo '❌';
                    break;
                default:
                    echo 'ℹ️';
                    break;
            }
            ?>
        </div>

        <h1>Email Verification</h1>

        <div class="verification-message <?php echo $messageType; ?>">
            <?php echo htmlspecialchars($message); ?>
        </div>

        <?php if ($messageType === 'error' && isset($_GET['token'])): ?>
            <div class="verification-info">
                <h3>🔍 Need Help?</h3>
                <p><strong>Didn't receive the email?</strong> Check your spam/junk folder.</p>
                <p><strong>Email not found?</strong> Make sure you entered the correct email during registration.</p>
                <p><strong>Link expired?</strong> The verification link expires after 24 hours for security.</p>
                <p><strong>Still having trouble?</strong> Contact our support team for assistance.</p>
            </div>
        <?php endif; ?>

        <?php if ($messageType === 'success'): ?>
            <div class="verification-info">
                <h3>🎉 Welcome to Tattao Veterinary Clinic!</h3>
                <p>Your email has been successfully verified. You now have full access to:</p>
                <p>• Book and manage appointments online</p>
                <p>• Access your pet's medical records</p>
                <p>• Receive appointment reminders</p>
                <p>• Order pet supplies and medications</p>
            </div>
        <?php endif; ?>

        <div class="verification-actions">
            <?php if ($messageType === 'success'): ?>
                <a href="../index.html" class="btn">Go to Homepage</a>
                <a href="#" onclick="showLoginModal()" class="btn btn-secondary">Login Now</a>
            <?php else: ?>
                <a href="../index.html" class="btn">Back to Homepage</a>
                <a href="mailto:support@tattoovet.com" class="btn btn-secondary">Contact Support</a>
                <?php if (isset($_GET['token'])): ?>
                    <div style="margin-top: 20px;">
                        <button onclick="resendVerificationEmail()" class="btn" style="background: #3498db;">Resend Verification Email</button>
                    </div>
                <?php endif; ?>
            <?php endif; ?>
        </div>
    </div>

    <script>
        function showLoginModal() {
            // Redirect to homepage with login modal
            window.location.href = '../index.html?show_login=1';
        }

        async function resendVerificationEmail() {
            // Get email from URL parameter or prompt user
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token');

            if (!token) {
                alert('No verification token found. Please check your email for the verification link.');
                return;
            }

            // Show loading state
            const button = event.target;
            const originalText = button.textContent;
            button.textContent = 'Sending...';
            button.disabled = true;

            try {
                // For resend, we'll use a generic approach since we don't have the user's email
                // In a real implementation, you'd want to store the email with the token or require email input
                const userEmail = prompt('Please enter your email address to resend the verification email:');

                if (!userEmail) {
                    button.textContent = originalText;
                    button.disabled = false;
                    return;
                }

                // Validate email format
                const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
                if (!emailRegex.test(userEmail)) {
                    alert('Please enter a valid email address.');
                    button.textContent = originalText;
                    button.disabled = false;
                    return;
                }

                // Send email using SMTPJS if available
                if (typeof emailService !== 'undefined') {
                    const emailResult = await emailService.sendVerificationEmail(userEmail, 'Valued Customer', token);

                    if (emailResult.success) {
                        alert('Verification email sent successfully! Please check your inbox.');
                    } else {
                        alert('Email configuration may need setup. Please contact support if you continue having issues.');
                    }
                } else {
                    alert('Email service not available. Please contact support for assistance.');
                }
            } catch (error) {
                console.error('Resend verification error:', error);
                alert('Connection error. Please try again later.');
            } finally {
                // Restore button state
                button.textContent = originalText;
                button.disabled = false;
            }
        }
    </script>
</body>
</html>