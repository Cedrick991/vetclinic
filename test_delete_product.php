<?php
/**
 * Test script to debug the delete product functionality
 */

// Start session
session_start();

// Include database
require_once 'db/database.php';
$db = getDB();

// Test 1: Check if products exist
echo "=== TEST 1: Check Products ===\n";
$products = $db->fetchAll('SELECT * FROM products');
echo "Products found: " . count($products) . "\n";
foreach($products as $product) {
    echo "ID: {$product['id']}, Name: {$product['name']}, Active: {$product['is_active']}\n";
}

// Test 2: Check if user is logged in
echo "\n=== TEST 2: Session Check ===\n";
if (isset($_SESSION['user_id']) && isset($_SESSION['user_type'])) {
    echo "User ID: {$_SESSION['user_id']}\n";
    echo "User Type: {$_SESSION['user_type']}\n";
} else {
    echo "No session found\n";
    // Try to create a test session
    $_SESSION['user_id'] = 1;
    $_SESSION['user_type'] = 'staff';
    echo "Created test session\n";
}

// Test 3: Test delete functionality
echo "\n=== TEST 3: Delete Test ===\n";
if (count($products) > 0) {
    $testProductId = $products[0]['id'];
    echo "Testing delete for product ID: $testProductId\n";

    try {
        // Check if product exists
        $product = $db->fetch('SELECT * FROM products WHERE id = ?', [$testProductId]);
        if (!$product) {
            echo "Product not found\n";
        } else {
            echo "Product found: {$product['name']}\n";

            // Perform soft delete
            $result = $db->execute(
                'UPDATE products SET is_active = 0 WHERE id = ?',
                [$testProductId]
            );

            echo "Delete result: $result rows affected\n";

            // Check if product was deactivated
            $updatedProduct = $db->fetch('SELECT * FROM products WHERE id = ?', [$testProductId]);
            echo "Product after delete - Active: {$updatedProduct['is_active']}\n";

            if ($updatedProduct['is_active'] == 0) {
                echo "✅ Soft delete successful\n";
            } else {
                echo "❌ Soft delete failed\n";
            }
        }
    } catch (Exception $e) {
        echo "Error during delete test: " . $e->getMessage() . "\n";
    }
} else {
    echo "No products to test with\n";
}

echo "\n=== TEST COMPLETE ===\n";
?>