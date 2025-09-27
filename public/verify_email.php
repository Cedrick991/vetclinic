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
        }

        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(255,215,0,0.4);
        }

        .btn-secondary {
            background: #3498db;
            color: white;
        }

        .btn-secondary:hover {
            background: #2980b9;
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

        <div class="verification-actions">
            <?php if ($messageType === 'success'): ?>
                <a href="index.html" class="btn">Go to Homepage</a>
                <a href="#" onclick="showLoginModal()" class="btn btn-secondary">Login Now</a>
            <?php else: ?>
                <a href="index.html" class="btn">Back to Homepage</a>
                <a href="mailto:support@tattoovet.com" class="btn btn-secondary">Contact Support</a>
            <?php endif; ?>
        </div>
    </div>

    <script>
        function showLoginModal() {
            // Redirect to homepage with login modal
            window.location.href = 'index.html?show_login=1';
        }
    </script>
</body>
</html>