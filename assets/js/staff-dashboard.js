/**
 * Staff Dashboard JavaScript
 * Handles staff-specific functionality for the veterinary clinic management system
 */

class StaffDashboard {
    constructor() {
        this.userData = null;
        this.userType = 'staff';
        this.sessionCheckInterval = null;
        this.sessionWarningShown = false;
        this.pendingStatusChanges = {};
        this.init();
    }

    async init() {
        try {
            console.log('🏁 Staff Dashboard initialization starting...');

            // Check session with retry logic
            let sessionValid = false;
            let retryCount = 0;
            const maxRetries = 3;

            while (!sessionValid && retryCount < maxRetries) {
                try {
                    console.log(`🔐 Session check attempt ${retryCount + 1}...`);
                    await this.checkSession();
                    sessionValid = true;
                    console.log('✅ Session check successful');
                } catch (error) {
                    retryCount++;
                    console.warn(`❌ Session check attempt ${retryCount} failed:`, error);
                    if (retryCount < maxRetries) {
                        console.log('⏳ Waiting 1 second before retry...');
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
            }

            if (!sessionValid) {
                throw new Error('Session validation failed after retries');
            }

            console.log('👤 Loading user data...');
            // Load user data and dashboard data
            await this.loadUserData();
            console.log('📊 Loading dashboard data...');
            await this.loadDashboardData();
            console.log('🔧 Setting up event listeners...');
            this.setupEventListeners();
            console.log('👀 Starting session monitoring...');
            this.startSessionMonitoring();
            console.log('🎉 Staff Dashboard initialization complete!');
            this.showToast('Welcome to Staff Dashboard!', 'success');

        } catch (error) {
            console.error('❌ Staff Dashboard initialization error:', error);
            this.redirectToLogin();
        }
    }

    startSessionMonitoring() {
        // Check session every 5 minutes
        this.sessionCheckInterval = setInterval(async () => {
            try {
                await this.checkSession();
                this.sessionWarningShown = false;
            } catch (error) {
                console.warn('Session check during monitoring failed:', error);
                if (!this.sessionWarningShown) {
                    this.showSessionWarning();
                }
            }
        }, 5 * 60 * 1000);

        // Warn user 2 minutes before session expires
        this.sessionWarningInterval = setInterval(() => {
            this.checkSessionTimeout();
        }, 60 * 1000);
    }

    async checkSessionTimeout() {
        try {
            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_user_info' })
            });

            const result = await response.json();

            if (!result.success && result.message === 'Session expired') {
                this.handleSessionExpired();
            }
        } catch (error) {
            console.warn('Session timeout check failed:', error);
        }
    }

