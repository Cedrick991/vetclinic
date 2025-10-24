// Utils Module
export const Utils = {
    formatDate(date) {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    formatTime(time) {
        return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },

    validatePhone(phone) {
        // Remove all non-digit characters for validation
        const digitsOnly = phone.replace(/\D/g, '');
        // Accept 10-15 digits (most international phone numbers)
        return digitsOnly.length >= 10 && digitsOnly.length <= 15;
    },

    generateStatusBadge(status) {
        return `<span class="status-badge status-${status.toLowerCase().replace(' ', '-')}">${status}</span>`;
    },

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    validatePassword(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*]/.test(password);
        
        const errors = [];
        if (password.length < minLength) errors.push(`Password must be at least ${minLength} characters long`);
        if (!hasUpperCase) errors.push('Password must contain at least one uppercase letter');
        if (!hasLowerCase) errors.push('Password must contain at least one lowercase letter');
        if (!hasNumbers) errors.push('Password must contain at least one number');
        if (!hasSpecialChar) errors.push('Password must contain at least one special character (!@#$%^&*)');
        
        return {
            isValid: errors.length === 0,
            errors
        };
    },

    sanitizeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};