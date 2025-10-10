<?php
/**
 * Simple Veterinary Clinic API
 * Clean implementation for login/registration with safe JSON output
 */

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// CORS Headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// Error handling: log to file, don’t show in response
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../logs/php_errors.log');

// Always return JSON
header('Content-Type: application/json; charset=utf-8');

// Ensure PHP errors are caught and returned as JSON
function handleError($errno, $errstr, $errfile, $errline) {
    $error = [
        'success' => false,
        'message' => 'PHP Error: ' . $errstr,
        'file' => basename($errfile),
        'line' => $errline
    ];
    echo json_encode($error);
    exit(1);
}
set_error_handler('handleError');

// Prevent caching
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

// Start session safely with better error handling
if (session_status() === PHP_SESSION_NONE) {
    // Set session configuration
    ini_set('session.cookie_httponly', 1);
    ini_set('session.cookie_secure', 0); // Set to 1 if using HTTPS
    ini_set('session.cookie_samesite', 'Lax');
    ini_set('session.gc_maxlifetime', 86400); // 24 hours
    ini_set('session.cookie_lifetime', 0); // Session cookie

    session_start();

    // Regenerate session ID periodically for security
    if (!isset($_SESSION['session_regenerated'])) {
        session_regenerate_id(true);
        $_SESSION['session_regenerated'] = true;
    }
}

// Response template
$response = ['success' => false, 'message' => 'Invalid request'];

try {
    // Get request body
    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true);

    if (!is_array($input)) {
        throw new Exception('Invalid JSON input');
    }

    $action = $input['action'] ?? '';
    if (empty($action)) {
        throw new Exception('Action is required');
    }

    // Include database with absolute path
    $dbPath = realpath(__DIR__ . '/../db/database.php');
    if (!$dbPath) {
        throw new Exception('Database file not found');
    }
    require_once $dbPath;
    $db = getDB();

    switch ($action) {
        case 'register':
            $response = registerUser($db, $input);
            break;

        case 'login':
            $response = loginUser($db, $input);
            break;

        case 'logout':
            $response = logoutUser();
            break;

        case 'get_user_info':
        case 'check_session':
            $response = getUserInfo();
            break;

        case 'get_dashboard_data':
            $response = getDashboardData();
            break;

        case 'get_services':
            $response = getServices();
            break;

        case 'get_pets':
            $response = getPets();
            break;

        case 'get_clients':
            $response = getClients();
            break;

        case 'get_appointments':
            $response = getAppointments();
            break;

        case 'get_products':
            $response = getProducts();
            break;

        case 'add_product':
            $response = addProduct($db, $input);
            break;

        case 'update_product':
            $response = updateProduct($db, $input);
            break;

        case 'delete_product':
            $response = deleteProduct($db, $input);
            break;

        case 'upload_product_image':
            $response = uploadProductImage($db, $input);
            break;

        case 'get_all_products':
            $response = getAllProducts();
            break;

        case 'add_service':
            $response = addService($db, $input);
            break;

        case 'update_service':
            $response = updateService($db, $input);
            break;

        case 'update_service_status':
            $response = updateServiceStatus($db, $input);
            break;

        case 'add_pet':
            $response = addPet($db, $input);
            break;

        case 'book_appointment':
            $response = bookAppointment($db, $input);
            break;

        case 'update_appointment':
            $response = updateAppointment($db, $input);
            break;

        case 'cancel_appointment':
            $response = cancelAppointment($db, $input);
            break;

        case 'update_appointment_status':
            $response = updateAppointmentStatus($db, $input);
            break;

        case 'get_available_times':
            $response = getAvailableTimes($db, $input);
            break;

        case 'add_to_cart':
            $response = addToCart($db, $input);
            break;

        case 'get_cart':
            $response = getCart($db, $input);
            break;

        case 'update_cart':
            $response = updateCart($db, $input);
            break;

        case 'remove_from_cart':
            $response = removeFromCart($db, $input);
            break;

        case 'checkout':
            $response = checkout($db, $input);
            break;

        case 'get_orders':
            $response = getOrders($db, $input);
            break;

        case 'add_to_order':
            $response = addToOrder($db, $input);
            break;

        case 'buy_now':
            $response = buyNow($db, $input);
            break;

        case 'buy_cart':
            $response = buyCart($db, $input);
            break;

        case 'update_profile':
            $response = updateProfile($db, $input);
            break;

        case 'update_password':
            $response = updatePassword($db, $input);
            break;

        case 'upload_profile_picture':
            $response = uploadProfilePicture($db, $input);
            break;

        case 'get_csrf_token':
            $response = ['success' => true, 'csrf_token' => 'demo_token_' . time()];
            break;

        case 'add_medical_history':
            $response = addMedicalHistory($db, $input);
            break;

        case 'get_appointment_details':
            $response = getAppointmentDetails($db, $input);
            break;

        case 'get_medical_history':
            $response = getMedicalHistory($db, $input);
            break;

        case 'update_pet_admin':
            $response = updatePetAdmin($db, $input);
            break;

        case 'delete_pet_admin':
            $response = deletePetAdmin($db, $input);
            break;

        case 'update_pet':
            $response = updatePet($db, $input);
            break;

        case 'delete_pet':
            $response = deletePet($db, $input);
            break;

        default:
            throw new Exception('Unknown action: ' . $action);
    }
} catch (Throwable $e) {
    // Catch all errors and return JSON
    $response = [
        'success' => false,
        'message' => $e->getMessage()
    ];
}

// Output JSON only
if (ob_get_length()) {
    ob_end_clean();
}
echo json_encode($response, JSON_UNESCAPED_UNICODE);
exit;


/* ==========================
   Functions
   ========================== */

function registerUser($db, $input) {
    $firstName = trim($input['first_name'] ?? '');
    $lastName  = trim($input['last_name'] ?? '');
    $email     = trim($input['email'] ?? '');
    $phone     = trim($input['phone'] ?? '');
    $password  = $input['password'] ?? '';
    $userType  = $input['user_type'] ?? 'client';

    if (!$firstName || !$lastName || !$email || !$password) {
        throw new Exception('All fields are required');
    }

    if (strlen($password) < 6) {
        throw new Exception('Password must be at least 6 characters');
    }

    // Check if email exists
    $existing = $db->fetch('SELECT id FROM users WHERE email = ?', [$email]);
    if ($existing) {
        throw new Exception('Email already registered');
    }

    // Hash password and insert
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

    $db->execute(
        'INSERT INTO users (first_name, last_name, email, phone, password, user_type) VALUES (?, ?, ?, ?, ?, ?)',
        [$firstName, $lastName, $email, $phone, $hashedPassword, $userType]
    );

    $userId = $db->lastInsertId();

    // Set session
    $_SESSION['user_id']   = $userId;
    $_SESSION['user_type'] = $userType;
    $_SESSION['user_name'] = $firstName . ' ' . $lastName;
    $_SESSION['login_time'] = time();

    return [
        'success' => true,
        'message' => 'Registration successful!',
        'user' => [
            'id'    => $userId,
            'name'  => $firstName . ' ' . $lastName,
            'email' => $email,
            'type'  => $userType
        ]
    ];
}

function loginUser($db, $input) {
    $email    = trim($input['email'] ?? '');
    $password = $input['password'] ?? '';

    if (!$email || !$password) {
        throw new Exception('Email and password are required');
    }

    // Get user
    $user = $db->fetch('SELECT * FROM users WHERE email = ?', [$email]);
    if (!$user || !password_verify($password, $user['password'])) {
        throw new Exception('Invalid login credentials');
    }

    // Set session variables
    $_SESSION['user_id']   = $user['id'];
    $_SESSION['user_type'] = $user['user_type'];
    $_SESSION['user_name'] = $user['first_name'] . ' ' . $user['last_name'];
    $_SESSION['user_email'] = $user['email'];
    $_SESSION['login_time'] = time();

    return [
        'success' => true,
        'message' => 'Login successful!',
        'redirect' => $user['user_type'] === 'staff' ? 'staff.html' : 'client.html',
        'user' => [
            'id'    => $user['id'],
            'name'  => $user['first_name'] . ' ' . $user['last_name'],
            'email' => $user['email'],
            'type'  => $user['user_type']
        ]
    ];
}

function logoutUser() {
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_destroy();
    }
    return [
        'success' => true,
        'message' => 'Logged out successfully'
    ];
}

