<?php
/**
 * Test script for registration and session handling
 * Access this at http://localhost/vetfinal/test_registration.php
 */

session_start();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Registration Test - Tattao Veterinary Clinic</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 10px; max-width: 600px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .test-section { background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #007bff; }
        .success { border-left-color: #28a745; background: #f8fff8; }
        .error { border-left-color: #dc3545; background: #fff8f8; }
        .warning { border-left-color: #ffc107; background: #fffef8; }
        button { background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin: 5px; }
        button:hover { background: #0056b3; }
        .info-box { background: #e9ecef; padding: 15px; border-radius: 5px; margin: 10px 0; }
        pre { background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 Registration & Session Test</h1>
        
        <div class="info-box">
            <strong>Current Session Status:</strong><br>
            Session ID: <?= session_id() ?: 'None' ?><br>
            User ID: <?= $_SESSION['user_id'] ?? 'Not set' ?><br>
            User Type: <?= $_SESSION['user_type'] ?? 'Not set' ?><br>
            User Name: <?= $_SESSION['user_name'] ?? 'Not set' ?><br>
            Login Time: <?= isset($_SESSION['login_time']) ? date('Y-m-d H:i:s', $_SESSION['login_time']) : 'Not set' ?>
        </div>

        <div class="test-section">
            <h3>🔧 Test Registration Flow</h3>
            <p>This will test the registration process with a temporary user.</p>
            <button onclick="testRegistration()">Test Registration</button>
            <button onclick="testSessionCheck()">Test Session Check</button>
            <button onclick="clearSession()">Clear Session</button>
            <div id="testResults"></div>
        </div>

        <div class="test-section">
            <h3>📊 API Test Results</h3>
            <div id="apiResults">Click a test button to see results...</div>
        </div>
    </div>

    <script>
        async function testRegistration() {
            const results = document.getElementById('testResults');
            const apiResults = document.getElementById('apiResults');
            
            results.innerHTML = '<div style="color: #007bff;">🔄 Testing registration...</div>';
            
            try {
                const testUser = {
                    action: 'register',
                    first_name: 'Test',
                    last_name: 'User',
                    email: 'testuser' + Date.now() + '@example.com',
                    phone: '0917-000-0000',
                    password: 'TestPassword123!',
                    user_type: 'client'
                };

                console.log('Sending registration request:', testUser);
                
                const response = await fetch('api/vet_api.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(testUser)
                });

                const result = await response.json();
                console.log('Registration response:', result);

                if (result.success) {
                    results.innerHTML = `
                        <div style="color: #28a745;">✅ Registration successful!</div>
                        <div>Auto-login: ${result.auto_login ? 'Yes' : 'No'}</div>
                        <div>User ID: ${result.user?.id}</div>
                        <div>Email: ${result.user?.email}</div>
                    `;
                    
                    // Test session immediately after registration
                    setTimeout(() => {
                        testSessionCheck();
                    }, 1000);
                } else {
                    results.innerHTML = `<div style="color: #dc3545;">❌ Registration failed: ${result.message}</div>`;
                }

                apiResults.innerHTML = '<pre>' + JSON.stringify(result, null, 2) + '</pre>';
                
            } catch (error) {
                results.innerHTML = `<div style="color: #dc3545;">❌ Error: ${error.message}</div>`;
                apiResults.innerHTML = `<div style="color: #dc3545;">Error: ${error.message}</div>`;
            }
        }

        async function testSessionCheck() {
            const apiResults = document.getElementById('apiResults');
            
            try {
                console.log('Testing session check...');
                
                const response = await fetch('api/vet_api.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'get_user_info' })
                });

                const result = await response.json();
                console.log('Session check response:', result);

                if (result.success && result.data?.logged_in) {
                    apiResults.innerHTML = `
                        <div style="color: #28a745; margin-bottom: 10px;">✅ Session check successful!</div>
                        <pre>${JSON.stringify(result, null, 2)}</pre>
                    `;
                } else {
                    apiResults.innerHTML = `
                        <div style="color: #dc3545; margin-bottom: 10px;">❌ Session check failed!</div>
                        <pre>${JSON.stringify(result, null, 2)}</pre>
                    `;
                }
                
            } catch (error) {
                apiResults.innerHTML = `<div style="color: #dc3545;">Error: ${error.message}</div>`;
            }
        }

        function clearSession() {
            fetch('api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'logout' })
            }).then(() => {
                location.reload();
            });
        }

        // Auto-refresh session status every 5 seconds
        setInterval(() => {
            location.reload();
        }, 15000);
    </script>
</body>
</html>