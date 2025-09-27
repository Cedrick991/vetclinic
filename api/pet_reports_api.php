<?php
/**
 * Pet Reports API
 * Handles generation and retrieval of printable pet reports
 */

require_once '../db/database.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    $db = getDB();
    $action = $_GET['action'] ?? '';

    switch ($action) {
        case 'get_pet_report':
            getPetReport($db);
            break;
        case 'get_pet_list':
            getPetList($db);
            break;
        case 'generate_pdf':
            generatePDF($db);
            break;
        default:
            throw new Exception('Invalid action');
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

/**
 * Get detailed pet report with all related information
 */
function getPetReport($db) {
    $petId = $_GET['pet_id'] ?? 0;

    if (!$petId) {
        throw new Exception('Pet ID is required');
    }

    // Get pet information
    $pet = $db->fetch("
        SELECT p.*, u.first_name, u.last_name, u.email, u.phone, u.address
        FROM pets p
        JOIN users u ON p.owner_id = u.id
        WHERE p.id = ?
    ", [$petId]);

    if (!$pet) {
        throw new Exception('Pet not found');
    }

    // Get appointment history
    $appointments = $db->fetchAll("
        SELECT a.*, s.name as service_name, u.first_name as staff_first_name, u.last_name as staff_last_name
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        LEFT JOIN users u ON a.staff_id = u.id
        WHERE a.pet_id = ?
        ORDER BY a.appointment_date DESC, a.appointment_time DESC
    ", [$petId]);

    // Get medical history
    $medicalHistory = $db->fetchAll("
        SELECT mh.*, a.appointment_date, a.appointment_time, s.name as service_name,
               u.first_name as staff_first_name, u.last_name as staff_last_name
        FROM medical_history mh
        JOIN appointments a ON mh.appointment_id = a.id
        JOIN services s ON a.service_id = s.id
        JOIN users u ON mh.staff_id = u.id
        WHERE mh.pet_id = ?
        ORDER BY mh.created_at DESC
    ", [$petId]);

    // Get vaccination records (if we had a vaccinations table)
    // For now, we'll extract vaccination info from appointment notes
    $vaccinations = [];
    foreach ($appointments as $appointment) {
        if (stripos($appointment['service_name'], 'vaccin') !== false ||
            stripos($appointment['notes'], 'vaccin') !== false) {
            $vaccinations[] = $appointment;
        }
    }

    // Get medical notes from appointments
    $medicalNotes = [];
    foreach ($appointments as $appointment) {
        if (!empty($appointment['notes'])) {
            $medicalNotes[] = [
                'date' => $appointment['appointment_date'],
                'service' => $appointment['service_name'],
                'notes' => $appointment['notes'],
                'staff' => $appointment['staff_first_name'] . ' ' . $appointment['staff_last_name']
            ];
        }
    }

    // Calculate pet age
    $age = 'Unknown';
    if ($pet['age']) {
        $age = $pet['age'] . ' years old';
    }

    // Format weight
    $weight = $pet['weight'] ? $pet['weight'] . ' kg' : 'Not recorded';

    $report = [
        'pet' => [
            'id' => $pet['id'],
            'name' => $pet['name'],
            'species' => $pet['species'],
            'breed' => $pet['breed'],
            'age' => $age,
            'gender' => $pet['gender'],
            'weight' => $weight,
            'color' => $pet['color'],
            'notes' => $pet['notes'],
            'registration_date' => $pet['created_at']
        ],
        'owner' => [
            'name' => $pet['first_name'] . ' ' . $pet['last_name'],
            'email' => $pet['email'],
            'phone' => $pet['phone'],
            'address' => $pet['address']
        ],
        'statistics' => [
            'total_appointments' => count($appointments),
            'total_vaccinations' => count($vaccinations),
            'total_medical_records' => count($medicalHistory),
            'last_visit' => !empty($appointments) ? $appointments[0]['appointment_date'] : null
        ],
        'appointments' => $appointments,
        'vaccinations' => $vaccinations,
        'medical_history' => $medicalHistory,
        'medical_notes' => $medicalNotes,
        'generated_at' => date('Y-m-d H:i:s'),
        'clinic_info' => [
            'name' => 'Tattoo Veterinary Clinic',
            'address' => 'Your Clinic Address',
            'phone' => '0917-519-4639',
            'email' => 'info@tattoovet.com'
        ]
    ];

    echo json_encode([
        'success' => true,
        'data' => $report
    ]);
}

/**
 * Get list of pets for report selection
 */
function getPetList($db) {
    $search = $_GET['search'] ?? '';
    $limit = $_GET['limit'] ?? 50;

    // Start session to get current user
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    $sql = "
        SELECT p.id, p.name, p.species, p.breed, p.owner_id,
               u.first_name, u.last_name, u.email
        FROM pets p
        JOIN users u ON p.owner_id = u.id
        WHERE p.is_active = 1
    ";

    $params = [];

    // If user is logged in and is a client, only show their pets
    if (isset($_SESSION['user_id']) && $_SESSION['user_type'] === 'client') {
        $sql .= " AND p.owner_id = ?";
        $params[] = $_SESSION['user_id'];
    }

    if (!empty($search)) {
        $sql .= " AND (p.name LIKE ? OR p.species LIKE ? OR p.breed LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)";
        $searchParam = "%$search%";
        $params = array_merge($params, [$searchParam, $searchParam, $searchParam, $searchParam, $searchParam]);
    }

    $sql .= " ORDER BY p.name LIMIT ?";

    if ($limit > 100) $limit = 100; // Prevent excessive results
    $params[] = $limit;

    $pets = $db->fetchAll($sql, $params);

    echo json_encode([
        'success' => true,
        'data' => $pets
    ]);
}

/**
 * Generate PDF report data for client-side PDF generation
 */
function generatePDF($db) {
    $petId = $_GET['pet_id'] ?? 0;

    if (!$petId) {
        throw new Exception('Pet ID is required');
    }

    // Get the same data as the regular report
    $pet = $db->fetch("
        SELECT p.*, u.first_name, u.last_name, u.email, u.phone, u.address
        FROM pets p
        JOIN users u ON p.owner_id = u.id
        WHERE p.id = ?
    ", [$petId]);

    if (!$pet) {
        throw new Exception('Pet not found');
    }

    $appointments = $db->fetchAll("
        SELECT a.*, s.name as service_name, u.first_name as staff_first_name, u.last_name as staff_last_name
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        LEFT JOIN users u ON a.staff_id = u.id
        WHERE a.pet_id = ?
        ORDER BY a.appointment_date DESC, a.appointment_time DESC
    ", [$petId]);

    // Get medical history
    $medicalHistory = $db->fetchAll("
        SELECT mh.*, a.appointment_date, a.appointment_time, s.name as service_name,
               u.first_name as staff_first_name, u.last_name as staff_last_name
        FROM medical_history mh
        JOIN appointments a ON mh.appointment_id = a.id
        JOIN services s ON a.service_id = s.id
        JOIN users u ON mh.staff_id = u.id
        WHERE mh.pet_id = ?
        ORDER BY mh.created_at DESC
    ", [$petId]);

    // Calculate age
    $age = 'Unknown';
    if ($pet['age']) {
        $age = $pet['age'] . ' years old';
    }

    // Format weight
    $weight = $pet['weight'] ? $pet['weight'] . ' kg' : 'Not recorded';

    // Prepare data for client-side PDF generation
    $reportData = [
        'pet' => [
            'id' => $pet['id'],
            'name' => $pet['name'],
            'species' => $pet['species'],
            'breed' => $pet['breed'],
            'age' => $age,
            'gender' => $pet['gender'],
            'weight' => $weight,
            'color' => $pet['color'],
            'notes' => $pet['notes'],
            'registration_date' => $pet['created_at']
        ],
        'owner' => [
            'name' => $pet['first_name'] . ' ' . $pet['last_name'],
            'email' => $pet['email'],
            'phone' => $pet['phone'],
            'address' => $pet['address']
        ],
        'statistics' => [
            'total_appointments' => count($appointments),
            'total_vaccinations' => count(array_filter($appointments, function($apt) {
                return stripos($apt['service_name'], 'vaccin') !== false;
            })),
            'total_medical_records' => count($medicalHistory),
            'last_visit' => !empty($appointments) ? $appointments[0]['appointment_date'] : null
        ],
        'appointments' => $appointments,
        'medical_history' => $medicalHistory,
        'clinic_info' => [
            'name' => 'Tattoo Veterinary Clinic',
            'address' => 'Your Clinic Address',
            'phone' => '0917-519-4639',
            'email' => 'info@tattoovet.com'
        ],
        'generated_at' => date('Y-m-d H:i:s')
    ];

    echo json_encode([
        'success' => true,
        'data' => $reportData,
        'message' => 'Report data prepared for client-side PDF generation'
    ]);
}

/**
 * Generate HTML for the pet report
 */
function generateReportHTML($pet, $appointments, $medicalHistory = []) {
    $age = $pet['age'] ? $pet['age'] . ' years old' : 'Age not recorded';
    $weight = $pet['weight'] ? $pet['weight'] . ' kg' : 'Weight not recorded';

    $html = '
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Pet Medical Report - ' . htmlspecialchars($pet['name']) . '</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .clinic-info { text-align: center; margin-bottom: 30px; }
            .section { margin-bottom: 30px; }
            .section h3 { background: #f0f0f0; padding: 10px; margin: 0 0 15px 0; border-left: 4px solid #007bff; }
            .info-grid { display: table; width: 100%; }
            .info-row { display: table-row; }
            .info-cell { display: table-cell; padding: 8px; border-bottom: 1px solid #ddd; }
            .info-label { font-weight: bold; width: 30%; }
            .appointment-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            .appointment-table th, .appointment-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .appointment-table th { background-color: #f8f9fa; font-weight: bold; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Tattoo Veterinary Clinic</h1>
            <h2>Pet Medical Report</h2>
        </div>

        <div class="clinic-info">
            <p><strong>Clinic Address:</strong> Your Clinic Address</p>
            <p><strong>Phone:</strong> 0917-519-4639 | <strong>Email:</strong> info@tattoovet.com</p>
            <p><strong>Report Generated:</strong> ' . date('F j, Y \a\t g:i A') . '</p>
        </div>

        <div class="section">
            <h3>Pet Information</h3>
            <div class="info-grid">
                <div class="info-row">
                    <div class="info-cell info-label">Name:</div>
                    <div class="info-cell">' . htmlspecialchars($pet['name']) . '</div>
                </div>
                <div class="info-row">
                    <div class="info-cell info-label">Species:</div>
                    <div class="info-cell">' . htmlspecialchars($pet['species']) . '</div>
                </div>
                <div class="info-row">
                    <div class="info-cell info-label">Breed:</div>
                    <div class="info-cell">' . htmlspecialchars($pet['breed'] ?: 'Not specified') . '</div>
                </div>
                <div class="info-row">
                    <div class="info-cell info-label">Age:</div>
                    <div class="info-cell">' . $age . '</div>
                </div>
                <div class="info-row">
                    <div class="info-cell info-label">Gender:</div>
                    <div class="info-cell">' . htmlspecialchars($pet['gender'] ?: 'Not specified') . '</div>
                </div>
                <div class="info-row">
                    <div class="info-cell info-label">Weight:</div>
                    <div class="info-cell">' . $weight . '</div>
                </div>
                <div class="info-row">
                    <div class="info-cell info-label">Color:</div>
                    <div class="info-cell">' . htmlspecialchars($pet['color'] ?: 'Not specified') . '</div>
                </div>
                <div class="info-row">
                    <div class="info-cell info-label">Registration Date:</div>
                    <div class="info-cell">' . date('F j, Y', strtotime($pet['created_at'])) . '</div>
                </div>
                ' . (!empty($pet['notes']) ? '
                <div class="info-row">
                    <div class="info-cell info-label">Notes:</div>
                    <div class="info-cell">' . htmlspecialchars($pet['notes']) . '</div>
                </div>' : '') . '
            </div>
        </div>

        <div class="section">
            <h3>Owner Information</h3>
            <div class="info-grid">
                <div class="info-row">
                    <div class="info-cell info-label">Name:</div>
                    <div class="info-cell">' . htmlspecialchars($pet['first_name'] . ' ' . $pet['last_name']) . '</div>
                </div>
                <div class="info-row">
                    <div class="info-cell info-label">Email:</div>
                    <div class="info-cell">' . htmlspecialchars($pet['email']) . '</div>
                </div>
                <div class="info-row">
                    <div class="info-cell info-label">Phone:</div>
                    <div class="info-cell">' . htmlspecialchars($pet['phone'] ?: 'Not provided') . '</div>
                </div>
                <div class="info-row">
                    <div class="info-cell info-label">Address:</div>
                    <div class="info-cell">' . htmlspecialchars($pet['address'] ?: 'Not provided') . '</div>
                </div>
            </div>
        </div>

        <div class="section">
            <h3>Appointment History</h3>
            <table class="appointment-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Service</th>
                        <th>Staff</th>
                        <th>Status</th>
                        <th>Notes</th>
                    </tr>
                </thead>
                <tbody>';

    foreach ($appointments as $appointment) {
        $html .= '
                    <tr>
                        <td>' . date('M j, Y', strtotime($appointment['appointment_date'])) . '<br><small>' . date('g:i A', strtotime($appointment['appointment_time'])) . '</small></td>
                        <td>' . htmlspecialchars($appointment['service_name']) . '</td>
                        <td>' . htmlspecialchars($appointment['staff_first_name'] . ' ' . $appointment['staff_last_name'] ?: 'Not assigned') . '</td>
                        <td>' . htmlspecialchars($appointment['status']) . '</td>
                        <td>' . htmlspecialchars($appointment['notes'] ?: 'No notes') . '</td>
                    </tr>';
    }

    $html .= '
                </tbody>
            </table>
            <p><strong>Total Appointments:</strong> ' . count($appointments) . '</p>
        </div>';

    // Add Medical History section if there are medical records
    if (!empty($medicalHistory)) {
        $html .= '
        <div class="section">
            <h3>Medical History</h3>
            <table class="appointment-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Service</th>
                        <th>Staff</th>
                        <th>Diagnosis</th>
                        <th>Treatment</th>
                    </tr>
                </thead>
                <tbody>';

        foreach ($medicalHistory as $record) {
            $html .= '
                    <tr>
                        <td>' . date('M j, Y', strtotime($record['appointment_date'])) . '<br><small>' . date('g:i A', strtotime($record['appointment_time'])) . '</small></td>
                        <td>' . htmlspecialchars($record['service_name']) . '</td>
                        <td>' . htmlspecialchars($record['staff_first_name'] . ' ' . $record['staff_last_name']) . '</td>
                        <td>' . htmlspecialchars(substr($record['diagnosis'], 0, 50) . (strlen($record['diagnosis']) > 50 ? '...' : '')) . '</td>
                        <td>' . htmlspecialchars(substr($record['treatment'], 0, 50) . (strlen($record['treatment']) > 50 ? '...' : '')) . '</td>
                    </tr>';
        }

        $html .= '
                </tbody>
            </table>
            <p><strong>Total Medical Records:</strong> ' . count($medicalHistory) . '</p>

            <!-- Detailed Medical Records -->
            <div class="medical-details">';

        foreach ($medicalHistory as $record) {
            $html .= '
                <div class="medical-record" style="margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 8px;">
                    <h4 style="margin: 0 0 10px 0; color: #333;">Medical Record - ' . date('M j, Y', strtotime($record['appointment_date'])) . '</h4>
                    <div style="margin-bottom: 10px;"><strong>Service:</strong> ' . htmlspecialchars($record['service_name']) . '</div>
                    <div style="margin-bottom: 10px;"><strong>Staff:</strong> ' . htmlspecialchars($record['staff_first_name'] . ' ' . $record['staff_last_name']) . '</div>
                    <div style="margin-bottom: 10px;"><strong>Diagnosis:</strong> ' . htmlspecialchars($record['diagnosis']) . '</div>
                    <div style="margin-bottom: 10px;"><strong>Treatment:</strong> ' . htmlspecialchars($record['treatment']) . '</div>';

            if (!empty($record['medications'])) {
                $html .= '<div style="margin-bottom: 10px;"><strong>Medications:</strong> ' . htmlspecialchars($record['medications']) . '</div>';
            }

            if (!empty($record['notes'])) {
                $html .= '<div style="margin-bottom: 10px;"><strong>Notes:</strong> ' . htmlspecialchars($record['notes']) . '</div>';
            }

            if (!empty($record['follow_up_date'])) {
                $html .= '<div style="margin-bottom: 10px;"><strong>Follow-up Date:</strong> ' . date('M j, Y', strtotime($record['follow_up_date'])) . '</div>';
            }

            if (!empty($record['follow_up_instructions'])) {
                $html .= '<div style="margin-bottom: 10px;"><strong>Follow-up Instructions:</strong> ' . htmlspecialchars($record['follow_up_instructions']) . '</div>';
            }

            $html .= '
                </div>';
        }

        $html .= '
            </div>
        </div>';
    }

    $html .= '
        <div class="footer">
            <p>This report contains confidential medical information and should only be shared with authorized personnel.</p>
            <p>For questions about this report, please contact Tattoo Veterinary Clinic.</p>
        </div>
    </body>
    </html>';

    return $html;
}
?>