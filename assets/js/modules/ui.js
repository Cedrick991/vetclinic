// UI Module
export const UI = {
    showToast(message, type = 'success') {
        const el = document.getElementById('toast');
        if (!el) return;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        el.textContent = `${icons[type] || ''} ${message}`;
        el.className = `toast toast-${type} show`;
        
        setTimeout(() => {
            el.className = el.className.replace('show', '');
        }, 3000);
    },

    showLoading(elementId, message = 'Loading...') {
        const el = document.getElementById(elementId);
        if (el) {
            el.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                    ${message}
                </div>`;
        }
    },

    hideLoading(elementId) {
        const el = document.getElementById(elementId);
        if (el) {
            el.innerHTML = '';
        }
    },

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
        }
    },

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    },

    updateNavigation(currentSection) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const navItem = document.querySelector(`.nav-item[href="#${currentSection}"]`);
        if (navItem) {
            navItem.classList.add('active');
        }
    }
};