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
                                <h3>No Appointments</h3>
                                <p>No appointments scheduled.</p>
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
                        <h3>No Clients</h3>
                        <p>No clients registered.</p>
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
