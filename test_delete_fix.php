<?php
/**
 * Test the delete product functionality with proper session handling
 * This simulates a browser request with session cookies
 */

// Start session
session_start();

// Simulate the session data that would exist in a browser
$_SESSION['user_id'] = 9;
$_SESSION['user_type'] = 'staff';
$_SESSION['user_name'] = 'Karla Tattao';
$_SESSION['user_email'] = 'karla@gmail.com';
$_SESSION['login_time'] = time();

echo "<h1>Testing Delete Product Fix</h1>";

// Test 1: Check Session Status
echo "<h2>Test 1: Check Session Status</h2>";
echo "<pre>";

$ch = curl_init('http://localhost/vetfinal/api/vet_api.php');
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['action' => 'check_session']));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_COOKIEJAR, '/tmp/cookies.txt');
curl_setopt($ch, CURLOPT_COOKIEFILE, '/tmp/cookies.txt');

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

echo "HTTP Code: $httpCode\n";
echo "Response:\n";
echo $response . "\n";

curl_close($ch);
echo "</pre>";

// Test 2: Test Delete Product
echo "<h2>Test 2: Test Delete Product</h2>";
echo "<pre>";

$ch = curl_init('http://localhost/vetfinal/api/vet_api.php');
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'action' => 'delete_product',
    'product_id' => 1
]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_COOKIEJAR, '/tmp/cookies.txt');
curl_setopt($ch, CURLOPT_COOKIEFILE, '/tmp/cookies.txt');

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

echo "HTTP Code: $httpCode\n";
echo "Response:\n";
echo $response . "\n";

curl_close($ch);
echo "</pre>";

// Test 3: Check if product was actually deleted (soft delete)
echo "<h2>Test 3: Check Product Status After Delete</h2>";
echo "<pre>";

$ch = curl_init('http://localhost/vetfinal/api/vet_api.php');
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['action' => 'get_all_products']));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_COOKIEJAR, '/tmp/cookies.txt');
curl_setopt($ch, CURLOPT_COOKIEFILE, '/tmp/cookies.txt');

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

echo "HTTP Code: $httpCode\n";
echo "Response:\n";
echo $response . "\n";

curl_close($ch);
echo "</pre>";

// Show current session data
echo "<h2>Current Session Data</h2>";
echo "<pre>";
echo "Session ID: " . session_id() . "\n";
echo "Session Data:\n";
print_r($_SESSION);
echo "</pre>";
?>