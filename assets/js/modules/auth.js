// Authentication Module
export const Auth = {
    async checkStaffAuthentication() {
        try {
            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_user_info' })
            });
            
            const result = await response.json();
            
            if (!result.success || !result.data.logged_in || result.data.user_type !== 'staff') {
                UI.showToast('Access denied. Staff login required.', 'error');
                setTimeout(() => {
                    window.location.href = '../public/homepage.html';
                }, 2000);
                return false;
            }
            return true;
        } catch (error) {
            console.error('Authentication check failed:', error);
            window.location.href = '../public/homepage.html';
            return false;
        }
    },

    async loadStaffProfile() {
        try {
            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_user_info' })
            });
            
            const result = await response.json();
            
            if (result.success && result.data.user) {
                return result.data.user;
            }
            return null;
        } catch (error) {
            console.error('Failed to load staff profile:', error);
            return null;
        }
    },

    async handleLogout() {
        if (confirm('Are you sure you want to log out?')) {
            try {
                UI.showToast('Logging out...', 'info');

                // Call logout API endpoint
                const response = await fetch('../api/vet_api.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'logout' })
                });

                const result = await response.json();

                if (result.success) {
                    // Clear any local storage
                    sessionStorage.removeItem('staff_session');
                    localStorage.removeItem('user_session');

                    setTimeout(() => {
                        window.location.href = '../public/homepage.html';
                    }, 1500);
                } else {
                    UI.showToast('Logout failed. Please try again.', 'error');
                }
            } catch (error) {
                console.error('Logout error:', error);
                UI.showToast('Logout failed. Please try again.', 'error');
            }
        }
    }
};