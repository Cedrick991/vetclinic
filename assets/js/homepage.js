// Homepage Initialization
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Modal Handlers
    initializeModalHandlers();
    
    // Initialize Button Handlers
    initializeButtonHandlers();
});

// Initialize all modal-related functionality
function initializeModalHandlers() {
    // Login Modal
    window.showLoginModal = function() {
        document.getElementById('loginModal').style.display = 'flex';
        document.getElementById('registerModal').style.display = 'none';
        document.getElementById('forgotPasswordModal').style.display = 'none';
        document.getElementById('bookingModal').style.display = 'none';
    };

    // Register Modal
    window.showRegisterModal = function() {
        document.getElementById('registerModal').style.display = 'flex';
        document.getElementById('loginModal').style.display = 'none';
        document.getElementById('forgotPasswordModal').style.display = 'none';
        document.getElementById('bookingModal').style.display = 'none';
    };

    // Forgot Password Modal
    window.showForgotPasswordModal = function() {
        document.getElementById('forgotPasswordModal').style.display = 'flex';
        document.getElementById('loginModal').style.display = 'none';
        document.getElementById('registerModal').style.display = 'none';
        document.getElementById('bookingModal').style.display = 'none';
    };

    // Booking Modal
    window.showBookingModal = async function() {
        const loggedIn = await checkUserLogin();
        
        if (loggedIn) {
            // Get user info to determine if staff or client
            const response = await fetch('api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_user_info' })
            });
            
            const result = await response.json();
            if (result.success && result.data && result.data.user_type) {
                if (result.data.user_type === 'staff') {
                    // Redirect staff to their dashboard
                    window.location.href = 'staff.html';
                    return;
                }
            }
        }
        
        document.getElementById('bookingModal').style.display = 'flex';
        document.getElementById('loginRequiredMessage').style.display = loggedIn ? 'none' : 'block';
        document.getElementById('bookingForm').style.display = loggedIn ? 'block' : 'none';
        
        if (loggedIn) {
            // Load the user's pets and available services
            loadUserPets();
            loadServices();
        }
    };

    // Close any modal
    window.closeModal = function(modalId) {
        document.getElementById(modalId).style.display = 'none';
    };

    // Add click handlers to close modals when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    });
}

// Initialize all button click handlers
function initializeButtonHandlers() {
    // Add click handler for navigation links
    document.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', function(e) {
            if (this.getAttribute('href') === '#') {
                e.preventDefault();
            }
        });
    });

    // Password visibility toggle
    window.togglePasswordVisibility = function(formId) {
        const form = document.getElementById(formId);
        if (!form) return;
        
        const pwInput = form.querySelector('input[type="password"]');
        const pwToggle = form.querySelector('.password-toggle');
        
        if (pwInput && pwToggle) {
            if (pwInput.type === 'password') {
                pwInput.type = 'text';
                pwToggle.textContent = '🔒';
            } else {
                pwInput.type = 'password';
                pwToggle.textContent = '👁️';
            }
        }
    };

    // Form submissions
    initializeFormHandlers();
}

// Initialize form submissions
function initializeFormHandlers() {
    // Login Form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await handleLogin(new FormData(this));
        });
    }

    // Register Form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await handleRegistration(new FormData(this));
        });
    }

    // Booking Form
    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
        bookingForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await handleBooking(new FormData(this));
        });
    }
}

// Helper function to check user login status
function checkUserLogin() {
    // Check for user session
    const userSession = sessionStorage.getItem('user_session');
    return !!userSession;
}

// Form submission handlers
async function handleLogin(formData) {
    try {
        const email = formData.get('email');
        const password = formData.get('password');
        const employeeId = formData.get('employee_id') || '';

        // Determine login type based on employee_id presence
        let loginData = {
            action: 'login',
            email: email,
            password: password
        };

        // If employee_id is provided, it's a staff login
        if (employeeId.trim() !== '') {
            loginData.employee_id = employeeId.trim();
        }

        const response = await fetch('../api/vet_api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(loginData)
        });

        const result = await response.json();
        
        if (result.success) {
            // Store user session
            sessionStorage.setItem('user_session', JSON.stringify(result.data));
            
            showToast('Login successful! Redirecting...', 'success');
            closeModal('loginModal');
            
            // Redirect based on user type
            setTimeout(() => {
                if (result.user_type === 'staff') {
                    window.location.href = 'staff.html';
                } else if (result.user_type === 'client') {
                    window.location.href = 'client.html';
                } else {
                    // Fallback - try to determine from stored data
                    const userData = result.data;
                    if (userData && userData.position) {
                        // Has position = staff
                        window.location.href = 'staff.html';
                    } else {
                        // No position = client
                        window.location.href = 'client.html';
                    }
                }
            }, 1000);
        } else {
            showToast(result.message || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('Connection error. Please try again.', 'error');
    }
}

async function handleRegistration(formData) {
    try {
        console.log('Attempting registration API call...');
        
        const requestData = {
            action: 'register',
            user_type: formData.get('user_type'),
            first_name: formData.get('first_name'),
            last_name: formData.get('last_name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            password: formData.get('password'),
            address: formData.get('address'),
            employee_id: formData.get('employee_id') || null,
            position: formData.get('position') || null
        };
        
        console.log('Request data:', requestData);
        
        const response = await fetch('api/vet_api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        
        console.log('Response status:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('HTTP Error:', response.status, errorText);
            showToast(`Server error (${response.status}): ${response.statusText}`, 'error');
            return;
        }

        const result = await response.json();
        console.log('API response:', result);
        
        if (result.success) {
            showToast('Registration successful! Please login.', 'success');
            closeModal('registerModal');
            setTimeout(() => showLoginModal(), 1500);
        } else {
            showToast(result.message || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        
        // More specific error messages
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            showToast('Cannot connect to server. Make sure Apache is running.', 'error');
        } else if (error.name === 'SyntaxError') {
            showToast('Server returned invalid response. Check PHP errors.', 'error');
        } else {
            showToast('Connection error: ' + error.message, 'error');
        }
    }
}

async function handleBooking(formData) {
    if (!checkUserLogin()) {
        showToast('Please login to book an appointment', 'warning');
        return;
    }

    try {
        const response = await fetch('api/vet_api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'create_appointment',
                service_id: formData.get('service_id'),
                pet_id: formData.get('pet_id'),
                appointment_date: formData.get('appointment_date'),
                appointment_time: formData.get('appointment_time'),
                notes: formData.get('notes')
            })
        });

        const result = await response.json();
        
        if (result.success) {
            showToast('Appointment booked successfully!', 'success');
            closeModal('bookingModal');
        } else {
            showToast(result.message || 'Booking failed', 'error');
        }
    } catch (error) {
        console.error('Booking error:', error);
        showToast('An error occurred while booking', 'error');
    }
}

// Utility function to show toast notifications
function showToast(message, type = 'success') {
    // Standardize error messages
    if (type === 'error' && typeof message === 'object') {
        if (message.message) message = message.message;
    }
    
    // Log errors to console
    if (type === 'error') {
        console.error('Toast error:', message);
    }

    const toast = document.getElementById('toast');
    if (!toast) return;
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    toast.textContent = `${icons[type] || ''} ${message}`;
    toast.className = `toast toast-${type} show`;
    
    setTimeout(() => {
        toast.className = toast.className.replace('show', '');
    }, 3000);
}