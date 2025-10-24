// Dashboard functionality for both client and staff
class Dashboard {
    constructor() {
        this.userData = null;
        this.userType = null;
        this.sessionCheckInterval = null;
        this.sessionWarningShown = false;
        this.init();
    }

    async init() {
        try {
            // Check session with retry logic
            let sessionValid = false;
            let retryCount = 0;
            const maxRetries = 3;

            while (!sessionValid && retryCount < maxRetries) {
                try {
                    await this.checkSession();
                    sessionValid = true;
                } catch (error) {
                    retryCount++;
                    console.warn(`Session check attempt ${retryCount} failed:`, error);
                    if (retryCount < maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
                    }
                }
            }

            if (!sessionValid) {
                throw new Error('Session validation failed after retries');
            }

            // Load user data and dashboard data
            await this.loadUserData();
            await this.loadDashboardData();
            this.setupEventListeners();
            this.startSessionMonitoring();
            this.showToast('Welcome to your dashboard!', 'success');

        } catch (error) {
            console.error('Dashboard initialization error:', error);
            this.showSessionErrorModal();
        }
    }

    startSessionMonitoring() {
        // Check session every 5 minutes
        this.sessionCheckInterval = setInterval(async () => {
            try {
                await this.checkSession();
                this.sessionWarningShown = false; // Reset warning flag
            } catch (error) {
                console.warn('Session check during monitoring failed:', error);
                if (!this.sessionWarningShown) {
                    this.showSessionWarning();
                }
            }
        }, 5 * 60 * 1000); // 5 minutes

        // Warn user 2 minutes before session expires (if we had that info)
        this.sessionWarningInterval = setInterval(() => {
            this.checkSessionTimeout();
        }, 60 * 1000); // Check every minute
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
        this.showToast('Your session has expired. Please login again.', 'error');
        clearInterval(this.sessionCheckInterval);
        clearInterval(this.sessionWarningInterval);

        this.showSessionExpiredModal();
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
            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'check_session' })
            });

            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.message || 'Session check failed');
            }

            if (!result.data?.logged_in) {
                throw new Error('Not logged in');
            }

            this.userType = result.data.user_type;
            return result;
        } catch (error) {
            console.error('Session check failed:', error);
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
        if (!this.userData) return;

        try {
            // Update sidebar user information
            const userNameElement = document.getElementById('userName') || document.querySelector('.sidebar-header h3');
            const userEmailElement = document.getElementById('userEmail') || document.querySelector('.sidebar-header p');

            if (userNameElement && this.userData.name) {
                userNameElement.textContent = this.userData.name;
            }

            if (userEmailElement && this.userData.email) {
                userEmailElement.textContent = this.userData.email;
            }

            // Update profile picture if available
            if (this.userData.profile_picture) {
                this.updateProfilePicture(this.userData.profile_picture);
            }

            // Update any other user display elements
            const clientNameElement = document.getElementById('clientName');
            const clientEmailElement = document.getElementById('clientEmail');

            if (clientNameElement && this.userData.name) {
                clientNameElement.textContent = this.userData.name;
            }

            if (clientEmailElement && this.userData.email) {
                clientEmailElement.textContent = this.userData.email;
            }

        } catch (error) {
            console.error('Error updating user display:', error);
        }
    }

    async loadDashboardData() {
        try {
            // Load real data from API
            const [dashboardResponse, petsResponse, appointmentsResponse] = await Promise.all([
                fetch('../api/vet_api.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'get_dashboard_data' })
                }),
                fetch('../api/vet_api.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'get_pets' })
                }),
                fetch('../api/vet_api.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'get_appointments' })
                })
            ]);

            const dashboardResult = await dashboardResponse.json();
            const petsResult = await petsResponse.json();
            const appointmentsResult = await appointmentsResponse.json();

            if (dashboardResult.success) {
                this.updateDashboardCards(dashboardResult.data);
            }

            // Recent activity cards removed for client dashboard
            // if (petsResult.success && petsResult.data) {
            //     this.updateCard('my-pets', petsResult.data.length);
            // }

            // if (appointmentsResult.success && appointmentsResult.data) {
            //     const appointments = appointmentsResult.data;
            //     const upcomingCount = appointments.filter(apt =>
            //         new Date(apt.appointment_date) >= new Date() &&
            //         apt.status !== 'cancelled'
            //     ).length;
            //     this.updateCard('upcoming-appointments', upcomingCount);
            // }

            // Load other sections
            await this.loadPetsSection();
            await this.loadAppointmentsSection();
            await this.loadOrdersSection();

        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        }
    }

    updateDashboardCards(data) {
        if (this.userType === 'client') {
            // Recent activity cards removed for client dashboard
            // this.updateCard('upcoming-appointments', data.upcoming_appointments || 0);
            // this.updateCard('my-pets', data.my_pets || 0);
            // this.updateCard('completed-visits', data.completed_visits || 0);
            // this.updateCard('cart-items', data.cart_items || 0);
        } else if (this.userType === 'staff') {
            this.updateCard('today-appointments', data.today_appointments || 0);
            this.updateCard('pending-appointments', data.pending_appointments || 0);
            this.updateCard('total-clients', data.total_clients || 0);
            this.updateCard('total-pets', data.total_pets || 0);
        }
    }

    updateCard(cardId, value) {
        const card = document.querySelector(`[data-card="${cardId}"]`);
        if (card) {
            const valueElement = card.querySelector('.card-value');
            if (valueElement) {
                valueElement.textContent = value;
            }
        }
    }

    setupEventListeners() {
        // Mobile sidebar toggle
        this.setupMobileSidebar();

        // Logout functionality
        const logoutBtn = document.querySelector('[data-action="logout"]');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }

        // Add Pet functionality
        const addPetBtn = document.querySelector('[data-action="add-pet"]');
        if (addPetBtn) {
            addPetBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showAddPetModal();
            });
        }

        // Book Appointment functionality - use event delegation for all booking buttons
        document.addEventListener('click', (e) => {
          if (e.target.matches('[data-action="book-appointment"]') || e.target.closest('[data-action="book-appointment"]')) {
            e.preventDefault();
            console.log('Booking button clicked!'); // Debug log
            this.showBookingModal();
          }
        });

        // Refresh dashboard
        const refreshBtn = document.querySelector('[data-action="refresh"]');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.loadDashboardData();
                this.showToast('Dashboard refreshed!', 'success');
            });
        }

        // Add to Order functionality - use event delegation for all order buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('.add-to-order') || e.target.closest('.add-to-order')) {
                e.preventDefault();
                const button = e.target.matches('.add-to-order') ? e.target : e.target.closest('.add-to-order');
                const productId = button.getAttribute('data-product-id');
                if (productId) {
                    const quantityInput = button.parentNode.parentNode.querySelector('.quantity-input');
                    const quantity = parseInt(quantityInput.value) || 1;
                    this.addToOrder(productId, quantity);
                }
            }

            // Buy Now functionality - use event delegation for all buy now buttons
            if (e.target.matches('.buy-now') || e.target.closest('.buy-now')) {
                e.preventDefault();
                const button = e.target.matches('.buy-now') ? e.target : e.target.closest('.buy-now');
                const productId = button.getAttribute('data-product-id');
                if (productId) {
                    const quantityInput = button.parentNode.parentNode.querySelector('.quantity-input');
                    const quantity = parseInt(quantityInput.value) || 1;
                    this.showPaymentModal(productId, quantity);
                }
            }
        });

        // Settings functionality
        this.setupSettingsEventListeners();

        // Mobile sidebar functionality
        this.setupMobileSidebar();
    }

    setupMobileSidebar() {
        // Mobile menu toggle button
        const mobileToggle = document.getElementById('mobileMenuToggle');
        if (mobileToggle) {
            mobileToggle.addEventListener('click', () => {
                this.toggleSidebar();
            });
        }

        // Mobile overlay click to close sidebar
        const mobileOverlay = document.getElementById('mobileOverlay');
        if (mobileOverlay) {
            mobileOverlay.addEventListener('click', () => {
                this.closeSidebar();
            });
        }

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                const sidebar = document.getElementById('sidebar');
                const mobileToggle = document.getElementById('mobileMenuToggle');
                const mobileOverlay = document.getElementById('mobileOverlay');

                if (sidebar && mobileOverlay && mobileToggle) {
                    const isOpen = sidebar.classList.contains('mobile-open');
                    const clickedOnToggle = mobileToggle.contains(e.target);
                    const clickedOnSidebar = sidebar.contains(e.target);
                    const clickedOnOverlay = mobileOverlay.contains(e.target);

                    if (isOpen && !clickedOnToggle && !clickedOnSidebar && !clickedOnOverlay) {
                        this.closeSidebar();
                    }
                }
            }
        });

        // Handle escape key to close mobile sidebar
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const sidebar = document.getElementById('sidebar');
                if (sidebar && sidebar.classList.contains('mobile-open')) {
                    this.closeSidebar();
                }
            }
        });
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('mobileOverlay');
        const toggleBtn = document.getElementById('mobileMenuToggle');

        if (sidebar && overlay) {
            const isOpen = sidebar.classList.contains('mobile-open');

            if (isOpen) {
                this.closeSidebar();
            } else {
                this.openSidebar();
            }
        }
    }

    openSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('mobileOverlay');
        const toggleBtn = document.getElementById('mobileMenuToggle');

        if (sidebar && overlay) {
            sidebar.classList.add('mobile-open');
            overlay.classList.add('active');

            if (toggleBtn) {
                toggleBtn.innerHTML = '<i class="fas fa-times"></i>';
                toggleBtn.setAttribute('aria-expanded', 'true');
            }

            // Focus management for accessibility
            const firstFocusableElement = sidebar.querySelector('a, button, [tabindex]:not([tabindex="-1"])');
            if (firstFocusableElement) {
                firstFocusableElement.focus();
            }
        }
    }

    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('mobileOverlay');
        const toggleBtn = document.getElementById('mobileMenuToggle');

        if (sidebar && overlay) {
            sidebar.classList.remove('mobile-open');
            overlay.classList.remove('active');

            if (toggleBtn) {
                toggleBtn.innerHTML = '<i class="fas fa-bars"></i>';
                toggleBtn.setAttribute('aria-expanded', 'false');
            }

            // Return focus to toggle button for accessibility
            if (toggleBtn) {
                toggleBtn.focus();
            }
        }
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

        // Sidebar profile picture click
        const sidebarProfileInput = document.getElementById('sidebarProfileInput');
        if (sidebarProfileInput) {
            sidebarProfileInput.addEventListener('change', (e) => {
                this.handleSidebarProfileUpload(e);
            });
        }

        // Sidebar profile picture container click
        const profilePictureContainer = document.querySelector('.profile-picture-container');
        if (profilePictureContainer) {
            profilePictureContainer.addEventListener('click', () => {
                sidebarProfileInput.click();
            });
        }
    }

    async logout() {
        try {
            // Stop session monitoring
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

    showAddPetModal() {
        const modal = this.createModal('Add New Pet', this.getAddPetForm());
        document.body.appendChild(modal);
        modal.style.display = 'block';
    }

    getAddPetForm() {
        return `
            <form id="addPetForm" class="pet-form">
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
                    <button type="button" class="btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button type="submit" class="btn-primary">Add Pet</button>
                </div>
            </form>
        `;
    }

    showBookingModal() {
      // Prevent multiple modals from being created
      if (this.isCreatingBookingModal) {
        console.log('Booking modal already being created, ignoring duplicate request');
        return;
      }

      this.isCreatingBookingModal = true;

      this.loadServicesAndPets().then(() => {
        const modal = this.createModal('Book Appointment', this.getBookingForm());
        document.body.appendChild(modal);
        modal.style.display = 'block';

        // Reset the flag when modal is closed
        const closeBtn = modal.querySelector('.close');
        if (closeBtn) {
          closeBtn.addEventListener('click', () => {
            this.isCreatingBookingModal = false;
          });
        }

        // Also reset flag when clicking outside modal
        modal.addEventListener('click', (e) => {
          if (e.target === modal) {
            this.isCreatingBookingModal = false;
          }
        });

        this.isCreatingBookingModal = false;
      }).catch((error) => {
        console.error('Error creating booking modal:', error);
        this.isCreatingBookingModal = false;
      });
    }

    async showEditAppointmentModal(appointmentId) {
        try {
            // First load services and pets
            await this.loadServicesAndPets();

            // Then fetch the appointment data
            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_appointments' })
            });

            const result = await response.json();

            if (result.success && result.data) {
                // Find the specific appointment (handle both id and appointment_id fields)
                const appointment = result.data.find(apt => apt.id == appointmentId || apt.appointment_id == appointmentId);
                if (appointment) {
                    const modal = this.createModal('Edit Appointment', this.getEditAppointmentForm(appointmentId, appointment));
                    document.body.appendChild(modal);
                    modal.style.display = 'block';

                    // Populate the form with existing data
                    this.populateEditForm(appointment);
                } else {
                    this.showToast('Appointment not found', 'error');
                }
            } else {
                this.showToast('Failed to load appointment data', 'error');
            }
        } catch (error) {
            console.error('Error loading edit appointment modal:', error);
            this.showToast('Failed to load edit appointment form', 'error');
        }
    }


    async loadServicesAndPets() {
        try {
            // Load services from API
            const servicesResponse = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_services' })
            });
            const servicesResult = await servicesResponse.json();

            // Filter to show only active services (same logic as staff dashboard)
            const activeServices = servicesResult.success ?
                servicesResult.data.filter(service => service.is_active === 1 || service.is_active === "1") : [];

            this.services = activeServices.map(service => ({
                service_id: service.id,
                service_name: service.name
            }));

            // Load user's pets
            const petsResponse = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_pets' })
            });
            const petsResult = await petsResponse.json();
            this.pets = petsResult.success ? petsResult.data : [];
        } catch (error) {
            console.error('Failed to load services and pets:', error);
            // Fallback to basic services if API fails
            this.services = [
                { service_id: 1, service_name: 'General Checkup' },
                { service_id: 2, service_name: 'Vaccination' },
                { service_id: 3, service_name: 'Deworming' },
                { service_id: 4, service_name: 'Grooming' },
                { service_id: 5, service_name: 'Dental Care' },
                { service_id: 6, service_name: 'Emergency Care' }
            ];
            this.pets = [];
        }
    }

    getBookingForm() {
        const serviceOptions = this.services.map(service =>
            `<option value="${service.service_id}">${service.service_name}</option>`
        ).join('');

        const petOptions = this.pets.map(pet =>
            `<option value="${pet.id}">${pet.name} (${pet.species})</option>`
        ).join('');

        return `
            <form id="bookingForm" class="booking-form">
                <div class="form-group">
                    <label for="serviceSelect">Service *</label>
                    <select id="serviceSelect" name="service_id" required>
                        <option value="">Select a service</option>
                        ${serviceOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label for="petSelect">Pet *</label>
                    <select id="petSelect" name="pet_id" required>
                        <option value="">Select your pet</option>
                        ${petOptions}
                    </select>
                    ${this.pets.length === 0 ? '<p class="text-warning">You need to add a pet first before booking.</p>' : ''}
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="appointmentDate">Date *</label>
                        <input type="date" id="appointmentDate" name="appointment_date" required min="${new Date().toISOString().split('T')[0]}">
                    </div>
                    <div class="form-group">
                        <label for="appointmentTime">Time *</label>
                        <select id="appointmentTime" name="appointment_time" required>
                            <option value="">Select date first</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label for="appointmentNotes">Notes (Optional)</label>
                    <textarea id="appointmentNotes" name="notes" rows="3" placeholder="Any special instructions or concerns..."></textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button type="submit" class="btn-primary" ${this.pets.length === 0 ? 'disabled' : ''}>Book Appointment</button>
                </div>
            </form>
        `;
    }

    getEditAppointmentForm(appointmentId, appointment = null) {
        const serviceOptions = this.services.map(service => {
            const selected = appointment && appointment.service_id == service.service_id ? 'selected' : '';
            return `<option value="${service.service_id}" ${selected}>${service.service_name}</option>`;
        }).join('');

        const petOptions = this.pets.map(pet => {
            const selected = appointment && appointment.pet_id == pet.id ? 'selected' : '';
            return `<option value="${pet.id}" ${selected}>${pet.name} (${pet.species})</option>`;
        }).join('');

        const appointmentDate = appointment ? appointment.appointment_date : '';
        const appointmentTime = appointment ? appointment.appointment_time : '';
        const notes = appointment ? appointment.notes || '' : '';

        return `
            <form id="editAppointmentForm" class="booking-form" data-appointment-id="${appointmentId}">
                <div class="form-group">
                    <label for="editServiceSelect">Service *</label>
                    <select id="editServiceSelect" name="service_id" required>
                        <option value="">Select a service</option>
                        ${serviceOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label for="editPetSelect">Pet *</label>
                    <select id="editPetSelect" name="pet_id" required>
                        <option value="">Select your pet</option>
                        ${petOptions}
                    </select>
                    ${this.pets.length === 0 ? '<p class="text-warning">You need to add a pet first before booking.</p>' : ''}
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="editAppointmentDate">Date *</label>
                        <input type="date" id="editAppointmentDate" name="appointment_date" required value="${appointmentDate}" min="${new Date().toISOString().split('T')[0]}">
                    </div>
                    <div class="form-group">
                        <label for="editAppointmentTime">Time *</label>
                        <select id="editAppointmentTime" name="appointment_time" required>
                            <option value="">Select date first</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label for="editAppointmentNotes">Notes (Optional)</label>
                    <textarea id="editAppointmentNotes" name="notes" rows="3" placeholder="Any special instructions or concerns...">${notes}</textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button type="submit" class="btn-primary">Update Appointment</button>
                </div>
            </form>
        `;
    }

    populateEditForm(appointment) {
        // The form is already populated in getEditAppointmentForm, but we need to set the time
        const timeSelect = document.getElementById('editAppointmentTime');
        if (timeSelect && appointment.appointment_time) {
            // Add the current time as an option and select it
            const option = document.createElement('option');
            option.value = appointment.appointment_time;
            option.textContent = appointment.appointment_time;
            option.selected = true;
            timeSelect.appendChild(option);
        }
    }

    createModal(title, content) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        `;

        // Add form submission handlers
        const form = modal.querySelector('form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                if (form.id === 'addPetForm') {
                    this.handleAddPet(form);
                } else if (form.id === 'addServiceForm') {
                    this.handleAddService(form);
                } else if (form.id === 'editPetForm') {
                    this.handleEditPet(form);
                } else if (form.id === 'bookingForm') {
                    this.handleBooking(form);
                } else if (form.id === 'editAppointmentForm') {
                    this.handleEditAppointment(form);
                } else if (form.id === 'paymentForm') {
                    this.handlePayment(form);
                }
            });
        }

        // Add payment method selection handler
        const paymentMethods = modal.querySelectorAll('input[name="payment_method"]');
        paymentMethods.forEach(method => {
            method.addEventListener('change', (e) => {
                const selectedMethod = modal.querySelector('#selectedMethod');
                const methodNames = {
                    'gcash': 'GCash',
                    'bank': 'Bank Transfer',
                    'cash_on_visit': 'Cash on Visit'
                };
                selectedMethod.textContent = methodNames[e.target.value];
            });
        });

        // Add date change handler for booking and edit forms
        const dateInput = modal.querySelector('#appointmentDate');
        const editDateInput = modal.querySelector('#editAppointmentDate');

        if (dateInput) {
            dateInput.addEventListener('change', (e) => {
                this.loadAvailableTimes(e.target.value);
            });
        }

        if (editDateInput) {
            editDateInput.addEventListener('change', (e) => {
                this.loadAvailableTimes(e.target.value);
            });
        }

        return modal;
    }

    async addToOrder(productId, quantity) {
        try {
            const orderData = {
                action: 'add_to_order',
                product_id: productId,
                quantity: quantity
            };

            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('Item added to order successfully!', 'success');
                // Refresh dashboard to update orders section and stock
                this.loadDashboardData();
            } else {
                this.showToast(result.message || 'Failed to add item to order', 'error');
            }
        } catch (error) {
            console.error('Error adding to order:', error);
            this.showToast('Failed to add item to order. Please try again.', 'error');
        }
    }

    showPaymentModal(productId, quantity) {
        // Get product details first
        this.selectedProductId = productId;
        this.selectedQuantity = quantity;

        const modal = this.createModal('Select Payment Method', this.getPaymentForm());
        document.body.appendChild(modal);
        modal.style.display = 'block';
    }

    showPaymentModalForCart(orderData) {
        // Store cart data for payment processing
        this.cartData = orderData;
        this.selectedProductId = 'cart'; // Special identifier for cart checkout

        const modal = this.createModal('Select Payment Method', this.getCartPaymentForm());
        document.body.appendChild(modal);
        modal.style.display = 'block';
    }

    getPaymentForm() {
        return `
            <form id="paymentForm" class="payment-form">
                <div class="payment-methods">
                    <div class="payment-method">
                        <input type="radio" id="gcash" name="payment_method" value="gcash" required>
                        <label for="gcash">
                            <div class="payment-icon">
                                <i class="fas fa-mobile-alt"></i>
                            </div>
                            <div class="payment-info">
                                <h3>GCash</h3>
                                <p>Pay using your GCash wallet</p>
                            </div>
                        </label>
                    </div>

                    <div class="payment-method">
                        <input type="radio" id="bank" name="payment_method" value="bank" required>
                        <label for="bank">
                            <div class="payment-icon">
                                <i class="fas fa-university"></i>
                            </div>
                            <div class="payment-info">
                                <h3>Bank Transfer</h3>
                                <p>Pay via bank transfer</p>
                            </div>
                        </label>
                    </div>

                    <div class="payment-method">
                        <input type="radio" id="cash" name="payment_method" value="cash_on_visit" required>
                        <label for="cash">
                            <div class="payment-icon">
                                <i class="fas fa-money-bill-wave"></i>
                            </div>
                            <div class="payment-info">
                                <h3>Cash on Visit</h3>
                                <p>Pay cash when you visit</p>
                            </div>
                        </label>
                    </div>
                </div>

                <div class="payment-summary">
                    <h4>Order Summary</h4>
                    <div class="summary-row">
                        <span>Quantity:</span>
                        <span>${this.selectedQuantity}</span>
                    </div>
                    <div class="summary-row">
                        <span>Payment Method:</span>
                        <span id="selectedMethod">Please select a payment method</span>
                    </div>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button type="submit" class="btn-primary">Complete Purchase</button>
                </div>
            </form>
        `;
    }

    getCartPaymentForm() {
        const cartItems = this.cartData.items.map(item => `
            <div class="cart-item-summary">
                <div class="item-info">
                    <h4>${item.name}</h4>
                    <p>Quantity: ${item.quantity} × ₱${item.price.toFixed(2)}</p>
                </div>
                <div class="item-total">
                    ₱${(item.price * item.quantity).toFixed(2)}
                </div>
            </div>
        `).join('');

        return `
            <form id="paymentForm" class="payment-form">
                <div class="cart-summary">
                    <h4>Cart Summary</h4>
                    ${cartItems}
                    <div class="cart-total-summary">
                        <strong>Total: ₱${this.cartData.total.toFixed(2)}</strong>
                    </div>
                </div>

                <div class="payment-methods">
                    <div class="payment-method">
                        <input type="radio" id="gcash" name="payment_method" value="gcash" required>
                        <label for="gcash">
                            <div class="payment-icon">
                                <i class="fas fa-mobile-alt"></i>
                            </div>
                            <div class="payment-info">
                                <h3>GCash</h3>
                                <p>Pay using your GCash wallet</p>
                            </div>
                        </label>
                    </div>

                    <div class="payment-method">
                        <input type="radio" id="bank" name="payment_method" value="bank" required>
                        <label for="bank">
                            <div class="payment-icon">
                                <i class="fas fa-university"></i>
                            </div>
                            <div class="payment-info">
                                <h3>Bank Transfer</h3>
                                <p>Pay via bank transfer</p>
                            </div>
                        </label>
                    </div>

                    <div class="payment-method">
                        <input type="radio" id="cash" name="payment_method" value="cash_on_visit" required>
                        <label for="cash">
                            <div class="payment-icon">
                                <i class="fas fa-money-bill-wave"></i>
                            </div>
                            <div class="payment-info">
                                <h3>Cash on Visit</h3>
                                <p>Pay cash when you visit</p>
                            </div>
                        </label>
                    </div>
                </div>

                <div class="payment-summary">
                    <div class="summary-row">
                        <span>Payment Method:</span>
                        <span id="selectedMethod">Please select a payment method</span>
                    </div>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button type="submit" class="btn-primary">Complete Purchase</button>
                </div>
            </form>
        `;
    }

    async handleAddPet(form) {
        try {
            // Prevent multiple submissions
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding Pet...';
            }

            const formData = new FormData(form);
            const petData = {
                action: 'add_pet',
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

                // Trigger notification for pet registration
                this.triggerNotification('pet_registration', {
                    pet_name: petData.pet_name,
                    species: petData.species
                });

                form.closest('.modal').remove();

                // Reload pets section after a short delay to ensure database is updated
                setTimeout(() => {
                    this.loadPetsSection();
                    this.loadDashboardData(); // Refresh dashboard data
                }, 500);
            } else {
                this.showToast(result.message || 'Failed to add pet', 'error');
            }
        } catch (error) {
            console.error('Error adding pet:', error);
            this.showToast('Failed to add pet. Please try again.', 'error');
        } finally {
            // Re-enable submit button
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Add Pet';
            }
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
                form.closest('.modal').remove();
                this.loadDashboardData(); // Refresh dashboard
            } else {
                this.showToast(result.message || 'Failed to add service', 'error');
            }
        } catch (error) {
            console.error('Error adding service:', error);
            this.showToast('Failed to add service. Please try again.', 'error');
        }
    }

    async handlePayment(form) {
        try {
            const formData = new FormData(form);
            const paymentMethod = formData.get('payment_method');

            if (!paymentMethod) {
                this.showToast('Please select a payment method', 'error');
                return;
            }

            let paymentData;

            if (this.selectedProductId === 'cart' && this.cartData) {
                // Handle cart purchase
                paymentData = {
                    action: 'buy_cart',
                    items: this.cartData.items,
                    total: this.cartData.total,
                    payment_method: paymentMethod
                };
            } else {
                // Handle individual product purchase
                paymentData = {
                    action: 'buy_now',
                    product_id: this.selectedProductId,
                    quantity: this.selectedQuantity,
                    payment_method: paymentMethod
                };
            }

            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(paymentData)
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('Purchase completed successfully!', 'success');
                form.closest('.modal').remove();

                // Clear cart if it was a cart purchase
                if (this.selectedProductId === 'cart') {
                    if (typeof cart !== 'undefined') {
                        cart = [];
                        localStorage.setItem('clientCart', JSON.stringify(cart));
                        updateCartCount();
                    }
                }

                // Refresh dashboard to update orders section and stock
                this.loadDashboardData();
            } else {
                this.showToast(result.message || 'Failed to complete purchase', 'error');
            }
        } catch (error) {
            console.error('Payment error:', error);
            this.showToast('Failed to complete purchase. Please try again.', 'error');
        }
    }

    async loadAvailableTimes(selectedDate) {
        const timeSelect = document.getElementById('appointmentTime');
        if (!timeSelect) return;

        // Generate time slots from 9:00 AM to 5:30 PM in 30-minute intervals
        const timeSlots = [];
        const startHour = 9; // 9 AM
        const endHour = 17; // 5 PM
        const endMinute = 30; // 5:30 PM

        for (let hour = startHour; hour <= endHour; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
                // Stop at 5:30 PM
                if (hour === endHour && minute > endMinute) {
                    break;
                }

                const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                const ampm = hour >= 12 ? 'PM' : 'AM';
                const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                const displayTime = `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;

                timeSlots.push({
                    value: timeString,
                    display: displayTime
                });
            }
        }

        // Populate the time select dropdown
        timeSelect.innerHTML = '<option value="">Select a time</option>';
        timeSlots.forEach(slot => {
            const option = document.createElement('option');
            option.value = slot.value;
            option.textContent = slot.display;
            timeSelect.appendChild(option);
        });
    }

    async handleBooking(form) {
        try {
            const formData = new FormData(form);
            const bookingData = {
                action: 'book_appointment',
                service_id: formData.get('service_id'),
                pet_id: formData.get('pet_id'),
                appointment_date: formData.get('appointment_date'),
                appointment_time: formData.get('appointment_time'),
                notes: formData.get('notes')
            };

            // Check session before submitting booking
            try {
                const sessionValid = await this.checkSession();
                if (!sessionValid) {
                    console.log('⚠️ Session expired during booking submission, saving data for later...');
                    this.savePendingOperation({ type: 'booking', data: bookingData });
                    this.showToast('Session expired. Please log in again to continue booking.', 'warning');
                    this.handleSessionExpired();
                    return;
                }
            } catch (error) {
                console.error('❌ Session check failed during booking:', error);
                this.savePendingOperation({ type: 'booking', data: bookingData });
                this.showToast('Session check failed. Please log in again to continue booking.', 'warning');
                this.handleSessionExpired();
                return;
            }

            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookingData)
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('Appointment booked successfully!', 'success');
                form.closest('.modal').remove();
                this.loadDashboardData(); // Refresh dashboard
            } else {
                this.showToast(result.message || 'Failed to book appointment', 'error');
            }
        } catch (error) {
            console.error('Booking error:', error);
            this.showToast('Failed to book appointment. Please try again.', 'error');
        }
    }

    async handleEditAppointment(form) {
        try {
            const formData = new FormData(form);
            const appointmentId = form.getAttribute('data-appointment-id');
            const editData = {
                action: 'update_appointment',
                appointment_id: appointmentId,
                service_id: formData.get('service_id'),
                pet_id: formData.get('pet_id'),
                appointment_date: formData.get('appointment_date'),
                appointment_time: formData.get('appointment_time'),
                notes: formData.get('notes')
            };

            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editData)
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('Appointment updated successfully!', 'success');
                form.closest('.modal').remove();
                this.loadDashboardData(); // Refresh dashboard
            } else {
                this.showToast(result.message || 'Failed to update appointment', 'error');
            }
        } catch (error) {
            console.error('Edit appointment error:', error);
            this.showToast('Failed to update appointment. Please try again.', 'error');
        }
    }

    async cancelAppointment(appointmentId) {
        if (!confirm('Are you sure you want to cancel this appointment? This action cannot be undone.')) {
            return;
        }

        try {
            const cancelData = {
                action: 'cancel_appointment',
                appointment_id: appointmentId  // Keep as appointment_id for API compatibility
            };

            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cancelData)
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('Appointment cancelled successfully!', 'success');
                this.loadDashboardData(); // Refresh dashboard
            } else {
                this.showToast(result.message || 'Failed to cancel appointment', 'error');
            }
        } catch (error) {
            console.error('Cancel appointment error:', error);
            this.showToast('Failed to cancel appointment. Please try again.', 'error');
        }
    }

    async viewPetReport(appointmentId) {
        try {
            // First get the appointment details to find the pet
            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_appointments' })
            });

            const result = await response.json();

            if (result.success && result.data) {
                const appointment = result.data.find(apt => apt.id == appointmentId);

                if (appointment) {
                    // Get the pet ID from the appointment
                    const petId = appointment.pet_id;

                    // Now call the pet reports API to get comprehensive pet data
                    const reportResponse = await fetch(`../api/pet_reports_api.php?action=get_pet_report&pet_id=${petId}`);
                    const reportResult = await reportResponse.json();

                    if (reportResult.success && reportResult.data) {
                        // Create a modal to show the comprehensive pet report
                        const modal = this.createComprehensivePetReportModal(appointment, reportResult.data);
                        document.body.appendChild(modal);
                        modal.style.display = 'block';
                    } else {
                        this.showToast('Failed to load pet report data', 'error');
                    }
                } else {
                    this.showToast('Appointment not found', 'error');
                }
            } else {
                this.showToast('Failed to load appointment data', 'error');
            }
        } catch (error) {
            console.error('Error loading pet report:', error);
            this.showToast('Failed to load pet report. Please try again.', 'error');
        }
    }

    createComprehensivePetReportModal(appointment, reportData) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content pet-report-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-file-medical"></i> Pet Medical Report - ${reportData.pet.name}</h3>
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="report-content">
                        <!-- Pet Information Section -->
                        <div class="report-section">
                            <h4><i class="fas fa-paw"></i> Pet Information</h4>
                            <div class="report-grid">
                                <div class="report-item">
                                    <label>Name:</label>
                                    <span>${reportData.pet.name}</span>
                                </div>
                                <div class="report-item">
                                    <label>Species:</label>
                                    <span>${reportData.pet.species}</span>
                                </div>
                                <div class="report-item">
                                    <label>Breed:</label>
                                    <span>${reportData.pet.breed || 'Not specified'}</span>
                                </div>
                                <div class="report-item">
                                    <label>Age:</label>
                                    <span>${reportData.pet.age || 'Not recorded'}</span>
                                </div>
                                <div class="report-item">
                                    <label>Gender:</label>
                                    <span>${reportData.pet.gender || 'Not specified'}</span>
                                </div>
                                <div class="report-item">
                                    <label>Weight:</label>
                                    <span>${reportData.pet.weight || 'Not recorded'}</span>
                                </div>
                                <div class="report-item">
                                    <label>Color:</label>
                                    <span>${reportData.pet.color || 'Not specified'}</span>
                                </div>
                                <div class="report-item">
                                    <label>Registration Date:</label>
                                    <span>${new Date(reportData.pet.registration_date).toLocaleDateString()}</span>
                                </div>
                                ${reportData.pet.notes ? `
                                <div class="report-item full-width">
                                    <label>Notes:</label>
                                    <span>${reportData.pet.notes}</span>
                                </div>
                                ` : ''}
                            </div>
                        </div>

                        <!-- Owner Information Section -->
                        <div class="report-section">
                            <h4><i class="fas fa-user"></i> Owner Information</h4>
                            <div class="report-grid">
                                <div class="report-item">
                                    <label>Name:</label>
                                    <span>${reportData.owner.name}</span>
                                </div>
                                <div class="report-item">
                                    <label>Email:</label>
                                    <span>${reportData.owner.email}</span>
                                </div>
                                <div class="report-item">
                                    <label>Phone:</label>
                                    <span>${reportData.owner.phone || 'Not provided'}</span>
                                </div>
                                <div class="report-item">
                                    <label>Address:</label>
                                    <span>${reportData.owner.address || 'Not provided'}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Statistics Section -->
                        <div class="report-section">
                            <h4><i class="fas fa-chart-bar"></i> Pet Statistics</h4>
                            <div class="statistics-grid">
                                <div class="stat-item">
                                    <div class="stat-value">${reportData.statistics.total_appointments}</div>
                                    <div class="stat-label">Total Appointments</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-value">${reportData.statistics.total_vaccinations}</div>
                                    <div class="stat-label">Vaccinations</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-value">${reportData.statistics.total_medical_records}</div>
                                    <div class="stat-label">Medical Records</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-value">${reportData.statistics.last_visit ? new Date(reportData.statistics.last_visit).toLocaleDateString() : 'None'}</div>
                                    <div class="stat-label">Last Visit</div>
                                </div>
                            </div>
                        </div>

                        <!-- Current Appointment Details -->
                        <div class="report-section">
                            <h4><i class="fas fa-calendar-check"></i> Current Appointment</h4>
                            <div class="report-grid">
                                <div class="report-item">
                                    <label>Date:</label>
                                    <span>${appointment.appointment_date}</span>
                                </div>
                                <div class="report-item">
                                    <label>Time:</label>
                                    <span>${appointment.appointment_time}</span>
                                </div>
                                <div class="report-item">
                                    <label>Service:</label>
                                    <span>${appointment.service_name}</span>
                                </div>
                                <div class="report-item">
                                    <label>Status:</label>
                                    <span class="status-badge status-completed">${appointment.status}</span>
                                </div>
                                ${appointment.notes ? `
                                <div class="report-item full-width">
                                    <label>Notes:</label>
                                    <span>${appointment.notes}</span>
                                </div>
                                ` : ''}
                            </div>
                        </div>

                        <!-- Appointment History -->
                        ${reportData.appointments && reportData.appointments.length > 0 ? `
                        <div class="report-section">
                            <h4><i class="fas fa-history"></i> Appointment History</h4>
                            <div class="appointments-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Service</th>
                                            <th>Staff</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${reportData.appointments.slice(0, 10).map(apt => `
                                        <tr>
                                            <td>${new Date(apt.appointment_date).toLocaleDateString()}</td>
                                            <td>${apt.service_name}</td>
                                            <td>${apt.staff_first_name ? `${apt.staff_first_name} ${apt.staff_last_name || ''}` : 'Not assigned'}</td>
                                            <td><span class="status-badge status-${apt.status}">${apt.status}</span></td>
                                        </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                                ${reportData.appointments.length > 10 ? `<p><em>Showing latest 10 appointments</em></p>` : ''}
                            </div>
                        </div>
                        ` : ''}

                        <!-- Medical History -->
                        ${reportData.medical_history && reportData.medical_history.length > 0 ? `
                        <div class="report-section">
                            <h4><i class="fas fa-stethoscope"></i> Medical History</h4>
                            <div class="medical-records">
                                ${reportData.medical_history.slice(0, 5).map(record => `
                                <div class="medical-record">
                                    <div class="record-header">
                                        <span class="record-date">${new Date(record.appointment_date).toLocaleDateString()}</span>
                                        <span class="record-service">${record.service_name}</span>
                                    </div>
                                    <div class="record-details">
                                        <p><strong>Staff:</strong> ${record.staff_first_name} ${record.staff_last_name || ''}</p>
                                        <p><strong>Diagnosis:</strong> ${record.diagnosis || 'Not recorded'}</p>
                                        <p><strong>Treatment:</strong> ${record.treatment || 'Not recorded'}</p>
                                        ${record.medications ? `<p><strong>Medications:</strong> ${record.medications}</p>` : ''}
                                        ${record.notes ? `<p><strong>Notes:</strong> ${record.notes}</p>` : ''}
                                    </div>
                                </div>
                                `).join('')}
                                ${reportData.medical_history.length > 5 ? `<p><em>Showing latest 5 medical records</em></p>` : ''}
                            </div>
                        </div>
                        ` : ''}

                        <!-- Vaccination Records -->
                        ${reportData.vaccinations && reportData.vaccinations.length > 0 ? `
                        <div class="report-section">
                            <h4><i class="fas fa-syringe"></i> Vaccination Records</h4>
                            <div class="vaccination-records">
                                ${reportData.vaccinations.slice(0, 5).map(vac => `
                                <div class="vaccination-record">
                                    <div class="vac-date">${new Date(vac.appointment_date).toLocaleDateString()}</div>
                                    <div class="vac-details">
                                        <strong>${vac.service_name}</strong>
                                        ${vac.notes ? `<br><span>${vac.notes}</span>` : ''}
                                    </div>
                                </div>
                                `).join('')}
                                ${reportData.vaccinations.length > 5 ? `<p><em>Showing latest 5 vaccination records</em></p>` : ''}
                            </div>
                        </div>
                        ` : ''}

                        <!-- Report Footer -->
                        <div class="report-section">
                            <h4><i class="fas fa-info-circle"></i> Report Information</h4>
                            <div class="report-info">
                                <p><strong>Generated:</strong> ${new Date(reportData.generated_at).toLocaleString()}</p>
                                <p><strong>Clinic:</strong> ${reportData.clinic_info.name}</p>
                                <p><strong>Contact:</strong> ${reportData.clinic_info.phone} | ${reportData.clinic_info.email}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-secondary" onclick="this.closest('.modal').remove()">Close Report</button>
                    <button type="button" class="btn-primary" onclick="window.print()">
                        <i class="fas fa-print"></i> Print Report
                    </button>
                </div>
            </div>
        `;

        return modal;
    }


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

    // Pet edit and delete functions for client dashboard
    showEditPetModal(petId) {
        // First fetch the pet data
        this.loadPetData(petId).then(pet => {
            if (pet) {
                const modal = this.createModal('Edit Pet', this.getEditPetForm(pet));
                document.body.appendChild(modal);
                modal.style.display = 'block';
            } else {
                this.showToast('Pet not found', 'error');
            }
        }).catch(error => {
            console.error('Error loading pet data:', error);
            this.showToast('Failed to load pet data', 'error');
        });
    }

    async loadPetData(petId) {
        try {
            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_pets' })
            });

            const result = await response.json();

            if (result.success && result.data) {
                return result.data.find(pet => pet.id == petId);
            }
            return null;
        } catch (error) {
            console.error('Error loading pet data:', error);
            return null;
        }
    }

    getEditPetForm(pet) {
        return `
            <form id="editPetForm" class="pet-form" data-pet-id="${pet.id}">
                <!-- Pet Name and Species Row -->
                <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                    <div class="form-group">
                        <label for="petName" style="color: #ffffff; font-size: 14px; margin-bottom: 8px; display: block; font-weight: 500;">Pet Name *</label>
                        <input type="text" id="petName" name="pet_name" value="${pet.name}" required style="width: 100%; padding: 12px 16px; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 8px; background: rgba(255, 255, 255, 0.1); color: #ffffff; font-size: 14px;" placeholder="Enter pet name">
                    </div>
                    <div class="form-group">
                        <label for="petSpecies" style="color: #ffffff; font-size: 14px; margin-bottom: 8px; display: block; font-weight: 500;">Species *</label>
                        <select id="petSpecies" name="species" required style="width: 100%; padding: 12px 16px; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 8px; background: rgba(255, 255, 255, 0.1); color: #ffffff; font-size: 14px; cursor: pointer;">
                            <option value="">Select Species</option>
                            <option value="Dog" ${pet.species === 'Dog' ? 'selected' : ''}>🐶 Dog</option>
                            <option value="Cat" ${pet.species === 'Cat' ? 'selected' : ''}>🐱 Cat</option>
                            <option value="Bird" ${pet.species === 'Bird' ? 'selected' : ''}>🐦 Bird</option>
                            <option value="Rabbit" ${pet.species === 'Rabbit' ? 'selected' : ''}>🐰 Rabbit</option>
                            <option value="Other" ${pet.species === 'Other' ? 'selected' : ''}>🐾 Other</option>
                        </select>
                    </div>
                </div>

                <!-- Breed and Birthdate Row -->
                <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                    <div class="form-group">
                        <label for="petBreed" style="color: #ffffff; font-size: 14px; margin-bottom: 8px; display: block; font-weight: 500;">Breed</label>
                        <input type="text" id="petBreed" name="breed" value="${pet.breed || ''}" style="width: 100%; padding: 12px 16px; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 8px; background: rgba(255, 255, 255, 0.1); color: #ffffff; font-size: 14px;" placeholder="Enter breed (optional)">
                    </div>
                    <div class="form-group">
                        <label for="petBirthdate" style="color: #ffffff; font-size: 14px; margin-bottom: 8px; display: block; font-weight: 500;">Birthdate</label>
                        <input type="date" id="petBirthdate" name="birthdate" value="${pet.birthdate || ''}" max="${new Date().toISOString().split('T')[0]}" style="width: 100%; padding: 12px 16px; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 8px; background: rgba(255, 255, 255, 0.1); color: #ffffff; font-size: 14px;">
                    </div>
                </div>

                <!-- Gender and Weight Row -->
                <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                    <div class="form-group">
                        <label for="petGender" style="color: #ffffff; font-size: 14px; margin-bottom: 8px; display: block; font-weight: 500;">Gender *</label>
                        <select id="petGender" name="gender" required style="width: 100%; padding: 12px 16px; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 8px; background: rgba(255, 255, 255, 0.1); color: #ffffff; font-size: 14px; cursor: pointer;">
                            <option value="">Select Gender</option>
                            <option value="Male" ${pet.gender === 'Male' ? 'selected' : ''}>♂️ Male</option>
                            <option value="Female" ${pet.gender === 'Female' ? 'selected' : ''}>♀️ Female</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="petWeight" style="color: #ffffff; font-size: 14px; margin-bottom: 8px; display: block; font-weight: 500;">Weight (kg)</label>
                        <input type="number" id="petWeight" name="weight" value="${pet.weight || ''}" step="0.1" min="0" placeholder="e.g., 5.5" style="width: 100%; padding: 12px 16px; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 8px; background: rgba(255, 255, 255, 0.1); color: #ffffff; font-size: 14px;">
                    </div>
                </div>

                <!-- Color -->
                <div class="form-group" style="margin-bottom: 20px;">
                    <label for="petColor" style="color: #ffffff; font-size: 14px; margin-bottom: 8px; display: block; font-weight: 500;">Color</label>
                    <input type="text" id="petColor" name="color" value="${pet.color || ''}" style="width: 100%; padding: 12px 16px; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 8px; background: rgba(255, 255, 255, 0.1); color: #ffffff; font-size: 14px;" placeholder="Enter color (optional)">
                </div>

                <!-- Form Actions -->
                <div class="form-actions" style="text-align: right; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.1); margin-top: 20px;">
                    <button type="button" class="btn-secondary" onclick="this.closest('.modal').remove()" style="background: rgba(255, 255, 255, 0.1); color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.2); padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; margin-right: 12px; transition: all 0.2s ease;" onmouseover="this.style.background='rgba(255, 255, 255, 0.2)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.1)'">CANCEL</button>
                    <button type="submit" class="btn-primary" style="background: linear-gradient(135deg, #28a745, #20c997); color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 2px 8px rgba(40, 167, 69, 0.3);" onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(40, 167, 69, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(40, 167, 69, 0.3)'">
                        <i class="fas fa-save" style="margin-right: 8px;"></i> UPDATE PET
                    </button>
                </div>
            </form>
        `;
    }

    async handleEditPet(form) {
        try {
            // Prevent multiple submissions
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating Pet...';
            }

            const formData = new FormData(form);
            const petData = {
                action: 'update_pet',
                pet_id: form.getAttribute('data-pet-id'),
                pet_name: formData.get('pet_name'),
                species: formData.get('species'),
                breed: formData.get('breed'),
                birthdate: formData.get('birthdate'),
                gender: formData.get('gender'),
                weight: formData.get('weight'),
                color: formData.get('color')
            };

            console.log('🔄 Updating pet with data:', petData);

            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(petData)
            });

            console.log('📡 Update response status:', response.status);
            const result = await response.json();
            console.log('📊 Update response:', result);

            if (result.success) {
                console.log('✅ Pet updated successfully');
                this.showToast('Pet updated successfully!', 'success');
                form.closest('.modal').remove();

                // Reload pets section after a short delay
                setTimeout(() => {
                    this.loadPetsSection();
                    this.loadDashboardData(); // Refresh dashboard data
                }, 500);
            } else {
                console.error('❌ Update failed:', result.message);
                this.showToast(result.message || 'Failed to update pet', 'error');
            }
        } catch (error) {
            console.error('Error updating pet:', error);
            this.showToast('Failed to update pet. Please try again.', 'error');
        } finally {
            // Re-enable submit button
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-save"></i> UPDATE PET';
            }
        }
    }

    async deletePet(petId) {
        if (!confirm('Are you sure you want to delete this pet? This action cannot be undone.')) {
            return;
        }

        try {
            const deleteData = {
                action: 'delete_pet',
                pet_id: petId
            };

            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(deleteData)
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('Pet deleted successfully!', 'success');

                // Reload pets section after a short delay
                setTimeout(() => {
                    this.loadPetsSection();
                    this.loadDashboardData(); // Refresh dashboard data
                }, 500);
            } else {
                this.showToast(result.message || 'Failed to delete pet', 'error');
            }
        } catch (error) {
            console.error('Error deleting pet:', error);
            this.showToast('Failed to delete pet. Please try again.', 'error');
        }
    }

    getSpeciesIcon(species) {
        // Map species to FontAwesome icon classes
        const iconMap = {
            'Dog': 'fas fa-dog',
            'Cat': 'fas fa-cat',
            'Bird': 'fas fa-dove',
            'Rabbit': 'fas fa-rabbit',
            'Other': 'fas fa-paw',
            'dog': 'fas fa-dog',
            'cat': 'fas fa-cat',
            'bird': 'fas fa-dove',
            'rabbit': 'fas fa-rabbit',
            'other': 'fas fa-paw'
        };

        return iconMap[species] || 'fas fa-paw'; // Default to paw icon if species not found
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

            if (!petsGrid) {
                console.error('Pets grid element not found');
                return;
            }

            if (result.success && result.data && result.data.length > 0) {
                // Clear existing content
                petsGrid.innerHTML = '';

                // Create a document fragment for better performance
                const fragment = document.createDocumentFragment();

                result.data.forEach(pet => {
                    const petCard = document.createElement('div');
                    petCard.className = 'pet-card';
                    petCard.setAttribute('data-pet-id', pet.id);

                    // Get species icon for the minimal design
                    const speciesIcon = this.getSpeciesIcon(pet.species);

                    // Format birthdate for display
                    let birthdateDisplay = 'Not recorded';
                    if (pet.birthdate) {
                        const birthDate = new Date(pet.birthdate);
                        birthdateDisplay = birthDate.toLocaleDateString();
                    }

                    // Format weight for display - handle both numeric and string values
                    let weightDisplay = 'Not recorded';
                    if (pet.weight !== null && pet.weight !== undefined && pet.weight !== '') {
                        const weightValue = parseFloat(pet.weight);
                        if (!isNaN(weightValue) && weightValue > 0) {
                            weightDisplay = `${weightValue} kg`;
                        }
                    }

                    petCard.innerHTML = `
                        <div class="pet-icon">
                            <i class="${speciesIcon}"></i>
                        </div>
                        <h3 class="pet-name">${pet.name}</h3>
                        <p><strong>Species:</strong> ${pet.species}</p>
                        <p><strong>Breed:</strong> ${pet.breed || 'Not specified'}</p>
                        <p><strong>Birthdate:</strong> ${birthdateDisplay}</p>
                        <p><strong>Gender:</strong> ${pet.gender || 'Not specified'}</p>
                        <p><strong>Weight:</strong> ${weightDisplay}</p>
                        <div class="pet-actions">
                            <button class="action-btn edit" onclick="editPet(${pet.id})" title="Edit Pet">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="action-btn delete" onclick="deletePet(${pet.id})" title="Delete Pet">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    `;

                    fragment.appendChild(petCard);
                });

                // Append all cards at once
                petsGrid.appendChild(fragment);
            } else {
                petsGrid.innerHTML = `
                    <div class="empty-state full-width">
                        <i class="fas fa-paw"></i>
                        <h3>No Pets Found</h3>
                        <p>You haven't registered any pets yet. Add your first pet to get started!</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Failed to load pets:', error);
            const petsGrid = document.getElementById('petsGrid');
            if (petsGrid) {
                petsGrid.innerHTML = `
                    <div class="error-state full-width">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Failed to load pets</p>
                    </div>
                `;
            }
        }
    }

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
                        <td>${appointment.pet_name} (${appointment.species})</td>
                        <td>${appointment.service_name}</td>
                        <td><span class="status-badge status-${appointment.status.toLowerCase()}">${appointment.status}</span></td>
                        <td>
                            <div class="appointment-actions">
                                ${(appointment.status === 'Pending' || appointment.status === 'pending' || appointment.status === 'Confirmed' || appointment.status === 'confirmed') ?
                                    `<button class="action-btn edit" onclick="editAppointment(${appointment.id})" title="Edit Appointment">
                                        <i class="fas fa-edit"></i> Edit
                                    </button>
                                    <button class="action-btn delete" onclick="cancelAppointment(${appointment.id})" title="Cancel Appointment">
                                        <i class="fas fa-times"></i> Cancel
                                    </button>` :
                                    (appointment.status === 'Scheduled' || appointment.status === 'scheduled') ?
                                    `<button class="action-btn edit" onclick="editAppointment(${appointment.id})" title="Edit Appointment">
                                        <i class="fas fa-edit"></i> Edit
                                    </button>
                                    <button class="action-btn delete" onclick="cancelAppointment(${appointment.id})" title="Cancel Appointment">
                                        <i class="fas fa-times"></i> Cancel
                                    </button>` :
                                    // For completed appointments, show View button
                                    (appointment.status === 'Completed' || appointment.status === 'completed') ?
                                    `<button class="action-btn view" onclick="viewPetReport(${appointment.id})" title="View Pet Report">
                                        <i class="fas fa-eye"></i> View
                                    </button>` :
                                    // For cancelled appointments, show cancelled status
                                    (appointment.status === 'Cancelled' || appointment.status === 'cancelled') ?
                                    `<span class="status-cancelled" title="Cancelled appointment cannot be edited">
                                        <i class="fas fa-times-circle"></i> Cancelled
                                    </span>` :
                                    // Default fallback
                                    `<span class="status-unknown" title="Unknown appointment status">
                                        <i class="fas fa-question-circle"></i> ${appointment.status}
                                    </span>`
                                }
                            </div>
                        </td>
                    </tr>
                `).join('');
            } else {
                appointmentsTableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="empty-state-table">
                            <div class="empty-state">
                                <i class="fas fa-calendar-times"></i>
                                <h3>No Appointments</h3>
                                <p>You haven't booked any appointments yet.</p>
                            </div>
                        </td>
                    </tr>
                `;
            }
        } catch (error) {
            console.error('Failed to load appointments:', error);
            const appointmentsTableBody = document.getElementById('appointmentsTableBody');
            appointmentsTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="error-state-table">
                        <div class="error-state">
                            <i class="fas fa-exclamation-triangle"></i>
                            <p>Failed to load appointments</p>
                        </div>
                    </td>
                </tr>
            `;
        }
    }

    async loadOrdersSection() {
        try {
            const ordersSection = document.getElementById('ordersSection');

            // Check if ordersSection element exists
            if (!ordersSection) {
                console.warn('Orders section element not found in DOM - skipping orders loading');
                return;
            }

            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_orders' })
            });

            const result = await response.json();

            if (result.success && result.data && result.data.length > 0) {
                ordersSection.innerHTML = `
                    <div class="orders-grid">
                        ${result.data.map(order => `
                            <div class="order-card">
                                <div class="order-header">
                                    <div class="order-info">
                                        <h3>Order #${order.id}</h3>
                                        <p class="order-date">${new Date(order.order_date).toLocaleDateString()}</p>
                                        <p class="payment-method">
                                            <i class="fas fa-credit-card"></i>
                                            ${order.payment_method === 'gcash' ? 'GCash' :
                                              order.payment_method === 'bank' ? 'Bank Transfer' :
                                              order.payment_method === 'cash_on_visit' ? 'Cash on Visit' : 'N/A'}
                                        </p>
                                    </div>
                                    <div class="order-status status-${order.status.toLowerCase()}">
                                        ${order.status}
                                    </div>
                                </div>
                                <div class="order-items">
                                    ${order.items.map(item => `
                                        <div class="order-item">
                                            <div class="item-info">
                                                <h4>${item.name}</h4>
                                                <p>Quantity: ${item.quantity}</p>
                                            </div>
                                            <div class="item-price">
                                                ₱${(item.price * item.quantity).toFixed(2)}
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                                <div class="order-total">
                                    <strong>Total: ₱${order.total_amount.toFixed(2)}</strong>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            } else {
                ordersSection.innerHTML = `
                    <div class="empty-state full-width">
                        <i class="fas fa-shopping-bag"></i>
                        <h3>No Orders Yet</h3>
                        <p>You haven't placed any orders yet. Browse our store to get started!</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Failed to load orders:', error);
            const ordersSection = document.getElementById('ordersSection');

            // Check if ordersSection element exists before trying to set innerHTML
            if (ordersSection) {
                ordersSection.innerHTML = `
                    <div class="error-state full-width">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Failed to load orders</p>
                    </div>
                `;
            } else {
                console.warn('Orders section element not found - cannot display error message');
            }
        }
    }

    async loadStoreSection() {
        try {
            const productsResponse = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_products' })
            });

            const productsResult = await productsResponse.json();
            const storeSection = document.querySelector('#storeSection');

            if (productsResult.success && productsResult.data && productsResult.data.length > 0) {
                // Get unique categories from products
                const categories = [...new Set(productsResult.data
                    .map(product => product.category)
                    .filter(category => category && category.trim() !== '')
                )];

                storeSection.innerHTML = `
                    <div class="section-header">
                        <h2 class="section-title">
                            <i class="fas fa-store"></i> Pet Store
                        </h2>
                    </div>
                    ${categories.length > 0 ? `
                        <div class="store-categories">
                            <button class="category-btn active" data-category="">All Products</button>
                            ${categories.map(category =>
                                `<button class="category-btn" data-category="${category}">${category}</button>`
                            ).join('')}
                        </div>
                    ` : ''}
                    <div class="products-grid">
                        ${productsResult.data.map(product => {
                            let imageSrc = '';
                            if (product.image) {
                                // Check if the path already contains the full path prefix
                                if (product.image.startsWith('assets/images/products/')) {
                                    // Path already contains full prefix, use as-is
                                    imageSrc = '../' + product.image;
                                } else {
                                    // Path is just filename, add prefix
                                    imageSrc = '../assets/images/products/' + product.image;
                                }
                            }
                            return `
                            <div class="product-card" data-category="${product.category || ''}">
                                <div class="product-image">
                                    <img src="${imageSrc}" alt="${product.product_name}" onerror="handleImageError(this, '${product.image || ''}');" loading="lazy">
                                    <div class="image-placeholder" style="display: ${product.image ? 'none' : 'flex'}; align-items: center; justify-content: center; height: 200px; background: #f8f9fa; border: 2px dashed #dee2e6; color: #6c757d;">
                                        <i class="fas fa-image" style="font-size: 48px;"></i>
                                    </div>
                                    ${product.is_featured ? '<span class="featured-badge">Featured</span>' : ''}
                                </div>
                                <div class="product-info">
                                    <h3 class="product-name">${product.product_name || product.name}</h3>
                                    <p class="product-category">${product.category || 'General'}</p>
                                    <p class="product-description">${product.description || 'No description available'}</p>
                                    <div class="product-price">
                                        ${product.sale_price ? `
                                            <span class="sale-price">₱${product.sale_price}</span>
                                            <span class="original-price">₱${product.price}</span>
                                        ` : `
                                            <span class="price">₱${product.price}</span>
                                        `}
                                    </div>
                                    <div class="product-stock ${product.stock <= 10 ? 'low-stock' : ''}">
                                        ${product.stock <= 10 ? `Low Stock (${product.stock})` : `In Stock (${product.stock})`}
                                    </div>
                                    <div class="product-actions">
                                        <div class="quantity-selector">
                                            <label>Qty:</label>
                                            <input type="number" class="quantity-input" value="1" min="1" max="${product.stock}" data-product-id="${product.product_id || product.id}">
                                        </div>
                                        <div class="action-buttons">
                                            <button class="btn-secondary add-to-order" data-product-id="${product.product_id || product.id}">
                                                <i class="fas fa-shopping-bag"></i> Add to Order
                                            </button>
                                            <button class="btn-primary buy-now" data-product-id="${product.product_id || product.id}">
                                                <i class="fas fa-credit-card"></i> Buy Now
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            `}).join('')}
                    </div>
                `;
            } else {
                storeSection.innerHTML = `
                    <div class="section-header">
                        <h2 class="section-title">
                            <i class="fas fa-store"></i> Pet Store
                        </h2>
                    </div>
                    <div class="empty-state">
                        <i class="fas fa-store-slash"></i>
                        <h3>Store Coming Soon</h3>
                        <p>We're working hard to stock our store with amazing pet products. Check back soon!</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Failed to load store:', error);
            const storeSection = document.querySelector('#storeSection');
            storeSection.innerHTML = `
                <div class="section-header">
                    <h2 class="section-title">
                        <i class="fas fa-store"></i> Pet Store
                    </h2>
                </div>
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load store</p>
                </div>
            `;
        }

        // Add category filtering functionality
        this.setupCategoryFiltering();
    }

    setupCategoryFiltering() {
        const categoryButtons = document.querySelectorAll('.category-btn');
        const productCards = document.querySelectorAll('.product-card');

        categoryButtons.forEach(button => {
            button.addEventListener('click', () => {
                const selectedCategory = button.getAttribute('data-category');

                // Update active button
                categoryButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                // Filter products
                productCards.forEach(card => {
                    const productCategory = card.getAttribute('data-category');

                    if (selectedCategory === '' || productCategory === selectedCategory) {
                        card.style.display = 'block';
                        // Add animation
                        card.style.opacity = '0';
                        card.style.transform = 'translateY(20px)';
                        setTimeout(() => {
                            card.style.transition = 'all 0.3s ease';
                            card.style.opacity = '1';
                            card.style.transform = 'translateY(0)';
                        }, 10);
                    } else {
                        card.style.transition = 'all 0.3s ease';
                        card.style.opacity = '0';
                        card.style.transform = 'translateY(-20px)';
                        setTimeout(() => {
                            card.style.display = 'none';
                        }, 300);
                    }
                });
            });
        });
    }


    redirectToLogin() {
        this.showToast('Please log in to access the dashboard', 'warning');
        this.showSessionErrorModal();
    }

    showSessionExpiredModal() {
        console.log('🔧 Showing session expired modal');

        // Create a session expired modal
        const modal = document.createElement('div');
        modal.className = 'modal session-expired-modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px; background: linear-gradient(135deg, #2E5BAA, #1E3F7A); border-radius: 16px;">
                <div class="modal-header" style="padding: 24px 24px 0 24px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <h3 style="color: #B3B8FF; margin: 0; font-size: 1.3rem; display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-clock" style="color: #ffd700;"></i>
                        Session Expired
                    </h3>
                    <span class="close" onclick="this.closest('.modal').remove()" style="color: #ffffff; font-size: 28px; cursor: pointer;">&times;</span>
                </div>
                <div class="modal-body" style="padding: 24px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <div style="font-size: 64px; margin-bottom: 20px;">⏰</div>
                        <h4 style="color: #ffffff; margin-bottom: 15px;">Your Session Has Expired</h4>
                        <p style="color: rgba(255, 255, 255, 0.8); margin-bottom: 25px;">
                            For your security, your session has expired. Please log in again to continue using the dashboard.
                        </p>
                    </div>

                    <div style="display: flex; gap: 12px; justify-content: center;">
                        <button onclick="dashboardInstance.reauthenticateSession()" class="btn-primary" style="background: linear-gradient(135deg, #28a745, #20c997); color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;">
                            <i class="fas fa-sign-in-alt"></i> Login Again
                        </button>
                        <button onclick="this.closest('.modal').remove()" class="btn-secondary" style="background: rgba(255, 255, 255, 0.1); color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.2); padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;">
                            <i class="fas fa-times"></i> Close
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'flex';
    }

    showSessionErrorModal() {
        console.log('🔧 Showing session error modal for initial failure');

        // Create a session error modal
        const modal = document.createElement('div');
        modal.className = 'modal session-error-modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px; background: linear-gradient(135deg, #2E5BAA, #1E3F7A); border-radius: 16px;">
                <div class="modal-header" style="padding: 24px 24px 0 24px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <h3 style="color: #B3B8FF; margin: 0; font-size: 1.3rem; display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-exclamation-triangle" style="color: #ffd700;"></i>
                        Session Verification Failed
                    </h3>
                    <span class="close" onclick="this.closest('.modal').remove()" style="color: #ffffff; font-size: 28px; cursor: pointer;">&times;</span>
                </div>
                <div class="modal-body" style="padding: 24px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <div style="font-size: 64px; margin-bottom: 20px;">🔒</div>
                        <h4 style="color: #ffffff; margin-bottom: 15px;">Session Verification Failed</h4>
                        <p style="color: rgba(255, 255, 255, 0.8); margin-bottom: 25px;">
                            We couldn't verify your login session. This might be due to:
                        </p>
                        <ul style="color: rgba(255, 255, 255, 0.8); text-align: left; display: inline-block;">
                            <li>Network connection issues</li>
                            <li>Session timeout</li>
                            <li>Browser cache problems</li>
                            <li>Server maintenance</li>
                        </ul>
                    </div>

                    <div style="display: flex; gap: 12px; justify-content: center;">
                        <button onclick="dashboardInstance.retrySession()" class="btn-primary" style="background: linear-gradient(135deg, #28a745, #20c997); color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;">
                            <i class="fas fa-redo"></i> Retry Session
                        </button>
                        <button onclick="window.location.reload()" class="btn-secondary" style="background: rgba(255, 255, 255, 0.1); color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.2); padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;">
                            <i class="fas fa-sync-alt"></i> Refresh Page
                        </button>
                        <button onclick="window.location.href='../index.html'" class="btn-secondary" style="background: rgba(255, 255, 255, 0.1); color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.2); padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;">
                            <i class="fas fa-sign-in-alt"></i> Login Again
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'flex';
    }

    async reauthenticateSession() {
        console.log('🔄 Attempting to re-authenticate session...');

        // Close the expired session modal
        const expiredModal = document.querySelector('.session-expired-modal');
        if (expiredModal) {
            expiredModal.remove();
        }

        // Show loading state
        this.showToast('Re-authenticating...', 'info');

        try {
            // Attempt to re-validate the session
            const sessionValid = await this.checkSession();

            if (sessionValid) {
                this.showToast('Session restored successfully!', 'success');

                // Resume session monitoring
                this.startSessionMonitoring();

                // Resume any ongoing operations if needed
                if (this.pendingOperation) {
                    console.log('📋 Resuming pending operation...');
                    this.showToast('Resuming your work...', 'info');
                    setTimeout(() => {
                        this.resumePendingOperation();
                    }, 1000);
                }
            } else {
                // If session check still fails, show modal and let user decide
                this.showToast('Please log in again', 'warning');
                // Modal is already shown by showSessionError(), no automatic redirect
            }
        } catch (error) {
            console.error('❌ Re-authentication failed:', error);
            this.showToast('Re-authentication failed. Please log in again.', 'error');
            this.showSessionErrorModal();
        }
    }

    async retrySession() {
        console.log('🔄 Retrying session check...');

        // Close the error modal
        const errorModal = document.querySelector('.session-error-modal');
        if (errorModal) {
            errorModal.remove();
        }

        // Show loading state
        this.showToast('Retrying session...', 'info');

        try {
            // Attempt to check session
            await this.checkSession();
            this.showToast('Session verified successfully!', 'success');

            // Proceed with loading dashboard
            await this.loadUserData();
            await this.loadDashboardData();
            this.setupEventListeners();
            this.startSessionMonitoring();
            this.showToast('Welcome to your dashboard!', 'success');

        } catch (error) {
            console.error('❌ Session retry failed:', error);
            this.showToast('Session retry failed. Please try again or log in.', 'error');
            // Show the modal again
            this.showSessionErrorModal();
        }
    }

    resumePendingOperation() {
        if (this.pendingOperation) {
            console.log('🔄 Resuming pending operation:', this.pendingOperation);

            if (this.pendingOperation.type === 'booking' && this.pendingOperation.data) {
                // Resume booking creation
                console.log('📋 Resuming booking creation...');
                this.showBookingModal();

                // Pre-fill the form with saved data
                setTimeout(() => {
                    this.prefillBookingForm(this.pendingOperation.data);
                }, 500);
            } else {
                // Generic operation resume
                this.showToast('Operation resumed successfully!', 'success');
            }

            this.pendingOperation = null;
        }
    }

    prefillBookingForm(bookingData) {
        console.log('📝 Pre-filling booking form with data:', bookingData);

        const serviceSelect = document.getElementById('serviceSelect');
        const petSelect = document.getElementById('petSelect');
        const dateInput = document.getElementById('appointmentDate');
        const timeSelect = document.getElementById('appointmentTime');
        const notesInput = document.getElementById('appointmentNotes');

        // Pre-fill form fields
        if (serviceSelect && bookingData.service_id) {
            serviceSelect.value = bookingData.service_id;
        }

        if (petSelect && bookingData.pet_id) {
            petSelect.value = bookingData.pet_id;
        }

        if (dateInput && bookingData.appointment_date) {
            dateInput.value = bookingData.appointment_date;
            // Trigger time slot loading
            setTimeout(() => {
                this.loadAvailableTimes(bookingData.appointment_date);
            }, 100);
        }

        if (timeSelect && bookingData.appointment_time) {
            timeSelect.value = bookingData.appointment_time;
        }

        if (notesInput && bookingData.notes) {
            notesInput.value = bookingData.notes;
        }

        this.showToast('Booking form restored. Please review and submit.', 'info');
    }

    savePendingOperation(operationData) {
        this.pendingOperation = operationData;
        console.log('💾 Saved pending operation data:', operationData);
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
                    document.getElementById('clientName').textContent = result.user.name;
                    document.getElementById('clientEmail').textContent = result.user.email;
                }
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
            console.log('Profile picture upload started...'); // Debug log
            const fileInput = document.getElementById('profilePictureInput');
            const file = fileInput.files[0];

            if (!file) {
                this.showToast('Please select an image file', 'error');
                return;
            }

            console.log('File selected:', file.name, file.type, file.size); // Debug log

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
                    console.log('Image converted to base64, length:', imageData.length); // Debug log

                    const uploadData = {
                        action: 'upload_profile_picture',
                        image_data: imageData,
                        image_name: file.name
                    };

                    console.log('Sending upload request...'); // Debug log
                    const response = await fetch('../api/vet_api.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(uploadData)
                    });

                    console.log('Response status:', response.status); // Debug log
                    const result = await response.json();
                    console.log('API response:', result); // Debug log

                    if (result.success) {
                        this.showToast('Profile picture updated successfully!', 'success');
                        // Update the profile picture in the UI
                        this.updateProfilePicture(result.image_path);
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
                    console.error('Profile picture upload error:', error);
                    this.showToast('Failed to upload profile picture. Please try again.', 'error');
                }
            };

            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Profile picture upload error:', error);
            this.showToast('Failed to upload profile picture. Please try again.', 'error');
        }
    }

    async handleSidebarProfileUpload(event) {
        try {
            console.log('Sidebar profile picture upload started...'); // Debug log
            const file = event.target.files[0];

            if (!file) {
                this.showToast('Please select an image file', 'error');
                return;
            }

            console.log('Sidebar file selected:', file.name, file.type, file.size); // Debug log

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
                    console.log('Sidebar image converted to base64, length:', imageData.length); // Debug log

                    const uploadData = {
                        action: 'upload_profile_picture',
                        image_data: imageData,
                        image_name: file.name
                    };

                    console.log('Sending sidebar upload request...'); // Debug log
                    const response = await fetch('../api/vet_api.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(uploadData)
                    });

                    console.log('Sidebar response status:', response.status); // Debug log
                    const result = await response.json();
                    console.log('Sidebar API response:', result); // Debug log

                    if (result.success) {
                        this.showToast('Profile picture updated successfully!', 'success');
                        // Update the profile picture in the UI
                        this.updateProfilePicture(result.image_path);

                        // Refresh user data to ensure consistency
                        setTimeout(() => {
                            this.loadUserData();
                        }, 500);
                    } else {
                        this.showToast(result.message || 'Failed to upload profile picture', 'error');
                    }
                } catch (error) {
                    console.error('Sidebar profile picture upload error:', error);
                    this.showToast('Failed to upload profile picture. Please try again.', 'error');
                }
            };

            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Sidebar profile picture upload error:', error);
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

    updateProfilePicture(imagePath) {
        console.log('Updating profile picture with path:', imagePath); // Debug log

        const profileImages = document.querySelectorAll('#clientAvatar, #currentProfilePicture');
        console.log('Found profile images:', profileImages.length); // Debug log

        profileImages.forEach((img, index) => {
            if (!img) return; // Skip if image element doesn't exist

            // Add a small delay to ensure file is fully written
            setTimeout(() => {
                const timestamp = Date.now() + Math.random(); // More unique cache buster
                const newSrc = '../' + imagePath + '?t=' + timestamp;
                console.log(`Updating image ${index + 1}:`, img.id || img.className, 'from', img.src, 'to', newSrc);

                // Force reload by setting src to empty first
                img.src = '';
                img.src = newSrc;

                // Add error handler with retry and format fallback
                let retryCount = 0;
                const basePath = '../' + imagePath.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');

                img.onerror = function() {
                    retryCount++;
                    if (retryCount < 3) {
                        console.warn(`Retry ${retryCount} for profile image:`, newSrc);
                        // Try again with a new timestamp
                        const retrySrc = '../' + imagePath + '?t=' + Date.now() + Math.random();
                        this.src = retrySrc;
                    } else if (retryCount === 3) {
                        console.warn('Trying alternative format (PNG):', basePath + '.png');
                        // Try PNG format
                        this.src = basePath + '.png?t=' + Date.now() + Math.random();
                        retryCount++; // Increment to 4
                    } else if (retryCount === 4) {
                        console.warn('Trying alternative format (WebP):', basePath + '.webp');
                        // Try WebP format
                        this.src = basePath + '.webp?t=' + Date.now() + Math.random();
                        retryCount++; // Increment to 5
                    } else {
                        console.warn('Failed to load profile image after all retries and formats, using fallback:', newSrc);
                        this.src = '../assets/images/logoo.jpg'; // Fallback to default
                    }
                };

                // Add load handler with validation
                img.onload = function() {
                    // Verify the image actually loaded by checking its dimensions
                    if (this.naturalWidth === 0 || this.naturalHeight === 0) {
                        console.warn('Image loaded but has invalid dimensions, retrying:', newSrc);
                        // Trigger error handler to retry
                        this.onerror();
                    } else {
                        console.log('Profile image loaded successfully:', newSrc, this.naturalWidth + 'x' + this.naturalHeight);
                    }
                };
            }, 500); // 500ms delay to ensure file is fully written
        });

        // Also update any other profile images that might exist (but don't show errors for these)
        const allProfileImages = document.querySelectorAll('img[src*="logoo.jpg"], img[src*="profile_"]');
        console.log('Found additional profile images:', allProfileImages.length);

        allProfileImages.forEach((img, index) => {
            if (!img || !img.id || !img.classList.contains('profile-picture')) return; // Skip non-profile images

            const newSrc = '../' + imagePath + '?t=' + Date.now();
            console.log(`Updating additional image ${index + 1}:`, img.src, 'to', newSrc);

            img.src = '';
            img.src = newSrc;

            // Silent error handling for additional images - don't log errors
            img.onerror = function() {
                // Silently fallback without logging error
                this.src = '../assets/images/logoo.jpg';
            };

            img.onload = function() {
                console.log('Additional profile image loaded successfully:', newSrc);
            };
        });
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

                if (firstNameInput) firstNameInput.value = user.name.split(' ')[0] || '';
                if (lastNameInput) lastNameInput.value = user.name.split(' ').slice(1).join(' ') || '';
                if (emailInput) emailInput.value = user.email || '';
                if (phoneInput) phoneInput.value = user.phone || '';
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
        if (!phone) return true; // Optional field
        // Remove all non-digit characters for validation
        const digitsOnly = phone.replace(/\D/g, '');
        // Accept 10-15 digits (most international phone numbers)
        return digitsOnly.length >= 10 && digitsOnly.length <= 15;
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

    // ====================
    // NOTIFICATION METHODS
    // ====================

    async triggerNotification(type, data = null, priority = 'normal') {
        if (!this.userData) return;

        try {
            // Create notification for current user
            const notificationData = {
                action: 'create_notification',
                user_id: this.userData.user.id,
                type: type,
                title: this.getNotificationTitle(type, data),
                message: this.getNotificationMessage(type, data),
                priority: priority,
                data: data
            };

            // Send notification to API (for staff notifications or system notifications)
            if (this.userType === 'staff') {
                await fetch('../api/vet_api.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'send_notification',
                        user_id: this.userData.user.id,
                        type: type,
                        title: notificationData.title,
                        message: notificationData.message,
                        priority: priority,
                        data: data
                    })
                });
            }
        } catch (error) {
            console.error('Failed to trigger notification:', error);
        }
    }

    getNotificationTitle(type, data = null) {
        const titles = {
            'appointment_new': 'New Appointment Booked',
            'appointment_status_change': 'Appointment Status Updated',
            'appointment_reminder': 'Appointment Reminder',
            'pet_registration': 'New Pet Registered',
            'medical_history_update': 'Medical History Updated',
            'order_new': 'New Order Placed',
            'order_status_change': 'Order Status Updated',
            'product_stock_alert': 'Low Stock Alert',
            'system_announcement': 'System Announcement'
        };

        return titles[type] || 'Notification';
    }

    getNotificationMessage(type, data = null) {
        const messages = {
            'appointment_new': `A new appointment has been scheduled for ${data?.service_name || 'a service'}.`,
            'appointment_status_change': `Your appointment status has been updated to: ${data?.new_status || 'Updated'}.`,
            'appointment_reminder': `You have an upcoming appointment tomorrow at ${data?.appointment_time || 'scheduled time'}.`,
            'pet_registration': `New pet "${data?.pet_name}" (${data?.species}) has been registered.`,
            'medical_history_update': `Medical history has been updated for ${data?.pet_name || 'your pet'}.`,
            'order_new': `New order placed for ${data?.item_count || 0} items totaling ₱${data?.total_amount || '0.00'}.`,
            'order_status_change': `Your order status has been updated to: ${data?.new_status || 'Updated'}.`,
            'product_stock_alert': `Product "${data?.product_name}" is running low on stock (${data?.stock_count} remaining).`,
            'system_announcement': data?.message || 'New system announcement available.'
        };

        return messages[type] || 'You have a new notification.';
    }
}


// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Dashboard initialization started');
    window.dashboardInstance = new Dashboard();

    // Load notification system
    console.log('📱 Loading notification system...');
    const notificationScript = document.createElement('script');
    notificationScript.src = '../assets/js/modules/notifications.js';
    notificationScript.onload = () => {
        console.log('✅ Notification system loaded successfully');
    };
    notificationScript.onerror = () => {
        console.error('❌ Failed to load notification system');
    };
    document.head.appendChild(notificationScript);
});

// Global function to handle edit appointment button clicks
function editAppointment(appointmentId) {
    if (window.dashboardInstance) {
        window.dashboardInstance.showEditAppointmentModal(appointmentId);
    } else {
        console.error('Dashboard instance not found');
    }
}

// Global function to handle edit pet button clicks
function editPet(petId) {
    if (window.dashboardInstance) {
        window.dashboardInstance.showEditPetModal(petId);
    } else {
        console.error('Dashboard instance not found');
    }
}

// Global function to handle delete pet button clicks
function deletePet(petId) {
    if (window.dashboardInstance) {
        window.dashboardInstance.deletePet(petId);
    } else {
        console.error('Dashboard instance not found');
    }
}

// Global function to handle view pet report button clicks
function viewPetReport(appointmentId) {
    if (window.dashboardInstance) {
        window.dashboardInstance.viewPetReport(appointmentId);
    } else {
        console.error('Dashboard instance not found');
    }
}

// Function to handle image loading errors
function handleImageError(img, imagePath) {
  // If no image path, hide image and show placeholder
  if (!imagePath || imagePath.trim() === '' || imagePath === 'null') {
    img.style.display = 'none';
    const placeholder = img.nextElementSibling;
    if (placeholder && placeholder.classList.contains('image-placeholder')) {
      placeholder.style.display = 'flex';
    }
    return;
  }

  // Try alternative paths with correct base path prefix
  const basePath = '../assets/images/products/';
  const paths = [
    basePath + imagePath, // Original path with correct prefix
    basePath + imagePath.replace(/\.(jpg|jpeg|png)$/i, '.jpg'), // Try as .jpg
    basePath + imagePath.replace(/\.(jpg|jpeg|png)$/i, '.png')  // Try as .png
  ];

  // Filter out empty paths
  const validPaths = paths.filter(path => path && path.trim() !== '');

  let currentIndex = 0;

  function tryNextPath() {
    currentIndex++;
    if (currentIndex >= validPaths.length) {
      // All paths failed, hide image and show placeholder
      img.style.display = 'none';
      const placeholder = img.nextElementSibling;
      if (placeholder && placeholder.classList.contains('image-placeholder')) {
        placeholder.style.display = 'flex';
      }
      return;
    }

    // Use the path with correct base prefix
    img.src = validPaths[currentIndex];
  }

  if (validPaths.length > 0) {
    img.onerror = tryNextPath;
    tryNextPath(); // Try the first alternative path
  } else {
    // No valid paths, show placeholder immediately
    img.style.display = 'none';
    const placeholder = img.nextElementSibling;
    if (placeholder && placeholder.classList.contains('image-placeholder')) {
      placeholder.style.display = 'flex';
    }
  }
}