function getUserInfo() {
    // Ensure session is started
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    // Debug logging
    error_log("getUserInfo called. Session data: " . json_encode($_SESSION));
    error_log("Session ID: " . session_id());

    // Check if session variables exist
    if (!isset($_SESSION['user_id'], $_SESSION['user_type'])) {
        error_log("No session found - user_id or user_type missing");
        error_log("Available session keys: " . implode(', ', array_keys($_SESSION)));
        return [
            'success' => false,
            'message' => 'Not logged in',
            'data' => ['logged_in' => false]
        ];
    }

    // Session timeout (24 hours)
    $loginTime = $_SESSION['login_time'] ?? 0;
    if (time() - $loginTime > 86400) {
        error_log("Session expired - login time: $loginTime, current time: " . time());
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

        error_log("Looking up user with ID: $userId");

        // Get fresh user data from database including profile picture
        $user = $db->fetch('SELECT first_name, last_name, email, phone, profile_picture, user_type FROM users WHERE id = ?', [$userId]);

        if (!$user) {
            error_log("User not found in database for ID: $userId");
            return [
                'success' => false,
                'message' => 'User not found',
                'data' => ['logged_in' => false]
            ];
        }

        // Verify user type matches session
        if ($user['user_type'] !== $_SESSION['user_type']) {
            error_log("User type mismatch - Session: {$_SESSION['user_type']}, Database: {$user['user_type']}");
            $_SESSION['user_type'] = $user['user_type'];
        }

        // Update session data with fresh database data
        $_SESSION['user_name'] = $user['first_name'] . ' ' . $user['last_name'];
        $_SESSION['user_email'] = $user['email'];

        error_log("User found successfully: {$user['first_name']} {$user['last_name']} ({$user['user_type']})");

        return [
            'success' => true,
            'data' => [
                'logged_in' => true,
                'user_type' => $_SESSION['user_type'],
                'user' => [
                    'id'   => $_SESSION['user_id'],
                    'type' => $_SESSION['user_type'],
                    'name' => $user['first_name'] . ' ' . $user['last_name'],
                    'first_name' => $user['first_name'],
                    'last_name' => $user['last_name'],
                    'email' => $user['email'],
                    'phone' => $user['phone'] ?? '',
                    'profile_picture' => $user['profile_picture'] ?? ''
                ]
            ]
        ];
    } catch (Exception $e) {
        error_log("Exception in getUserInfo: " . $e->getMessage());
        return [
            'success' => false,
            'message' => 'Failed to load user data: ' . $e->getMessage(),
            'data' => ['logged_in' => false]
        ];
    }
}