    showSessionWarning() {
        this.sessionWarningShown = true;
        this.showToast('Your session will expire soon. Please save your work.', 'warning');

        // Auto-extend session by making a request
        fetch('../api/vet_api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get_user_info' })
        }).catch(error => console.warn('Session extension failed:', error));
    }

    handleSessionExpired() {
        this.showToast('Your session has expired. Redirecting to login...', 'error');
        clearInterval(this.sessionCheckInterval);
        clearInterval(this.sessionWarningInterval);

        setTimeout(() => {
            this.redirectToLogin();
        }, 3000);
    }

    stopSessionMonitoring() {
        if (this.sessionCheckInterval) {
            clearInterval(this.sessionCheckInterval);
        }
        if (this.sessionWarningInterval) {
            clearInterval(this.sessionWarningInterval);
        }
    }

    async checkSession() {
        try {
            console.log('🔐 Making session check API call...');
            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'check_session' })
            });

            console.log('📡 Session check response status:', response.status);

            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('📊 Session check result:', result);

            if (!result.success) {
                throw new Error(result.message || 'Session check failed');
            }

            if (!result.data?.logged_in) {
                throw new Error('Not logged in');
            }

            this.userType = result.data.user_type;
            console.log('👤 User type set to:', this.userType);
            return result;
        } catch (error) {
            console.error('❌ Session check failed:', error);
            throw error;
        }
    }

    async loadUserData() {
        try {
            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_user_info' })
            });

            const result = await response.json();

            if (result.success && result.data) {
                this.userData = result.data;
                this.updateUserDisplay();
            }
        } catch (error) {
            console.error('Failed to load user data:', error);
        }
    }

    updateUserDisplay() {
        // Update staff name in sidebar
        const staffNameElement = document.getElementById('staffName');
        const staffRoleElement = document.getElementById('staffRole');

        if (staffNameElement && this.userData && this.userData.user) {
            staffNameElement.textContent = this.userData.user.name || 'Staff User';
        }

        if (staffRoleElement && this.userData && this.userData.user) {
            staffRoleElement.textContent = this.userData.user.position || 'Staff Member';
        }

        // Update welcome message
        const welcomeTitle = document.querySelector('.welcome-title');
        if (welcomeTitle && this.userData && this.userData.user && this.userData.user.name) {
            const firstName = this.userData.user.name.split(' ')[0];
            welcomeTitle.innerHTML = `<i class="fas fa-clinic-medical"></i> Welcome back, ${firstName}!`;
        }

        // Update profile picture if available
        if (this.userData && this.userData.user && this.userData.user.profile_picture) {
            this.updateProfilePicture(this.userData.user.profile_picture);
        }
    }

    updateProfilePicture(imagePath) {
        console.log('Updating staff profile picture with path:', imagePath);

        const profileImages = document.querySelectorAll('#staffAvatar');
        console.log('Found profile images:', profileImages.length);

        profileImages.forEach((img, index) => {
            const newSrc = '../' + imagePath + '?t=' + Date.now();
            console.log(`Updating staff image ${index + 1}:`, img.id || img.className, 'from', img.src, 'to', newSrc);

            img.src = '';
            img.src = newSrc;

            img.onerror = function() {
                console.error('Failed to load staff profile image:', newSrc);
                this.src = '../assets/images/logoo.jpg';
            };

            img.onload = function() {
                console.log('Staff profile image loaded successfully:', newSrc);
            };
        });
    }

    async loadDashboardData() {
        try {
            console.log('🔄 Loading dashboard data...');

            // First try to check if we have an active session
            let sessionValid = false;
            try {
                await this.checkSession();
                sessionValid = true;
                console.log('✅ Active session found');
            } catch (sessionError) {
                console.log('❌ No active session, using fallback mode for demo...');
            }

            // If no session, try to establish one for demo purposes
            if (!sessionValid) {
                try {
                    console.log('🔐 Attempting to establish demo session...');
                    const loginResponse = await fetch('../api/vet_api.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'login',
                            email: 'karla.tattao@email.com',
                            password: 'password123'
                        })
                    });

                    const loginResult = await loginResponse.json();
                    console.log('Auto-login result:', loginResult);

                    if (loginResult.success) {
                        sessionValid = true;
                        console.log('✅ Demo session established');
                    }
                } catch (loginError) {
                    console.log('❌ Auto-login failed, proceeding with fallback mode');
                }
            }

            // Load data - either with session or in fallback mode
            if (sessionValid) {
                await this.loadDashboardDataWithSession();
            } else {
                // Use mock data for demonstration when PHP server is not available
                await this.loadDashboardDataMock();
            }

        } catch (error) {
            console.error('❌ Failed to load dashboard data:', error);
            // Final fallback attempt with mock data
            await this.loadDashboardDataMock();
        }
    }

    async loadDashboardDataWithSession() {
        console.log('🔄 Loading dashboard data with active session...');

        try {
            // Load real data from API
            const [dashboardResponse, appointmentsResponse] = await Promise.all([
                fetch('../api/vet_api.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'get_dashboard_data' })
                }),
                fetch('../api/vet_api.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'get_appointments' })
                })
            ]);

            console.log('📡 API responses received');

            const dashboardResult = await dashboardResponse.json();
            const appointmentsResult = await appointmentsResponse.json();

            console.log('📊 Dashboard API result:', dashboardResult);
            console.log('📅 Appointments API result:', appointmentsResult);

            if (dashboardResult.success) {
                console.log('✅ Updating dashboard cards with data:', dashboardResult.data);
                this.updateDashboardCards(dashboardResult.data);
            } else {
                console.error('❌ Dashboard API failed:', dashboardResult.message);
                // Don't show error toast for dashboard data failure
            }

            // Recent activity removed - today's schedule no longer updated

            // Load other sections
            console.log('🔄 Loading other sections...');
            await this.loadAppointmentsSection();
            await this.loadClientsSection();
            await this.loadPetsSection();
            await this.loadServicesSection();
            console.log('✅ All sections loaded');
        } catch (error) {
            console.error('❌ Error loading dashboard data:', error);
            // Don't show error toast, just log it
        }
    }

    async loadDashboardDataFallback() {
        console.log('🔄 Loading dashboard data in fallback mode...');

        try {
            // Load clients data directly
            const clientsResponse = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_clients' })
            });

            const clientsResult = await clientsResponse.json();
            console.log('Clients fallback result:', clientsResult);

            // Load appointments data directly
            const appointmentsResponse = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_appointments' })
            });

            const appointmentsResult = await appointmentsResponse.json();
            console.log('Appointments fallback result:', appointmentsResult);

            if (clientsResult.success && appointmentsResult.success) {
                // Calculate dashboard stats from raw data
                const clientsCount = clientsResult.data ? clientsResult.data.length : 0;
                const petsCount = clientsResult.data ? clientsResult.data.reduce((total, client) => total + (client.pet_count || 0), 0) : 0;
                const appointmentsCount = appointmentsResult.data ? appointmentsResult.data.length : 0;

                const fallbackData = {
                    total_clients: clientsCount,
                    total_pets: petsCount,
                    today_appointments: appointmentsCount,
                    monthly_revenue: 0 // Not available in fallback mode
                };

                console.log('✅ Fallback data calculated:', fallbackData);
                this.updateDashboardCards(fallbackData);

                // Recent activity removed - today's schedule no longer updated

                // Load other sections
                await this.loadAppointmentsSection();
                await this.loadClientsSection();
                await this.loadPetsSection();
                await this.loadServicesSection();
                console.log('✅ All sections loaded in fallback mode');
            } else {
                console.error('❌ Fallback mode failed');
                this.showToast('Unable to load dashboard data', 'error');
            }

        } catch (error) {
            console.error('❌ Error in fallback mode:', error);
            this.showToast('Error loading dashboard data', 'error');
        }
    }

    async loadDashboardDataMock() {
        console.log('🔄 Loading dashboard data with mock data...');

        try {
            // Mock data for demonstration
            const mockData = {
                total_clients: 12,
                total_pets: 18,
                today_appointments: 5,
                monthly_revenue: 15420.50
            };

            console.log('✅ Mock data loaded:', mockData);
            this.updateDashboardCards(mockData);

            // Mock today's schedule
            const todayAppointments = [
                {
                    appointment_date: new Date().toISOString().split('T')[0],
                    appointment_time: '09:00',
                    service_name: 'General Check-up',
                    first_name: 'John',
                    last_name: 'Doe',
                    pet_name: 'Buddy',
                    species: 'Dog',
                    status: 'confirmed'
                },
                {
                    appointment_date: new Date().toISOString().split('T')[0],
                    appointment_time: '10:30',
                    service_name: 'Vaccination',
                    first_name: 'Jane',
                    last_name: 'Smith',
                    pet_name: 'Whiskers',
                    species: 'Cat',
                    status: 'pending'
                },
                {
                    appointment_date: new Date().toISOString().split('T')[0],
                    appointment_time: '14:00',
                    service_name: 'Dental Cleaning',
                    first_name: 'Mike',
                    last_name: 'Johnson',
                    pet_name: 'Max',
                    species: 'Dog',
                    status: 'in-progress'
                }
            ];

            // Recent activity removed - today's schedule no longer updated

            // Load other sections with mock data
            await this.loadAppointmentsSectionMock();
            await this.loadClientsSectionMock();
            await this.loadPetsSectionMock();
            await this.loadServicesSectionMock();

            console.log('✅ All sections loaded with mock data');
            this.showToast('Dashboard loaded with demo data', 'info');

        } catch (error) {
            console.error('❌ Error loading mock data:', error);
            this.showToast('Error loading dashboard data', 'error');
        }
    }

    updateDashboardCards(data) {
        console.log('🎯 updateDashboardCards called with data:', data);
        console.log('👤 User type:', this.userType);

        if (this.userType === 'staff') {
            console.log('📊 Updating cards:');
            console.log('  - Today appointments:', data.today_appointments || 0);
            console.log('  - Total clients:', data.total_clients || 0);
            console.log('  - Total pets:', data.total_pets || 0);
            console.log('  - Monthly revenue:', '₱' + (data.monthly_revenue || 0));

            this.updateCard('todayAppointments', data.today_appointments || 0);
            this.updateCard('totalClients', data.total_clients || 0);
            this.updateCard('totalPets', data.total_pets || 0);
            this.updateCard('monthlyRevenue', '₱' + (data.monthly_revenue || 0));
        } else {
            console.log('⚠️ Not updating cards - user type is not staff:', this.userType);
        }
    }

    updateCard(cardId, value) {
        const card = document.querySelector(`#${cardId}`);
        console.log(`🔄 updateCard called: ${cardId} = ${value}`);
        console.log(`🔍 Card element found:`, !!card);

        if (card) {
            // Find the card-value element within the card
            const valueElement = card.querySelector('.card-value');
            console.log(`🔍 Value element found:`, !!valueElement);

            if (valueElement) {
                console.log(`📝 Before update:`, valueElement.textContent);
                valueElement.textContent = value;
                console.log(`✅ After update:`, valueElement.textContent);
            } else {
                console.error(`❌ Card value element not found for: #${cardId}`);
                // Fallback: try to update the card directly
                console.log(`📝 Fallback - Before update:`, card.textContent);
                card.textContent = value;
                console.log(`✅ Fallback - After update:`, card.textContent);
            }
        } else {
            console.error(`❌ Card element not found: #${cardId}`);
        }
    }

    // Recent activity removed - updateTodaySchedule function disabled

    setupEventListeners() {
        // Modal functionality
        this.setupModalEventListeners();

        // Navigation functionality
        this.setupNavigationEventListeners();

        // Form submissions
        this.setupFormEventListeners();
    }

    setupModalEventListeners() {
        // Close modal with escape key only
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modals = document.querySelectorAll('.modal');
                modals.forEach(modal => {
                    if (modal.style.display === 'flex') {
                        this.closeModal(modal.id);
                    }
                });
            }
        });
    }

    setupNavigationEventListeners() {
        // Section navigation is already handled by inline onclick handlers
        // This could be improved with event delegation in the future
    }

    setupFormEventListeners() {
        // Add appointment form
        const addAppointmentForm = document.getElementById('addAppointmentForm');
        if (addAppointmentForm) {
            addAppointmentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddAppointment(addAppointmentForm);
            });
        }


        // Add pet form
        const addPetForm = document.getElementById('addPetForm');
        if (addPetForm) {
            addPetForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddPet(addPetForm);
            });
        }

        // Add service form
        const addServiceForm = document.getElementById('addServiceForm');
        if (addServiceForm) {
            addServiceForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddService(addServiceForm);
            });
        }

        // Edit service form
        const editServiceForm = document.getElementById('editServiceForm');
        if (editServiceForm) {
            editServiceForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleEditService(editServiceForm);
            });
        }

        // Add product form
        const addProductForm = document.getElementById('addProductForm');
        if (addProductForm) {
            addProductForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddProduct(addProductForm);
            });
        }

        // Edit product form
        const editProductForm = document.getElementById('editProductForm');
        if (editProductForm) {
            editProductForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleEditProduct(editProductForm);
            });
        }

        // Product image upload
        const productImageInput = document.getElementById('productImageInput');
        if (productImageInput) {
            productImageInput.addEventListener('change', (e) => {
                this.handleProductImageUpload(e);
            });
        }

        const editProductImageInput = document.getElementById('editProductImageInput');
        if (editProductImageInput) {
            editProductImageInput.addEventListener('change', (e) => {
                this.handleEditProductImageUpload(e);
            });
        }

        // Medical history form
        const medicalHistoryForm = document.getElementById('medicalHistoryForm');
        if (medicalHistoryForm) {
            medicalHistoryForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleMedicalHistorySubmission(medicalHistoryForm);
            });
        }

        // Settings functionality
        this.setupSettingsEventListeners();
    }

    setupSettingsEventListeners() {
        // Profile form submission
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleProfileUpdate(profileForm);
            });
        }

        // Password form submission
        const passwordForm = document.getElementById('passwordForm');
        if (passwordForm) {
            passwordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handlePasswordUpdate(passwordForm);
            });
        }

        // Profile picture upload
        const pictureForm = document.getElementById('pictureForm');
        if (pictureForm) {
            pictureForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleProfilePictureUpload(pictureForm);
            });
        }

        // File input change handler
        const profilePictureInput = document.getElementById('profilePictureInput');
        if (profilePictureInput) {
            profilePictureInput.addEventListener('change', (e) => {
                this.handleImagePreview(e);
            });
        }
    }

    // Modal management functions
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = ''; // Restore scrolling
        }
    }

    // Global modal functions (made available to inline onclick handlers)
    showAddAppointmentModal() {
        const modal = this.createAddAppointmentModal();
        document.body.appendChild(modal);
        this.openModal('addAppointmentModal');
    }

    showAddPetModal() {
        const modal = this.createAddPetModal();
        document.body.appendChild(modal);
        this.openModal('addPetModal');
    }

    showAddServiceModal() {
        const modal = this.createAddServiceModal();
        document.body.appendChild(modal);
        this.openModal('addServiceModal');
    }

    createAddServiceModal() {
        const modal = document.createElement('div');
        modal.id = 'addServiceModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-plus"></i> Add New Service</h3>
                    <span class="close" onclick="staffDashboard.closeModal('addServiceModal')">&times;</span>
                </div>
                <div class="modal-body">
                    <form id="addServiceForm" class="booking-form">
                        <div class="form-group">
                            <label for="serviceName">Service Name *</label>
                            <input type="text" id="serviceName" name="service_name" required placeholder="e.g., General Check-up">
                        </div>
                        <div class="form-group">
                            <label for="serviceDescription">Description</label>
                            <textarea id="serviceDescription" name="service_description" rows="3" placeholder="Brief description of the service..."></textarea>
                        </div>
                        <div class="form-group">
                            <label for="serviceStatus">Status</label>
                            <select id="serviceStatus" name="service_status">
                                <option value="1" selected>Active</option>
                                <option value="0">Inactive</option>
                            </select>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-secondary" onclick="staffDashboard.closeModal('addServiceModal')">CANCEL</button>
                            <button type="submit" class="btn-primary">ADD SERVICE</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        return modal;
    }

    // Medical History Modal Functions
    showMedicalHistoryModal(appointmentId) {
        this.currentAppointmentId = appointmentId;
        this.loadAppointmentInfoForMedicalHistory(appointmentId);
        this.openModal('medicalHistoryModal');
    }

    closeMedicalHistoryModal() {
        this.closeModal('medicalHistoryModal');
        this.currentAppointmentId = null;
    }

    async loadAppointmentInfoForMedicalHistory(appointmentId) {
        try {
            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'get_appointment_details',
                    appointment_id: appointmentId
                })
            });

            const result = await response.json();

            if (result.success && result.data) {
                this.displayAppointmentInfoForMedicalHistory(result.data);
            } else {
                this.showToast('Failed to load appointment details', 'error');
            }
        } catch (error) {
            console.error('Error loading appointment info:', error);
            this.showToast('Failed to load appointment details', 'error');
        }
    }

    displayAppointmentInfoForMedicalHistory(appointment) {
        const infoDiv = document.getElementById('medicalHistoryAppointmentInfo');
        if (!infoDiv) return;

        const appointmentDate = new Date(appointment.appointment_date).toLocaleDateString();
        const appointmentTime = appointment.appointment_time;

        infoDiv.innerHTML = `
            <div class="appointment-info-card">
                <h3><i class="fas fa-calendar-check"></i> Appointment Details</h3>
                <div class="info-grid">
                    <div class="info-row">
                        <div class="info-label">Date:</div>
                        <div class="info-value">${appointmentDate} at ${appointmentTime}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Client:</div>
                        <div class="info-value">${appointment.first_name} ${appointment.last_name}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Pet:</div>
                        <div class="info-value">${appointment.pet_name} (${appointment.species})</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Service:</div>
                        <div class="info-value">${appointment.service_name}</div>
                    </div>
                </div>
            </div>
        `;
    }

    showAddProductModal() {
        this.openModal('addProductModal');
    }

    showEditProductModal(productId) {
        // Load product data and show edit modal
        this.loadProductForEditing(productId);
    }

    async loadProductForEditing(productId) {
        try {
            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_all_products' })
            });

            const result = await response.json();

            if (result.success && result.data) {
                const product = result.data.find(p => p.id == productId);
                if (product) {
                    this.showEditProductModal(product);
                } else {
                    this.showToast('Product not found', 'error');
                }
            } else {
                this.showToast('Failed to load product data', 'error');
            }
        } catch (error) {
            console.error('Error loading product for editing:', error);
            this.showToast('Failed to load product data', 'error');
        }
    }

    showEditProductModal(product) {
        // Populate the edit form with product data
        const editProductId = document.getElementById('editProductId');
        const editProductName = document.getElementById('editProductName');
        const editProductCategory = document.getElementById('editProductCategory');
        const editProductDescription = document.getElementById('editProductDescription');
        const editProductPrice = document.getElementById('editProductPrice');
        const editProductStock = document.getElementById('editProductStock');
        const editProductStatus = document.getElementById('editProductStatus');

        if (editProductId) editProductId.value = product.id;
        if (editProductName) editProductName.value = product.name;
        if (editProductCategory) editProductCategory.value = product.category;
        if (editProductDescription) editProductDescription.value = product.description || '';
        if (editProductPrice) editProductPrice.value = product.price;
        if (editProductStock) editProductStock.value = product.stock;
        if (editProductStatus) editProductStatus.value = product.is_active;

        // Load product image if exists
        const preview = document.getElementById('editProductImagePreview');
        if (preview) {
            if (product.image) {
                preview.src = '../assets/images/products/' + product.image;
                preview.style.display = 'block';
            } else {
                preview.style.display = 'none';
            }
        }

        this.openModal('editProductModal');
    }

    showAddProductModal() {
        this.openModal('addProductModal');
    }

    // Enhanced modal closing function for add product
    closeAddProductModal() {
        console.log('🔄 Closing add product modal...');

        const modal = document.getElementById('addProductModal');
        if (modal) {
            console.log('✅ Found add product modal, hiding it');
            modal.style.display = 'none';
            document.body.style.overflow = ''; // Restore scrolling

            // Clear form data
            const form = document.getElementById('addProductForm');
            if (form) {
                console.log('✅ Clearing form data');
                form.reset();

                // Clear any image preview
                const preview = document.getElementById('productImagePreview');
                if (preview) {
                    console.log('✅ Clearing image preview');
                    preview.style.display = 'none';
                    preview.src = '';
                }

                // Clear file input
                const fileInput = document.getElementById('productImageInput');
                if (fileInput) {
                    fileInput.value = '';
                }

                // Clear preview container
                const previewContainer = document.getElementById('productImagePreviewContainer');
                if (previewContainer) {
                    previewContainer.style.display = 'none';
                    previewContainer.style.visibility = 'hidden';
                    previewContainer.style.opacity = '0';
                }
            }

            console.log('✅ Add product modal closed successfully');
            this.showToast('Add cancelled', 'info');
        } else {
            console.error('❌ Add product modal not found');
        }
    }

    // Enhanced modal closing function for edit product
    closeEditProductModal() {
        console.log('🔄 Closing edit product modal...');

        const modal = document.getElementById('editProductModal');
        if (modal) {
            console.log('✅ Found edit product modal, hiding it');
            modal.style.display = 'none';
            document.body.style.overflow = ''; // Restore scrolling

            // Clear form data
            const form = document.getElementById('editProductForm');
            if (form) {
                console.log('✅ Clearing form data');
                form.reset();

                // Clear any image preview
                const preview = document.getElementById('editProductImagePreview');
                if (preview) {
                    console.log('✅ Clearing image preview');
                    preview.style.display = 'none';
                    preview.src = '';
                }

                // Clear file input
                const fileInput = document.getElementById('editProductImageInput');
                if (fileInput) {
                    fileInput.value = '';
                }

                // Clear preview container
                const previewContainer = document.getElementById('editProductImagePreviewContainer');
                if (previewContainer) {
                    previewContainer.style.display = 'none';
                    previewContainer.style.visibility = 'hidden';
                    previewContainer.style.opacity = '0';
                }
            }

            console.log('✅ Edit product modal closed successfully');
            this.showToast('Edit cancelled', 'info');
        } else {
            console.error('❌ Edit product modal not found');
        }
    }




    editService(serviceId) {
        // Get service details first
        this.loadServiceForEditing(serviceId);
    }

    async loadServiceForEditing(serviceId) {
        try {
            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_services' })
            });

            const result = await response.json();

            if (result.success && result.data) {
                const service = result.data.find(s => s.id == serviceId);
                if (service) {
                    this.showEditServiceModal(service);
                } else {
                    this.showToast('Service not found', 'error');
                }
            } else {
                this.showToast('Failed to load service details', 'error');
            }
        } catch (error) {
            console.error('Error loading service for editing:', error);
            this.showToast('Failed to load service details', 'error');
        }
    }

    showEditServiceModal(service) {
        const modal = this.createEditServiceModal(service);
        document.body.appendChild(modal);
        this.openModal('editServiceModal');
    }

    createEditServiceModal(service) {
        const modal = document.createElement('div');
        modal.id = 'editServiceModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-edit"></i> Edit Service</h3>
                    <span class="close" onclick="staffDashboard.closeModal('editServiceModal')">&times;</span>
                </div>
                <div class="modal-body">
                    <form id="editServiceForm" class="booking-form">
                        <input type="hidden" id="editServiceId" name="service_id" value="${service.id}">
                        <div class="form-group">
                            <label for="editServiceName">Service Name *</label>
                            <input type="text" id="editServiceName" name="service_name" value="${service.name}" required placeholder="e.g., General Check-up">
                        </div>
                        <div class="form-group">
                            <label for="editServiceDescription">Description</label>
                            <textarea id="editServiceDescription" name="service_description" rows="3" placeholder="Brief description of the service...">${service.description || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label for="editServiceStatus">Status</label>
                            <select id="editServiceStatus" name="service_status">
                                <option value="1" ${service.is_active ? 'selected' : ''}>Active</option>
                                <option value="0" ${!service.is_active ? 'selected' : ''}>Inactive</option>
                            </select>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-secondary btn-small" onclick="staffDashboard.closeModal('editServiceModal')">CANCEL</button>
                            <button type="submit" class="btn-primary btn-small">UPDATE SERVICE</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        return modal;
    }

    async handleEditService(form) {
        try {
            const formData = new FormData(form);
            const serviceData = {
                action: 'update_service',
                service_id: parseInt(formData.get('service_id')),
                name: formData.get('service_name'),
                description: formData.get('service_description'),
                is_active: parseInt(formData.get('service_status'))
            };

            // Validate required fields
            if (!serviceData.name) {
                this.showToast('Service name is required', 'error');
                return;
            }

            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(serviceData)
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('Service updated successfully!', 'success');
                this.closeModal('editServiceModal');
                await this.loadServicesSection(); // Refresh services list
                await this.loadDashboardData(); // Refresh dashboard data
            } else {
                this.showToast(result.message || 'Failed to update service', 'error');
            }
        } catch (error) {
            console.error('Edit service error:', error);
            this.showToast('Failed to update service. Please try again.', 'error');
        }
    }

    async deleteService(serviceId, buttonElement) {
        if (!serviceId || isNaN(parseInt(serviceId))) {
            this.showToast('Invalid service ID', 'error');
            return;
        }

        try {
            console.log('🗑️ Deactivating service with ID:', serviceId);

            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update_service_status',
                    service_id: parseInt(serviceId),
                    is_active: 0
                })
            });

            const result = await response.json();
            console.log('📡 Deactivate service response:', result);

            if (result.success) {
                this.showToast('Service deleted successfully!', 'success');
                // Immediately hide the table row for better UX
                const serviceRow = buttonElement.closest('tr');
                if (serviceRow) {
                    serviceRow.style.transition = 'opacity 0.3s ease';
                    serviceRow.style.opacity = '0';
                    setTimeout(() => {
                        serviceRow.remove();
                    }, 300);
                }
            } else {
                this.showToast(result.message || 'Failed to delete service', 'error');
            }
        } catch (error) {
            console.error('Error deleting service:', error);
            this.showToast('Error deleting service. Please try again.', 'error');
        }
    }

    async getServiceDetails(serviceId) {
        try {
            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_services' })
            });

            const result = await response.json();

            if (result.success && result.data) {
                return result.data.find(s => s.id == serviceId);
            }
            return null;
        } catch (error) {
            console.error('Error getting service details:', error);
            return null;
        }
    }

    // Modal creation functions
    createAddAppointmentModal() {
        const modal = document.createElement('div');
        modal.id = 'addAppointmentModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-calendar-plus"></i> Schedule New Appointment</h3>
                    <span class="close" onclick="staffDashboard.closeModal('addAppointmentModal')">&times;</span>
                </div>
                <div class="modal-body">
                    <form id="addAppointmentForm" class="booking-form">
                        <div class="form-group">
                            <label for="appointmentClient">Client *</label>
                            <select id="appointmentClient" name="client_id" required>
                                <option value="">Select a client</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="appointmentPet">Pet *</label>
                            <select id="appointmentPet" name="pet_id" required>
                                <option value="">Select a pet</option>
                            </select>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="appointmentDate">Date *</label>
                                <input type="date" id="appointmentDate" name="appointment_date" required min="${new Date().toISOString().split('T')[0]}">
                            </div>
                            <div class="form-group">
                                <label for="appointmentTime">Time *</label>
                                <select id="appointmentTime" name="appointment_time" required>
                                    <option value="">Select time</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="appointmentService">Service *</label>
                            <select id="appointmentService" name="service_id" required>
                                <option value="">Select a service</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="appointmentNotes">Notes (Optional)</label>
                            <textarea id="appointmentNotes" name="notes" rows="3" placeholder="Any special instructions..."></textarea>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-secondary btn-small" onclick="staffDashboard.closeModal('addAppointmentModal')">CANCEL</button>
                            <button type="submit" class="btn-primary btn-small">SCHEDULE APPOINTMENT</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        // Load clients and services when modal opens
        setTimeout(() => {
            this.loadClientsForAppointment();
            this.loadServicesForAppointment();
        }, 100);

        return modal;
    }


    createAddPetModal() {
        const modal = document.createElement('div');
        modal.id = 'addPetModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-paw"></i> Add New Pet</h3>
                    <span class="close" onclick="staffDashboard.closeModal('addPetModal')">&times;</span>
                </div>
                <div class="modal-body">
                    <form id="addPetForm" class="booking-form">
                        <div class="form-group">
                            <label for="petOwner">Owner *</label>
                            <select id="petOwner" name="owner_id" required>
                                <option value="">Select an owner</option>
                            </select>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="petName">Pet Name *</label>
                                <input type="text" id="petName" name="pet_name" required>
                            </div>
                            <div class="form-group">
                                <label for="petSpecies">Species *</label>
                                <select id="petSpecies" name="species" required>
                                    <option value="">Select Species</option>
                                    <option value="Dog">Dog</option>
                                    <option value="Cat">Cat</option>
                                    <option value="Bird">Bird</option>
                                    <option value="Rabbit">Rabbit</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="petBreed">Breed</label>
                                <input type="text" id="petBreed" name="breed">
                            </div>
                            <div class="form-group">
                                <label for="petBirthdate">Birthdate</label>
                                <input type="date" id="petBirthdate" name="birthdate" max="${new Date().toISOString().split('T')[0]}">
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="petGender">Gender *</label>
                            <select id="petGender" name="gender" required>
                                <option value="">Select Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="petColor">Color</label>
                            <input type="text" id="petColor" name="color">
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-secondary btn-small" onclick="staffDashboard.closeModal('addPetModal')">CANCEL</button>
                            <button type="submit" class="btn-primary btn-small">ADD PET</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        // Load clients when modal opens
        setTimeout(() => {
            this.loadClientsForPet();
        }, 100);

        return modal;
    }

    // Data loading functions
    async loadClientsForAppointment() {
        try {
            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_clients' })
            });

            const result = await response.json();
            const clientSelect = document.getElementById('appointmentClient');

            if (result.success && result.data) {
                clientSelect.innerHTML = '<option value="">Select a client</option>';
                result.data.forEach(client => {
                    const option = document.createElement('option');
                    option.value = client.id;
                    option.textContent = `${client.first_name} ${client.last_name}`;
                    clientSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading clients:', error);
        }
    }

    async loadServicesForAppointment() {
        try {
            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_services' })
            });

            const result = await response.json();
            const serviceSelect = document.getElementById('appointmentService');

            if (result.success && result.data) {
                serviceSelect.innerHTML = '<option value="">Select a service</option>';
                result.data.forEach(service => {
                    const option = document.createElement('option');
                    option.value = service.id;
                    option.textContent = service.name;
                    serviceSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading services:', error);
        }
    }

    async loadClientsForPet() {
        try {
            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_clients' })
            });

            const result = await response.json();
            const ownerSelect = document.getElementById('petOwner');

            if (result.success && result.data) {
                ownerSelect.innerHTML = '<option value="">Select an owner</option>';
                result.data.forEach(client => {
                    const option = document.createElement('option');
                    option.value = client.id;
                    option.textContent = `${client.first_name} ${client.last_name}`;
                    ownerSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading clients for pet:', error);
        }
    }

    // Form handling functions
    async handleAddAppointment(form) {
        try {
            const formData = new FormData(form);
            const appointmentData = {
                action: 'book_appointment',
                client_id: formData.get('client_id'),
                pet_id: formData.get('pet_id'),
                service_id: formData.get('service_id'),
                appointment_date: formData.get('appointment_date'),
                appointment_time: formData.get('appointment_time'),
                notes: formData.get('notes')
            };

            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(appointmentData)
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('Appointment scheduled successfully!', 'success');
                this.closeModal('addAppointmentModal');
                this.loadDashboardData(); // Refresh dashboard
            } else {
                this.showToast(result.message || 'Failed to schedule appointment', 'error');
            }
        } catch (error) {
            console.error('Add appointment error:', error);
            this.showToast('Failed to schedule appointment. Please try again.', 'error');
        }
    }


    async handleAddPet(form) {
        try {
            const formData = new FormData(form);
            const petData = {
                action: 'add_pet',
                owner_id: formData.get('owner_id'),
                pet_name: formData.get('pet_name'),
                species: formData.get('species'),
                breed: formData.get('breed'),
                birthdate: formData.get('birthdate'),
                gender: formData.get('gender'),
                weight: formData.get('weight'),
                color: formData.get('color')
            };

            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(petData)
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('Pet added successfully!', 'success');
                this.closeModal('addPetModal');
                this.loadDashboardData(); // Refresh dashboard
            } else {
                this.showToast(result.message || 'Failed to add pet', 'error');
            }
        } catch (error) {
            console.error('Add pet error:', error);
            this.showToast('Failed to add pet. Please try again.', 'error');
        }
    }

    async handleAddService(form) {
        try {
            const formData = new FormData(form);
            const serviceData = {
                action: 'add_service',
                name: formData.get('service_name'),
                description: formData.get('service_description'),
                is_active: parseInt(formData.get('service_status'))
            };

            // Validate required fields
            if (!serviceData.name || serviceData.name.trim() === '') {
                this.showToast('Service name is required', 'error');
                return;
            }

            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(serviceData)
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('Service added successfully!', 'success');
                this.closeModal('addServiceModal');
                await this.loadServicesSection(); // Refresh services list
                await this.loadDashboardData(); // Refresh dashboard data
            } else {
                this.showToast(result.message || 'Failed to add service', 'error');
            }
        } catch (error) {
            console.error('Add service error:', error);
            this.showToast('Failed to add service. Please try again.', 'error');
        }
    }

    async handleAddService(form) {
        try {
            const formData = new FormData(form);
            const serviceData = {
                action: 'add_service',
                name: formData.get('service_name'),
                description: formData.get('service_description'),
                is_active: parseInt(formData.get('service_status'))
            };

            // Validate required fields
            if (!serviceData.name || serviceData.name.trim() === '') {
                this.showToast('Service name is required', 'error');
                return;
            }

            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(serviceData)
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('Service added successfully!', 'success');
                this.closeModal('addServiceModal');
                await this.loadServicesSection(); // Refresh services list
                await this.loadDashboardData(); // Refresh dashboard data
            } else {
                this.showToast(result.message || 'Failed to add service', 'error');
            }
        } catch (error) {
            console.error('Add service error:', error);
            this.showToast('Failed to add service. Please try again.', 'error');
        }
    }

    async handleAddService(form) {
        try {
            const formData = new FormData(form);
            const serviceData = {
                action: 'add_service',
                name: formData.get('service_name'),
                description: formData.get('service_description'),
                is_active: parseInt(formData.get('service_status'))
            };

            // Validate required fields
            if (!serviceData.name || serviceData.name.trim() === '') {
                this.showToast('Service name is required', 'error');
                return;
            }

            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(serviceData)
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('Service added successfully!', 'success');
                this.closeModal('addServiceModal');
                await this.loadServicesSection(); // Refresh services list
                await this.loadDashboardData(); // Refresh dashboard data
            } else {
                this.showToast(result.message || 'Failed to add service', 'error');
            }
        } catch (error) {
            console.error('Add service error:', error);
            this.showToast('Failed to add service. Please try again.', 'error');
        }
    }

    async handleMedicalHistorySubmission(form) {
        try {
            if (!this.currentAppointmentId) {
                this.showToast('No appointment selected', 'error');
                return;
            }

            const formData = new FormData(form);
            const medicalHistoryData = {
                action: 'add_medical_history',
                appointment_id: this.currentAppointmentId,
                diagnosis: formData.get('diagnosis'),
                treatment: formData.get('treatment'),
                medications: formData.get('medications'),
                notes: formData.get('notes'),
                follow_up_date: formData.get('follow_up_date'),
                follow_up_instructions: formData.get('follow_up_instructions')
            };

            // Validate required fields
            if (!medicalHistoryData.diagnosis || !medicalHistoryData.treatment) {
                this.showToast('Diagnosis and treatment are required', 'error');
                return;
            }

            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(medicalHistoryData)
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('Medical history saved successfully!', 'success');
                this.closeMedicalHistoryModal();
                // Refresh appointments to show updated status
                await this.loadAppointmentsSection();
                await this.loadDashboardData();
            } else {
                this.showToast(result.message || 'Failed to save medical history', 'error');
            }
        } catch (error) {
            console.error('Medical history submission error:', error);
            this.showToast('Failed to save medical history. Please try again.', 'error');
        }
    }

    // Section loading functions
    async loadAppointmentsSection() {
        try {
            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_appointments' })
            });

            const result = await response.json();
            const appointmentsTableBody = document.getElementById('appointmentsTableBody');

            if (result.success && result.data && result.data.length > 0) {
                appointmentsTableBody.innerHTML = result.data.map(appointment => `
                    <tr>
                        <td>${appointment.appointment_date}</td>
                        <td>${appointment.appointment_time}</td>
                        <td>${appointment.first_name} ${appointment.last_name}</td>
                        <td>${appointment.pet_name} (${appointment.species})</td>
                        <td>${appointment.service_name}</td>
                        <td>
                            <div class="status-container">
                                <select class="status-select" data-appointment-id="${appointment.id}" onchange="staffDashboard.changeAppointmentStatus(${appointment.id}, this.value)">
                                    <option value="pending" ${appointment.status === 'pending' ? 'selected' : ''}>Pending</option>
                                    <option value="confirmed" ${appointment.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                                    <option value="in-progress" ${appointment.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                                    <option value="completed" ${appointment.status === 'completed' ? 'selected' : ''}>Completed</option>
                                    <option value="cancelled" ${appointment.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                                    <option value="no-show" ${appointment.status === 'no-show' ? 'selected' : ''}>No Show</option>
                                </select>
                                <button class="btn-primary btn-small" onclick="staffDashboard.updateAppointmentStatus(${appointment.id})" title="Update Status">
                                    <i class="fas fa-check"></i> UPDATE
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('');
            } else {
                appointmentsTableBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="empty-state-table">
                            <div class="empty-state">
                                <i class="fas fa-calendar-times"></i>
                                <h3>No Appointments</h3>
                                <p>No appointments scheduled.</p>
                            </div>
                        </td>
                    </tr>
                `;
            }
        } catch (error) {
            console.error('Failed to load appointments:', error);
            // Fallback to mock data
            await this.loadAppointmentsSectionMock();
        }
    }

    async loadAppointmentsSectionMock() {
        const appointmentsTableBody = document.getElementById('appointmentsTableBody');
        if (!appointmentsTableBody) return;

        const mockAppointments = [
            {
                id: 1,
                appointment_date: new Date().toISOString().split('T')[0],
                appointment_time: '09:00',
                first_name: 'John',
                last_name: 'Doe',
                pet_name: 'Buddy',
                species: 'Dog',
                service_name: 'General Check-up',
                status: 'confirmed'
            },
            {
                id: 2,
                appointment_date: new Date().toISOString().split('T')[0],
                appointment_time: '10:30',
                first_name: 'Jane',
                last_name: 'Smith',
                pet_name: 'Whiskers',
                species: 'Cat',
                service_name: 'Vaccination',
                status: 'pending'
            },
            {
                id: 3,
                appointment_date: new Date().toISOString().split('T')[0],
                appointment_time: '14:00',
                first_name: 'Mike',
                last_name: 'Johnson',
                pet_name: 'Max',
                species: 'Dog',
                service_name: 'Dental Cleaning',
                status: 'in-progress'
            }
        ];

        appointmentsTableBody.innerHTML = mockAppointments.map(appointment => `
            <tr>
                <td>${appointment.appointment_date}</td>
                <td>${appointment.appointment_time}</td>
                <td>${appointment.first_name} ${appointment.last_name}</td>
                <td>${appointment.pet_name} (${appointment.species})</td>
                <td>${appointment.service_name}</td>
                <td>
                    <div class="status-container">
                        <select class="status-select" data-appointment-id="${appointment.id}" onchange="staffDashboard.changeAppointmentStatus(${appointment.id}, this.value)">
                            <option value="pending" ${appointment.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="confirmed" ${appointment.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                            <option value="in-progress" ${appointment.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                            <option value="completed" ${appointment.status === 'completed' ? 'selected' : ''}>Completed</option>
                            <option value="cancelled" ${appointment.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                            <option value="no-show" ${appointment.status === 'no-show' ? 'selected' : ''}>No Show</option>
                        </select>
                        <button class="btn-primary btn-small" onclick="staffDashboard.updateAppointmentStatus(${appointment.id})" title="Update Status">
                            <i class="fas fa-check"></i> UPDATE
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    async loadClientsSection() {
        try {
            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_clients' })
            });

            const result = await response.json();
            const clientsGrid = document.getElementById('clientsGrid');

            if (!clientsGrid) {
                console.error('❌ clientsGrid element not found');
                this.showToast('Failed to load clients: Grid element not found', 'error');
                return;
            }

            if (result.success && result.data && result.data.length > 0) {
                clientsGrid.innerHTML = result.data.map(client => this.createClientCard(client)).join('');
            } else {
                // Fallback to mock data
                await this.loadClientsSectionMock();
            }
        } catch (error) {
            console.error('Failed to load clients:', error);
            // Fallback to mock data
            await this.loadClientsSectionMock();
        }
    }

    async loadClientsSectionMock() {
        const clientsGrid = document.getElementById('clientsGrid');
        if (!clientsGrid) return;

        const mockClients = [
            {
                id: 1,
                first_name: 'John',
                last_name: 'Doe',
                email: 'john.doe@email.com',
                phone: '+1-555-0123',
                address: '123 Main St, City, State',
                created_at: '2024-01-15',
                profile_picture: null,
                pets: [
                    { name: 'Buddy' },
                    { name: 'Max' }
                ]
            },
            {
                id: 2,
                first_name: 'Jane',
                last_name: 'Smith',
                email: 'jane.smith@email.com',
                phone: '+1-555-0456',
                address: '456 Oak Ave, City, State',
                created_at: '2024-02-20',
                profile_picture: null,
                pets: [
                    { name: 'Whiskers' }
                ]
            }
        ];

        clientsGrid.innerHTML = mockClients.map(client => this.createClientCard(client)).join('');
    }

    createClientCard(client) {
        const profileImage = client.profile_picture ?
            `<img src="../${client.profile_picture}" alt="${client.first_name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` :
            '';

        const placeholderIcon = client.first_name.charAt(0).toUpperCase();

        const petsList = client.pets && client.pets.length > 0 ?
            client.pets.map(pet => `<span class="pet-badge"><i class="fas fa-paw"></i>${pet.name}</span>`).join('') :
            '<span style="color: #999; font-style: italic;">No pets registered</span>';

        return `
            <div class="client-card">
                <div class="client-avatar">
                    ${profileImage}
                    <div class="client-avatar-placeholder" style="display: ${client.profile_picture ? 'none' : 'flex'}">
                        <i class="fas fa-user"></i>
                    </div>
                </div>
                <div class="client-info">
                    <h3 class="client-name">
                        <i class="fas fa-user-circle"></i>
                        ${client.first_name} ${client.last_name || ''}
                    </h3>
                    <div class="client-email">
                        <i class="fas fa-envelope"></i>
                        ${client.email}
                    </div>
                    <div class="client-details">
                        <p>
                            <i class="fas fa-phone"></i>
                            <strong>Phone:</strong>
                            ${client.phone || 'Not provided'}
                        </p>
                        <p>
                            <i class="fas fa-map-marker-alt"></i>
                            <strong>Address:</strong>
                            ${client.address || 'Not provided'}
                        </p>
                        <p>
                            <i class="fas fa-calendar"></i>
                            <strong>Member since:</strong>
                            ${client.created_at ? new Date(client.created_at).toLocaleDateString() : 'Unknown'}
                        </p>
                    </div>
                    <div class="client-pets">
                        <h4><i class="fas fa-paw"></i> Registered Pets</h4>
                        <div class="client-pets-list">
                            ${petsList}
                        </div>
                    </div>
                    <div class="client-actions">
                        <button class="action-btn view" onclick="viewClientDetails('${client.id}')">
                            <i class="fas fa-eye"></i> View Details
                        </button>
                        <button class="action-btn edit" onclick="editClient('${client.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    async loadPetsSection() {
        try {
            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_pets' })
            });

            const result = await response.json();
            const petsGrid = document.getElementById('petsGrid');

            if (result.success && result.data && result.data.length > 0) {
                petsGrid.innerHTML = result.data.map(pet => this.createPetCard(pet)).join('');
            } else {
                // Fallback to mock data
                await this.loadPetsSectionMock();
            }
        } catch (error) {
            console.error('Failed to load pets:', error);
            // Fallback to mock data
            await this.loadPetsSectionMock();
        }
    }

    async loadPetsSectionMock() {
        const petsGrid = document.getElementById('petsGrid');
        if (!petsGrid) return;

        const mockPets = [
            {
                id: 1,
                name: 'Buddy',
                species: 'Dog',
                breed: 'Golden Retriever',
                first_name: 'John',
                last_name: 'Doe',
                birthdate: '2020-03-15',
                gender: 'Male',
                weight: 25,
                color: 'Golden'
            },
            {
                id: 2,
                name: 'Whiskers',
                species: 'Cat',
                breed: 'Persian',
                first_name: 'Jane',
                last_name: 'Smith',
                birthdate: '2021-07-22',
                gender: 'Female',
                weight: 4,
                color: 'White'
            }
        ];

        petsGrid.innerHTML = mockPets.map(pet => this.createPetCard(pet)).join('');
    }

    createPetCard(pet) {
        // Get species-specific styling and icon
        const speciesInfo = this.getSpeciesStyling(pet.species);

        // Calculate age if birthdate is available
        let ageInfo = '';
        if (pet.birthdate) {
            const birthDate = new Date(pet.birthdate);
            const today = new Date();
            const ageInMonths = (today.getFullYear() - birthDate.getFullYear()) * 12 + (today.getMonth() - birthDate.getMonth());
            const years = Math.floor(ageInMonths / 12);
            const months = ageInMonths % 12;

            if (years > 0) {
                ageInfo = years === 1 ? '1 year' : `${years} years`;
                if (months > 0) ageInfo += ` ${months} month${months > 1 ? 's' : ''}`;
            } else if (months > 0) {
                ageInfo = months === 1 ? '1 month' : `${months} months`;
            } else {
                ageInfo = 'Newborn';
            }
        }

        // Create status badges for additional info
        const statusBadges = [];
        if (pet.weight) {
            const weightClass = pet.weight > 20 ? 'heavy' : pet.weight > 10 ? 'medium' : 'light';
            statusBadges.push(`<span class="pet-badge weight-badge ${weightClass}">${pet.weight}kg</span>`);
        }
        if (ageInfo) {
            statusBadges.push(`<span class="pet-badge age-badge">${ageInfo}</span>`);
        }
        if (pet.color) {
            statusBadges.push(`<span class="pet-badge color-badge">${pet.color}</span>`);
        }

        return `
            <div class="pet-card" data-pet-id="${pet.id}">
                <div class="pet-card-header">
                    <div class="pet-avatar-container">
                        <div class="pet-avatar ${speciesInfo.class}">
                            <i class="${speciesInfo.icon}"></i>
                        </div>
                        <div class="pet-species-badge ${speciesInfo.badgeClass}">
                            <i class="${speciesInfo.icon}"></i>
                            ${pet.species}
                        </div>
                    </div>
                    <div class="pet-name-section">
                        <h3 class="pet-name">${pet.name}</h3>
                        ${pet.breed ? `<p class="pet-breed">${pet.breed}</p>` : `<p class="pet-breed">${pet.species}</p>`}
                    </div>
                </div>

                <div class="pet-card-body">
                    <div class="pet-info-grid">
                        <div class="info-group">
                            <div class="info-label">
                                <i class="fas fa-user"></i>
                                Owner
                            </div>
                            <div class="info-value">${pet.first_name} ${pet.last_name}</div>
                        </div>

                        ${pet.birthdate ? `
                        <div class="info-group">
                            <div class="info-label">
                                <i class="fas fa-calendar"></i>
                                Birthdate
                            </div>
                            <div class="info-value">${new Date(pet.birthdate).toLocaleDateString()}</div>
                        </div>
                        ` : ''}

                        <div class="info-group">
                            <div class="info-label">
                                <i class="fas fa-venus-mars"></i>
                                Gender
                            </div>
                            <div class="info-value">${pet.gender}</div>
                        </div>

                        ${pet.weight ? `
                        <div class="info-group">
                            <div class="info-label">
                                <i class="fas fa-weight"></i>
                                Weight
                            </div>
                            <div class="info-value">${pet.weight} kg</div>
                        </div>
                        ` : ''}

                        ${pet.color ? `
                        <div class="info-group">
                            <div class="info-label">
                                <i class="fas fa-palette"></i>
                                Color
                            </div>
                            <div class="info-value">${pet.color}</div>
                        </div>
                        ` : ''}

                        ${pet.notes ? `
                        <div class="info-group full-width">
                            <div class="info-label">
                                <i class="fas fa-sticky-note"></i>
                                Notes
                            </div>
                            <div class="info-value notes-value">${pet.notes}</div>
                        </div>
                        ` : ''}
                    </div>

                    ${statusBadges.length > 0 ? `
                    <div class="pet-badges">
                        ${statusBadges.join('')}
                    </div>
                    ` : ''}
                    <div class="pet-actions">
                        <button class="action-btn history-btn" onclick="showPetMedicalHistory(${pet.id})" title="Medical History">
                            <i class="fas fa-file-medical"></i>
                            <span>Medical History</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    getSpeciesIcon(species) {
        const icons = {
            'dog': 'fas fa-dog',
            'cat': 'fas fa-cat',
            'bird': 'fas fa-dove',
            'rabbit': 'fas fa-paw',
            'hamster': 'fas fa-paw',
            'fish': 'fas fa-fish',
            'reptile': 'fas fa-paw',
            'other': 'fas fa-paw'
        };
        return icons[species.toLowerCase()] || 'fas fa-paw';
    }

    getSpeciesStyling(species) {
        const styling = {
            'dog': {
                icon: 'fas fa-dog',
                class: 'species-dog',
                badgeClass: 'badge-dog',
                gradient: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)'
            },
            'cat': {
                icon: 'fas fa-cat',
                class: 'species-cat',
                badgeClass: 'badge-cat',
                gradient: 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)'
            },
            'bird': {
                icon: 'fas fa-dove',
                class: 'species-bird',
                badgeClass: 'badge-bird',
                gradient: 'linear-gradient(135deg, #45B7D1 0%, #96C93D 100%)'
            },
            'rabbit': {
                icon: 'fas fa-paw',
                class: 'species-rabbit',
                badgeClass: 'badge-rabbit',
                gradient: 'linear-gradient(135deg, #F093FB 0%, #F5576C 100%)'
            },
            'hamster': {
                icon: 'fas fa-paw',
                class: 'species-hamster',
                badgeClass: 'badge-hamster',
                gradient: 'linear-gradient(135deg, #FFC312 0%, #F79F1F 100%)'
            },
            'fish': {
                icon: 'fas fa-fish',
                class: 'species-fish',
                badgeClass: 'badge-fish',
                gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            },
            'reptile': {
                icon: 'fas fa-paw',
                class: 'species-reptile',
                badgeClass: 'badge-reptile',
                gradient: 'linear-gradient(135deg, #56ab2f 0%, #a8e6cf 100%)'
            },
            'other': {
                icon: 'fas fa-paw',
                class: 'species-other',
                badgeClass: 'badge-other',
                gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }
        };

        const speciesKey = species.toLowerCase();
        return styling[speciesKey] || styling['other'];
    }

    async showPetMedicalHistory(petId) {
        try {
            console.log('🏥 Loading pet medical history for ID:', petId);

            const response = await fetch(`../api/pet_reports_api.php?action=get_pet_report&pet_id=${petId}`);
            const result = await response.json();

            if (result.success && result.data) {
                // Use existing pet reports modal instead of creating custom modal
                const modal = document.getElementById('petReportModal');
                if (modal) {
                    // Clear any existing search and show the report directly for this pet
                    const petSearchInput = document.getElementById('petSearchInput');
                    const petList = document.getElementById('petList');
                    const reportPreview = document.getElementById('reportPreview');
                    const reportContent = document.getElementById('reportContent');

                    if (petSearchInput) petSearchInput.value = '';
                    if (petList) petList.innerHTML = '<div class="loading"><div class="spinner"></div>Loading pet data...</div>';
                    if (reportPreview) reportPreview.style.display = 'none';
                    if (reportContent) reportContent.innerHTML = '';

                    // Show the modal first
                    modal.style.display = 'block';

                    // Update modal title
                    const modalTitle = modal.querySelector('h2');
                    if (modalTitle) {
                        modalTitle.innerHTML = `<i class="fas fa-file-medical"></i> Pet Medical Report - ${result.data.pet.name}`;
                    }

                    // Display the report preview directly (skip pet selection)
                    if (reportPreview && reportContent) {
                        reportPreview.style.display = 'block';
                        reportContent.innerHTML = this.generateMedicalHistoryHTML(result.data);
                    }

                    // Update the print button to work with this specific pet
                    const printBtn = document.getElementById('downloadBtn');
                    if (printBtn) {
                        printBtn.onclick = () => this.downloadPetMedicalReport(petId);
                    }

                    this.showToast('Pet medical report loaded successfully', 'success');
                } else {
                    this.showToast('Pet reports modal not found', 'error');
                }
            } else {
                this.showToast('Failed to load medical history', 'error');
            }
        } catch (error) {
            console.error('Error loading pet medical history:', error);
            this.showToast('Failed to load medical history', 'error');
        }
    }

    displayPetMedicalHistory(data) {
        const modal = document.createElement('div');
        modal.id = 'petMedicalHistoryModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content pet-report-modal">
                <h2><i class="fas fa-file-medical"></i> Medical History - ${data.pet.name}</h2>
                <span class="close" onclick="if(window.staffDashboard) window.staffDashboard.closeModal('petMedicalHistoryModal')">&times;</span>

                <div class="pet-report-content">
                    <div class="report-preview">
                        <h3><i class="fas fa-file-alt"></i> Medical Report</h3>
                        <div class="pdf-note">
                            <strong>PDF Generation:</strong> This report can be generated as a downloadable PDF file.
                        </div>
                        <div class="report-content" id="medicalReportContent">
                            ${this.generateMedicalHistoryHTML(data)}
                        </div>
                    </div>

                    <div class="report-actions">
                        <button type="button" class="btn-secondary" onclick="if(window.staffDashboard) window.staffDashboard.closeModal('petMedicalHistoryModal')">
                            <i class="fas fa-times"></i> Close
                        </button>
                        <button type="button" class="action-btn view" onclick="downloadPetMedicalReport(${data.pet.id})">
                            <i class="fas fa-download"></i> Download PDF
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.openModal('petMedicalHistoryModal');
    }

    generateMedicalHistoryHTML(data) {
        let html = `
            <div class="report-section">
                <h4><i class="fas fa-paw"></i> Pet Information</h4>
                <div class="report-row">
                    <div class="report-label">Name:</div>
                    <div class="report-value">${data.pet.name}</div>
                </div>
                <div class="report-row">
                    <div class="report-label">Species:</div>
                    <div class="report-value">${data.pet.species}</div>
                </div>
                <div class="report-row">
                    <div class="report-label">Breed:</div>
                    <div class="report-value">${data.pet.breed || 'Not specified'}</div>
                </div>
                <div class="report-row">
                    <div class="report-label">Owner:</div>
                    <div class="report-value">${data.owner.name}</div>
                </div>
            </div>
        `;

        if (data.medical_history && data.medical_history.length > 0) {
            html += `
                <div class="report-section">
                    <h4><i class="fas fa-stethoscope"></i> Medical History</h4>
                    <div style="margin-bottom: 20px; text-align: center;">
                        <span style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600;">
                            <i class="fas fa-file-medical"></i> Total Records: ${data.medical_history.length}
                        </span>
                    </div>
            `;

            data.medical_history.forEach((record, index) => {
                html += `
                    <div class="medical-record" style="margin: 25px 0; padding: 25px; border: 2px solid #667eea; border-radius: 15px; background: linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%); box-shadow: 0 6px 20px rgba(102, 126, 234, 0.15);">
                        <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #e1e5e9;">
                            <h5 style="margin: 0 0 10px 0; color: #667eea; font-size: 18px; display: flex; align-items: center; gap: 10px;">
                                <i class="fas fa-file-medical"></i> Medical Record #${index + 1}
                            </h5>
                            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
                                <div style="display: flex; align-items: center; gap: 15px; color: #666;">
                                    <div><i class="fas fa-calendar"></i> <strong>Date:</strong> ${new Date(record.created_at).toLocaleDateString()}</div>
                                    <div><i class="fas fa-user-md"></i> <strong>Staff:</strong> ${record.staff_name || 'Not recorded'}</div>
                                </div>
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr; gap: 15px;">
                            <div style="background: #ffffff; padding: 15px; border-radius: 10px; border-left: 5px solid #667eea; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                                <div style="font-weight: bold; color: #333; margin-bottom: 8px; font-size: 16px; display: flex; align-items: center; gap: 8px;">
                                    <i class="fas fa-stethoscope"></i> Diagnosis
                                </div>
                                <div style="color: #555; line-height: 1.6; padding-left: 25px;">${record.diagnosis ? record.diagnosis.replace(/\n/g, '<br>') : 'Not specified'}</div>
                            </div>

                            <div style="background: #ffffff; padding: 15px; border-radius: 10px; border-left: 5px solid #28a745; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                                <div style="font-weight: bold; color: #333; margin-bottom: 8px; font-size: 16px; display: flex; align-items: center; gap: 8px;">
                                    <i class="fas fa-thermometer-three-quarters"></i> Treatment
                                </div>
                                <div style="color: #555; line-height: 1.6; padding-left: 25px;">${record.treatment ? record.treatment.replace(/\n/g, '<br>') : 'Not specified'}</div>
                            </div>

                            ${record.medications ? `
                            <div style="background: #ffffff; padding: 15px; border-radius: 10px; border-left: 5px solid #ffc107; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                                <div style="font-weight: bold; color: #333; margin-bottom: 8px; font-size: 16px; display: flex; align-items: center; gap: 8px;">
                                    <i class="fas fa-pills"></i> Medications
                                </div>
                                <div style="color: #555; line-height: 1.6; padding-left: 25px;">${record.medications.replace(/\n/g, '<br>')}</div>
                            </div>
                            ` : ''}

                            ${record.follow_up_date ? `
                            <div style="background: #ffffff; padding: 15px; border-radius: 10px; border-left: 5px solid #dc3545; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                                <div style="font-weight: bold; color: #333; margin-bottom: 8px; font-size: 16px; display: flex; align-items: center; gap: 8px;">
                                    <i class="fas fa-calendar-check"></i> Follow-up Date
                                </div>
                                <div style="color: #555; line-height: 1.6; padding-left: 25px;">${new Date(record.follow_up_date).toLocaleDateString()}</div>
                            </div>
                            ` : ''}

                            ${record.notes ? `
                            <div style="background: #fff3cd; padding: 15px; border-radius: 10px; border-left: 5px solid #ffc107; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                                <div style="font-weight: bold; color: #856404; margin-bottom: 8px; font-size: 16px; display: flex; align-items: center; gap: 8px;">
                                    <i class="fas fa-sticky-note"></i> Clinical Notes
                                </div>
                                <div style="color: #856404; line-height: 1.6; padding-left: 25px;">${record.notes.replace(/\n/g, '<br>')}</div>
                            </div>
                            ` : ''}

                            ${record.instructions ? `
                            <div style="background: #d1ecf1; padding: 15px; border-radius: 10px; border-left: 5px solid #17a2b8; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                                <div style="font-weight: bold; color: #0c5460; margin-bottom: 8px; font-size: 16px; display: flex; align-items: center; gap: 8px;">
                                    <i class="fas fa-clipboard-list"></i> Instructions
                                </div>
                                <div style="color: #0c5460; line-height: 1.6; padding-left: 25px;">${record.instructions.replace(/\n/g, '<br>')}</div>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            });

            html += `</div>`;
        } else {
            html += `
                <div class="report-section">
                    <h4><i class="fas fa-info-circle"></i> Medical History</h4>
                    <p style="text-align: center; color: #666; font-style: italic;">No medical history records found for this pet.</p>
                </div>
            `;
        }

        return html;
    }

    async downloadPetMedicalReport(petId) {
        try {
            console.log('📥 Generating pet medical report for ID:', petId);

            const response = await fetch(`../api/pet_reports_api.php?action=get_pet_report&pet_id=${petId}`);
            const result = await response.json();

            if (result.success && result.data) {
                // Show loading state
                const downloadBtn = document.querySelector('#petMedicalHistoryModal .action-btn.view');
                if (downloadBtn) {
                    const originalText = downloadBtn.innerHTML;
                    downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating PDF...';
                    downloadBtn.disabled = true;

                    try {
                        // Generate PDF using client-side jsPDF
                        await this.generatePetMedicalPDF(result.data);

                        this.showToast('PDF downloaded successfully!', 'success');
                    } catch (error) {
                        console.error('Error generating PDF:', error);

                        // Fallback: try to generate a simple HTML report
                        if (error.message.includes('jsPDF')) {
                            this.showToast('PDF library failed to load. Generating HTML report instead.', 'warning');
                            this.generatePetMedicalHTML(result.data);
                        } else {
                            this.showToast('Error generating PDF. Please try again.', 'error');
                        }
                    } finally {
                        // Reset button state
                        downloadBtn.innerHTML = originalText;
                        downloadBtn.disabled = false;
                    }
                }
            } else {
                this.showToast('Failed to load medical report data', 'error');
            }
        } catch (error) {
            console.error('Error downloading pet medical report:', error);
            this.showToast('Failed to download medical report', 'error');
        }
    }

    async generatePetMedicalPDF(data) {
        // Load jsPDF library dynamically if not already loaded
        if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
            await this.loadJSPDFLibrary();
        }

        const { jsPDF } = window.jspdf;

        // Create new PDF document
        const pdf = new jsPDF('p', 'mm', 'a4');

        // Set up fonts and styles
        pdf.setFont('helvetica');

        // Add header
        pdf.setFontSize(20);
        pdf.setTextColor(40, 40, 40);
        pdf.text('Tattoo Veterinary Clinic', 105, 20, { align: 'center' });

        pdf.setFontSize(16);
        pdf.text('Pet Medical Report', 105, 30, { align: 'center' });

        // Add clinic info
        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        pdf.text('Clinic Address: Your Clinic Address', 105, 40, { align: 'center' });
        pdf.text('Phone: 0917-519-4639 | Email: info@tattoovet.com', 105, 45, { align: 'center' });
        pdf.text(`Generated: ${new Date().toLocaleString()}`, 105, 50, { align: 'center' });

        let yPosition = 65;

        // Pet Information Section
        pdf.setFontSize(14);
        pdf.setTextColor(40, 40, 40);
        pdf.text('Pet Information', 20, yPosition);
        yPosition += 10;

        pdf.setFontSize(10);
        pdf.setTextColor(60, 60, 60);

        const petInfo = [
            ['Name:', data.pet.name],
            ['Species:', data.pet.species],
            ['Breed:', data.pet.breed || 'Not specified'],
            ['Birthdate:', data.pet.birthdate ? new Date(data.pet.birthdate).toLocaleDateString() : 'Not specified'],
            ['Gender:', data.pet.gender || 'Not specified'],
            ['Weight:', data.pet.weight ? `${data.pet.weight} kg` : 'Weight not recorded'],
            ['Color:', data.pet.color || 'Not specified']
        ];

        if (data.pet.notes) {
            petInfo.push(['Notes:', data.pet.notes]);
        }

        petInfo.forEach(([label, value]) => {
            pdf.text(`${label} ${value}`, 20, yPosition);
            yPosition += 6;
        });

        // Owner Information Section
        yPosition += 5;
        pdf.setFontSize(14);
        pdf.setTextColor(40, 40, 40);
        pdf.text('Owner Information', 20, yPosition);
        yPosition += 10;

        pdf.setFontSize(10);
        pdf.setTextColor(60, 60, 60);

        const ownerInfo = [
            ['Name:', data.owner.name],
            ['Email:', data.owner.email],
            ['Phone:', data.owner.phone || 'Not provided'],
            ['Address:', data.owner.address || 'Not provided']
        ];

        ownerInfo.forEach(([label, value]) => {
            pdf.text(`${label} ${value}`, 20, yPosition);
            yPosition += 6;
        });

        // Medical History Section
        if (data.medical_history && data.medical_history.length > 0) {
            // Check if we need a new page for medical history
            if (yPosition > 200) {
                pdf.addPage();
                yPosition = 20;
            }

            pdf.setFontSize(16);
            pdf.setTextColor(102, 126, 234);
            pdf.text('Medical History', 20, yPosition);
            pdf.setTextColor(0, 0, 0);
            yPosition += 15;

            pdf.setFontSize(10);
            let recordCount = 0;
            const maxRecordsPerPage = 3;

            for (const record of data.medical_history) {
                recordCount++;

                // Check if we need a new page
                if (yPosition > 220 || recordCount > maxRecordsPerPage) {
                    pdf.addPage();
                    yPosition = 20;
                    recordCount = 1;
                }

                // Record header
                pdf.setFontSize(11);
                pdf.setFont(undefined, 'bold');
                pdf.text(`${recordCount}. ${new Date(record.created_at).toLocaleDateString()}`, 20, yPosition);
                yPosition += 10;

                // Staff info
                pdf.setFontSize(8);
                pdf.setTextColor(100, 100, 100);
                pdf.text(`   Staff: ${record.staff_name || 'Not recorded'}`, 20, yPosition);
                pdf.setTextColor(0, 0, 0);
                yPosition += 8;

                // Diagnosis
                pdf.setFontSize(9);
                pdf.setFont(undefined, 'normal');
                const diagnosisText = record.diagnosis || 'No diagnosis recorded';
                const diagnosisLines = pdf.splitTextToSize(`   Diagnosis: ${diagnosisText}`, 165);
                pdf.text(diagnosisLines, 20, yPosition);
                yPosition += (diagnosisLines.length * 5) + 5;

                // Treatment
                if (record.treatment) {
                    const treatmentText = record.treatment;
                    const treatmentLines = pdf.splitTextToSize(`   Treatment: ${treatmentText}`, 165);
                    pdf.text(treatmentLines, 20, yPosition);
                    yPosition += (treatmentLines.length * 5) + 5;
                }

                // Medications
                if (record.medications) {
                    const medicationText = record.medications;
                    const medicationLines = pdf.splitTextToSize(`   Medications: ${medicationText}`, 165);
                    pdf.text(medicationLines, 20, yPosition);
                    yPosition += (medicationLines.length * 5) + 5;
                }

                // Notes
                if (record.notes) {
                    const notesText = record.notes;
                    const notesLines = pdf.splitTextToSize(`   Notes: ${notesText}`, 165);
                    pdf.text(notesLines, 20, yPosition);
                    yPosition += (notesLines.length * 5) + 5;
                }

                // Instructions
                if (record.instructions) {
                    const instructionsText = record.instructions;
                    const instructionsLines = pdf.splitTextToSize(`   Instructions: ${instructionsText}`, 165);
                    pdf.text(instructionsLines, 20, yPosition);
                    yPosition += (instructionsLines.length * 5) + 5;
                }

                // Follow-up date
                if (record.follow_up_date) {
                    pdf.text(`   Follow-up: ${new Date(record.follow_up_date).toLocaleDateString()}`, 20, yPosition);
                    yPosition += 8;
                }

                // Add space between records
                yPosition += 10;

                // Safety check
                if (yPosition > 240) {
                    pdf.addPage();
                    yPosition = 20;
                }
            }
        }

        // Add footer
        const pageCount = pdf.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            pdf.setPage(i);
            pdf.setFontSize(8);
            pdf.setTextColor(150, 150, 150);
            pdf.text(`Page ${i} of ${pageCount}`, 105, 285, { align: 'center' });
            pdf.text('This report contains confidential medical information.', 105, 290, { align: 'center' });
        }

        // Generate filename
        const filename = `pet_medical_report_${data.pet.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;

        // Download the PDF
        pdf.save(filename);
    }

    async loadJSPDFLibrary() {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            if (typeof window.jspdf !== 'undefined' && typeof window.jspdf.jsPDF !== 'undefined') {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script.onload = () => {
                // Wait a bit for the library to initialize
                setTimeout(() => {
                    if (typeof window.jspdf !== 'undefined' && typeof window.jspdf.jsPDF !== 'undefined') {
                        resolve();
                    } else {
                        reject(new Error('jsPDF library failed to load properly'));
                    }
                }, 100);
            };
            script.onerror = () => reject(new Error('Failed to load jsPDF library'));
            document.head.appendChild(script);
        });
    }

    generatePetMedicalHTML(data) {
        const filename = `pet_medical_report_${data.pet.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.html`;

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Pet Medical Report - ${data.pet.name}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; max-width: 800px; margin: 0 auto; }
                    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
                    .clinic-info { text-align: center; margin-bottom: 30px; }
                    .section { margin-bottom: 30px; }
                    .section h3 { background: #f0f0f0; padding: 10px; margin: 0 0 15px 0; border-left: 4px solid #007bff; }
                    .info-grid { display: table; width: 100%; }
                    .info-row { display: table-row; }
                    .info-cell { display: table-cell; padding: 8px; border-bottom: 1px solid #ddd; }
                    .info-label { font-weight: bold; width: 30%; }
                    .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
                    @media print { body { margin: 0; } }
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
                    <p><strong>Report Generated:</strong> ${new Date().toLocaleString()}</p>
                </div>

                <div class="section">
                    <h3>Pet Information</h3>
                    <div class="info-grid">
                        <div class="info-row">
                            <div class="info-cell info-label">Name:</div>
                            <div class="info-cell">${data.pet.name}</div>
                        </div>
                        <div class="info-row">
                            <div class="info-cell info-label">Species:</div>
                            <div class="info-cell">${data.pet.species}</div>
                        </div>
                        <div class="info-row">
                            <div class="info-cell info-label">Breed:</div>
                            <div class="info-cell">${data.pet.breed || 'Not specified'}</div>
                        </div>
                        <div class="info-row">
                            <div class="info-cell info-label">Age:</div>
                            <div class="info-cell">${data.pet.age || 'Age not recorded'}</div>
                        </div>
                        <div class="info-row">
                            <div class="info-cell info-label">Gender:</div>
                            <div class="info-cell">${data.pet.gender || 'Not specified'}</div>
                        </div>
                        <div class="info-row">
                            <div class="info-cell info-label">Weight:</div>
                            <div class="info-cell">${data.pet.weight ? data.pet.weight + ' kg' : 'Weight not recorded'}</div>
                        </div>
                        <div class="info-row">
                            <div class="info-cell info-label">Color:</div>
                            <div class="info-cell">${data.pet.color || 'Not specified'}</div>
                        </div>
                        ${data.pet.notes ? `
                        <div class="info-row">
                            <div class="info-cell info-label">Notes:</div>
                            <div class="info-cell">${data.pet.notes}</div>
                        </div>
                        ` : ''}
                    </div>
                </div>

                <div class="section">
                    <h3>Owner Information</h3>
                    <div class="info-grid">
                        <div class="info-row">
                            <div class="info-cell info-label">Name:</div>
                            <div class="info-cell">${data.owner.name}</div>
                        </div>
                        <div class="info-row">
                            <div class="info-cell info-label">Email:</div>
                            <div class="info-cell">${data.owner.email}</div>
                        </div>
                        <div class="info-row">
                            <div class="info-cell info-label">Phone:</div>
                            <div class="info-cell">${data.owner.phone || 'Not provided'}</div>
                        </div>
                        <div class="info-row">
                            <div class="info-cell info-label">Address:</div>
                            <div class="info-cell">${data.owner.address || 'Not provided'}</div>
                        </div>
                    </div>
                </div>

                ${data.medical_history && data.medical_history.length > 0 ? `
                <div class="section">
                    <h3 style="color: #667eea; display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-stethoscope"></i> Medical History
                    </h3>
                    <div style="margin-bottom: 20px; text-align: center;">
                        <span style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600;">
                            <i class="fas fa-file-medical"></i> Total Records: ${data.medical_history.length}
                        </span>
                    </div>

                    <div class="medical-details">
                        ${data.medical_history.map((record, index) => `
                            <div class="medical-record" style="margin: 25px 0; padding: 25px; border: 2px solid #667eea; border-radius: 15px; background: linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%); box-shadow: 0 6px 20px rgba(102, 126, 234, 0.15); position: relative; overflow: hidden;">
                                <div style="position: absolute; top: 0; right: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 8px 15px; border-radius: 0 15px 0 15px; font-size: 12px; font-weight: 600;">
                                    #${index + 1}
                                </div>

                                <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #e1e5e9;">
                                    <h4 style="margin: 0 0 10px 0; color: #667eea; font-size: 20px; display: flex; align-items: center; gap: 10px;">
                                        <i class="fas fa-file-medical"></i> Medical Record
                                    </h4>
                                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
                                        <div style="display: flex; align-items: center; gap: 15px; color: #666;">
                                            <div><i class="fas fa-calendar"></i> <strong>Date:</strong> ${new Date(record.created_at).toLocaleDateString()}</div>
                                            <div><i class="fas fa-user-md"></i> <strong>Staff:</strong> ${record.staff_name || 'Not recorded'}</div>
                                        </div>
                                    </div>
                                </div>

                                <div style="display: grid; grid-template-columns: 1fr; gap: 15px;">
                                    <div style="background: #ffffff; padding: 15px; border-radius: 10px; border-left: 5px solid #667eea; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                                        <div style="font-weight: bold; color: #333; margin-bottom: 8px; font-size: 16px; display: flex; align-items: center; gap: 8px;">
                                            <i class="fas fa-stethoscope"></i> Diagnosis
                                        </div>
                                        <div style="color: #555; line-height: 1.6; padding-left: 25px;">${record.diagnosis ? record.diagnosis.replace(/\n/g, '<br>') : 'Not specified'}</div>
                                    </div>

                                    <div style="background: #ffffff; padding: 15px; border-radius: 10px; border-left: 5px solid #28a745; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                                        <div style="font-weight: bold; color: #333; margin-bottom: 8px; font-size: 16px; display: flex; align-items: center; gap: 8px;">
                                            <i class="fas fa-thermometer-three-quarters"></i> Treatment
                                        </div>
                                        <div style="color: #555; line-height: 1.6; padding-left: 25px;">${record.treatment ? record.treatment.replace(/\n/g, '<br>') : 'Not specified'}</div>
                                    </div>

                                    ${record.medications ? `
                                    <div style="background: #ffffff; padding: 15px; border-radius: 10px; border-left: 5px solid #ffc107; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                                        <div style="font-weight: bold; color: #333; margin-bottom: 8px; font-size: 16px; display: flex; align-items: center; gap: 8px;">
                                            <i class="fas fa-pills"></i> Medications
                                        </div>
                                        <div style="color: #555; line-height: 1.6; padding-left: 25px;">${record.medications.replace(/\n/g, '<br>')}</div>
                                    </div>
                                    ` : ''}

                                    ${record.follow_up_date ? `
                                    <div style="background: #ffffff; padding: 15px; border-radius: 10px; border-left: 5px solid #dc3545; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                                        <div style="font-weight: bold; color: #333; margin-bottom: 8px; font-size: 16px; display: flex; align-items: center; gap: 8px;">
                                            <i class="fas fa-calendar-check"></i> Follow-up Date
                                        </div>
                                        <div style="color: #555; line-height: 1.6; padding-left: 25px;">${new Date(record.follow_up_date).toLocaleDateString()}</div>
                                    </div>
                                    ` : ''}

                                    ${record.notes ? `
                                    <div style="background: #fff3cd; padding: 15px; border-radius: 10px; border-left: 5px solid #ffc107; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                                        <div style="font-weight: bold; color: #856404; margin-bottom: 8px; font-size: 16px; display: flex; align-items: center; gap: 8px;">
                                            <i class="fas fa-sticky-note"></i> Clinical Notes
                                        </div>
                                        <div style="color: #856404; line-height: 1.6; padding-left: 25px;">${record.notes.replace(/\n/g, '<br>')}</div>
                                    </div>
                                    ` : ''}

                                    ${record.instructions ? `
                                    <div style="background: #d1ecf1; padding: 15px; border-radius: 10px; border-left: 5px solid #17a2b8; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                                        <div style="font-weight: bold; color: #0c5460; margin-bottom: 8px; font-size: 16px; display: flex; align-items: center; gap: 8px;">
                                            <i class="fas fa-clipboard-list"></i> Instructions
                                        </div>
                                        <div style="color: #0c5460; line-height: 1.6; padding-left: 25px;">${record.instructions.replace(/\n/g, '<br>')}</div>
                                    </div>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}

                <div class="footer">
                    <p>This report contains confidential medical information and should only be shared with authorized personnel.</p>
                    <p>For questions about this report, please contact Tattoo Veterinary Clinic.</p>
                </div>
            </body>
            </html>
        `;

        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async loadServicesSection() {
        try {
            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_services' })
            });

            const result = await response.json();
            const servicesTableBody = document.getElementById('servicesTableBody');

            if (result.success && result.data && result.data.length > 0) {
                // Filter to show only active services
                const activeServices = result.data.filter(service => service.is_active === 1 || service.is_active === "1");

                if (activeServices.length > 0) {
                    servicesTableBody.innerHTML = activeServices.map(service => `
                        <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                            <td style="padding: 16px 12px; color: #ffffff; font-weight: 500;">${service.name}</td>
                            <td style="padding: 16px 12px; text-align: center;">
                                <span style="background: #28a745; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 500;">ACTIVE</span>
                            </td>
                            <td style="padding: 16px 12px; text-align: center;">
                                <div style="display: flex; gap: 8px; justify-content: center;">
                                    <button onclick="staffDashboard.editService(${service.id})" title="Edit Service" style="background: #3498db; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 12px; cursor: pointer; transition: all 0.2s ease;">
                                        <i class="fas fa-edit"></i> EDIT
                                    </button>
                                    <button onclick="staffDashboard.deleteService(${service.id}, this)" title="Delete Service" style="background: #e74c3c; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 12px; cursor: pointer; transition: all 0.2s ease;">
                                        <i class="fas fa-trash"></i> DELETE
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('');
                } else {
                    servicesTableBody.innerHTML = `
                        <tr>
                            <td colspan="3" style="text-align: center; padding: 40px; color: rgba(255, 255, 255, 0.7);">
                                <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
                                    <i class="fas fa-stethoscope" style="font-size: 48px; color: rgba(255, 255, 255, 0.3);"></i>
                                    <div>
                                        <h3 style="margin: 0 0 10px 0; color: #ffffff;">No Active Services</h3>
                                        <p style="margin: 0; color: rgba(255, 255, 255, 0.7);">All services have been deactivated. Add a new service to get started.</p>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    `;
                }
            } else {
                // Fallback to mock data - only show active services
                await this.loadServicesSectionMock();
            }
        } catch (error) {
            console.error('Failed to load services:', error);
            // Fallback to mock data
            await this.loadServicesSectionMock();
        }
    }

    async loadServicesSectionMock() {
        const servicesTableBody = document.getElementById('servicesTableBody');
        if (!servicesTableBody) return;

        const mockServices = [
            {
                id: 1,
                name: 'General Check-up',
                description: 'Comprehensive health examination',
                is_active: 1
            },
            {
                id: 2,
                name: 'Vaccination',
                description: 'Annual vaccination service',
                is_active: 1
            },
            {
                id: 3,
                name: 'Dental Cleaning',
                description: 'Professional teeth cleaning',
                is_active: 1
            }
        ];

        // Filter to show only active services
        const activeServices = mockServices.filter(service => service.is_active === 1);

        if (activeServices.length > 0) {
            servicesTableBody.innerHTML = activeServices.map(service => `
                <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                    <td style="padding: 16px 12px; color: #ffffff; font-weight: 500;">${service.name}</td>
                    <td style="padding: 16px 12px; text-align: center;">
                        <span style="background: #28a745; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 500;">ACTIVE</span>
                    </td>
                    <td style="padding: 16px 12px; text-align: center;">
                        <div style="display: flex; gap: 8px; justify-content: center;">
                            <button onclick="staffDashboard.editService(${service.id})" title="Edit Service" style="background: #3498db; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 12px; cursor: pointer; transition: all 0.2s ease;">
                                <i class="fas fa-edit"></i> EDIT
                            </button>
                            <button onclick="staffDashboard.deleteService(${service.id}, this)" title="Delete Service" style="background: #e74c3c; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 12px; cursor: pointer; transition: all 0.2s ease;">
                                <i class="fas fa-trash"></i> DELETE
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } else {
            servicesTableBody.innerHTML = `
                <tr>
                    <td colspan="3" style="text-align: center; padding: 40px; color: rgba(255, 255, 255, 0.7);">
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
                            <i class="fas fa-stethoscope" style="font-size: 48px; color: rgba(255, 255, 255, 0.3);"></i>
                            <div>
                                <h3 style="margin: 0 0 10px 0; color: #ffffff;">No Active Services</h3>
                                <p style="margin: 0; color: rgba(255, 255, 255, 0.7);">All services have been deactivated. Add a new service to get started.</p>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        }
    }

    async loadStoreSection() {
        try {
            console.log('🔄 Staff Dashboard: Loading store section...');

            // Show loading state
            const productsGrid = document.getElementById('productsGrid');
            if (productsGrid) {
                productsGrid.innerHTML = `
                    <div class="loading">
                        <div class="spinner"></div>
                        Loading products...
                    </div>
                `;
            }

            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_all_products' })
            });

            const result = await response.json();
            console.log('📡 Staff Dashboard: API response received:', result);

            if (productsGrid) {
                if (result.success && result.data && result.data.length > 0) {
                    console.log('✅ Staff Dashboard: Products loaded successfully:', result.data.length, 'products');
                    console.log('📊 Staff Dashboard: First product sample:', result.data[0]);
                    productsGrid.innerHTML = result.data.map(product => this.createProductCard(product)).join('');
                } else {
                    console.log('⚠️ Staff Dashboard: No products found or API failed:', result);
                    // Fallback to mock data
                    await this.loadStoreSectionMock();
                }
            }
        } catch (error) {
            console.error('❌ Staff Dashboard: Failed to load store:', error);
            // Fallback to mock data
            await this.loadStoreSectionMock();
        }
    }

    async loadStoreSectionMock() {
        const productsGrid = document.getElementById('productsGrid');
        if (!productsGrid) return;

        const mockProducts = [
            {
                id: 1,
                name: 'Premium Dog Food',
                category: 'Food',
                description: 'High-quality nutrition for dogs',
                price: 45.99,
                stock: 25,
                image: null
            },
            {
                id: 2,
                name: 'Cat Toys Set',
                category: 'Toys',
                description: 'Interactive toys for cats',
                price: 12.50,
                stock: 8,
                image: null
            }
        ];

        productsGrid.innerHTML = mockProducts.map(product => this.createProductCard(product)).join('');
    }

    createProductCard(product) {
        // Handle image loading with simplified error handling
        let imageHtml = '';
        let placeholderHtml = '<div class="product-image-placeholder"><i class="fas fa-image"></i></div>';

        console.log('🎯 Staff Dashboard: Creating product card for:', product.name, 'Image path:', product.image);

        if (product.image && product.image.trim() !== '' && product.image !== null && product.image !== 'null') {
            // Create a clean image path
            const cleanImageName = product.image.replace(/^.*[\/\\]/, ''); // Remove any path prefix
            const imagePath = `../assets/images/products/${cleanImageName}`;

            console.log('📁 Staff Dashboard: Using image path for', product.name, ':', imagePath);

            imageHtml = `<img src="${imagePath}" alt="${product.name}"
                onerror="handleImageError(this)"
                loading="lazy"
                style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">`;
        } else {
            console.log('⚠️ Staff Dashboard: No image data for', product.name, 'or image is null/empty');
        }

        const stockClass = product.stock === 0 ? 'stock-out' : product.stock < 10 ? 'stock-low' : 'stock-good';
        const stockText = product.stock === 0 ? 'Out of Stock' : product.stock < 10 ? 'Low Stock' : 'In Stock';
        const inStockClass = product.stock > 0 ? 'in-stock' : '';

        return `
            <div class="product-card ${inStockClass}">
                <div class="product-image">
                    ${imageHtml}
                    ${imageHtml ? '' : placeholderHtml}
                </div>
                <div class="product-info">
                    <div class="product-name">${product.name}</div>
                    <div class="product-category">${product.category}</div>
                    <div class="product-description">${product.description || 'No description available'}</div>
                    <div class="product-details">
                        <div class="product-price">₱${parseFloat(product.price).toFixed(2)}</div>
                        <div class="product-stock">
                            <span class="stock-badge ${stockClass}">${stockText} (${product.stock})</span>
                        </div>
                    </div>
                    <div class="product-actions">
                        <button class="btn-primary btn-small" onclick="editProduct(${product.id})" title="Edit Product">
                            <i class="fas fa-edit"></i> EDIT
                        </button>
                        <button class="btn-danger btn-small" onclick="deleteProduct(${product.id})" title="Delete Product">
                            <i class="fas fa-trash"></i> DELETE
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    async deleteProduct(productId) {
        if (!productId || isNaN(parseInt(productId))) {
            this.showToast('Invalid product ID', 'error');
            return;
        }

        // Enhanced confirmation dialog with product details
        const product = await this.getProductDetails(productId);
        if (!product) {
            this.showToast('Product not found', 'error');
            return;
        }

        const confirmMessage = `Are you sure you want to delete "${product.name}"?\n\nThis action cannot be undone and will:\n• Permanently delete the product\n• Remove the product image\n• Delete all associated data\n\nType "DELETE" to confirm:`;

        const userInput = prompt(confirmMessage);
        if (userInput !== 'DELETE') {
            if (userInput !== null) { // User didn't cancel
                this.showToast('Deletion cancelled. Type "DELETE" exactly to confirm.', 'info');
            }
            return;
        }

        try {
            console.log('🗑️ Deleting product with ID:', productId);

            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'delete_product',
                    product_id: parseInt(productId)
                })
            });

            const result = await response.json();
            console.log('📡 Delete product response:', result);

            if (result.success) {
                this.showToast('Product deleted successfully!', 'success');
                // Refresh the products grid and dashboard data
                await this.loadStoreSection();
                await this.loadDashboardData();
            } else {
                this.showToast(result.message || 'Failed to delete product', 'error');
            }
        } catch (error) {
            console.error('Error deleting product:', error);
            this.showToast('Error deleting product. Please try again.', 'error');
        }
    }

    async getProductDetails(productId) {
        try {
            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_all_products' })
            });

            const result = await response.json();

            if (result.success && result.data) {
                return result.data.find(p => p.id == productId);
            }
            return null;
        } catch (error) {
            console.error('Error getting product details:', error);
            return null;
        }
    }

    // Status change functions
    changeAppointmentStatus(appointmentId, newStatus) {
        console.log(`Status changed for appointment ${appointmentId} to ${newStatus}`);
        // Store the new status temporarily
        this.pendingStatusChanges = this.pendingStatusChanges || {};
        this.pendingStatusChanges[appointmentId] = newStatus;
    }

    async updateAppointmentStatus(appointmentId) {
        const newStatus = this.pendingStatusChanges?.[appointmentId];
        if (!newStatus) {
            this.showToast('Please select a status first', 'warning');
            return;
        }

        try {
            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update_appointment_status',
                    appointment_id: appointmentId,
                    status: newStatus
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('Appointment status updated successfully!', 'success');

                // If appointment is marked as completed, show medical history modal
                if (newStatus === 'completed') {
                    this.showMedicalHistoryModal(appointmentId);
                }

                // Remove from pending changes
                delete this.pendingStatusChanges[appointmentId];
                // Reload appointments to show updated status
                await this.loadAppointmentsSection();
            } else {
                this.showToast(result.message || 'Failed to update appointment status', 'error');
            }
        } catch (error) {
            console.error('Error updating appointment status:', error);
            this.showToast('Failed to update appointment status. Please try again.', 'error');
        }
    }

    // Placeholder functions for features not yet implemented
    editAppointment(appointmentId) {
        this.showToast('Edit appointment feature coming soon!', 'info');
    }

    cancelAppointment(appointmentId) {
        if (confirm('Are you sure you want to cancel this appointment?')) {
            this.showToast('Cancel appointment feature coming soon!', 'info');
        }
    }


    // Settings functionality
    async handleProfileUpdate(form) {
        try {
            const formData = new FormData(form);

            // Validate form data
            if (!this.validateProfileForm(formData)) {
                return;
            }

            const profileData = {
                action: 'update_profile',
                first_name: formData.get('first_name'),
                last_name: formData.get('last_name'),
                email: formData.get('email'),
                phone: formData.get('phone')
            };

            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profileData)
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('Profile updated successfully!', 'success');
                // Update the UI with new data
                if (result.user) {
                    document.getElementById('staffName').textContent = result.user.name;
                    document.getElementById('staffRole').textContent = result.user.position || 'Staff Member';
                }
                // Refresh user data to ensure consistency
                await this.loadUserData();
            } else {
                this.showToast(result.message || 'Failed to update profile', 'error');
            }
        } catch (error) {
            console.error('Profile update error:', error);
            this.showToast('Failed to update profile. Please try again.', 'error');
        }
    }

    async handlePasswordUpdate(form) {
        try {
            const formData = new FormData(form);

            // Validate form data
            if (!this.validatePasswordForm(formData)) {
                return;
            }

            const passwordData = {
                action: 'update_password',
                current_password: formData.get('current_password'),
                new_password: formData.get('new_password'),
                confirm_password: formData.get('confirm_password')
            };

            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(passwordData)
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('Password updated successfully!', 'success');
                form.reset();
            } else {
                this.showToast(result.message || 'Failed to update password', 'error');
            }
        } catch (error) {
            console.error('Password update error:', error);
            this.showToast('Failed to update password. Please try again.', 'error');
        }
    }

    async handleProfilePictureUpload(form) {
        try {
            console.log('Staff profile picture upload started...');
            const fileInput = document.getElementById('profilePictureInput');
            const file = fileInput.files[0];

            if (!file) {
                this.showToast('Please select an image file', 'error');
                return;
            }

            console.log('Staff file selected:', file.name, file.type, file.size);

            // Validate file type
            if (!file.type.startsWith('image/')) {
                this.showToast('Please select a valid image file', 'error');
                return;
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                this.showToast('Image file must be less than 5MB', 'error');
                return;
            }

            // Convert image to base64
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const imageData = e.target.result;
                    console.log('Staff image converted to base64, length:', imageData.length);

                    const uploadData = {
                        action: 'upload_profile_picture',
                        image_data: imageData,
                        image_name: file.name
                    };

                    console.log('Sending staff upload request...');
                    const response = await fetch('../api/vet_api.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(uploadData)
                    });

                    console.log('Staff response status:', response.status);
                    const result = await response.json();
                    console.log('Staff API response:', result);

                    if (result.success) {
                        this.showToast('Profile picture updated successfully!', 'success');
                        // Update the profile picture in the UI
                        this.updateProfilePicture(result.image_path);

                        // Also update the settings section profile picture
                        const currentProfilePicture = document.getElementById('currentProfilePicture');
                        if (currentProfilePicture && result.image_path) {
                            const newSrc = '../' + result.image_path + '?t=' + Date.now();
                            currentProfilePicture.src = newSrc;

                            currentProfilePicture.onerror = function() {
                                this.src = '../assets/images/logoo.jpg';
                            };
                        }

                        fileInput.value = ''; // Clear file input
                        document.getElementById('imagePreview').style.display = 'none';

                        // Refresh user data to ensure consistency
                        setTimeout(() => {
                            this.loadUserData();
                        }, 500);
                    } else {
                        this.showToast(result.message || 'Failed to upload profile picture', 'error');
                    }
                } catch (error) {
                    console.error('Staff profile picture upload error:', error);
                    this.showToast('Failed to upload profile picture. Please try again.', 'error');
                }
            };

            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Staff profile picture upload error:', error);
            this.showToast('Failed to upload profile picture. Please try again.', 'error');
        }
    }

    handleImagePreview(event) {
        const file = event.target.files[0];
        const preview = document.getElementById('imagePreview');

        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.src = e.target.result;
                preview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            preview.style.display = 'none';
        }
    }

    handleProductImageUpload(event) {
        const file = event.target.files[0];
        const preview = document.getElementById('productImagePreview');
        const previewContainer = document.getElementById('productImagePreviewContainer');

        console.log('Product image upload triggered:', { file, preview, previewContainer });

        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                this.showToast('Please select a valid image file', 'error');
                return;
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                this.showToast('Image file size must be less than 5MB', 'error');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                console.log('FileReader loaded image, setting preview');
                console.log('Image data length:', e.target.result.length);

                // Set the image source
                preview.src = e.target.result;
                preview.style.display = 'block';

                // Make sure the container is visible and properly styled
                if (previewContainer) {
                    previewContainer.style.display = 'flex';
                    previewContainer.style.visibility = 'visible';
                    previewContainer.style.opacity = '1';
                    previewContainer.style.position = 'relative';
                    previewContainer.style.backgroundColor = 'transparent';
                    previewContainer.style.alignItems = 'center';
                    previewContainer.style.justifyContent = 'center';
                    previewContainer.style.width = '100%';
                    previewContainer.style.height = '160px';
                    previewContainer.style.marginTop = '16px';
                    previewContainer.style.overflow = 'hidden';
                    previewContainer.style.borderRadius = '8px';
                    previewContainer.style.border = '2px solid #e1e5e9';
                    previewContainer.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                }

                // Ensure image has proper styling
                preview.style.width = 'auto';
                preview.style.height = 'auto';
                preview.style.maxWidth = '100%';
                preview.style.maxHeight = '100%';
                preview.style.objectFit = 'contain';
                preview.style.objectPosition = 'center';
                preview.style.borderRadius = '6px';
                preview.style.margin = '0 auto';
                preview.style.display = 'block';

                // Force reflow to ensure the image displays
                preview.offsetHeight;
                if (previewContainer) {
                    previewContainer.offsetHeight;
                }

                console.log('Preview should now be visible');
                console.log('Preview src set to:', preview.src.substring(0, 50) + '...');
                console.log('Preview display style:', preview.style.display);
                console.log('Preview container display:', previewContainer ? previewContainer.style.display : 'not found');

                // Show success message
                this.showToast('Image preview loaded successfully!', 'success');
            };
            reader.onerror = (e) => {
                console.error('FileReader error:', e);
                this.showToast('Error reading image file', 'error');
            };
            reader.readAsDataURL(file);
        } else {
            console.log('No file selected, hiding preview');
            if (preview) {
                preview.style.display = 'none';
                preview.src = '';
            }
            if (previewContainer) {
                previewContainer.style.display = 'none';
                previewContainer.style.visibility = 'hidden';
                previewContainer.style.opacity = '0';
            }
        }
    }

    handleEditProductImageUpload(event) {
        const file = event.target.files[0];
        const preview = document.getElementById('editProductImagePreview');

        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                this.showToast('Please select a valid image file', 'error');
                return;
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                this.showToast('Image file size must be less than 5MB', 'error');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                preview.src = e.target.result;
                preview.style.display = 'block';
                this.showToast('Image preview loaded successfully!', 'success');
            };
            reader.onerror = (e) => {
                console.error('FileReader error:', e);
                this.showToast('Error reading image file', 'error');
            };
            reader.readAsDataURL(file);
        } else {
            preview.style.display = 'none';
        }
    }

    async handleAddProduct(form) {
        try {
            const formData = new FormData(form);

            // Validate required fields
            const name = formData.get('name');
            const price = formData.get('price');
            const category = formData.get('category');

            if (!name || name.trim() === '') {
                this.showToast('Product name is required', 'error');
                return;
            }

            if (!price || isNaN(parseFloat(price)) || parseFloat(price) < 0) {
                this.showToast('Valid price is required', 'error');
                return;
            }

            if (!category || category.trim() === '') {
                this.showToast('Category is required', 'error');
                return;
            }

            const productData = {
                action: 'add_product',
                name: name.trim(),
                category: category.trim(),
                description: formData.get('description') ? formData.get('description').trim() : '',
                price: parseFloat(price),
                stock: parseInt(formData.get('stock')) || 0,
                is_active: 1 // Default to active for new products
            };

            // If there's an image file, convert it to base64
            const imageFile = formData.get('product_image');
            if (imageFile && imageFile.size > 0) {
                // Validate file type
                if (!imageFile.type.startsWith('image/')) {
                    this.showToast('Please select a valid image file', 'error');
                    return;
                }

                // Validate file size (max 5MB)
                if (imageFile.size > 5 * 1024 * 1024) {
                    this.showToast('Image file must be less than 5MB', 'error');
                    return;
                }

                const reader = new FileReader();
                reader.onload = async (e) => {
                    productData.image_data = e.target.result;
                    productData.image_name = imageFile.name;
                    await this.submitProduct(productData, 'add');
                };
                reader.onerror = (e) => {
                    console.error('FileReader error:', e);
                    this.showToast('Error reading image file', 'error');
                };
                reader.readAsDataURL(imageFile);
            } else {
                await this.submitProduct(productData, 'add');
            }
        } catch (error) {
            console.error('Add product error:', error);
            this.showToast('Failed to add product. Please try again.', 'error');
        }
    }

    async handleEditProduct(form) {
        try {
            const formData = new FormData(form);

            // Validate required fields using correct field names from HTML form
            const name = formData.get('name');
            const price = formData.get('price');
            const category = formData.get('category');
            const productId = formData.get('product_id');

            if (!name || name.trim() === '') {
                this.showToast('Product name is required', 'error');
                return;
            }

            if (!price || isNaN(parseFloat(price)) || parseFloat(price) < 0) {
                this.showToast('Valid price is required', 'error');
                return;
            }

            if (!category || category.trim() === '') {
                this.showToast('Category is required', 'error');
                return;
            }

            if (!productId || isNaN(parseInt(productId))) {
                this.showToast('Invalid product ID', 'error');
                return;
            }

            const productData = {
                action: 'update_product',
                product_id: parseInt(productId),
                name: name.trim(),
                category: category.trim(),
                description: formData.get('description') ? formData.get('description').trim() : '',
                price: parseFloat(price),
                stock: parseInt(formData.get('stock')) || 0,
                is_active: formData.get('is_active') === '1' ? 1 : 0
            };

            // If there's an image file, convert it to base64
            const imageFile = formData.get('editProductImage');
            if (imageFile && imageFile.size > 0) {
                // Validate file type
                if (!imageFile.type.startsWith('image/')) {
                    this.showToast('Please select a valid image file', 'error');
                    return;
                }

                // Validate file size (max 5MB)
                if (imageFile.size > 5 * 1024 * 1024) {
                    this.showToast('Image file must be less than 5MB', 'error');
                    return;
                }

                const reader = new FileReader();
                reader.onload = async (e) => {
                    productData.image_data = e.target.result;
                    productData.image_name = imageFile.name;
                    await this.submitProduct(productData, 'edit');
                };
                reader.onerror = (e) => {
                    console.error('FileReader error:', e);
                    this.showToast('Error reading image file', 'error');
                };
                reader.readAsDataURL(imageFile);
            } else {
                await this.submitProduct(productData, 'edit');
            }
        } catch (error) {
            console.error('Edit product error:', error);
            this.showToast('Failed to update product. Please try again.', 'error');
        }
    }

    // Enhanced modal closing function
    closeEditProductModal() {
        console.log('🔄 Closing edit product modal...');

        const modal = document.getElementById('editProductModal');
        if (modal) {
            console.log('✅ Found edit product modal, hiding it');
            modal.style.display = 'none';
            document.body.style.overflow = ''; // Restore scrolling

            // Clear form data
            const form = document.getElementById('editProductForm');
            if (form) {
                console.log('✅ Clearing form data');
                form.reset();

                // Clear any image preview
                const preview = document.getElementById('editProductImagePreview');
                if (preview) {
                    console.log('✅ Clearing image preview');
                    preview.style.display = 'none';
                    preview.src = '';
                }

                // Clear file input
                const fileInput = document.getElementById('editProductImageInput');
                if (fileInput) {
                    fileInput.value = '';
                }
            }

            console.log('✅ Edit product modal closed successfully');
            this.showToast('Edit cancelled', 'info');
        } else {
            console.error('❌ Edit product modal not found');
        }
    }

    async submitProduct(productData, action) {
        try {
            console.log(`🔄 Submitting ${action} product request...`, productData);

            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productData)
            });

            const result = await response.json();
            console.log(`📡 ${action} product response:`, result);

            if (result.success) {
                const actionText = action === 'add' ? 'added' : 'updated';
                this.showToast(`Product ${actionText} successfully!`, 'success');

                // Close modal and refresh data
                if (action === 'add') {
                    this.closeAddProductModal();
                } else {
                    this.closeEditProductModal();
                }

                await this.loadStoreSection();
                await this.loadDashboardData();
            } else {
                this.showToast(result.message || `Failed to ${action} product`, 'error');
            }
        } catch (error) {
            console.error('Submit product error:', error);
            this.showToast(`Failed to ${action} product. Please try again.`, 'error');
        }
    }


    async loadSettingsData() {
        try {
            // Load current user data for the settings forms
            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_user_info' })
            });

            const result = await response.json();

            if (result.success && result.data && result.data.user) {
                const user = result.data.user;
                // Populate settings forms with current data
                const firstNameInput = document.getElementById('firstName');
                const lastNameInput = document.getElementById('lastName');
                const emailInput = document.getElementById('email');
                const phoneInput = document.getElementById('phone');
    
                // Use separate first_name and last_name fields from API
                if (firstNameInput) firstNameInput.value = user.first_name || '';
                if (lastNameInput) lastNameInput.value = user.last_name || '';
                if (emailInput) emailInput.value = user.email || '';
                if (phoneInput) phoneInput.value = user.phone || '';
    
                // Update profile picture in settings section
                if (user.profile_picture) {
                    const currentProfilePicture = document.getElementById('currentProfilePicture');
                    if (currentProfilePicture) {
                        const newSrc = '../' + user.profile_picture + '?t=' + Date.now();
                        currentProfilePicture.src = newSrc;
    
                        // Add error handling
                        currentProfilePicture.onerror = function() {
                            this.src = '../assets/images/logoo.jpg';
                        };
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load settings data:', error);
        }
    }

    // Form validation methods
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    validatePhone(phone) {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
    }

    validatePassword(password) {
        return password.length >= 6;
    }

    showFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.style.borderColor = '#dc3545';

            // Remove existing error message
            const existingError = field.parentNode.querySelector('.field-error');
            if (existingError) {
                existingError.remove();
            }

            // Add new error message
            const errorDiv = document.createElement('div');
            errorDiv.className = 'field-error';
            errorDiv.style.color = '#dc3545';
            errorDiv.style.fontSize = '12px';
            errorDiv.style.marginTop = '4px';
            errorDiv.textContent = message;

            field.parentNode.appendChild(errorDiv);
        }
    }

    clearFieldError(fieldId) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.style.borderColor = '';

            const existingError = field.parentNode.querySelector('.field-error');
            if (existingError) {
                existingError.remove();
            }
        }
    }

    validateProfileForm(formData) {
        const firstName = formData.get('first_name');
        const lastName = formData.get('last_name');
        const email = formData.get('email');
        const phone = formData.get('phone');

        let isValid = true;

        // Validate first name
        if (!firstName || firstName.trim().length < 2) {
            this.showFieldError('firstName', 'First name must be at least 2 characters');
            isValid = false;
        } else {
            this.clearFieldError('firstName');
        }

        // Validate last name
        if (!lastName || lastName.trim().length < 2) {
            this.showFieldError('lastName', 'Last name must be at least 2 characters');
            isValid = false;
        } else {
            this.clearFieldError('lastName');
        }

        // Validate email
        if (!email || !this.validateEmail(email)) {
            this.showFieldError('email', 'Please enter a valid email address');
            isValid = false;
        } else {
            this.clearFieldError('email');
        }

        // Validate phone (optional)
        if (phone && !this.validatePhone(phone)) {
            this.showFieldError('phone', 'Please enter a valid phone number');
            isValid = false;
        } else {
            this.clearFieldError('phone');
        }

        return isValid;
    }

    validatePasswordForm(formData) {
        const currentPassword = formData.get('current_password');
        const newPassword = formData.get('new_password');
        const confirmPassword = formData.get('confirm_password');

        let isValid = true;

        // Validate current password
        if (!currentPassword) {
            this.showFieldError('currentPassword', 'Current password is required');
            isValid = false;
        } else {
            this.clearFieldError('currentPassword');
        }

        // Validate new password
        if (!newPassword || !this.validatePassword(newPassword)) {
            this.showFieldError('newPassword', 'Password must be at least 6 characters');
            isValid = false;
        } else {
            this.clearFieldError('newPassword');
        }

        // Validate confirm password
        if (!confirmPassword) {
            this.showFieldError('confirmPassword', 'Please confirm your new password');
            isValid = false;
        } else if (newPassword !== confirmPassword) {
            this.showFieldError('confirmPassword', 'Passwords do not match');
            isValid = false;
        } else {
            this.clearFieldError('confirmPassword');
        }

        return isValid;
    }

    // Utility functions
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type} show`;
        toast.innerHTML = `
            <div class="toast-icon">
                ${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}
            </div>
            <div class="toast-message">${message}</div>
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    redirectToLogin() {
        this.showToast('Please log in to access the staff dashboard', 'warning');
        setTimeout(() => {
            window.location.href = '../index.html';
        }, 2000);
    }

    async logout() {
        try {
            this.stopSessionMonitoring();

            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'logout' })
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('Logged out successfully!', 'success');
                setTimeout(() => {
                    window.location.href = '../index.html';
                }, 1500);
            } else {
                this.showToast('Logout failed. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Logout error:', error);
            this.showToast('Logout failed. Please try again.', 'error');
        }
    }
}

// Initialize staff dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.staffDashboard = new StaffDashboard();

});

// Global function for logout
window.immediateLogout = async () => {
    if (window.staffDashboard) {
        await window.staffDashboard.logout();
    }
};

// Image error handling functions
function handleStaffImageError(img, originalImage, allPaths) {
    console.log('❌ Staff Dashboard: Image failed to load:', img.src);
    console.log('🔍 Staff Dashboard: Original image:', originalImage);
    console.log('📋 Staff Dashboard: All paths:', allPaths);

    if (!img || !allPaths) {
        console.log('💔 Staff Dashboard: Invalid parameters, showing placeholder');
        showImagePlaceholder(img);
        return;
    }

    // Parse the pipe-separated paths
    const paths = allPaths.split('|').filter(path => path && path.trim() !== '');

    if (paths.length === 0) {
        console.log('💔 Staff Dashboard: No valid paths, showing placeholder');
        showImagePlaceholder(img);
        return;
    }

    // Find current index in the paths array
    const currentSrc = img.src;
    let currentIndex = paths.findIndex(path => currentSrc.includes(path));

    if (currentIndex === -1) {
        currentIndex = 0;
    } else {
        currentIndex++;
    }

    console.log('🔄 Staff Dashboard: Trying next path, current index:', currentIndex, 'of', paths.length);

    if (currentIndex >= paths.length) {
        // All paths failed, hide image and show placeholder
        console.log('💔 Staff Dashboard: All image paths failed for:', originalImage, 'showing placeholder');
        showImagePlaceholder(img);
        return;
    }

    // Skip empty paths
    if (!paths[currentIndex] || paths[currentIndex].trim() === '') {
        console.log('⚠️ Staff Dashboard: Skipping empty path at index', currentIndex);
        handleStaffImageError(img, originalImage, allPaths);
        return;
    }

    // Use the path with correct base prefix
    const basePath = '../assets/images/products/';
    const correctPath = basePath + paths[currentIndex];
    console.log('🔄 Staff Dashboard: Trying path:', correctPath);
    img.src = correctPath;
    img.onerror = function() {
        handleStaffImageError(img, originalImage, allPaths);
    };
}

function showImagePlaceholder(img) {
    if (img) {
        img.style.display = 'none';
        const placeholder = img.nextElementSibling;
        if (placeholder && placeholder.classList.contains('product-image-placeholder')) {
            placeholder.style.display = 'flex';
        } else {
            // Create placeholder if it doesn't exist
            const parent = img.parentElement;
            if (parent) {
                const placeholderDiv = document.createElement('div');
                placeholderDiv.className = 'product-image-placeholder';
                placeholderDiv.innerHTML = '<i class="fas fa-image"></i>';
                placeholderDiv.style.display = 'flex';
                parent.appendChild(placeholderDiv);
            }
        }
    }
}

// Global function to close edit product modal
function closeEditProductModal() {
    if (window.staffDashboard && window.staffDashboard.closeEditProductModal) {
        window.staffDashboard.closeEditProductModal();
    } else {
        console.error('StaffDashboard not available, using fallback');
        // Fallback implementation
        const modal = document.getElementById('editProductModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = ''; // Restore scrolling

            // Clear form data
            const form = document.getElementById('editProductForm');
            if (form) {
                form.reset();
                const preview = document.getElementById('editProductImagePreview');
                if (preview) {
                    preview.style.display = 'none';
                    preview.src = '';
                }
                // Clear file input
                const fileInput = document.getElementById('editProductImageInput');
                if (fileInput) {
                    fileInput.value = '';
                }
                // Clear preview container
                const previewContainer = document.getElementById('editProductImagePreviewContainer');
                if (previewContainer) {
                    previewContainer.style.display = 'none';
                    previewContainer.style.visibility = 'hidden';
                    previewContainer.style.opacity = '0';
                }
            }
        }
    }
}

// Global functions for product actions
function editProduct(productId) {
    console.log('🔧 Edit product called with ID:', productId);
    if (window.staffDashboard && window.staffDashboard.showEditProductModal) {
        window.staffDashboard.showEditProductModal(productId);
    } else {
        console.error('❌ StaffDashboard not available for edit');
        if (window.toast) {
            window.toast('Edit feature not available. Please refresh the page.', 'error');
        } else {
            alert('Edit feature not available. Please refresh the page.');
        }
    }
}

function deleteProduct(productId) {
    console.log('🗑️ Delete product called with ID:', productId);
    if (window.staffDashboard && window.staffDashboard.deleteProduct) {
        window.staffDashboard.deleteProduct(productId);
    } else {
        console.error('❌ StaffDashboard not available for delete');
        if (window.toast) {
            window.toast('Delete feature not available. Please refresh the page.', 'error');
        } else {
            alert('Delete feature not available. Please refresh the page.');
        }
    }
}

// Global function to show add product modal
function showAddProductModal() {
    console.log('➕ Show add product modal called');
    if (window.staffDashboard && window.staffDashboard.showAddProductModal) {
        window.staffDashboard.showAddProductModal();
    } else {
        console.error('❌ StaffDashboard not available for add product');
        if (window.toast) {
            window.toast('Add product feature not available. Please refresh the page.', 'error');
        } else {
            alert('Add product feature not available. Please refresh the page.');
        }
    }
}

// Global functions for pet card actions
function viewPetDetails(petId) {
    console.log('👁️ View pet details called with ID:', petId);
    if (window.staffDashboard && window.staffDashboard.viewPetDetails) {
        window.staffDashboard.viewPetDetails(petId);
    } else {
        console.error('❌ StaffDashboard not available for view pet details');
        if (window.toast) {
            window.toast('View pet details feature not available. Please refresh the page.', 'error');
        } else {
            alert('View pet details feature not available. Please refresh the page.');
        }
    }
}

function showPetMedicalHistory(petId) {
    console.log('🏥 Show pet medical history called with ID:', petId);
    if (window.staffDashboard && window.staffDashboard.showPetMedicalHistory) {
        window.staffDashboard.showPetMedicalHistory(petId);
    } else {
        console.error('❌ StaffDashboard not available for pet medical history');
        if (window.toast) {
            window.toast('Medical history feature not available. Please refresh the page.', 'error');
        } else {
            alert('Medical history feature not available. Please refresh the page.');
        }
    }
}

// Global function to download pet medical report
function downloadPetMedicalReport(petId) {
    console.log('📥 Download pet medical report called with ID:', petId);
    if (window.staffDashboard && window.staffDashboard.downloadPetMedicalReport) {
        window.staffDashboard.downloadPetMedicalReport(petId);
    } else {
        console.error('❌ StaffDashboard not available for download medical report');
        if (window.toast) {
            window.toast('Download feature not available. Please refresh the page.', 'error');
        } else {
            alert('Download feature not available. Please refresh the page.');
        }
    }
}