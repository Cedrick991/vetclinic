<?php
/**
 * Password Reset Page
 * Handles password reset requests and form submission
 */

require_once '../src/config.php';
require_once '../src/auth/auth.php';

$auth = new Auth();
$message = '';
$messageType = 'info';
$showForm = true;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $token = trim($_POST['token'] ?? '');
    $newPassword = $_POST['new_password'] ?? '';
    $confirmPassword = $_POST['confirm_password'] ?? '';

    if (empty($token)) {
        $message = 'Invalid reset token.';
        $messageType = 'error';
    } elseif (empty($newPassword)) {
        $message = 'Please enter a new password.';
        $messageType = 'error';
    } elseif ($newPassword !== $confirmPassword) {
        $message = 'Passwords do not match.';
        $messageType = 'error';
    } else {
        $result = $auth->resetPassword($token, $newPassword);

        if ($result['success']) {
            $message = $result['message'];
            $messageType = 'success';
            $showForm = false;
        } else {
            $message = $result['message'];
            $messageType = 'error';
        }
    }
} elseif (isset($_GET['token'])) {
    $token = trim($_GET['token']);
    if (empty($token)) {
        $message = 'Invalid reset token.';
        $messageType = 'error';
        $showForm = false;
    }
} else {
    $message = 'No reset token provided.';
    $messageType = 'error';
    $showForm = false;
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Password - Tattoo Veterinary Clinic</title>
    <link rel="stylesheet" href="../assets/css/style.min.css">
    <style>
        .reset-container {
            max-width: 500px;
            margin: 100px auto;
            padding: 40px;
            background: white;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }

        .reset-icon {
            font-size: 3em;
            margin-bottom: 20px;
            text-align: center;
        }

        .success { color: #27ae60; }
        .error { color: #e74c3c; }
        .info { color: #3498db; }

        .reset-message {
            text-align: center;
            font-size: 1.1em;
            margin-bottom: 30px;
            line-height: 1.6;
        }

        .reset-form {
            margin-top: 30px;
        }

        .form-group {
            margin-bottom: 20px;
        }

        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
            color: #001f54;
        }

        .form-group input[type="password"] {
            width: 100%;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.3s ease;
        }

        .form-group input[type="password"]:focus {
            outline: none;
            border-color: #ffd700;
        }

        .password-strength {
            margin-top: 5px;
            font-size: 12px;
        }

        .btn {
            width: 100%;
            padding: 15px;
            background: linear-gradient(135deg, #ffd700, #ff9900);
            color: #001f54;
            border: none;
            border-radius: 25px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(255,215,0,0.4);
        }

        .reset-actions {
            text-align: center;
            margin-top: 30px;
        }

        .btn-secondary {
            background: #3498db;
            color: white;
            margin-top: 10px;
        }

        .btn-secondary:hover {
            background: #2980b9;
        }
    </style>
</head>
<body>
    <div class="reset-container">
        <div class="reset-icon <?php echo $messageType; ?>">
            <?php
            switch ($messageType) {
                case 'success':
                    echo '✅';
                    break;
                case 'error':
                    echo '❌';
                    break;
                default:
                    echo '🔑';
                    break;
            }
            ?>
        </div>

        <h1 style="text-align: center; color: #001f54;">Reset Your Password</h1>

        <?php if (!empty($message)): ?>
            <div class="reset-message <?php echo $messageType; ?>">
                <?php echo htmlspecialchars($message); ?>
            </div>
        <?php endif; ?>

        <?php if ($showForm && isset($token)): ?>
            <form method="POST" class="reset-form" id="resetForm">
                <input type="hidden" name="token" value="<?php echo htmlspecialchars($token); ?>">

                <div class="form-group">
                    <label for="new_password">New Password</label>
                    <input type="password" id="new_password" name="new_password" required minlength="8">
                    <div class="password-strength">
                        <div class="pw-strength-bar" id="pwBar"></div>
                        <div class="pw-strength-text" id="pwText">Password strength: -</div>
                        <div class="pw-requirements" id="pwReq"></div>
                    </div>
                </div>

                <div class="form-group">
                    <label for="confirm_password">Confirm New Password</label>
                    <input type="password" id="confirm_password" name="confirm_password" required minlength="8">
                </div>

                <button type="submit" class="btn">Reset Password</button>
            </form>
        <?php endif; ?>

        <div class="reset-actions">
            <a href="index.html" class="btn btn-secondary">Back to Homepage</a>
        </div>
    </div>

    <script>
        // Password strength indicator (same as registration form)
        function evaluatePasswordStrength(pwd) {
            const length = pwd.length;
            const hasUpper = /[A-Z]/.test(pwd);
            const hasLower = /[a-z]/.test(pwd);
            const hasDigit = /\d/.test(pwd);
            const hasSymbol = /[^A-Za-z0-9]/.test(pwd);

            let score = 0;
            if (length >= 8) score++;
            if (length >= 12) score++;
            if (hasUpper && hasLower) score++;
            if (hasDigit) score++;
            if (hasSymbol) score++;
            if (score > 4) score = 4;

            let label = 'Weak', color = '#e74c3c', width = '25%';
            if (score === 2) { label = 'Fair'; color = '#f39c12'; width = '50%'; }
            else if (score === 3) { label = 'Good'; color = '#3498db'; width = '75%'; }
            else if (score === 4) { label = 'Strong'; color = '#27ae60'; width = '100%'; }

            const missing = [];
            if (length < 8) missing.push('at least 8 characters');
            if (!hasUpper) missing.push('an uppercase letter');
            if (!hasLower) missing.push('a lowercase letter');
            if (!hasDigit) missing.push('a number');
            if (!hasSymbol) missing.push('a symbol');

            return { score, label, color, width, missing };
        }

        function updateStrengthUI(result) {
            const bar = document.getElementById('pwBar');
            const text = document.getElementById('pwText');
            const req = document.getElementById('pwReq');

            if (bar) {
                bar.style.setProperty('--pw-color', result.color);
                bar.style.setProperty('--pw-width', result.width);
                bar.style.background = '#eee';
                bar.style.position = 'relative';

                if (!bar.firstChild) {
                    const inner = document.createElement('div');
                    inner.style.height = '100%';
                    inner.style.width = result.width;
                    inner.style.background = result.color;
                    inner.style.transition = 'width 0.3s ease, background 0.3s ease';
                    bar.appendChild(inner);
                } else {
                    bar.firstChild.style.width = result.width;
                    bar.firstChild.style.background = result.color;
                }
            }

            if (text) text.textContent = 'Password strength: ' + result.label;
            if (req) {
                if (result.missing.length === 0) {
                    req.textContent = 'Looks good: meets all requirements.';
                    req.className = 'pw-requirements pw-ok';
                } else {
                    req.textContent = 'Needs: ' + result.missing.join(', ');
                    req.className = 'pw-requirements pw-bad';
                }
            }
        }

        // Wire up password strength
        const passwordInput = document.getElementById('new_password');
        if (passwordInput) {
            const update = () => updateStrengthUI(evaluatePasswordStrength(passwordInput.value));
            passwordInput.addEventListener('input', update);
            update(); // Initialize
        }

        // Form validation
        const form = document.getElementById('resetForm');
        if (form) {
            form.addEventListener('submit', function(e) {
                const newPass = document.getElementById('new_password').value;
                const confirmPass = document.getElementById('confirm_password').value;

                if (newPass !== confirmPass) {
                    e.preventDefault();
                    alert('Passwords do not match. Please try again.');
                    return false;
                }

                if (newPass.length < 8) {
                    e.preventDefault();
                    alert('Password must be at least 8 characters long.');
                    return false;
                }
            });
        }
    </script>
</body>
</html>