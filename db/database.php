<?php
/**
 * Simple SQLite Database Class
 * Tattoo Veterinary Clinic - Fresh Start
 */

class VetDatabase {
    private static $instance = null;
    private $pdo = null;
    private $dbPath;
    
    private function __construct() {
        // Try multiple database locations in order of preference
        $possiblePaths = [
            __DIR__ . '/vet_clinic.db',                    // Current location
            sys_get_temp_dir() . '/vet_clinic.db',         // System temp directory
            'C:/xampp/tmp/vet_clinic.db',                  // XAMPP temp directory
            getcwd() . '/vet_clinic.db'                    // Current working directory
        ];
        
        $this->dbPath = null;
        foreach ($possiblePaths as $path) {
            $dir = dirname($path);
            if (is_dir($dir) && is_writable($dir)) {
                $this->dbPath = $path;
                break;
            }
        }
        
        // If no writable location found, use the first one and try to fix permissions
        if ($this->dbPath === null) {
            $this->dbPath = $possiblePaths[0];
        }
        
        $this->connect();
        $this->createTables();
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function connect() {
        try {
            // Ensure directory exists
            $dir = dirname($this->dbPath);
            if (!is_dir($dir)) {
                if (!mkdir($dir, 0777, true)) {
                    throw new Exception("Cannot create database directory: $dir");
                }
            }
            
            // Check if directory is writable
            if (!is_writable($dir)) {
                // Try to fix permissions
                @chmod($dir, 0777);
                if (!is_writable($dir)) {
                    throw new Exception("Database directory is not writable: $dir. Please run: icacls \"$dir\" /grant \"Everyone:(OI)(CI)F\"");
                }
            }
            
            // Check if database file exists and is writable
            if (file_exists($this->dbPath) && !is_writable($this->dbPath)) {
                @chmod($this->dbPath, 0666);
                if (!is_writable($this->dbPath)) {
                    throw new Exception("Database file is not writable: {$this->dbPath}. Please run: icacls \"{$this->dbPath}\" /grant \"Everyone:(F)\"");
                }
            }
            
            // Create SQLite connection
            $this->pdo = new PDO('sqlite:' . $this->dbPath);
            $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            
            // Enable foreign keys
            $this->pdo->exec('PRAGMA foreign_keys = ON');
            
            // Test write capability
            $this->pdo->exec('PRAGMA journal_mode = WAL');
            
        } catch (PDOException $e) {
            throw new Exception('Database connection failed: ' . $e->getMessage() . '. Database path: ' . $this->dbPath);
        } catch (Exception $e) {
            throw new Exception('Database setup failed: ' . $e->getMessage());
        }
    }
    
    private function createTables() {
        $tables = [
           // Users table (clients and staff)
           'users' => "
               CREATE TABLE IF NOT EXISTS users (
                   id INTEGER PRIMARY KEY AUTOINCREMENT,
                   first_name TEXT NOT NULL,
                   last_name TEXT NOT NULL,
                   email TEXT UNIQUE NOT NULL,
                   phone TEXT,
                   password TEXT NOT NULL,
                   user_type TEXT NOT NULL DEFAULT 'client',
                   employee_id TEXT,
                   address TEXT,
                   profile_picture TEXT,
                   is_active INTEGER DEFAULT 1,
                   email_verification_token TEXT,
                   token_expiry DATETIME,
                   email_verified_at DATETIME,
                   password_reset_token TEXT,
                   reset_token_expiry DATETIME,
                   created_at DATETIME DEFAULT CURRENT_TIMESTAMP
               )
           ",
            
            // Pets table
            'pets' => "
                CREATE TABLE IF NOT EXISTS pets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    owner_id INTEGER NOT NULL,
                    name TEXT NOT NULL,
                    species TEXT NOT NULL,
                    breed TEXT,
                    birthdate DATE,
                    age INTEGER,
                    gender TEXT,
                    weight REAL,
                    color TEXT,
                    notes TEXT,
                    is_active INTEGER DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (owner_id) REFERENCES users(id)
                )
            ",
            
            // Services table
            'services' => "
                CREATE TABLE IF NOT EXISTS services (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    description TEXT,
                    duration INTEGER DEFAULT 30,
                    is_active INTEGER DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ",
            
            // Appointments table
            'appointments' => "
                CREATE TABLE IF NOT EXISTS appointments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    client_id INTEGER NOT NULL,
                    pet_id INTEGER NOT NULL,
                    service_id INTEGER NOT NULL,
                    staff_id INTEGER,
                    appointment_date DATE NOT NULL,
                    appointment_time TIME NOT NULL,
                    status TEXT DEFAULT 'pending',
                    notes TEXT,
                    cancellation_requested INTEGER DEFAULT 0,
                    cancellation_reason TEXT,
                    appointment_duration INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (client_id) REFERENCES users(id),
                    FOREIGN KEY (pet_id) REFERENCES pets(id),
                    FOREIGN KEY (service_id) REFERENCES services(id),
                    FOREIGN KEY (staff_id) REFERENCES users(id)
                )
            ",
            
            // Products table
            'products' => "
                CREATE TABLE IF NOT EXISTS products (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    description TEXT,
                    category TEXT,
                    price REAL NOT NULL,
                    stock INTEGER DEFAULT 0,
                    image TEXT,
                    is_active INTEGER DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ",

            // Cart table
            'cart' => "
                CREATE TABLE IF NOT EXISTS cart (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    product_id INTEGER NOT NULL,
                    quantity INTEGER NOT NULL DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id),
                    FOREIGN KEY (product_id) REFERENCES products(id),
                    UNIQUE(user_id, product_id)
                )
            ",

            // Orders table
            'orders' => "
                CREATE TABLE IF NOT EXISTS orders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    total_amount REAL NOT NULL,
                    status TEXT DEFAULT 'pending',
                    payment_method TEXT,
                    order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            ",

            // Order items table
            'order_items' => "
                CREATE TABLE IF NOT EXISTS order_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    order_id INTEGER NOT NULL,
                    product_id INTEGER NOT NULL,
                    quantity INTEGER NOT NULL,
                    price REAL NOT NULL,
                    FOREIGN KEY (order_id) REFERENCES orders(id),
                    FOREIGN KEY (product_id) REFERENCES products(id)
                )
            ",

            // Medical history table
            'medical_history' => "
                CREATE TABLE IF NOT EXISTS medical_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    appointment_id INTEGER NOT NULL,
                    pet_id INTEGER NOT NULL,
                    staff_id INTEGER NOT NULL,
                    diagnosis TEXT,
                    treatment TEXT,
                    medications TEXT,
                    notes TEXT,
                    follow_up_date DATE,
                    follow_up_instructions TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (appointment_id) REFERENCES appointments(id),
                    FOREIGN KEY (pet_id) REFERENCES pets(id),
                    FOREIGN KEY (staff_id) REFERENCES users(id)
                )
            ",

