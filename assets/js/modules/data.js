// Data Module
export const Data = {
    async fetchDashboardStats() {
        try {
            // Load appointments
            const appointmentsResponse = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_all_appointments', limit: 100 })
            });
            
            const appointmentsResult = await appointmentsResponse.json();
            
            // Load clients
            const clientsResponse = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_all_clients' })
            });
            
            const clientsResult = await clientsResponse.json();
            
            // Load pets
            const petsResponse = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_all_pets' })
            });
            
            const petsResult = await petsResponse.json();
            
            return {
                appointments: appointmentsResult.success ? appointmentsResult.data : [],
                clients: clientsResult.success ? clientsResult.data : [],
                pets: petsResult.success ? petsResult.data : []
            };
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
            return {
                appointments: [],
                clients: [],
                pets: []
            };
        }
    },

    async updateAppointment(appointmentId, data) {
        try {
            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update_appointment',
                    appointment_id: appointmentId,
                    ...data
                })
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to update appointment:', error);
            return { success: false, message: 'Failed to update appointment' };
        }
    },

    async updateStaffProfile(profileData) {
        try {
            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update_staff_profile',
                    ...profileData
                })
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to update profile:', error);
            return { success: false, message: 'Failed to update profile' };
        }
    },

    async changePassword(passwordData) {
        try {
            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'change_password',
                    ...passwordData
                })
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to change password:', error);
            return { success: false, message: 'Failed to change password' };
        }
    }
};