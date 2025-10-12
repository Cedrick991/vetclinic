<?php
/**
 * Real-time Notification Service using Server-Sent Events (SSE)
 * Veterinary Clinic Management System
 */

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// CORS Headers for SSE
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Cache-Control');
header('Access-Control-Expose-Headers: Content-Type');

// SSE Headers
header('Content-Type: text/event-stream');
header('Cache-Control: no-cache');
header('Connection: keep-alive');
header('X-Accel-Buffering: no'); // Disable buffering for nginx

// Prevent caching
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

// Include database configuration
require_once __DIR__ . '/../db/database.php';

try {
    $db = getDB();

    // Test database connection
    $db->query('SELECT 1');

    // Get user ID from query parameter
    $userId = intval($_GET['user_id'] ?? 0);

    if (!$userId) {
        throw new Exception('User ID is required');
    }

    // Verify user exists and is active
    try {
        $user = $db->fetch('SELECT id, user_type FROM users WHERE id = ? AND is_active = 1', [$userId]);
        if (!$user) {
            throw new Exception('Invalid user');
        }
    } catch (Exception $e) {
        // If users table doesn't exist, create a mock user for demo purposes
        if (strpos($e->getMessage(), 'no such table') !== false) {
            $user = ['id' => $userId, 'user_type' => 'staff'];
        } else {
            throw $e;
        }
    }

    // Send initial connection confirmation
    echo "data: " . json_encode([
        'type' => 'connection',
        'status' => 'connected',
        'user_id' => $userId,
        'timestamp' => date('Y-m-d H:i:s')
    ]) . "\n\n";
    flush();

    // Keep track of last notification ID sent to avoid duplicates
    $lastNotificationId = intval($_GET['last_id'] ?? 0);

    // Main SSE loop
    while (true) {
        try {
            // Check if notifications table exists
            try {
                $notifications = $db->fetchAll('
                    SELECT n.*, nrs.is_read
                    FROM notifications n
                    LEFT JOIN notification_read_status nrs ON n.id = nrs.notification_id AND nrs.user_id = ?
                    WHERE n.user_id = ? AND n.id > ?
                    ORDER BY n.created_at ASC
                ', [$userId, $userId, $lastNotificationId]);
            } catch (Exception $e) {
                // If table doesn't exist, send a setup message and return empty array
                if (strpos($e->getMessage(), 'no such table') !== false || strpos($e->getMessage(), 'doesn\'t exist') !== false) {
                    echo "data: " . json_encode([
                        'type' => 'error',
                        'message' => 'Database tables not set up. Please run database migrations.',
                        'timestamp' => date('Y-m-d H:i:s')
                    ]) . "\n\n";
                    flush();
                    sleep(30); // Wait longer if database is not set up
                    continue;
                }
                throw $e;
            }

            // Send new notifications
            foreach ($notifications as $notification) {
                $data = [
                    'type' => 'notification',
                    'id' => $notification['id'],
                    'notification_type' => $notification['type'],
                    'title' => $notification['title'],
                    'message' => $notification['message'],
                    'priority' => $notification['priority'],
                    'is_read' => (bool)($notification['is_read'] ?? 0),
                    'data' => $notification['data'] ? json_decode($notification['data'], true) : null,
                    'created_at' => $notification['created_at'],
                    'timestamp' => date('Y-m-d H:i:s')
                ];

                echo "data: " . json_encode($data) . "\n\n";
                flush();

                $lastNotificationId = max($lastNotificationId, $notification['id']);
            }

            // Check for connection heartbeat every 30 seconds
            if (connection_aborted()) {
                break;
            }

            // Wait before next check (5 seconds)
            sleep(5);

        } catch (Exception $e) {
            // Send error to client
            echo "data: " . json_encode([
                'type' => 'error',
                'message' => 'Server error: ' . $e->getMessage(),
                'timestamp' => date('Y-m-d H:i:s')
            ]) . "\n\n";
            flush();
            break;
        }
    }

} catch (Exception $e) {
    echo "data: " . json_encode([
        'type' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]) . "\n\n";
    flush();
}
?>