// Dashboard data functions
function getDashboardData() {
    if (!isset($_SESSION['user_id'], $_SESSION['user_type'])) {
        return ['success' => false, 'message' => 'Not logged in'];
    }

    try {
        $db = getDB();
        $userType = $_SESSION['user_type'];
        $userId = $_SESSION['user_id'];

        if ($userType === 'client') {
            // Get client's pets count
            $petsCount = $db->fetch('SELECT COUNT(*) as count FROM pets WHERE owner_id = ? AND is_active = 1', [$userId]);
            $petsCount = $petsCount ? intval($petsCount['count']) : 0;

            // Get upcoming appointments count
            $upcomingAppointments = $db->fetch('
                SELECT COUNT(*) as count
                FROM appointments a
                JOIN pets p ON a.pet_id = p.id
                WHERE a.client_id = ? AND a.appointment_date >= date("now") AND a.status != "cancelled"
            ', [$userId]);
            $upcomingCount = $upcomingAppointments ? intval($upcomingAppointments['count']) : 0;

            // Get completed visits count
            $completedVisits = $db->fetch('
                SELECT COUNT(*) as count
                FROM appointments a
                JOIN pets p ON a.pet_id = p.id
                WHERE a.client_id = ? AND a.appointment_date < date("now") AND a.status = "completed"
            ', [$userId]);
            $completedCount = $completedVisits ? intval($completedVisits['count']) : 0;

            return [
                'success' => true,
                'data' => [
                    'upcoming_appointments' => $upcomingCount,
                    'my_pets' => $petsCount,
                    'completed_visits' => $completedCount,
                    'cart_items' => 0 // For now, until cart is implemented
                ]
            ];
        } else {
            // Staff dashboard data
            $todayAppointments = $db->fetch('
                SELECT COUNT(*) as count
                FROM appointments
                WHERE appointment_date = date("now") AND status != "cancelled"
            ');
            $todayCount = $todayAppointments ? intval($todayAppointments['count']) : 0;

            $pendingAppointments = $db->fetch('
                SELECT COUNT(*) as count
                FROM appointments
                WHERE status = "pending"
            ');
            $pendingCount = $pendingAppointments ? intval($pendingAppointments['count']) : 0;

            $totalClients = $db->fetch('SELECT COUNT(*) as count FROM users WHERE user_type = "client" AND is_active = 1');
            $clientsCount = $totalClients ? intval($totalClients['count']) : 0;

            $totalPets = $db->fetch('SELECT COUNT(*) as count FROM pets WHERE is_active = 1');
            $petsCount = $totalPets ? intval($totalPets['count']) : 0;

            return [
                'success' => true,
                'data' => [
                    'today_appointments' => $todayCount,
                    'pending_appointments' => $pendingCount,
                    'total_clients' => $clientsCount,
                    'total_pets' => $petsCount
                ]
            ];
        }
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Failed to load dashboard data: ' . $e->getMessage()];
    }
}

function getServices() {
    try {
        $db = getDB();
        $services = $db->fetchAll('SELECT * FROM services ORDER BY name');
        return ['success' => true, 'data' => $services];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Failed to load services'];
    }
}

function addService($db, $input) {
    // Check if user is logged in
    if (!isset($_SESSION['user_id'])) {
        error_log("addService: User not logged in");
        return ['success' => false, 'message' => 'Not logged in'];
    }

    // Check if user is staff (only staff can add services)
    if ($_SESSION['user_type'] !== 'staff') {
        error_log("addService: Unauthorized access attempt by user type: " . $_SESSION['user_type']);
        return ['success' => false, 'message' => 'Only staff members can add services'];
    }

    // Enhanced input validation and sanitization
    $name = trim($input['name'] ?? '');
    $description = trim($input['description'] ?? '');
    $duration = intval($input['duration'] ?? 0);
    $isActive = intval($input['is_active'] ?? 1);

    // Validate required fields
    if (empty($name)) {
        return ['success' => false, 'message' => 'Service name is required'];
    }

    if ($duration <= 0) {
        return ['success' => false, 'message' => 'Duration must be greater than 0 minutes'];
    }

    // Enhanced validation with reasonable limits
    if (strlen($name) > 100) {
        return ['success' => false, 'message' => 'Service name must be less than 100 characters'];
    }

    if (strlen($description) > 500) {
        return ['success' => false, 'message' => 'Description must be less than 500 characters'];
    }

    if ($duration > 480) { // 8 hours max
        return ['success' => false, 'message' => 'Duration cannot exceed 8 hours (480 minutes)'];
    }

    // Validate is_active parameter
    if ($isActive !== 0 && $isActive !== 1) {
        return ['success' => false, 'message' => 'Invalid status value'];
    }

    // Additional sanitization
    $name = htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
    $description = htmlspecialchars($description, ENT_QUOTES, 'UTF-8');

    try {
        // Check if service name already exists (case-insensitive)
        $existing = $db->fetch('SELECT id FROM services WHERE LOWER(name) = LOWER(?)', [$name]);
        if ($existing) {
            error_log("addService: Service name already exists: " . $name);
            return ['success' => false, 'message' => 'Service name already exists'];
        }

        // Use transaction for data integrity
        $db->execute('BEGIN TRANSACTION');

        // Insert the new service
        $db->execute(
            'INSERT INTO services (name, description, duration, is_active, created_at) VALUES (?, ?, ?, ?, datetime("now"))',
            [$name, $description, $duration, $isActive]
        );

        $serviceId = $db->lastInsertId();

        // Commit transaction
        $db->execute('COMMIT');

        error_log("addService: Successfully added service ID {$serviceId}: {$name}");

        return [
            'success' => true,
            'message' => 'Service added successfully!',
            'service_id' => $serviceId,
            'service' => [
                'id' => $serviceId,
                'name' => $name,
                'description' => $description,
                'duration' => $duration,
                'is_active' => $isActive
            ]
        ];
    } catch (Exception $e) {
        // Rollback transaction on error
        if ($db) {
            $db->execute('ROLLBACK');
        }

        error_log("addService: Database error - " . $e->getMessage());
        return ['success' => false, 'message' => 'Failed to add service: ' . $e->getMessage()];
    }
}

function updateService($db, $input) {
    // Check if user is logged in
    if (!isset($_SESSION['user_id'])) {
        error_log("updateService: User not logged in");
        return ['success' => false, 'message' => 'Not logged in'];
    }

    // Check if user is staff (only staff can update services)
    if ($_SESSION['user_type'] !== 'staff') {
        error_log("updateService: Unauthorized access attempt by user type: " . $_SESSION['user_type']);
        return ['success' => false, 'message' => 'Only staff members can update services'];
    }

    $serviceId = intval($input['service_id'] ?? 0);

    // For partial updates, get existing values if not provided
    $existingService = $db->fetch('SELECT * FROM services WHERE id = ?', [$serviceId]);
    if (!$existingService) {
        return ['success' => false, 'message' => 'Service not found'];
    }

    $name = trim($input['name'] ?? $existingService['name']);
    $description = trim($input['description'] ?? $existingService['description']);
    $duration = intval($input['duration'] ?? $existingService['duration']);
    $isActive = intval($input['is_active'] ?? $existingService['is_active']);

    // Validate service ID
    if (!$serviceId) {
        return ['success' => false, 'message' => 'Service ID is required'];
    }

    // Validate required fields
    if (empty($name)) {
        return ['success' => false, 'message' => 'Service name is required'];
    }

    if ($duration <= 0) {
        return ['success' => false, 'message' => 'Duration must be greater than 0 minutes'];
    }

    // Enhanced validation with reasonable limits
    if (strlen($name) > 100) {
        return ['success' => false, 'message' => 'Service name must be less than 100 characters'];
    }

    if (strlen($description) > 500) {
        return ['success' => false, 'message' => 'Description must be less than 500 characters'];
    }

    if ($duration > 480) { // 8 hours max
        return ['success' => false, 'message' => 'Duration cannot exceed 8 hours (480 minutes)'];
    }

    // Validate is_active parameter
    if ($isActive !== 0 && $isActive !== 1) {
        return ['success' => false, 'message' => 'Invalid status value'];
    }

    // Additional sanitization
    $name = htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
    $description = htmlspecialchars($description, ENT_QUOTES, 'UTF-8');

    try {
        // Check if service exists
        $existingService = $db->fetch('SELECT id, name FROM services WHERE id = ?', [$serviceId]);
        if (!$existingService) {
            error_log("updateService: Service not found: " . $serviceId);
            return ['success' => false, 'message' => 'Service not found'];
        }

        // Check if new name conflicts with another service (case-insensitive, excluding current service)
        $nameConflict = $db->fetch(
            'SELECT id FROM services WHERE LOWER(name) = LOWER(?) AND id != ?',
            [$name, $serviceId]
        );
        if ($nameConflict) {
            error_log("updateService: Service name already exists: " . $name);
            return ['success' => false, 'message' => 'Service name already exists'];
        }

        // Use transaction for data integrity
        $db->execute('BEGIN TRANSACTION');

        // Update the service
        $db->execute(
            'UPDATE services SET name = ?, description = ?, duration = ?, is_active = ? WHERE id = ?',
            [$name, $description, $duration, $isActive, $serviceId]
        );

        // Commit transaction
        $db->execute('COMMIT');

        error_log("updateService: Successfully updated service ID {$serviceId}: {$name}");

        return [
            'success' => true,
            'message' => 'Service updated successfully!',
            'service_id' => $serviceId,
            'service' => [
                'id' => $serviceId,
                'name' => $name,
                'description' => $description,
                'duration' => $duration,
                'is_active' => $isActive
            ]
        ];
    } catch (Exception $e) {
        // Rollback transaction on error
        if ($db) {
            $db->execute('ROLLBACK');
        }

        error_log("updateService: Database error - " . $e->getMessage());
        return ['success' => false, 'message' => 'Failed to update service: ' . $e->getMessage()];
    }
}

function updateServiceStatus($db, $input) {
    if (!isset($_SESSION['user_id'])) {
        return ['success' => false, 'message' => 'Not logged in'];
    }

    $serviceId = intval($input['service_id'] ?? 0);
    $isActive = intval($input['is_active'] ?? 0);

    if (!$serviceId) {
        return ['success' => false, 'message' => 'Service ID is required'];
    }

    try {
        // Check if service exists
        $service = $db->fetch('SELECT id, name FROM services WHERE id = ?', [$serviceId]);
        if (!$service) {
            return ['success' => false, 'message' => 'Service not found'];
        }

        // Only staff can update service status
        if ($_SESSION['user_type'] !== 'staff') {
            return ['success' => false, 'message' => 'Only staff can update service status'];
        }

        $db->execute(
            'UPDATE services SET is_active = ? WHERE id = ?',
            [$isActive, $serviceId]
        );

        return [
            'success' => true,
            'message' => 'Service status updated successfully!',
            'service_id' => $serviceId,
            'new_status' => $isActive
        ];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Failed to update service status: ' . $e->getMessage()];
    }
}

function getPets() {
    if (!isset($_SESSION['user_id'])) {
        return ['success' => false, 'message' => 'Not logged in'];
    }

    try {
        $db = getDB();
        $userId = $_SESSION['user_id'];

        if ($_SESSION['user_type'] === 'client') {
            $pets = $db->fetchAll('SELECT * FROM pets WHERE owner_id = ? AND is_active = 1', [$userId]);
        } else {
            $pets = $db->fetchAll('SELECT p.*, u.first_name, u.last_name FROM pets p JOIN users u ON p.owner_id = u.id WHERE p.is_active = 1');
        }

        return ['success' => true, 'data' => $pets ?: []];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Failed to load pets: ' . $e->getMessage()];
    }
}

function getClients() {
    if (!isset($_SESSION['user_id'])) {
        return ['success' => false, 'message' => 'Not logged in'];
    }

    try {
        $db = getDB();

        // Get all clients with their pet count and last appointment date
        $clients = $db->fetchAll('
            SELECT
                u.id,
                u.first_name,
                u.last_name,
                u.email,
                u.phone,
                u.created_at,
                COUNT(p.id) as pet_count,
                MAX(a.appointment_date) as last_visit
            FROM users u
            LEFT JOIN pets p ON u.id = p.owner_id AND p.is_active = 1
            LEFT JOIN appointments a ON u.id = a.client_id AND a.status != "cancelled"
            WHERE u.user_type = "client" AND u.is_active = 1
            GROUP BY u.id
            ORDER BY u.last_name, u.first_name
        ');

        // Format the data for the frontend
        $formattedClients = array_map(function($client) {
            return [
                'id' => $client['id'],
                'first_name' => $client['first_name'],
                'last_name' => $client['last_name'],
                'email' => $client['email'],
                'phone' => $client['phone'],
                'pet_count' => intval($client['pet_count']),
                'last_visit' => $client['last_visit'] ?: 'Never',
                'created_at' => $client['created_at']
            ];
        }, $clients);

        return ['success' => true, 'data' => $formattedClients];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Failed to load clients: ' . $e->getMessage()];
    }
}

function getAppointments() {
    if (!isset($_SESSION['user_id'])) {
        return ['success' => false, 'message' => 'Not logged in'];
    }

    try {
        $db = getDB();
        $userId = $_SESSION['user_id'];

        if ($_SESSION['user_type'] === 'client') {
            $appointments = $db->fetchAll('
                SELECT a.*, s.name as service_name, p.name as pet_name, p.species
                FROM appointments a
                JOIN services s ON a.service_id = s.id
                JOIN pets p ON a.pet_id = p.id
                WHERE a.client_id = ?
                ORDER BY a.appointment_date DESC, a.appointment_time DESC
            ', [$userId]);
        } else {
            $appointments = $db->fetchAll('
                SELECT a.*, s.name as service_name, p.name as pet_name, p.species,
                       u.first_name, u.last_name
                FROM appointments a
                JOIN services s ON a.service_id = s.id
                JOIN pets p ON a.pet_id = p.id
                JOIN users u ON a.client_id = u.id
                ORDER BY a.appointment_date, a.appointment_time
            ');
        }

        return ['success' => true, 'data' => $appointments];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Failed to load appointments'];
    }
}

function getProducts() {
    try {
        $db = getDB();
        $products = $db->fetchAll('SELECT * FROM products WHERE is_active = 1 ORDER BY name');
        return ['success' => true, 'data' => $products];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Failed to load products'];
    }
}

// Pet management functions
function addPet($db, $input) {
    if (!isset($_SESSION['user_id'])) {
        return ['success' => false, 'message' => 'Not logged in'];
    }

    $petName = trim($input['pet_name'] ?? '');
    $species = trim($input['species'] ?? '');
    $breed = trim($input['breed'] ?? '');
    $birthdate = trim($input['birthdate'] ?? '');
    $gender = trim($input['gender'] ?? '');
    $weight = floatval($input['weight'] ?? 0);
    $color = trim($input['color'] ?? '');

    if (!$petName || !$species || !$gender) {
        return ['success' => false, 'message' => 'Pet name, species, and gender are required'];
    }

    // Validate birthdate format if provided
    if (!empty($birthdate) && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $birthdate)) {
        return ['success' => false, 'message' => 'Birthdate must be in YYYY-MM-DD format'];
    }

    try {
        // Calculate age from birthdate if provided
        $age = null;
        if (!empty($birthdate)) {
            $birthDateTime = new DateTime($birthdate);
            $currentDate = new DateTime();
            $age = $currentDate->diff($birthDateTime)->y;
        }

        $db->execute(
            'INSERT INTO pets (owner_id, name, species, breed, birthdate, age, gender, weight, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [$_SESSION['user_id'], $petName, $species, $breed, $birthdate, $age, $gender, $weight, $color]
        );

        $petId = $db->lastInsertId();

        return [
            'success' => true,
            'message' => 'Pet added successfully!',
            'pet_id' => $petId
        ];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Failed to add pet: ' . $e->getMessage()];
    }
}

// Appointment functions
function bookAppointment($db, $input) {
    if (!isset($_SESSION['user_id'])) {
        return ['success' => false, 'message' => 'Not logged in'];
    }

    $serviceId = intval($input['service_id'] ?? 0);
    $petId = intval($input['pet_id'] ?? 0);
    $appointmentDate = trim($input['appointment_date'] ?? '');
    $appointmentTime = trim($input['appointment_time'] ?? '');
    $notes = trim($input['notes'] ?? '');

    if (!$serviceId || !$petId || !$appointmentDate || !$appointmentTime) {
        return ['success' => false, 'message' => 'Service, pet, date, and time are required'];
    }

    try {
        // Check if pet belongs to user
        $pet = $db->fetch('SELECT id FROM pets WHERE id = ? AND owner_id = ?', [$petId, $_SESSION['user_id']]);
        if (!$pet) {
            return ['success' => false, 'message' => 'Pet not found or not owned by you'];
        }

        // Check if service exists
        $service = $db->fetch('SELECT id FROM services WHERE id = ? AND is_active = 1', [$serviceId]);
        if (!$service) {
            return ['success' => false, 'message' => 'Service not found'];
        }

        $db->execute(
            'INSERT INTO appointments (client_id, pet_id, service_id, appointment_date, appointment_time, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [$_SESSION['user_id'], $petId, $serviceId, $appointmentDate, $appointmentTime, $notes, 'pending']
        );

        $appointmentId = $db->lastInsertId();


        return [
            'success' => true,
            'message' => 'Appointment booked successfully!',
            'appointment_id' => $appointmentId
        ];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Failed to book appointment: ' . $e->getMessage()];
    }
}

function updateAppointment($db, $input) {
    if (!isset($_SESSION['user_id'])) {
        return ['success' => false, 'message' => 'Not logged in'];
    }

    $appointmentId = intval($input['appointment_id'] ?? 0);
    $serviceId = intval($input['service_id'] ?? 0);
    $petId = intval($input['pet_id'] ?? 0);
    $appointmentDate = trim($input['appointment_date'] ?? '');
    $appointmentTime = trim($input['appointment_time'] ?? '');
    $notes = trim($input['notes'] ?? '');

    if (!$appointmentId || !$serviceId || !$petId || !$appointmentDate || !$appointmentTime) {
        return ['success' => false, 'message' => 'Appointment ID, service, pet, date, and time are required'];
    }

    try {
        // Check if appointment exists and belongs to user
        $appointment = $db->fetch('SELECT * FROM appointments WHERE id = ? AND client_id = ?', [$appointmentId, $_SESSION['user_id']]);
        if (!$appointment) {
            return ['success' => false, 'message' => 'Appointment not found or not owned by you'];
        }

        // Check if pet belongs to user
        $pet = $db->fetch('SELECT id FROM pets WHERE id = ? AND owner_id = ?', [$petId, $_SESSION['user_id']]);
        if (!$pet) {
            return ['success' => false, 'message' => 'Pet not found or not owned by you'];
        }

        // Check if service exists
        $service = $db->fetch('SELECT id FROM services WHERE id = ? AND is_active = 1', [$serviceId]);
        if (!$service) {
            return ['success' => false, 'message' => 'Service not found'];
        }

        // Only allow updates for pending or confirmed appointments
        if (!in_array($appointment['status'], ['pending', 'confirmed'])) {
            return ['success' => false, 'message' => 'Cannot update appointment with status: ' . $appointment['status']];
        }

        $db->execute(
            'UPDATE appointments SET service_id = ?, pet_id = ?, appointment_date = ?, appointment_time = ?, notes = ? WHERE id = ?',
            [$serviceId, $petId, $appointmentDate, $appointmentTime, $notes, $appointmentId]
        );

        return [
            'success' => true,
            'message' => 'Appointment updated successfully!',
            'appointment_id' => $appointmentId
        ];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Failed to update appointment: ' . $e->getMessage()];
    }
}

function cancelAppointment($db, $input) {
    if (!isset($_SESSION['user_id'])) {
        return ['success' => false, 'message' => 'Not logged in'];
    }

    $appointmentId = intval($input['appointment_id'] ?? 0);

    if (!$appointmentId) {
        return ['success' => false, 'message' => 'Appointment ID is required'];
    }

    try {
        // Check if appointment exists and belongs to user
        $appointment = $db->fetch('SELECT * FROM appointments WHERE id = ? AND client_id = ?', [$appointmentId, $_SESSION['user_id']]);
        if (!$appointment) {
            return ['success' => false, 'message' => 'Appointment not found or not owned by you'];
        }

        // Only allow cancellation for pending, confirmed, or scheduled appointments
        if (!in_array($appointment['status'], ['pending', 'confirmed', 'scheduled'])) {
            return ['success' => false, 'message' => 'Cannot cancel appointment with status: ' . $appointment['status']];
        }

        $db->execute(
            'UPDATE appointments SET status = ? WHERE id = ?',
            ['cancelled', $appointmentId]
        );

        return [
            'success' => true,
            'message' => 'Appointment cancelled successfully!',
            'appointment_id' => $appointmentId
        ];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Failed to cancel appointment: ' . $e->getMessage()];
    }
}

function updateAppointmentStatus($db, $input) {
    if (!isset($_SESSION['user_id'])) {
        return ['success' => false, 'message' => 'Not logged in'];
    }

    $appointmentId = intval($input['appointment_id'] ?? 0);
    $newStatus = trim($input['status'] ?? '');

    if (!$appointmentId || !$newStatus) {
        return ['success' => false, 'message' => 'Appointment ID and status are required'];
    }

    // Validate status
    $validStatuses = ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'];
    if (!in_array($newStatus, $validStatuses)) {
        return ['success' => false, 'message' => 'Invalid status. Must be one of: ' . implode(', ', $validStatuses)];
    }

    try {
        // Check if appointment exists
        $appointment = $db->fetch('SELECT * FROM appointments WHERE id = ?', [$appointmentId]);
        if (!$appointment) {
            return ['success' => false, 'message' => 'Appointment not found'];
        }

        // Only staff can update appointment status
        if ($_SESSION['user_type'] !== 'staff') {
            return ['success' => false, 'message' => 'Only staff can update appointment status'];
        }

        // Update appointment status
        $db->execute(
            'UPDATE appointments SET status = ? WHERE id = ?',
            [$newStatus, $appointmentId]
        );


        return [
            'success' => true,
            'message' => 'Appointment status updated successfully!',
            'appointment_id' => $appointmentId,
            'new_status' => $newStatus
        ];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Failed to update appointment status: ' . $e->getMessage()];
    }
}

function getAvailableTimes($db, $input) {
    $date = trim($input['date'] ?? '');

    if (!$date) {
        return ['success' => false, 'message' => 'Date is required'];
    }

    try {
        // Simple time slots - you can customize this based on your clinic hours
        $timeSlots = [
            '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
            '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
        ];

        // Check existing appointments for this date
        $bookedTimes = $db->fetchAll(
            'SELECT appointment_time FROM appointments WHERE appointment_date = ? AND status != "cancelled"',
            [$date]
        );

        $bookedSlots = array_column($bookedTimes, 'appointment_time');
        $availableSlots = array_diff($timeSlots, $bookedSlots);

        return [
            'success' => true,
            'data' => array_values($availableSlots)
        ];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Failed to get available times'];
    }
}

// Shopping cart functions
function addToCart($db, $input) {
    if (!isset($_SESSION['user_id'])) {
        return ['success' => false, 'message' => 'Not logged in'];
    }

    $productId = intval($input['product_id'] ?? 0);
    $quantity = intval($input['quantity'] ?? 1);

    if (!$productId || $quantity <= 0) {
        return ['success' => false, 'message' => 'Invalid product or quantity'];
    }

    try {
        // Check if product exists and is in stock
        $product = $db->fetch('SELECT * FROM products WHERE id = ? AND is_active = 1', [$productId]);
        if (!$product) {
            return ['success' => false, 'message' => 'Product not found'];
        }

        if ($product['stock'] < $quantity) {
            return ['success' => false, 'message' => 'Insufficient stock'];
        }

        // For now, we'll just return success - you can implement actual cart storage
        return [
            'success' => true,
            'message' => 'Product added to cart!',
            'cart_count' => $quantity
        ];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Failed to add to cart'];
    }
}

function getCart($db, $input) {
    if (!isset($_SESSION['user_id'])) {
        return ['success' => false, 'message' => 'Not logged in'];
    }

    try {
        // Get cart items with product details
        $cartItems = $db->fetchAll('
            SELECT c.*, p.name, p.description, p.category, p.price, p.image, p.stock
            FROM cart c
            JOIN products p ON c.product_id = p.id
            WHERE c.user_id = ?
            ORDER BY c.created_at DESC
        ', [$_SESSION['user_id']]);

        $total = 0;
        foreach ($cartItems as &$item) {
            $item['subtotal'] = $item['quantity'] * $item['price'];
            $total += $item['subtotal'];
        }

        return [
            'success' => true,
            'data' => $cartItems,
            'total' => $total,
            'item_count' => count($cartItems)
        ];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Failed to load cart: ' . $e->getMessage()];
    }
}

function updateCart($db, $input) {
    if (!isset($_SESSION['user_id'])) {
        return ['success' => false, 'message' => 'Not logged in'];
    }

    $productId = intval($input['product_id'] ?? 0);
    $quantity = intval($input['quantity'] ?? 0);

    if (!$productId || $quantity < 0) {
        return ['success' => false, 'message' => 'Invalid product or quantity'];
    }

    try {
        if ($quantity == 0) {
            // Remove item if quantity is 0
            $db->execute('DELETE FROM cart WHERE user_id = ? AND product_id = ?', [$_SESSION['user_id'], $productId]);
        } else {
            // Check if product exists and has enough stock
            $product = $db->fetch('SELECT stock FROM products WHERE id = ? AND is_active = 1', [$productId]);
            if (!$product) {
                return ['success' => false, 'message' => 'Product not found'];
            }

            if ($product['stock'] < $quantity) {
                return ['success' => false, 'message' => 'Insufficient stock'];
            }

            // Update cart item
            $db->execute(
                'UPDATE cart SET quantity = ? WHERE user_id = ? AND product_id = ?',
                [$quantity, $_SESSION['user_id'], $productId]
            );
        }

        return [
            'success' => true,
            'message' => 'Cart updated successfully'
        ];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Failed to update cart: ' . $e->getMessage()];
    }
}

function removeFromCart($db, $input) {
    if (!isset($_SESSION['user_id'])) {
        return ['success' => false, 'message' => 'Not logged in'];
    }

    $productId = intval($input['product_id'] ?? 0);

    if (!$productId) {
        return ['success' => false, 'message' => 'Product ID is required'];
    }

    try {
        $db->execute('DELETE FROM cart WHERE user_id = ? AND product_id = ?', [$_SESSION['user_id'], $productId]);

        return [
            'success' => true,
            'message' => 'Item removed from cart'
        ];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Failed to remove item from cart: ' . $e->getMessage()];
    }
}

function checkout($db, $input) {
    if (!isset($_SESSION['user_id'])) {
        return ['success' => false, 'message' => 'Not logged in'];
    }

    try {
        // Get cart items
        $cartItems = $db->fetchAll('
            SELECT c.*, p.name, p.price, p.stock
            FROM cart c
            JOIN products p ON c.product_id = p.id
            WHERE c.user_id = ?
        ', [$_SESSION['user_id']]);

        if (empty($cartItems)) {
            return ['success' => false, 'message' => 'Cart is empty'];
        }

        // Calculate total
        $total = 0;
        foreach ($cartItems as $item) {
            $total += $item['quantity'] * $item['price'];
        }

        // Start transaction
        $db->execute('BEGIN TRANSACTION');

        // Create order
        $db->execute(
            'INSERT INTO orders (user_id, total_amount, status) VALUES (?, ?, ?)',
            [$_SESSION['user_id'], $total, 'pending']
        );

        $orderId = $db->lastInsertId();

        // Add order items
        foreach ($cartItems as $item) {
            $db->execute(
                'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                [$orderId, $item['product_id'], $item['quantity'], $item['price']]
            );

            // Update product stock
            $db->execute(
                'UPDATE products SET stock = stock - ? WHERE id = ?',
                [$item['quantity'], $item['product_id']]
            );
        }

        // Clear cart
        $db->execute('DELETE FROM cart WHERE user_id = ?', [$_SESSION['user_id']]);

        // Commit transaction
        $db->execute('COMMIT');

        return [
            'success' => true,
            'message' => 'Order placed successfully!',
            'order_id' => $orderId
        ];
    } catch (Exception $e) {
        // Rollback transaction on error
        $db->execute('ROLLBACK');
        return ['success' => false, 'message' => 'Failed to place order: ' . $e->getMessage()];
    }
}

function addToOrder($db, $input) {
    if (!isset($_SESSION['user_id'])) {
        return ['success' => false, 'message' => 'Not logged in'];
    }

    $productId = intval($input['product_id'] ?? 0);
    $quantity = intval($input['quantity'] ?? 1);

    if (!$productId || $quantity <= 0) {
        return ['success' => false, 'message' => 'Invalid product or quantity'];
    }

    try {
        // Check if product exists and is in stock
        $product = $db->fetch('SELECT * FROM products WHERE id = ? AND is_active = 1', [$productId]);
        if (!$product) {
            return ['success' => false, 'message' => 'Product not found'];
        }

        if ($product['stock'] < $quantity) {
            return ['success' => false, 'message' => 'Insufficient stock. Available: ' . $product['stock']];
        }

        // Calculate total amount
        $totalAmount = $quantity * $product['price'];

        // Start transaction
        $db->execute('BEGIN TRANSACTION');

        // Create order
        $db->execute(
            'INSERT INTO orders (user_id, total_amount, status) VALUES (?, ?, ?)',
            [$_SESSION['user_id'], $totalAmount, 'pending']
        );

        $orderId = $db->lastInsertId();

        // Add order item
        $db->execute(
            'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
            [$orderId, $productId, $quantity, $product['price']]
        );

        // Update product stock
        $db->execute(
            'UPDATE products SET stock = stock - ? WHERE id = ?',
            [$quantity, $productId]
        );

        // Commit transaction
        $db->execute('COMMIT');

        return [
            'success' => true,
            'message' => 'Item added to order successfully!',
            'order_id' => $orderId
        ];
    } catch (Exception $e) {
        // Rollback transaction on error
        $db->execute('ROLLBACK');
        return ['success' => false, 'message' => 'Failed to add to order: ' . $e->getMessage()];
    }
}

function buyNow($db, $input) {
    if (!isset($_SESSION['user_id'])) {
        return ['success' => false, 'message' => 'Not logged in'];
    }

    $productId = intval($input['product_id'] ?? 0);
    $quantity = intval($input['quantity'] ?? 1);
    $paymentMethod = trim($input['payment_method'] ?? '');

    if (!$productId || $quantity <= 0) {
        return ['success' => false, 'message' => 'Invalid product or quantity'];
    }

    // Validate payment method
    $validPaymentMethods = ['gcash', 'bank', 'cash_on_visit'];
    if (!in_array($paymentMethod, $validPaymentMethods)) {
        return ['success' => false, 'message' => 'Invalid payment method'];
    }

    try {
        // Check if product exists and is in stock
        $product = $db->fetch('SELECT * FROM products WHERE id = ? AND is_active = 1', [$productId]);
        if (!$product) {
            return ['success' => false, 'message' => 'Product not found'];
        }

        if ($product['stock'] < $quantity) {
            return ['success' => false, 'message' => 'Insufficient stock. Available: ' . $product['stock']];
        }

        // Calculate total amount
        $totalAmount = $quantity * $product['price'];

        // Start transaction
        $db->execute('BEGIN TRANSACTION');

        // Create order with payment method
        $db->execute(
            'INSERT INTO orders (user_id, total_amount, status, payment_method) VALUES (?, ?, ?, ?)',
            [$_SESSION['user_id'], $totalAmount, 'pending', $paymentMethod]
        );

        $orderId = $db->lastInsertId();

        // Add order item
        $db->execute(
            'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
            [$orderId, $productId, $quantity, $product['price']]
        );

        // Update product stock
        $db->execute(
            'UPDATE products SET stock = stock - ? WHERE id = ?',
            [$quantity, $productId]
        );

        // Commit transaction
        $db->execute('COMMIT');

        return [
            'success' => true,
            'message' => 'Purchase completed successfully!',
            'order_id' => $orderId,
            'payment_method' => $paymentMethod
        ];
    } catch (Exception $e) {
        // Rollback transaction on error
        $db->execute('ROLLBACK');
        return ['success' => false, 'message' => 'Failed to complete purchase: ' . $e->getMessage()];
    }
}

function buyCart($db, $input) {
    if (!isset($_SESSION['user_id'])) {
        return ['success' => false, 'message' => 'Not logged in'];
    }

    $items = $input['items'] ?? [];
    $total = floatval($input['total'] ?? 0);
    $paymentMethod = trim($input['payment_method'] ?? '');

    if (empty($items) || $total <= 0) {
        return ['success' => false, 'message' => 'Invalid cart data'];
    }

    // Validate payment method
    $validPaymentMethods = ['gcash', 'bank', 'cash_on_visit'];
    if (!in_array($paymentMethod, $validPaymentMethods)) {
        return ['success' => false, 'message' => 'Invalid payment method'];
    }

    try {
        // Start transaction
        $db->execute('BEGIN TRANSACTION');

        // Create order with payment method
        $db->execute(
            'INSERT INTO orders (user_id, total_amount, status, payment_method) VALUES (?, ?, ?, ?)',
            [$_SESSION['user_id'], $total, 'pending', $paymentMethod]
        );

        $orderId = $db->lastInsertId();

        // Add order items and update stock
        foreach ($items as $item) {
            $productId = intval($item['id']);
            $quantity = intval($item['quantity']);
            $price = floatval($item['price']);

            // Check if product exists and is in stock
            $product = $db->fetch('SELECT * FROM products WHERE id = ? AND is_active = 1', [$productId]);
            if (!$product) {
                throw new Exception('Product not found: ' . $productId);
            }

            if ($product['stock'] < $quantity) {
                throw new Exception('Insufficient stock for product: ' . $product['name']);
            }

            // Add order item
            $db->execute(
                'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                [$orderId, $productId, $quantity, $price]
            );

            // Update product stock
            $db->execute(
                'UPDATE products SET stock = stock - ? WHERE id = ?',
                [$quantity, $productId]
            );
        }

        // Commit transaction
        $db->execute('COMMIT');

        return [
            'success' => true,
            'message' => 'Cart purchase completed successfully!',
            'order_id' => $orderId,
            'payment_method' => $paymentMethod
        ];
    } catch (Exception $e) {
        // Rollback transaction on error
        $db->execute('ROLLBACK');
        return ['success' => false, 'message' => 'Failed to complete cart purchase: ' . $e->getMessage()];
    }
}

function getOrders($db, $input) {
    if (!isset($_SESSION['user_id'])) {
        return ['success' => false, 'message' => 'Not logged in'];
    }

    try {
        // Get orders with order items
        $orders = $db->fetchAll('
            SELECT o.*, COUNT(oi.id) as item_count
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.user_id = ?
            GROUP BY o.id
            ORDER BY o.order_date DESC
        ', [$_SESSION['user_id']]);

        // Get order items for each order
        foreach ($orders as &$order) {
            $orderItems = $db->fetchAll('
                SELECT oi.*, p.name, p.image
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = ?
                ORDER BY oi.id
            ', [$order['id']]);

            $order['items'] = $orderItems;
        }

        return [
            'success' => true,
            'data' => $orders
        ];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Failed to load orders: ' . $e->getMessage()];
    }
}

// User profile management functions
function updateProfile($db, $input) {
    if (!isset($_SESSION['user_id'])) {
        return ['success' => false, 'message' => 'Not logged in'];
    }

    $firstName = trim($input['first_name'] ?? '');
    $lastName = trim($input['last_name'] ?? '');
    $email = trim($input['email'] ?? '');
    $phone = trim($input['phone'] ?? '');

    if (!$firstName || !$lastName || !$email) {
        return ['success' => false, 'message' => 'First name, last name, and email are required'];
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return ['success' => false, 'message' => 'Invalid email format'];
    }

    try {
        // Check if email exists for another user
        $existing = $db->fetch('SELECT id FROM users WHERE email = ? AND id != ?', [$email, $_SESSION['user_id']]);
        if ($existing) {
            return ['success' => false, 'message' => 'Email already in use by another account'];
        }

        // Update user profile
        $db->execute(
            'UPDATE users SET first_name = ?, last_name = ?, email = ?, phone = ? WHERE id = ?',
            [$firstName, $lastName, $email, $phone, $_SESSION['user_id']]
        );

        // Update session data
        $_SESSION['user_name'] = $firstName . ' ' . $lastName;
        $_SESSION['user_email'] = $email;

        return [
            'success' => true,
            'message' => 'Profile updated successfully!',
            'user' => [
                'name' => $firstName . ' ' . $lastName,
                'email' => $email,
                'phone' => $phone
            ]
        ];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Failed to update profile: ' . $e->getMessage()];
    }
}

function updatePassword($db, $input) {
    if (!isset($_SESSION['user_id'])) {
        return ['success' => false, 'message' => 'Not logged in'];
    }

    $currentPassword = $input['current_password'] ?? '';
    $newPassword = $input['new_password'] ?? '';
    $confirmPassword = $input['confirm_password'] ?? '';

    if (!$currentPassword || !$newPassword || !$confirmPassword) {
        return ['success' => false, 'message' => 'All password fields are required'];
    }

    if ($newPassword !== $confirmPassword) {
        return ['success' => false, 'message' => 'New passwords do not match'];
    }

    if (strlen($newPassword) < 6) {
        return ['success' => false, 'message' => 'Password must be at least 6 characters'];
    }

    try {
        // Get current user
        $user = $db->fetch('SELECT password FROM users WHERE id = ?', [$_SESSION['user_id']]);
        if (!$user || !password_verify($currentPassword, $user['password'])) {
            return ['success' => false, 'message' => 'Current password is incorrect'];
        }

        // Update password
        $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
        $db->execute(
            'UPDATE users SET password = ? WHERE id = ?',
            [$hashedPassword, $_SESSION['user_id']]
        );

        return [
            'success' => true,
            'message' => 'Password updated successfully!'
        ];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Failed to update password: ' . $e->getMessage()];
    }
}

function uploadProfilePicture($db, $input) {
    error_log("uploadProfilePicture called with input: " . json_encode($input)); // Debug log

    if (!isset($_SESSION['user_id'])) {
        error_log("User not logged in"); // Debug log
        return ['success' => false, 'message' => 'Not logged in'];
    }

    $imageData = $input['image_data'] ?? '';
    $imageName = $input['image_name'] ?? 'profile_' . $_SESSION['user_id'] . '.jpg';

    error_log("User ID: " . $_SESSION['user_id']); // Debug log
    error_log("Image name: " . $imageName); // Debug log
    error_log("Image data length: " . strlen($imageData)); // Debug log

    if (!$imageData) {
        error_log("No image data provided"); // Debug log
        return ['success' => false, 'message' => 'No image data provided'];
    }

    try {
        // Create uploads directory if it doesn't exist
        $uploadDir = __DIR__ . '/../assets/images/profiles/';
        error_log("Upload directory: " . $uploadDir); // Debug log

        if (!is_dir($uploadDir)) {
            error_log("Creating upload directory"); // Debug log
            mkdir($uploadDir, 0755, true);
            chmod($uploadDir, 0755);
        }

        // Decode base64 image data - handle multiple formats
        $imageData = preg_replace('/^data:image\/(jpeg|png|gif|webp);base64,/', '', $imageData);
        $imageData = str_replace(' ', '+', $imageData);
        $imageBinary = base64_decode($imageData);

        error_log("Decoded image binary length: " . strlen($imageBinary)); // Debug log
        error_log("Base64 data length before decode: " . strlen($imageData)); // Debug log

        if (!$imageBinary) {
            error_log("Invalid image data after decoding"); // Debug log
            error_log("Base64 data sample: " . substr($imageData, 0, 100)); // Debug log
            return ['success' => false, 'message' => 'Invalid image data'];
        }

        // Verify the decoded data looks like a valid image
        if (strlen($imageBinary) < 100) {
            error_log("Image data too small: " . strlen($imageBinary)); // Debug log
            return ['success' => false, 'message' => 'Image data too small'];
        }

        // Get original file extension or default to jpg
        $originalName = $imageName ?? 'profile_' . $_SESSION['user_id'] . '.jpg';
        $fileExtension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

        // If no extension or unsupported format, use jpg
        if (empty($fileExtension) || !in_array($fileExtension, ['jpg', 'jpeg', 'png', 'gif', 'webp'])) {
            $fileExtension = 'jpg';
        }

        // Generate unique filename with correct extension
        $fileName = 'profile_' . $_SESSION['user_id'] . '_' . time() . '.' . $fileExtension;
        $filePath = $uploadDir . $fileName;

        error_log("Saving to file: " . $filePath); // Debug log
        error_log("Original format: " . $fileExtension); // Debug log
        error_log("Image binary size: " . strlen($imageBinary)); // Debug log

        // Save image
        if (file_put_contents($filePath, $imageBinary) === false) {
            error_log("Failed to save image to file"); // Debug log
            return ['success' => false, 'message' => 'Failed to save image'];
        }

        // Set proper permissions for web server access
        chmod($filePath, 0644);

        // Verify file was saved correctly
        if (!file_exists($filePath) || filesize($filePath) === 0) {
            error_log("File was not saved correctly"); // Debug log
            return ['success' => false, 'message' => 'Failed to save image file'];
        }

        // Verify the saved file is a valid image by checking its headers
        $fileHandle = fopen($filePath, 'rb');
        if ($fileHandle) {
            $header = fread($fileHandle, 8);
            fclose($fileHandle);

            // Check for common image format headers
            $isValidImage = false;
            if (strpos($header, "\xFF\xD8\xFF") === 0) { // JPEG
                $isValidImage = true;
                error_log("Valid JPEG image detected"); // Debug log
            } elseif (strpos($header, "\x89PNG\r\n\x1a\n") === 0) { // PNG
                $isValidImage = true;
                error_log("Valid PNG image detected"); // Debug log
            } elseif (strpos($header, "GIF87a") === 0 || strpos($header, "GIF89a") === 0) { // GIF
                $isValidImage = true;
                error_log("Valid GIF image detected"); // Debug log
            } elseif (strpos($header, "RIFF") === 0 && strpos($header, "WEBP") !== false) { // WebP
                $isValidImage = true;
                error_log("Valid WebP image detected"); // Debug log
            }

            if (!$isValidImage) {
                error_log("Invalid image file header: " . bin2hex($header)); // Debug log
                // Remove the invalid file
                unlink($filePath);
                return ['success' => false, 'message' => 'Invalid image format'];
            }
        }

        // Update user profile with image path
        $relativePath = 'assets/images/profiles/' . $fileName;
        error_log("Updating database with path: " . $relativePath); // Debug log

        $db->execute(
            'UPDATE users SET profile_picture = ? WHERE id = ?',
            [$relativePath, $_SESSION['user_id']]
        );

        error_log("Database update completed successfully"); // Debug log

        return [
            'success' => true,
            'message' => 'Profile picture updated successfully!',
            'image_path' => $relativePath
        ];
    } catch (Exception $e) {
        error_log("Exception in uploadProfilePicture: " . $e->getMessage()); // Debug log
        return ['success' => false, 'message' => 'Failed to upload profile picture: ' . $e->getMessage()];
    }
}

// Product management functions
function addProduct($db, $input) {
    if (!isset($_SESSION['user_id'])) {
        return ['success' => false, 'message' => 'Not logged in'];
    }

    // Only staff can add products
    if ($_SESSION['user_type'] !== 'staff') {
        return ['success' => false, 'message' => 'Only staff members can add products'];
    }

    $name = trim($input['name'] ?? '');
    $description = trim($input['description'] ?? '');
    $category = trim($input['category'] ?? '');
    $price = floatval($input['price'] ?? 0);
    $stock = intval($input['stock'] ?? 0);
    $imageData = $input['image_data'] ?? '';
    $imageName = $input['image_name'] ?? '';

    if (!$name || !$category || $price <= 0) {
        return ['success' => false, 'message' => 'Product name, category, and price are required'];
    }

    if ($stock < 0) {
        return ['success' => false, 'message' => 'Stock cannot be negative'];
    }

    try {
        // Handle image upload if provided
        $imagePath = null;
        if (!empty($imageData) && !empty($imageName)) {
            $imagePath = saveProductImage($imageData, $imageName);
        }

        // Insert product with image path if available
        if ($imagePath) {
            $db->execute(
                'INSERT INTO products (name, description, category, price, stock, image, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)',
                [$name, $description, $category, $price, $stock, $imagePath]
            );
        } else {
            $db->execute(
                'INSERT INTO products (name, description, category, price, stock, is_active) VALUES (?, ?, ?, ?, ?, 1)',
                [$name, $description, $category, $price, $stock]
            );
        }

        $productId = $db->lastInsertId();

        return [
            'success' => true,
            'message' => 'Product added successfully!',
            'product_id' => $productId,
            'image_uploaded' => !empty($imagePath)
        ];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Failed to add product: ' . $e->getMessage()];
    }
}

function updateProduct($db, $input) {
    if (!isset($_SESSION['user_id'])) {
        return ['success' => false, 'message' => 'Not logged in'];
    }

    // Only staff can update products
    if ($_SESSION['user_type'] !== 'staff') {
        return ['success' => false, 'message' => 'Only staff members can update products'];
    }

    $productId = intval($input['product_id'] ?? 0);
    $name = trim($input['name'] ?? '');
    $description = trim($input['description'] ?? '');
    $category = trim($input['category'] ?? '');
    $price = floatval($input['price'] ?? 0);
    $stock = intval($input['stock'] ?? 0);
    $isActive = intval($input['is_active'] ?? 1);
    $imageData = $input['image_data'] ?? '';
    $imageName = $input['image_name'] ?? '';

    if (!$productId) {
        return ['success' => false, 'message' => 'Product ID is required'];
    }

    // Check if product exists
    $product = $db->fetch('SELECT * FROM products WHERE id = ?', [$productId]);
    if (!$product) {
        return ['success' => false, 'message' => 'Product not found'];
    }

    if (!$name || !$category || $price <= 0) {
        return ['success' => false, 'message' => 'Product name, category, and price are required'];
    }

    if ($stock < 0) {
        return ['success' => false, 'message' => 'Stock cannot be negative'];
    }

    try {
        // Handle image upload if provided
        $imagePath = null;
        if (!empty($imageData) && !empty($imageName)) {
            $imagePath = saveProductImage($imageData, $imageName);
        }

        // Update product with image path if available
        if ($imagePath) {
            $db->execute(
                'UPDATE products SET name = ?, description = ?, category = ?, price = ?, stock = ?, image = ?, is_active = ? WHERE id = ?',
                [$name, $description, $category, $price, $stock, $imagePath, $isActive, $productId]
            );
        } else {
            $db->execute(
                'UPDATE products SET name = ?, description = ?, category = ?, price = ?, stock = ?, is_active = ? WHERE id = ?',
                [$name, $description, $category, $price, $stock, $isActive, $productId]
            );
        }

        return [
            'success' => true,
            'message' => 'Product updated successfully!',
            'product_id' => $productId,
            'image_uploaded' => !empty($imagePath)
        ];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Failed to update product: ' . $e->getMessage()];
    }
}

function deleteProduct($db, $input) {
    if (!isset($_SESSION['user_id'])) {
        return ['success' => false, 'message' => 'Not logged in'];
    }

    // Only staff can delete products
    if ($_SESSION['user_type'] !== 'staff') {
        return ['success' => false, 'message' => 'Only staff members can delete products'];
    }

    $productId = intval($input['product_id'] ?? 0);

    if (!$productId) {
        return ['success' => false, 'message' => 'Product ID is required'];
    }

    try {
        // Check if product exists
        $product = $db->fetch('SELECT * FROM products WHERE id = ?', [$productId]);
        if (!$product) {
            return ['success' => false, 'message' => 'Product not found'];
        }

        // Soft delete by setting is_active to 0
        $db->execute(
            'UPDATE products SET is_active = 0 WHERE id = ?',
            [$productId]
        );

        return [
            'success' => true,
            'message' => 'Product deleted successfully!',
            'product_id' => $productId
        ];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Failed to delete product: ' . $e->getMessage()];
    }
}

function uploadProductImage($db, $input) {
    if (!isset($_SESSION['user_id'])) {
        return ['success' => false, 'message' => 'Not logged in'];
    }

    // Only staff can upload product images
    if ($_SESSION['user_type'] !== 'staff') {
        return ['success' => false, 'message' => 'Only staff members can upload product images'];
    }

    $productId = intval($input['product_id'] ?? 0);
    $imageData = $input['image_data'] ?? '';
    $imageName = $input['image_name'] ?? 'product_' . $productId . '.jpg';

    if (!$productId) {
        return ['success' => false, 'message' => 'Product ID is required'];
    }

    if (!$imageData) {
        return ['success' => false, 'message' => 'No image data provided'];
    }

    try {
        // Check if product exists
        $product = $db->fetch('SELECT * FROM products WHERE id = ?', [$productId]);
        if (!$product) {
            return ['success' => false, 'message' => 'Product not found'];
        }

        // Create products directory if it doesn't exist
        $uploadDir = __DIR__ . '/../assets/images/products/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        // Decode base64 image data
        $imageData = str_replace('data:image/jpeg;base64,', '', $imageData);
        $imageData = str_replace('data:image/png;base64,', '', $imageData);
        $imageData = str_replace(' ', '+', $imageData);
        $imageBinary = base64_decode($imageData);

        if (!$imageBinary) {
            return ['success' => false, 'message' => 'Invalid image data'];
        }

        // Generate unique filename
        $fileName = 'product_' . $productId . '_' . time() . '.jpg';
        $filePath = $uploadDir . $fileName;

        // Save image
        if (file_put_contents($filePath, $imageBinary) === false) {
            return ['success' => false, 'message' => 'Failed to save image'];
        }

        // Update product with image path
        $relativePath = 'assets/images/products/' . $fileName;
        $db->execute(
            'UPDATE products SET image = ? WHERE id = ?',
            [$relativePath, $productId]
        );

        return [
            'success' => true,
            'message' => 'Product image updated successfully!',
            'image_path' => $relativePath
        ];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Failed to upload product image: ' . $e->getMessage()];
    }
}

function getAllProducts() {
    if (!isset($_SESSION['user_id'])) {
        return ['success' => false, 'message' => 'Not logged in'];
    }

    // Only staff can get all products (including inactive ones)
    if ($_SESSION['user_type'] !== 'staff') {
        return ['success' => false, 'message' => 'Only staff members can access all products'];
    }

    try {
        $db = getDB();
        // Only return active products for display in the store section
        $products = $db->fetchAll('SELECT * FROM products WHERE is_active = 1 ORDER BY name');
        return ['success' => true, 'data' => $products];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Failed to load products'];
    }
}

/**
 * Helper function to save product image
 */
function saveProductImage($imageData, $imageName) {
    // Create products directory if it doesn't exist
    $uploadDir = __DIR__ . '/../assets/images/products/';
    if (!is_dir($uploadDir)) {
        if (!mkdir($uploadDir, 0755, true)) {
            throw new Exception('Failed to create upload directory');
        }
    }

    // Ensure directory is writable
    if (!is_writable($uploadDir)) {
        chmod($uploadDir, 0755);
        if (!is_writable($uploadDir)) {
            throw new Exception('Upload directory is not writable');
        }
    }

    // Decode base64 image data - handle multiple formats
    $imageData = preg_replace('/^data:image\/(jpeg|png|gif|webp);base64,/', '', $imageData);
    $imageData = str_replace(' ', '+', $imageData);
    $imageBinary = base64_decode($imageData);

    if (!$imageBinary) {
        throw new Exception('Invalid image data - could not decode base64');
    }

    // Verify the decoded data looks like a valid image
    if (strlen($imageBinary) < 100) {
        throw new Exception('Image data too small - invalid image');
    }

    // Get original file extension or default to jpg
    $originalName = $imageName ?? 'product_image.jpg';
    $fileExtension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

    // If no extension or unsupported format, use jpg
    if (empty($fileExtension) || !in_array($fileExtension, ['jpg', 'jpeg', 'png', 'gif', 'webp'])) {
        $fileExtension = 'jpg';
    }

    // Generate unique filename with correct extension
    $fileName = 'product_' . time() . '_' . rand(1000, 9999) . '.' . $fileExtension;
    $filePath = $uploadDir . $fileName;

    // Save image
    if (file_put_contents($filePath, $imageBinary) === false) {
        throw new Exception('Failed to save image to file');
    }

    // Set proper permissions for web server access
    chmod($filePath, 0644);

    // Verify file was saved correctly
    if (!file_exists($filePath) || filesize($filePath) === 0) {
        throw new Exception('Failed to save image file correctly');
    }

    // Verify the saved file is a valid image by checking its headers
    $fileHandle = fopen($filePath, 'rb');
    if ($fileHandle) {
        $header = fread($fileHandle, 8);
        fclose($fileHandle);

        // Check for common image format headers
        $isValidImage = false;
        if (strpos($header, "\xFF\xD8\xFF") === 0) { // JPEG
            $isValidImage = true;
        } elseif (strpos($header, "\x89PNG\r\n\x1a\n") === 0) { // PNG
            $isValidImage = true;
        } elseif (strpos($header, "GIF87a") === 0 || strpos($header, "GIF89a") === 0) { // GIF
            $isValidImage = true;
        } elseif (strpos($header, "RIFF") === 0 && strpos($header, "WEBP") !== false) { // WebP
            $isValidImage = true;
        }

        if (!$isValidImage) {
            // Remove the invalid file
            unlink($filePath);
            throw new Exception('Invalid image format detected');
        }
    }

    return 'assets/images/products/' . $fileName;
}

// Medical History Functions
function addMedicalHistory($db, $input) {
    if (!isset($_SESSION['user_id'])) {
        return ['success' => false, 'message' => 'Not logged in'];
    }

    // Only staff can add medical history
    if ($_SESSION['user_type'] !== 'staff') {
        return ['success' => false, 'message' => 'Only staff members can add medical history'];
    }

    $appointmentId = intval($input['appointment_id'] ?? 0);
    $diagnosis = trim($input['diagnosis'] ?? '');
    $treatment = trim($input['treatment'] ?? '');
    $medications = trim($input['medications'] ?? '');
    $notes = trim($input['notes'] ?? '');
    $followUpDate = trim($input['follow_up_date'] ?? '');
    $followUpInstructions = trim($input['follow_up_instructions'] ?? '');

    if (!$appointmentId) {
        return ['success' => false, 'message' => 'Appointment ID is required'];
    }

    if (!$diagnosis || !$treatment) {
        return ['success' => false, 'message' => 'Diagnosis and treatment are required'];
    }

    try {
        // Check if appointment exists and is completed
        $appointment = $db->fetch('SELECT * FROM appointments WHERE id = ?', [$appointmentId]);
        if (!$appointment) {
            return ['success' => false, 'message' => 'Appointment not found'];
        }

        if ($appointment['status'] !== 'completed') {
            return ['success' => false, 'message' => 'Medical history can only be added to completed appointments'];
        }

        // Check if medical history already exists for this appointment
        $existing = $db->fetch('SELECT id FROM medical_history WHERE appointment_id = ?', [$appointmentId]);
        if ($existing) {
            return ['success' => false, 'message' => 'Medical history already exists for this appointment'];
        }

        // Insert medical history record
        $db->execute(
            'INSERT INTO medical_history (appointment_id, pet_id, staff_id, diagnosis, treatment, medications, notes, follow_up_date, follow_up_instructions, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))',
            [$appointmentId, $appointment['pet_id'], $_SESSION['user_id'], $diagnosis, $treatment, $medications, $notes, $followUpDate, $followUpInstructions]
        );

        $medicalHistoryId = $db->lastInsertId();

        return [
            'success' => true,
            'message' => 'Medical history saved successfully!',
            'medical_history_id' => $medicalHistoryId
        ];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Failed to save medical history: ' . $e->getMessage()];
    }
}

function getAppointmentDetails($db, $input) {
    if (!isset($_SESSION['user_id'])) {
        return ['success' => false, 'message' => 'Not logged in'];
    }

    $appointmentId = intval($input['appointment_id'] ?? 0);

    if (!$appointmentId) {
        return ['success' => false, 'message' => 'Appointment ID is required'];
    }

    try {
        // Get appointment details with related information
        $appointment = $db->fetch('
            SELECT
                a.*,
                s.name as service_name,
                p.name as pet_name,
                p.species,
                p.breed,
                p.age,
                p.gender,
                p.weight,
                p.color,
                u.first_name,
                u.last_name,
                u.email,
                u.phone
            FROM appointments a
            JOIN services s ON a.service_id = s.id
            JOIN pets p ON a.pet_id = p.id
            JOIN users u ON a.client_id = u.id
            WHERE a.id = ?
        ', [$appointmentId]);

        if (!$appointment) {
            return ['success' => false, 'message' => 'Appointment not found'];
        }

        return [
            'success' => true,
            'data' => $appointment
        ];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Failed to load appointment details: ' . $e->getMessage()];
    }
}

function getMedicalHistory($db, $input) {
    if (!isset($_SESSION['user_id'])) {
        return ['success' => false, 'message' => 'Not logged in'];
    }

    $petId = intval($input['pet_id'] ?? 0);

    if (!$petId) {
        return ['success' => false, 'message' => 'Pet ID is required'];
    }

    try {
        // Get medical history for a specific pet
        $medicalHistory = $db->fetchAll('
            SELECT
                mh.*,
                a.appointment_date,
                a.appointment_time,
                s.name as service_name,
                u.first_name as staff_first_name,
                u.last_name as staff_last_name,
                p.name as pet_name,
                p.species
            FROM medical_history mh
            JOIN appointments a ON mh.appointment_id = a.id
            JOIN services s ON a.service_id = s.id
            JOIN users u ON mh.staff_id = u.id
            JOIN pets p ON mh.pet_id = p.id
            WHERE mh.pet_id = ?
            ORDER BY mh.created_at DESC
        ', [$petId]);

        return [
            'success' => true,
            'data' => $medicalHistory
        ];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Failed to load medical history: ' . $e->getMessage()];
    }
}

// Admin Pet Management Functions
function updatePetAdmin($db, $input) {
    if (!isset($_SESSION['user_id'])) {
        return ['success' => false, 'message' => 'Not logged in'];
    }

    // Only staff can update pets
    if ($_SESSION['user_type'] !== 'staff') {
        return ['success' => false, 'message' => 'Only staff members can update pets'];
    }

    $petId = intval($input['pet_id'] ?? 0);
    $name = trim($input['name'] ?? '');
    $species = trim($input['species'] ?? '');
    $breed = trim($input['breed'] ?? '');
    $birthdate = trim($input['birthdate'] ?? '');
    $gender = trim($input['gender'] ?? '');
    $weight = floatval($input['weight'] ?? 0);
    $color = trim($input['color'] ?? '');
    $notes = trim($input['notes'] ?? '');

    if (!$petId) {
        return ['success' => false, 'message' => 'Pet ID is required'];
    }

    if (!$name || !$species || !$gender) {
        return ['success' => false, 'message' => 'Pet name, species, and gender are required'];
    }

    // Validate birthdate format if provided
    if (!empty($birthdate) && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $birthdate)) {
        return ['success' => false, 'message' => 'Birthdate must be in YYYY-MM-DD format'];
    }

    try {
        // Check if pet exists
        $pet = $db->fetch('SELECT * FROM pets WHERE id = ?', [$petId]);
        if (!$pet) {
            return ['success' => false, 'message' => 'Pet not found'];
        }

        // Calculate age from birthdate if provided
        $age = null;
        if (!empty($birthdate)) {
            $birthDateTime = new DateTime($birthdate);
            $currentDate = new DateTime();
            $age = $currentDate->diff($birthDateTime)->y;
        }

        // Update pet
        $db->execute(
            'UPDATE pets SET name = ?, species = ?, breed = ?, birthdate = ?, age = ?, gender = ?, weight = ?, color = ?, notes = ? WHERE id = ?',
            [$name, $species, $breed, $birthdate, $age, $gender, $weight, $color, $notes, $petId]
        );

        return [
            'success' => true,
            'message' => 'Pet updated successfully!',
            'pet_id' => $petId
        ];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Failed to update pet: ' . $e->getMessage()];
    }
}

function deletePetAdmin($db, $input) {
    if (!isset($_SESSION['user_id'])) {
        return ['success' => false, 'message' => 'Not logged in'];
    }

    // Only staff can delete pets
    if ($_SESSION['user_type'] !== 'staff') {
        return ['success' => false, 'message' => 'Only staff members can delete pets'];
    }

    $petId = intval($input['pet_id'] ?? 0);

    if (!$petId) {
        return ['success' => false, 'message' => 'Pet ID is required'];
    }

    try {
        // Check if pet exists
        $pet = $db->fetch('SELECT * FROM pets WHERE id = ?', [$petId]);
        if (!$pet) {
            return ['success' => false, 'message' => 'Pet not found'];
        }

        // Soft delete by setting is_active to 0
        $db->execute(
            'UPDATE pets SET is_active = 0 WHERE id = ?',
            [$petId]
        );

        return [
            'success' => true,
            'message' => 'Pet deleted successfully!',
            'pet_id' => $petId
        ];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Failed to delete pet: ' . $e->getMessage()];
    }
}

// Client Pet Management Functions
function updatePet($db, $input) {
    if (!isset($_SESSION['user_id'])) {
        return ['success' => false, 'message' => 'Not logged in'];
    }

    $petId = intval($input['pet_id'] ?? 0);
    $name = trim($input['pet_name'] ?? '');
    $species = trim($input['species'] ?? '');
    $breed = trim($input['breed'] ?? '');
    $birthdate = trim($input['birthdate'] ?? '');
    $gender = trim($input['gender'] ?? '');
    $color = trim($input['color'] ?? '');

    if (!$petId) {
        return ['success' => false, 'message' => 'Pet ID is required'];
    }

    if (!$name || !$species || !$gender) {
        return ['success' => false, 'message' => 'Pet name, species, and gender are required'];
    }

    // Validate birthdate format if provided
    if (!empty($birthdate) && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $birthdate)) {
        return ['success' => false, 'message' => 'Birthdate must be in YYYY-MM-DD format'];
    }

    try {
        // Check if pet exists and belongs to user
        $pet = $db->fetch('SELECT * FROM pets WHERE id = ? AND owner_id = ?', [$petId, $_SESSION['user_id']]);
        if (!$pet) {
            return ['success' => false, 'message' => 'Pet not found or not owned by you'];
        }

        // Calculate age from birthdate if provided
        $age = null;
        if (!empty($birthdate)) {
            $birthDateTime = new DateTime($birthdate);
            $currentDate = new DateTime();
            $age = $currentDate->diff($birthDateTime)->y;
        }

        // Update pet
        $db->execute(
            'UPDATE pets SET name = ?, species = ?, breed = ?, birthdate = ?, age = ?, gender = ?, color = ? WHERE id = ?',
            [$name, $species, $breed, $birthdate, $age, $gender, $color, $petId]
        );

        return [
            'success' => true,
            'message' => 'Pet updated successfully!',
            'pet_id' => $petId
        ];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Failed to update pet: ' . $e->getMessage()];
    }
}

function deletePet($db, $input) {
    if (!isset($_SESSION['user_id'])) {
        return ['success' => false, 'message' => 'Not logged in'];
    }

    $petId = intval($input['pet_id'] ?? 0);

    if (!$petId) {
        return ['success' => false, 'message' => 'Pet ID is required'];
    }

    try {
        // Check if pet exists and belongs to user
        $pet = $db->fetch('SELECT * FROM pets WHERE id = ? AND owner_id = ?', [$petId, $_SESSION['user_id']]);
        if (!$pet) {
            return ['success' => false, 'message' => 'Pet not found or not owned by you'];
        }

        // Soft delete by setting is_active to 0
        $db->execute(
            'UPDATE pets SET is_active = 0 WHERE id = ?',
            [$petId]
        );

        return [
            'success' => true,
            'message' => 'Pet deleted successfully!',
            'pet_id' => $petId
        ];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Failed to delete pet: ' . $e->getMessage()];
    }
}

