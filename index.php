<?php
/**
 * Tattoo Veterinary Clinic Website
 * Entry Point
 * 
 * This file serves as the main entry point for the veterinary clinic website.
 * It redirects users to the homepage and handles initial routing.
 */

// Error reporting for development
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Start session
session_start();

// Set timezone (adjust as needed)
date_default_timezone_set('Asia/Manila');

// Define constants for the application
define('APP_NAME', 'Tattoo Veterinary Clinic');
define('APP_VERSION', '1.0.0');
define('BASE_PATH', __DIR__);
define('PUBLIC_PATH', BASE_PATH . '/public');
define('SRC_PATH', BASE_PATH . '/src');

// Initialize database connection
try {
    require_once __DIR__ . '/db/database.php';
    $db = getDB();
} catch (Exception $e) {
    // Log the error
    error_log("Database Error: " . $e->getMessage());
    // During development, you might want to see the error:
    // die("Database Error: " . $e->getMessage());
}

// Simple routing - redirect to homepage
header('Location: index.html');
exit();
?>
