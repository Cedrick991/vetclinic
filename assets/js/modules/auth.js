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
                this.showAuthRequiredModal();
                return false;
            }
            return true;
        } catch (error) {
            console.error('Authentication check failed:', error);
            this.showAuthRequiredModal();
            return false;
        }
    },

    showAuthRequiredModal() {
        console.log('🔧 Showing authentication required modal');

        // Create an authentication required modal
        const modal = document.createElement('div');
        modal.className = 'modal auth-required-modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px; background: linear-gradient(135deg, #2E5BAA, #1E3F7A); border-radius: 16px;">
                <div class="modal-header" style="padding: 24px 24px 0 24px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <h3 style="color: #B3B8FF; margin: 0; font-size: 1.3rem; display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-shield-alt" style="color: #ffd700;"></i>
                        Authentication Required
                    </h3>
                    <span class="close" onclick="this.closest('.modal').remove()" style="color: #ffffff; font-size: 28px; cursor: pointer;">&times;</span>
                </div>
                <div class="modal-body" style="padding: 24px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <div style="font-size: 64px; margin-bottom: 20px;">🔐</div>
                        <h4 style="color: #ffffff; margin-bottom: 15px;">Staff Access Required</h4>
                        <p style="color: rgba(255, 255, 255, 0.8); margin-bottom: 25px;">
                            You need to be logged in as a staff member to access this page. Please log in with your staff credentials.
                        </p>
                    </div>

                    <div style="display: flex; gap: 12px; justify-content: center;">
                        <button onclick="Auth.handleStaffLogin()" class="btn-primary" style="background: linear-gradient(135deg, #28a745, #20c997); color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;">
                            <i class="fas fa-sign-in-alt"></i> Login as Staff
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
    },

    async handleStaffLogin() {
        console.log('🔄 Redirecting to staff login...');

        // Close the auth required modal
        const authModal = document.querySelector('.auth-required-modal');
        if (authModal) {
            authModal.remove();
        }

        // Redirect to homepage with staff login modal
        window.location.href = '../index.html?show_staff_login=1';
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
                        window.location.href = '../index.html';
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