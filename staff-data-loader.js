/**
 * Staff Dashboard Data Loading Functions
 * These functions are missing from the main staff-dashboard.js file
 * Add these functions to fix the data loading issues
 */

class StaffDashboardDataLoader {

    // Section loading functions that are called from loadDashboardData
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
                        <td>${appointment.first_name} ${appointment.last_name}</td>
                        <td>${appointment.pet_name}</td>
                        <td>${appointment.service_name}</td>
                        <td>${appointment.appointment_date}</td>
                        <td>${appointment.appointment_time}</td>
                        <td><span class="status-badge status-${appointment.status.toLowerCase()}">${appointment.status}</span></td>
                        <td>
                            <div class="appointment-actions">
                                <button class="action-btn edit" onclick="editAppointment(${appointment.id})" title="Edit Appointment">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="action-btn view" onclick="viewAppointmentDetails(${appointment.id})" title="View Details">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="action-btn delete" onclick="cancelAppointment(${appointment.id})" title="Cancel Appointment">
                                    <i class="fas fa-times"></i>
                                </button>
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
                                <h3>No Appointments Scheduled</h3>
                                <p>Schedule your first appointment to get started!</p>
                                <button class="btn-primary btn-small" onclick="showAddAppointmentModal()">
                                    <i class="fas fa-plus"></i> Schedule Appointment
                                </button>
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

    async loadClientsSection() {
        try {
            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_clients' })
            });

            const result = await response.json();
            const clientsGrid = document.getElementById('clientsGrid');

            if (result.success && result.data && result.data.length > 0) {
                clientsGrid.innerHTML = result.data.map(client => this.createClientCard(client)).join('');
            } else {
                clientsGrid.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-users"></i>
                        <h3>No Clients Registered</h3>
                        <p>Start by registering your first client to begin managing appointments and pet records.</p>
                        <button class="btn-primary btn-small" onclick="showAddClientModal()">
                            <i class="fas fa-user-plus"></i> Add New Client
                        </button>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Failed to load clients:', error);
            const clientsGrid = document.getElementById('clientsGrid');
            clientsGrid.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load clients</p>
                    <button class="btn-primary" onclick="if(window.staffDashboard) window.staffDashboard.loadClientsSection()">
                        <i class="fas fa-refresh"></i> Retry
                    </button>
                </div>
            `;
        }
    }

    createClientCard(client) {
        // Get pets for this client
        let petsList = 'No pets registered';
        if (client.pets && client.pets.length > 0) {
            petsList = client.pets.map(pet => `${pet.name} (${pet.species})`).join(', ');
        }

        return `
            <div class="client-card">
                <div class="client-avatar">
                    <i class="fas fa-user-circle"></i>
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
                petsGrid.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-paw"></i>
                        <h3>No Pets Registered</h3>
                        <p>Start by registering pets for your clients to track their health and appointments.</p>
                        <button class="btn-primary btn-small" onclick="showAddPetModal()">
                            <i class="fas fa-plus"></i> Register New Pet
                        </button>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Failed to load pets:', error);
            const petsGrid = document.getElementById('petsGrid');
            petsGrid.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load pets</p>
                    <button class="btn-primary" onclick="if(window.staffDashboard) window.staffDashboard.loadPetsSection()">
                        <i class="fas fa-refresh"></i> Retry
                    </button>
                </div>
            `;
        }
    }

    createPetCard(pet) {
        // Handle pet image with fallback
        let imageHtml = '';
        let placeholderHtml = '<div class="pet-image-placeholder"><i class="fas fa-paw"></i></div>';

        // For now, we'll use a placeholder since pets might not have individual images
        // In the future, you could add pet image functionality
        const speciesIcon = this.getSpeciesIcon(pet.species);

        // Create pet details
        const details = [];
        if (pet.breed) details.push(`<strong>Breed:</strong> ${pet.breed}`);
        if (pet.birthdate) details.push(`<strong>Birthdate:</strong> ${new Date(pet.birthdate).toLocaleDateString()}`);
        details.push(`<strong>Gender:</strong> ${pet.gender}`);
        details.push(`<strong>Owner:</strong> ${pet.first_name} ${pet.last_name}`);
        if (pet.weight) details.push(`<strong>Weight:</strong> ${pet.weight} kg`);
        if (pet.color) details.push(`<strong>Color:</strong> ${pet.color}`);

        const detailsText = details.join('<br>');

        return `
            <div class="pet-card">
                <div class="pet-image">
                    <div class="pet-image-placeholder">
                        <i class="${speciesIcon}"></i>
                    </div>
                </div>
                <div class="pet-info">
                    <div class="pet-name">${pet.name}</div>
                    <div class="pet-species">${pet.species}</div>
                    <div class="pet-details">${detailsText}</div>
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
}

// Make functions available globally
window.staffDashboardDataLoader = new StaffDashboardDataLoader();

// Also add the functions directly to the staffDashboard instance if it exists
if (typeof window.staffDashboard !== 'undefined') {
    // Copy the functions to the main dashboard instance
    Object.getOwnPropertyNames(StaffDashboardDataLoader.prototype).forEach(method => {
        if (method !== 'constructor' && typeof window.staffDashboard[method] === 'undefined') {
            window.staffDashboard[method] = StaffDashboardDataLoader.prototype[method].bind(window.staffDashboard);
        }
    });
}