            // Notifications table
            'notifications' => "
                CREATE TABLE IF NOT EXISTS notifications (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    type TEXT NOT NULL,
                    title TEXT NOT NULL,
                    message TEXT NOT NULL,
                    data TEXT,
                    priority TEXT DEFAULT 'normal',
                    is_read INTEGER DEFAULT 0,
                    read_at DATETIME,
                    expires_at DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            ",

            // Notification preferences table
            'notification_preferences' => "
                CREATE TABLE IF NOT EXISTS notification_preferences (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    notification_type TEXT NOT NULL,
                    is_enabled INTEGER DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id),
                    UNIQUE(user_id, notification_type)
                )
            ",

            // Notification read status table (for tracking read status per user)
            'notification_read_status' => "
                CREATE TABLE IF NOT EXISTS notification_read_status (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    notification_id INTEGER NOT NULL,
                    user_id INTEGER NOT NULL,
                    is_read INTEGER DEFAULT 0,
                    read_at DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (notification_id) REFERENCES notifications(id),
                    FOREIGN KEY (user_id) REFERENCES users(id),
                    UNIQUE(notification_id, user_id)
                )
            ",

            // Login attempts tracking table
            'login_attempts' => "
                CREATE TABLE IF NOT EXISTS login_attempts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT NOT NULL,
                    ip_address TEXT,
                    user_agent TEXT,
                    attempt_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                    is_successful INTEGER DEFAULT 0,
                    lockout_until DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ",

        ];
        
        foreach ($tables as $name => $sql) {
            $this->pdo->exec($sql);
        }

        // Check and add missing columns to existing tables
        $this->migrateExistingTables();

        // Insert default data if tables are empty
        $this->insertDefaultData();
    }
    
    private function insertDefaultData() {
        // Check if we already have data
        $userCount = $this->pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
        
        if ($userCount == 0) {
            // Insert default admin user
            $adminPassword = password_hash('admin123', PASSWORD_DEFAULT);
            $this->pdo->exec("
                INSERT INTO users (first_name, last_name, email, phone, password, user_type, employee_id, is_active, email_verified_at)
                VALUES ('Admin', 'User', 'admin@tattoovet.com', '0917-519-4639', '$adminPassword', 'staff', 'ADMIN001', 1, datetime('now'))
            ");

            // Insert sample client users (already verified)
            $clientPassword = password_hash('client123', PASSWORD_DEFAULT);
            $this->pdo->exec("
                INSERT INTO users (first_name, last_name, email, phone, password, user_type, is_active, email_verified_at) VALUES
                ('John', 'Smith', 'john.smith@email.com', '0917-123-4567', '$clientPassword', 'client', 1, datetime('now')),
                ('Sarah', 'Johnson', 'sarah.johnson@email.com', '0917-234-5678', '$clientPassword', 'client', 1, datetime('now')),
                ('Michael', 'Brown', 'michael.brown@email.com', '0917-345-6789', '$clientPassword', 'client', 1, datetime('now')),
                ('Emily', 'Davis', 'emily.davis@email.com', '0917-456-7890', '$clientPassword', 'client', 1, datetime('now')),
                ('David', 'Wilson', 'david.wilson@email.com', '0917-567-8901', '$clientPassword', 'client', 1, datetime('now'))
            ");
            
            
            // Insert sample services
            $this->pdo->exec("
                INSERT INTO services (name, description, duration, is_active) VALUES
                ('General Checkup', 'Comprehensive health examination', 30, 1),
                ('Vaccination', 'Routine vaccination services', 15, 1),
                ('Deworming', 'Internal parasite treatment', 20, 1),
                ('Grooming', 'Professional pet grooming', 60, 1),
                ('Dental Care', 'Dental cleaning and care', 45, 1),
                ('Emergency Care', 'Emergency veterinary services', 30, 1),
                ('BASIC OBEDIENCE TRAINING', 'Basic obedience training for dogs', 60, 1),
                ('DEWORMING', 'Internal and external parasite treatment', 20, 1),
                ('MICROCHIP IMPLANTING', 'Pet microchip identification implant', 15, 1),
                ('VACCINATION', 'Vaccination and immunization services', 15, 1),
                ('PET BOARDING', 'Pet boarding and daycare services', 60, 1),
                ('EXTERNAL PARASITE PREVENTION', 'Flea and tick prevention treatment', 20, 1),
                ('EUTHANASIA', 'Humane euthanasia services', 30, 1),
                ('COMPREHENSIVE GENERAL CHECK UP', 'Complete physical examination', 45, 1),
                ('GROOMING', 'Professional pet grooming and styling', 60, 1),
                ('DENTAL SURGERY', 'Dental surgery and oral care', 90, 1),
                ('SURGERY', 'General surgical procedures', 120, 1),
                ('HOME SERVICE BY APPOINTMENT', 'Veterinary services at your home', 60, 1)
            ");

            // Insert sample products
            $this->pdo->exec("
                INSERT INTO products (name, description, category, price, stock) VALUES
                ('Premium Dog Food 5kg', 'High-quality dry dog food', 'Food', 1200.00, 50),
                ('Cat Food Wet 400g', 'Nutritious wet cat food', 'Food', 180.00, 100),
                ('Dog Toy Ball', 'Durable rubber ball', 'Toys', 250.00, 30),
                ('Pet Shampoo', 'Gentle pet shampoo', 'Grooming', 220.00, 25),
                ('Pet Collar', 'Adjustable pet collar', 'Accessories', 180.00, 40)
            ");

            // Insert sample pets for the clients
            $this->pdo->exec("
                INSERT INTO pets (owner_id, name, species, breed, birthdate, age, gender, weight, color) VALUES
                (2, 'Buddy', 'Dog', 'Golden Retriever', '2021-03-15', 3, 'Male', 25.5, 'Golden'),
                (2, 'Whiskers', 'Cat', 'Persian', '2022-07-20', 2, 'Female', 4.2, 'White'),
                (3, 'Max', 'Dog', 'Labrador', '2019-11-08', 5, 'Male', 30.0, 'Black'),
                (3, 'Luna', 'Cat', 'Siamese', '2023-05-12', 1, 'Female', 3.8, 'Cream'),
                (4, 'Bella', 'Dog', 'Beagle', '2020-09-25', 4, 'Female', 12.5, 'Tri-color'),
                (5, 'Charlie', 'Dog', 'Poodle', '2022-01-30', 2, 'Male', 8.0, 'White'),
                (5, 'Milo', 'Cat', 'Maine Coon', '2021-12-03', 3, 'Male', 6.5, 'Gray')
            ");

            // Insert default notification preferences for all users
            $this->pdo->exec("
                INSERT OR IGNORE INTO notification_preferences (user_id, notification_type, is_enabled) VALUES
                -- Admin user preferences
                (1, 'appointment_new', 1),
                (1, 'appointment_status_change', 1),
                (1, 'appointment_reminder', 1),
                (1, 'pet_registration', 1),
                (1, 'medical_history_update', 1),
                (1, 'order_new', 1),
                (1, 'product_stock_alert', 1),
                (1, 'system_announcement', 1),

                -- Client users preferences (IDs 2-6)
                (2, 'appointment_new', 1),
                (2, 'appointment_status_change', 1),
                (2, 'appointment_reminder', 1),
                (2, 'medical_history_update', 1),
                (2, 'order_new', 1),
                (2, 'order_status_change', 1),
                (2, 'system_announcement', 1),

                (3, 'appointment_new', 1),
                (3, 'appointment_status_change', 1),
                (3, 'appointment_reminder', 1),
                (3, 'medical_history_update', 1),
                (3, 'order_new', 1),
                (3, 'order_status_change', 1),
                (3, 'system_announcement', 1),

                (4, 'appointment_new', 1),
                (4, 'appointment_status_change', 1),
                (4, 'appointment_reminder', 1),
                (4, 'medical_history_update', 1),
                (4, 'order_new', 1),
                (4, 'order_status_change', 1),
                (4, 'system_announcement', 1),

                (5, 'appointment_new', 1),
                (5, 'appointment_status_change', 1),
                (5, 'appointment_reminder', 1),
                (5, 'medical_history_update', 1),
                (5, 'order_new', 1),
                (5, 'order_status_change', 1),
                (5, 'system_announcement', 1),

                (6, 'appointment_new', 1),
                (6, 'appointment_status_change', 1),
                (6, 'appointment_reminder', 1),
                (6, 'medical_history_update', 1),
                (6, 'order_new', 1),
                (6, 'order_status_change', 1),
                (6, 'system_announcement', 1)
            ");
        }
    }
    
    public function query($sql, $params = []) {
        try {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            return $stmt;
        } catch (PDOException $e) {
            throw new Exception('Database query failed: ' . $e->getMessage());
        }
    }
    
    public function fetch($sql, $params = []) {
        return $this->query($sql, $params)->fetch();
    }
    
    public function fetchAll($sql, $params = []) {
        return $this->query($sql, $params)->fetchAll();
    }
    
    public function execute($sql, $params = []) {
        return $this->query($sql, $params)->rowCount();
    }
    
    public function lastInsertId() {
        return $this->pdo->lastInsertId();
    }
    
    public function getConnection() {
        return $this->pdo;
    }
    
    public function getDatabaseInfo() {
        return [
            'path' => $this->dbPath,
            'size' => file_exists($this->dbPath) ? filesize($this->dbPath) : 0,
            'tables' => $this->getTables()
        ];
    }
    
    private function migrateExistingTables() {
        // Check if users table has profile_picture column
        $columns = $this->pdo->query("PRAGMA table_info(users)")->fetchAll(PDO::FETCH_ASSOC);
        $hasProfilePicture = false;

        foreach ($columns as $column) {
            if ($column['name'] === 'profile_picture') {
                $hasProfilePicture = true;
                break;
            }
        }

        // Add profile_picture column if missing
        if (!$hasProfilePicture) {
            try {
                $this->pdo->exec("ALTER TABLE users ADD COLUMN profile_picture TEXT");
                echo "✅ Added missing profile_picture column to users table\n";
            } catch (Exception $e) {
                // Column might already exist, continue silently
            }
        }

        // Check if products table has image column
        $columns = $this->pdo->query("PRAGMA table_info(products)")->fetchAll(PDO::FETCH_ASSOC);
        $hasImage = false;

        foreach ($columns as $column) {
            if ($column['name'] === 'image') {
                $hasImage = true;
                break;
            }
        }

        // Add image column if missing
        if (!$hasImage) {
            try {
                $this->pdo->exec("ALTER TABLE products ADD COLUMN image TEXT");
                echo "✅ Added missing image column to products table\n";
            } catch (Exception $e) {
                // Column might already exist, continue silently
            }
        }

        // Check if pets table has birthdate column
        $columns = $this->pdo->query("PRAGMA table_info(pets)")->fetchAll(PDO::FETCH_ASSOC);
        $hasBirthdate = false;

        foreach ($columns as $column) {
            if ($column['name'] === 'birthdate') {
                $hasBirthdate = true;
                break;
            }
        }

        // Add birthdate column if missing
        if (!$hasBirthdate) {
            try {
                $this->pdo->exec("ALTER TABLE pets ADD COLUMN birthdate DATE");
                echo "✅ Added missing birthdate column to pets table\n";
            } catch (Exception $e) {
                // Column might already exist, continue silently
            }
        }

        // Check if appointments table has cancellation_requested column
        $columns = $this->pdo->query("PRAGMA table_info(appointments)")->fetchAll(PDO::FETCH_ASSOC);
        $hasCancellationRequested = false;

        foreach ($columns as $column) {
            if ($column['name'] === 'cancellation_requested') {
                $hasCancellationRequested = true;
                break;
            }
        }

        // Add cancellation_requested column if missing
        if (!$hasCancellationRequested) {
            try {
                $this->pdo->exec("ALTER TABLE appointments ADD COLUMN cancellation_requested INTEGER DEFAULT 0");
                echo "✅ Added missing cancellation_requested column to appointments table\n";
            } catch (Exception $e) {
                // Column might already exist, continue silently
            }
        }

        // Check if appointments table has appointment_duration column
        $columns = $this->pdo->query("PRAGMA table_info(appointments)")->fetchAll(PDO::FETCH_ASSOC);
        $hasAppointmentDuration = false;

        foreach ($columns as $column) {
            if ($column['name'] === 'appointment_duration') {
                $hasAppointmentDuration = true;
                break;
            }
        }

        // Add appointment_duration column if missing
        if (!$hasAppointmentDuration) {
            try {
                $this->pdo->exec("ALTER TABLE appointments ADD COLUMN appointment_duration INTEGER");
                echo "✅ Added missing appointment_duration column to appointments table\n";
            } catch (Exception $e) {
                // Column might already exist, continue silently
            }
        }

        // Check if appointments table has cancellation_reason column
        $columns = $this->pdo->query("PRAGMA table_info(appointments)")->fetchAll(PDO::FETCH_ASSOC);
        $hasCancellationReason = false;

        foreach ($columns as $column) {
            if ($column['name'] === 'cancellation_reason') {
                $hasCancellationReason = true;
                break;
            }
        }

        // Add cancellation_reason column if missing
        if (!$hasCancellationReason) {
            try {
                $this->pdo->exec("ALTER TABLE appointments ADD COLUMN cancellation_reason TEXT");
                echo "✅ Added missing cancellation_reason column to appointments table\n";
            } catch (Exception $e) {
                // Column might already exist, continue silently
            }
        }

        // Check if orders table has payment_method column
        $columns = $this->pdo->query("PRAGMA table_info(orders)")->fetchAll(PDO::FETCH_ASSOC);
        $hasPaymentMethod = false;

        foreach ($columns as $column) {
            if ($column['name'] === 'payment_method') {
                $hasPaymentMethod = true;
                break;
            }
        }

        // Add payment_method column if missing
        if (!$hasPaymentMethod) {
            try {
                $this->pdo->exec("ALTER TABLE orders ADD COLUMN payment_method TEXT");
                echo "✅ Added missing payment_method column to orders table\n";
            } catch (Exception $e) {
                // Column might already exist, continue silently
            }
        }

        // Check if services table has duration column
        $columns = $this->pdo->query("PRAGMA table_info(services)")->fetchAll(PDO::FETCH_ASSOC);
        $hasDuration = false;

        foreach ($columns as $column) {
            if ($column['name'] === 'duration') {
                $hasDuration = true;
                break;
            }
        }

        // Add duration column if missing
        if (!$hasDuration) {
            try {
                $this->pdo->exec("ALTER TABLE services ADD COLUMN duration INTEGER DEFAULT 30");
                echo "✅ Added missing duration column to services table\n";
            } catch (Exception $e) {
                // Column might already exist, continue silently
            }
        }

        // Check if users table has email_verification_token column
        $columns = $this->pdo->query("PRAGMA table_info(users)")->fetchAll(PDO::FETCH_ASSOC);
        $hasEmailVerificationToken = false;

        foreach ($columns as $column) {
            if ($column['name'] === 'email_verification_token') {
                $hasEmailVerificationToken = true;
                break;
            }
        }

        // Add email verification columns if missing
        if (!$hasEmailVerificationToken) {
            try {
                $this->pdo->exec("ALTER TABLE users ADD COLUMN email_verification_token TEXT");
                echo "✅ Added missing email_verification_token column to users table\n";
            } catch (Exception $e) {
                // Column might already exist, continue silently
            }
        }

        // Check if users table has token_expiry column
        $hasTokenExpiry = false;
        foreach ($columns as $column) {
            if ($column['name'] === 'token_expiry') {
                $hasTokenExpiry = true;
                break;
            }
        }

        if (!$hasTokenExpiry) {
            try {
                $this->pdo->exec("ALTER TABLE users ADD COLUMN token_expiry DATETIME");
                echo "✅ Added missing token_expiry column to users table\n";
            } catch (Exception $e) {
                // Column might already exist, continue silently
            }
        }

        // Check if users table has email_verified_at column
        $hasEmailVerifiedAt = false;
        foreach ($columns as $column) {
            if ($column['name'] === 'email_verified_at') {
                $hasEmailVerifiedAt = true;
                break;
            }
        }

        if (!$hasEmailVerifiedAt) {
            try {
                $this->pdo->exec("ALTER TABLE users ADD COLUMN email_verified_at DATETIME");
                echo "✅ Added missing email_verified_at column to users table\n";
            } catch (Exception $e) {
                // Column might already exist, continue silently
            }
        }

        // Check if users table has password_reset_token column
        $hasPasswordResetToken = false;
        foreach ($columns as $column) {
            if ($column['name'] === 'password_reset_token') {
                $hasPasswordResetToken = true;
                break;
            }
        }

        if (!$hasPasswordResetToken) {
            try {
                $this->pdo->exec("ALTER TABLE users ADD COLUMN password_reset_token TEXT");
                echo "✅ Added missing password_reset_token column to users table\n";
            } catch (Exception $e) {
                // Column might already exist, continue silently
            }
        }

        // Check if users table has reset_token_expiry column
        $hasResetTokenExpiry = false;
        foreach ($columns as $column) {
            if ($column['name'] === 'reset_token_expiry') {
                $hasResetTokenExpiry = true;
                break;
            }
        }

        if (!$hasResetTokenExpiry) {
            try {
                $this->pdo->exec("ALTER TABLE users ADD COLUMN reset_token_expiry DATETIME");
                echo "✅ Added missing reset_token_expiry column to users table\n";
            } catch (Exception $e) {
                // Column might already exist, continue silently
            }
        }

        // Check and add 2FA related columns
        $columns = $this->pdo->query("PRAGMA table_info(users)")->fetchAll(PDO::FETCH_ASSOC);
        $existingColumns = array_column($columns, 'name');
        
        $twoFAColumns = [
            'two_factor_enabled' => 'INTEGER DEFAULT 0',
            'otp_code' => 'TEXT',
            'otp_expiry' => 'DATETIME',
            'backup_codes' => 'TEXT',  // JSON array of backup codes
            'last_otp_request' => 'DATETIME'
        ];

        foreach ($twoFAColumns as $columnName => $columnType) {
            if (!in_array($columnName, $existingColumns)) {
                try {
                    $this->pdo->exec("ALTER TABLE users ADD COLUMN $columnName $columnType");
                    echo "✅ Added missing $columnName column to users table\n";
                } catch (Exception $e) {
                    // Column might already exist, continue silently
                }
            }
        }
    }

    private function getTables() {
        $stmt = $this->pdo->query("SELECT name FROM sqlite_master WHERE type='table'");
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    }
}

// Global helper function
function getDB() {
    return VetDatabase::getInstance();
}
?>
