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
                INSERT INTO users (first_name, last_name, email, phone, password, user_type, employee_id)
                VALUES ('Admin', 'User', 'admin@tattoovet.com', '0917-519-4639', '$adminPassword', 'staff', 'ADMIN001')
            ");

            // Insert sample client users
            $clientPassword = password_hash('client123', PASSWORD_DEFAULT);
            $this->pdo->exec("
                INSERT INTO users (first_name, last_name, email, phone, password, user_type, is_active) VALUES
                ('John', 'Smith', 'john.smith@email.com', '0917-123-4567', '$clientPassword', 'client', 1),
                ('Sarah', 'Johnson', 'sarah.johnson@email.com', '0917-234-5678', '$clientPassword', 'client', 1),
                ('Michael', 'Brown', 'michael.brown@email.com', '0917-345-6789', '$clientPassword', 'client', 1),
                ('Emily', 'Davis', 'emily.davis@email.com', '0917-456-7890', '$clientPassword', 'client', 1),
                ('David', 'Wilson', 'david.wilson@email.com', '0917-567-8901', '$clientPassword', 'client', 1)
            ");
            
            
            // Insert sample services
            $this->pdo->exec("
                INSERT INTO services (name, description, is_active) VALUES
                ('General Checkup', 'Comprehensive health examination', 1),
                ('Vaccination', 'Routine vaccination services', 1),
                ('Deworming', 'Internal parasite treatment', 1),
                ('Grooming', 'Professional pet grooming', 1),
                ('Dental Care', 'Dental cleaning and care', 1),
                ('Emergency Care', 'Emergency veterinary services', 1)
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
