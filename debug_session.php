<?php
/**
 * Comprehensive Session Debug Script
 * This will help identify why the API isn't recognizing the session
 */

// Start session
session_start();

echo "<h1>Session Debug Information</h1>";

// Test 1: Show current session data
echo "<h2>Test 1: Current Session Data</h2>";
echo "<pre>";
echo "Session ID: " . session_id() . "\n";
echo "Session Status: " . session_status() . "\n";
echo "Session Data:\n";
print_r($_SESSION);
echo "</pre>";

// Test 2: Test database connection
echo "<h2>Test 2: Database Connection</h2>";
echo "<pre>";
try {
    require_once __DIR__ . '/db/database.php';
    $db = getDB();
    echo "✅ Database connection successful\n";

    // Test user lookup
    if (isset($_SESSION['user_id'])) {
        $userId = $_SESSION['user_id'];
        echo "Testing user lookup for ID: $userId\n";

        $user = $db->fetch('SELECT first_name, last_name, email, phone, profile_picture FROM users WHERE id = ?', [$userId]);
        if ($user) {
            echo "✅ User found in database:\n";
            print_r($user);
        } else {
            echo "❌ User NOT found in database\n";
        }
    } else {
        echo "❌ No user_id in session\n";
    }
} catch (Exception $e) {
    echo "❌ Database connection failed: " . $e->getMessage() . "\n";
}
echo "</pre>";

// Test 3: Test getUserInfo function directly
echo "<h2>Test 3: Direct getUserInfo Function Test</h2>";
echo "<pre>";

function getUserInfo() {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    // Debug logging
    error_log("getUserInfo called. Session data: " . json_encode($_SESSION));

    if (!isset($_SESSION['user_id'], $_SESSION['user_type'])) {
        error_log("No session found - user_id or user_type missing");
        return [
            'success' => false,
            'message' => 'Not logged in',
            'data' => ['logged_in' => false]
        ];
    }

    // Session timeout (24 hours)
    $loginTime = $_SESSION['login_time'] ?? 0;
    if (time() - $loginTime > 86400) {
        session_destroy();
        return [
            'success' => false,
            'message' => 'Session expired',
            'data' => ['logged_in' => false]
        ];
    }

    try {
        $db = getDB();
        $userId = $_SESSION['user_id'];

        // Get fresh user data from database including profile picture
        $user = $db->fetch('SELECT first_name, last_name, email, phone, profile_picture FROM users WHERE id = ?', [$userId]);

        if (!$user) {
            return [
                'success' => false,
                'message' => 'User not found',
                'data' => ['logged_in' => false]
            ];
        }

        // Update session data with fresh database data
        $_SESSION['user_name'] = $user['first_name'] . ' ' . $user['last_name'];
        $_SESSION['user_email'] = $user['email'];

        return [
            'success' => true,
            'data' => [
                'logged_in' => true,
                'user_type' => $_SESSION['user_type'],
                'user' => [
                    'id'   => $_SESSION['user_id'],
                    'type' => $_SESSION['user_type'],
                    'name' => $user['first_name'] . ' ' . $user['last_name'],
                    'email' => $user['email'],
                    'phone' => $user['phone'] ?? '',
                    'profile_picture' => $user['profile_picture'] ?? ''
                ]
            ]
        ];
    } catch (Exception $e) {
        return [
            'success' => false,
            'message' => 'Failed to load user data: ' . $e->getMessage(),
            'data' => ['logged_in' => false]
        ];
    }
}

$result = getUserInfo();
echo "getUserInfo result:\n";
print_r($result);
echo "</pre>";

// Test 4: Check session configuration
echo "<h2>Test 4: Session Configuration</h2>";
echo "<pre>";
echo "session.save_path: " . ini_get('session.save_path') . "\n";
echo "session.cookie_path: " . ini_get('session.cookie_path') . "\n";
echo "session.cookie_domain: " . ini_get('session.cookie_domain') . "\n";
echo "session.cookie_secure: " . ini_get('session.cookie_secure') . "\n";
echo "session.cookie_httponly: " . ini_get('session.cookie_httponly') . "\n";
echo "session.use_cookies: " . ini_get('session.use_cookies') . "\n";
echo "session.use_only_cookies: " . ini_get('session.use_only_cookies') . "\n";
echo "</pre>";

// Test 5: Check if session files exist
echo "<h2>Test 5: Session Files</h2>";
echo "<pre>";
$sessionPath = ini_get('session.save_path');
if ($sessionPath && is_dir($sessionPath)) {
    $sessionFiles = glob($sessionPath . '/sess_*');
    echo "Session save path: $sessionPath\n";
    echo "Number of session files: " . count($sessionFiles) . "\n";

    // Look for current session file
    $currentSessionFile = $sessionPath . '/sess_' . session_id();
    if (file_exists($currentSessionFile)) {
        echo "Current session file exists: $currentSessionFile\n";
        echo "Session file size: " . filesize($currentSessionFile) . " bytes\n";
        echo "Session file contents:\n";
        echo file_get_contents($currentSessionFile) . "\n";
    } else {
        echo "❌ Current session file NOT found: $currentSessionFile\n";
    }
} else {
    echo "❌ Session save path not accessible: $sessionPath\n";
}
echo "</pre>";

// Test 6: Check database file location
echo "<h2>Test 6: Database Information</h2>";
echo "<pre>";
try {
    $db = getDB();
    $dbInfo = $db->getDatabaseInfo();
    echo "Database path: " . $dbInfo['path'] . "\n";
    echo "Database size: " . $dbInfo['size'] . " bytes\n";
    echo "Tables: " . implode(', ', $dbInfo['tables']) . "\n";

    // Check users table
    $userCount = $db->fetch('SELECT COUNT(*) as count FROM users')['count'];
    echo "Users in database: $userCount\n";

    if (isset($_SESSION['user_id'])) {
        $userId = $_SESSION['user_id'];
        $user = $db->fetch('SELECT * FROM users WHERE id = ?', [$userId]);
        if ($user) {
            echo "Session user exists in database:\n";
            print_r($user);
        } else {
            echo "❌ Session user NOT found in database\n";
        }
    }
} catch (Exception $e) {
    echo "❌ Database error: " . $e->getMessage() . "\n";
}
echo "</pre>";
?>