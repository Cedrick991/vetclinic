/**
 * Real-time Notification System
 * Veterinary Clinic Management System
 */

// Check if NotificationSystem is already declared to prevent redeclaration errors
if (typeof window.NotificationSystem !== 'undefined') {
    console.log('NotificationSystem already loaded, skipping redeclaration');
} else {
    class NotificationSystem {
    constructor() {
        this.eventSource = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000; // Start with 1 second
        this.userId = null;
        this.lastNotificationId = 0;
        this.notificationQueue = [];
        this.isProcessingQueue = false;

        this.init();
        this.startTimeUpdater();
    }

    startTimeUpdater() {
        // Update notification times every minute
        setInterval(() => {
            this.updateAllNotificationTimes();
        }, 60000); // Update every minute
    }

    updateAllNotificationTimes() {
        const timeElements = document.querySelectorAll('.notification-time');
        timeElements.forEach(element => {
            const timestamp = element.dataset.timestamp;
            if (timestamp) {
                element.innerHTML = `<i class="fas fa-clock"></i> ${this.formatTime(timestamp)}`;
            }
        });

        // Also update toast times if they exist
        const toastTimeElements = document.querySelectorAll('.notification-toast-time');
        toastTimeElements.forEach(element => {
            const timestamp = element.dataset.timestamp;
            if (timestamp) {
                element.innerHTML = `<i class="fas fa-clock"></i> ${this.formatTime(timestamp)}`;
            }
        });
    }

    async init() {
        try {
            console.log('🔧 Initializing notification system...');

            // Get current user info
            const userResponse = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_user_info' })
            });

            const userResult = await userResponse.json();
            console.log('📊 User info response:', userResult);

            if (userResult.success && userResult.data) {
                this.userId = userResult.data.user.id;
                console.log('✅ User ID found:', this.userId);

                this.setupNotificationUI();
                this.connect();
                this.loadExistingNotifications();
                this.startNotificationPolling();

                console.log('🚀 Notification system initialized successfully');
            } else {
                console.warn('⚠️ Cannot initialize notifications: User not logged in');
            }
        } catch (error) {
            console.error('❌ Failed to initialize notification system:', error);
        }
    }

    setupNotificationUI() {
        // Create notification container if it doesn't exist
        if (!document.getElementById('notificationContainer')) {
            this.createNotificationContainer();
        }

        // Create notification dropdown if it doesn't exist
        if (!document.getElementById('notificationDropdown')) {
            this.createNotificationDropdown();
        }

        // Add notification bell icon to header
        this.addNotificationBell();

        // Setup event listeners
        this.setupEventListeners();
    }

    createNotificationContainer() {
        const modal = document.createElement('div');
        modal.id = 'notificationModal';
        modal.className = 'notification-modal';
        modal.innerHTML = `
            <div class="notification-modal-content">
                <div class="notification-header">
                    <h3><i class="fas fa-bell"></i> Notifications</h3>
                    <div class="notification-actions">
                        <button class="clear-all-btn" id="clearAllBtn" title="Clear all notifications">
                            <i class="fas fa-trash-alt"></i>
                            Clear All
                        </button>
                        <button class="mark-all-read-btn" id="markAllReadBtn" title="Mark all as read">
                            <i class="fas fa-check-double"></i>
                            Mark All Read
                        </button>
                        <button class="notification-settings-btn" id="notificationSettingsBtn" title="Settings">
                            <i class="fas fa-cog"></i>
                            Settings
                        </button>
                        <button class="close-notifications-btn" id="closeNotificationsBtn" title="Close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <div class="notification-body">
                    <div class="notification-list" id="notificationList">
                        <div class="notification-loading">
                            <i class="fas fa-spinner fa-spin"></i>
                            <p>Loading notifications...</p>
                        </div>
                    </div>
                </div>
                <div class="notification-footer">
                    <div class="notification-summary">
                        <span id="notificationSummary">Loading...</span>
                    </div>
                    <button class="view-all-btn" id="viewAllNotificationsBtn">
                        <i class="fas fa-history"></i>
                        View Notification History
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    createNotificationDropdown() {
        // Add CSS for notifications if not already present
        if (!document.getElementById('notificationStyles')) {
            const styles = document.createElement('style');
            styles.id = 'notificationStyles';
            styles.textContent = `
                .notification-container {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 9999;
                    pointer-events: none;
                }

                .notification-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: transparent;
                    display: none;
                }

                .notification-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    display: none;
                    z-index: 10000;
                    animation: fadeIn 0.3s ease;
                }

                .notification-modal.show {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .notification-modal-content {
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                    width: 90%;
                    max-width: 600px;
                    max-height: 80vh;
                    display: flex;
                    flex-direction: column;
                    animation: slideIn 0.3s ease;
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-50px) scale(0.9);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }

                .notification-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px 24px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border-radius: 16px 16px 0 0;
                }

                .notification-header h3 {
                    margin: 0;
                    font-size: 20px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .notification-actions {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                }

                .notification-actions button {
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    color: white;
                    padding: 8px 12px;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 12px;
                    font-weight: 500;
                }

                .notification-actions button:hover {
                    background: rgba(255, 255, 255, 0.3);
                    transform: translateY(-1px);
                }

                .clear-all-btn {
                    background: rgba(220, 53, 69, 0.2) !important;
                    color: #ff6b6b !important;
                }

                .clear-all-btn:hover {
                    background: rgba(220, 53, 69, 0.3) !important;
                    color: #ff5252 !important;
                }

                .clear-notification-btn {
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    background: rgba(220, 53, 69, 0.1);
                    border: none;
                    color: #dc3545;
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px;
                    opacity: 0;
                }

                .notification-item:hover .clear-notification-btn {
                    opacity: 1;
                }

                .clear-notification-btn:hover {
                    background: rgba(220, 53, 69, 0.2);
                    color: #c82333;
                    transform: scale(1.1);
                }

                .close-notifications-btn {
                    background: rgba(255, 255, 255, 0.2) !important;
                    color: white !important;
                    width: 32px !important;
                    height: 32px !important;
                    border-radius: 50% !important;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .notification-body {
                    flex: 1;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }

                .notification-list {
                    flex: 1;
                    overflow-y: auto;
                    padding: 8px;
                }

                .notification-item {
                    padding: 16px 20px;
                    margin-bottom: 8px;
                    background: white;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    position: relative;
                    border: 1px solid #e9ecef;
                }

                .notification-item:hover {
                    background-color: #f8f9fa;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                }

                .notification-item.unread {
                    background-color: #f0f7ff;
                    border-left: 4px solid #007bff;
                    animation: pulse 2s infinite;
                }

                .notification-item.read {
                    opacity: 0.9;
                }

                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(0, 123, 255, 0.4); }
                    70% { box-shadow: 0 0 0 8px rgba(0, 123, 255, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(0, 123, 255, 0); }
                }

                .notification-content {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .notification-title {
                    font-weight: 600;
                    font-size: 14px;
                    color: #2c3e50;
                    margin: 0;
                }

                .notification-message {
                    font-size: 13px;
                    color: #6c757d;
                    line-height: 1.4;
                    margin: 0;
                }

                .notification-meta {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 12px;
                    color: #adb5bd;
                }

                .notification-time {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .notification-priority {
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: 500;
                    text-transform: uppercase;
                }

                .priority-high {
                    background-color: #ffc107;
                    color: #856404;
                }

                .priority-urgent {
                    background-color: #dc3545;
                    color: white;
                }

                .priority-normal {
                    background-color: #28a745;
                    color: white;
                }

                .priority-low {
                    background-color: #6c757d;
                    color: white;
                }

                .notification-loading {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 40px;
                    color: #6c757d;
                }

                .notification-empty {
                    text-align: center;
                    padding: 40px;
                    color: #6c757d;
                }

                .notification-empty i {
                    font-size: 48px;
                    margin-bottom: 16px;
                    opacity: 0.5;
                }

                .notification-footer {
                    padding: 20px 24px;
                    background-color: #f8f9fa;
                    border-top: 1px solid #e9ecef;
                    border-radius: 0 0 16px 16px;
                }

                .notification-summary {
                    text-align: center;
                    margin-bottom: 16px;
                    font-size: 14px;
                    color: #6c757d;
                }

                .view-all-btn {
                    width: 100%;
                    padding: 14px;
                    background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                    color: white;
                    border: none;
                    border-radius: 10px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }

                .view-all-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
                }

                .notification-bell-btn {
                    position: relative;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border: none;
                    border-radius: 8px;
                    padding: 8px 12px;
                    color: white;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 14px;
                }

                .notification-bell-btn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
                }

                .notification-bell-btn:active {
                    transform: translateY(0);
                }

                /* Enhanced styling for client dashboard header */
                .header-bar .notification-bell-btn {
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    backdrop-filter: blur(10px);
                }

                .header-bar .notification-bell-btn:hover {
                    background: rgba(255, 255, 255, 0.2);
                    border-color: rgba(255, 255, 255, 0.3);
                }

                .notification-badge {
                    position: absolute;
                    top: -6px;
                    right: -6px;
                    background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
                    color: white;
                    border-radius: 50%;
                    width: 20px;
                    height: 20px;
                    font-size: 11px;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-width: 20px;
                    box-shadow: 0 2px 8px rgba(220, 53, 69, 0.3);
                    animation: badgePulse 2s infinite;
                }

                @keyframes badgePulse {
                    0%, 70% { transform: scale(1); }
                    35% { transform: scale(1.1); }
                }

                .notification-toast {
                    position: fixed;
                    top: 80px;
                    right: 20px;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
                    padding: 16px 20px;
                    max-width: 350px;
                    z-index: 10001;
                    transform: translateX(400px);
                    opacity: 0;
                    transition: all 0.3s ease;
                    border-left: 4px solid #007bff;
                }

                .notification-toast.show {
                    transform: translateX(0);
                    opacity: 1;
                }

                .notification-toast-title {
                    font-weight: 600;
                    font-size: 14px;
                    color: #2c3e50;
                    margin-bottom: 4px;
                }

                .notification-toast-message {
                    font-size: 13px;
                    color: #6c757d;
                    line-height: 1.4;
                    margin-bottom: 8px;
                }

                .notification-toast-time {
                    font-size: 12px;
                    color: #adb5bd;
                }

                @media (max-width: 768px) {
                    .notification-modal-content {
                        width: 95%;
                        max-height: 90vh;
                    }

                    .notification-header {
                        padding: 16px 20px;
                    }

                    .notification-header h3 {
                        font-size: 18px;
                    }

                    .notification-actions button {
                        padding: 6px 10px;
                        font-size: 11px;
                    }

                    .notification-footer {
                        padding: 16px 20px;
                    }
                }
            `;
            document.head.appendChild(styles);
        }
    }

    addNotificationBell() {
        console.log('🔍 Looking for header elements...');

        // Find the header bar in client.html structure
        const headerBar = document.querySelector('.header-bar');
        console.log('📱 Header bar found:', !!headerBar);

        if (headerBar) {
            const headerContent = headerBar.querySelector('.header-content');
            console.log('📄 Header content found:', !!headerContent);

            if (headerContent) {
                // Create right group for notifications and user actions
                let rightGroup = headerContent.querySelector('.right-group');
                console.log('🏷️ Right group exists:', !!rightGroup);

                if (!rightGroup) {
                    rightGroup = document.createElement('div');
                    rightGroup.className = 'right-group';
                    rightGroup.style.cssText = 'display: flex; align-items: center; gap: 12px; margin-left: auto;';

                    // Move existing elements to left group and add right group
                    const leftGroup = headerContent.querySelector('.left-group');
                    if (leftGroup) {
                        leftGroup.style.marginRight = 'auto';
                        headerContent.appendChild(rightGroup);
                        console.log('✅ Created and added right group');
                    }
                }

                // Create notification button
                const bellContainer = document.createElement('button');
                bellContainer.className = 'notification-bell-btn';
                bellContainer.id = 'notificationBell';
                bellContainer.type = 'button';
                bellContainer.innerHTML = `
                    <i class="fas fa-bell"></i>
                    <div class="notification-badge" id="notificationBadge">0</div>
                `;

                // Add to right group
                rightGroup.appendChild(bellContainer);
                console.log('🔔 Notification button added to right group');
            }
        }

        // Also try the original method for other page structures
        if (!document.getElementById('notificationBell')) {
            console.log('🔄 Trying alternative header detection...');
            const header = document.querySelector('.header, .navbar, .top-bar');
            console.log('📋 Alternative header found:', !!header);

            if (header) {
                const bellContainer = document.createElement('button');
                bellContainer.className = 'notification-bell-btn';
                bellContainer.id = 'notificationBell';
                bellContainer.type = 'button';
                bellContainer.innerHTML = `
                    <i class="fas fa-bell"></i>
                    <div class="notification-badge" id="notificationBadge">0</div>
                `;

                // Insert before any existing user menu or at the end
                const userMenu = header.querySelector('.user-menu, .profile-menu');
                if (userMenu) {
                    header.insertBefore(bellContainer, userMenu);
                    console.log('🔔 Notification button inserted before user menu');
                } else {
                    header.appendChild(bellContainer);
                    console.log('🔔 Notification button appended to header');
                }
            }
        }

        // Final check
        const finalButton = document.getElementById('notificationBell');
        console.log('🎯 Final notification button check:', !!finalButton);
    }

    setupEventListeners() {
        // Notification bell click
        document.addEventListener('click', (e) => {
            if (e.target.closest('#notificationBell')) {
                e.preventDefault();
                e.stopPropagation();
                this.toggleNotificationModal();
            }
        });

        // Close modal when clicking outside
        document.addEventListener('click', (e) => {
            const modal = document.getElementById('notificationModal');
            const bell = document.getElementById('notificationBell');

            if (modal && modal.classList.contains('show')) {
                if (!modal.contains(e.target) && !bell?.contains(e.target)) {
                    this.closeNotificationModal();
                }
            }
        });

        // Close modal with escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('notificationModal');
                if (modal && modal.classList.contains('show')) {
                    this.closeNotificationModal();
                }
            }
        });

        // Mark all as read button
        document.addEventListener('click', (e) => {
            if (e.target.closest('#markAllReadBtn')) {
                e.preventDefault();
                e.stopPropagation();
                this.markAllAsRead();
            }
        });

        // Clear all notifications button
        document.addEventListener('click', (e) => {
            if (e.target.closest('#clearAllBtn')) {
                e.preventDefault();
                e.stopPropagation();
                this.clearAllNotifications();
            }
        });

        // Clear individual notification button
        document.addEventListener('click', (e) => {
            if (e.target.closest('.clear-notification-btn')) {
                e.preventDefault();
                e.stopPropagation();
                const button = e.target.closest('.clear-notification-btn');
                const notificationId = button.dataset.notificationId;
                if (notificationId) {
                    this.clearNotification(notificationId);
                }
            }
        });

        // Close button
        document.addEventListener('click', (e) => {
            if (e.target.closest('#closeNotificationsBtn')) {
                e.preventDefault();
                e.stopPropagation();
                this.closeNotificationModal();
            }
        });

        // Notification settings button
        document.addEventListener('click', (e) => {
            if (e.target.closest('#notificationSettingsBtn')) {
                e.preventDefault();
                e.stopPropagation();
                this.showNotificationSettings();
            }
        });

        // View all notifications button
        document.addEventListener('click', (e) => {
            if (e.target.closest('#viewAllNotificationsBtn')) {
                e.preventDefault();
                e.stopPropagation();
                this.showAllNotifications();
            }
        });

        // Notification item clicks
        document.addEventListener('click', (e) => {
            if (e.target.closest('.notification-item')) {
                e.preventDefault();
                e.stopPropagation();
                const item = e.target.closest('.notification-item');
                const notificationId = item.dataset.notificationId;
                if (notificationId) {
                    this.markAsRead(notificationId);
                }
            }
        });
    }

    connect() {
        if (!this.userId) return;

        try {
            // Close existing connection
            if (this.eventSource) {
                this.eventSource.close();
            }

            // Create new EventSource connection
            const lastId = localStorage.getItem(`lastNotificationId_${this.userId}`) || 0;
            this.eventSource = new EventSource(`../api/notification_service.php?user_id=${this.userId}&last_id=${lastId}`);

            this.eventSource.onopen = () => {
                console.log('Notification service connected');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.reconnectDelay = 1000;
            };

            this.eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleNotificationEvent(data);
                } catch (error) {
                    console.error('Error parsing notification event:', error);
                }
            };

            this.eventSource.onerror = (error) => {
                console.warn('Notification service error - falling back to polling mode:', error);
                this.isConnected = false;
                this.handleConnectionError();
            };

        } catch (error) {
            console.warn('Failed to connect to notification service - using polling fallback:', error);
            this.isConnected = false;
            // Start polling as fallback
            this.startPollingFallback();

            // Show user-friendly message about fallback mode
            if (window.dashboardInstance) {
                window.dashboardInstance.showToast('Real-time notifications unavailable - using polling mode', 'info');
            }
        }
    }

    handleConnectionError() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

            setTimeout(() => {
                this.connect();
            }, this.reconnectDelay);

            // Exponential backoff
            this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
        } else {
            console.error('Max reconnection attempts reached');
        }
    }

    handleNotificationEvent(data) {
        switch (data.type) {
            case 'connection':
                console.log('Notification service connection established');
                break;

            case 'notification':
                this.showNotificationToast(data);
                this.addNotificationToList(data);
                this.updateNotificationBadge();
                break;

            case 'error':
                console.error('Notification service error:', data.message);
                break;
        }
    }

    showNotificationToast(notification) {
        const toast = document.createElement('div');
        toast.className = 'notification-toast';
        toast.innerHTML = `
            <div class="notification-toast-title">${notification.title}</div>
            <div class="notification-toast-message">${notification.message}</div>
            <div class="notification-toast-time" data-timestamp="${notification.created_at}">
                <i class="fas fa-clock"></i>
                ${this.formatTime(notification.created_at)}
            </div>
        `;

        document.body.appendChild(toast);

        // Trigger animation
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 5000);

        // Click to dismiss
        toast.addEventListener('click', () => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        });
    }

    addNotificationToList(notification) {
        const notificationList = document.getElementById('notificationList');
        if (!notificationList) return;

        const notificationItem = document.createElement('div');
        notificationItem.className = `notification-item unread`;
        notificationItem.dataset.notificationId = notification.id;

        const priorityClass = `priority-${notification.priority || 'normal'}`;

        notificationItem.innerHTML = `
            <div class="notification-content">
                <div class="notification-title">${notification.title}</div>
                <div class="notification-message">${notification.message}</div>
                <div class="notification-meta">
                    <div class="notification-time" data-timestamp="${notification.created_at}">
                        <i class="fas fa-clock"></i>
                        ${this.formatTime(notification.created_at)}
                    </div>
                    <div class="notification-priority ${priorityClass}">
                        ${notification.priority || 'normal'}
                    </div>
                </div>
            </div>
            <div class="notification-actions">
                <button class="clear-notification-btn" data-notification-id="${notification.id}" title="Clear this notification">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        // Insert at the top of the list
        const firstItem = notificationList.querySelector('.notification-item');
        if (firstItem) {
            notificationList.insertBefore(notificationItem, firstItem);
        } else {
            notificationList.appendChild(notificationItem);
        }

        // Update last notification ID
        this.lastNotificationId = Math.max(this.lastNotificationId, notification.id);
        localStorage.setItem(`lastNotificationId_${this.userId}`, this.lastNotificationId);

        // Limit visible notifications
        this.limitNotificationList();
    }

    limitNotificationList() {
        const notificationList = document.getElementById('notificationList');
        if (!notificationList) return;

        const items = notificationList.querySelectorAll('.notification-item');
        if (items.length > 20) {
            // Remove oldest items beyond the limit
            for (let i = 20; i < items.length; i++) {
                items[i].remove();
            }
        }
    }

    async loadExistingNotifications() {
        try {
            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'get_notifications',
                    limit: 20,
                    offset: 0
                })
            });

            const result = await response.json();

            if (result.success && result.data) {
                this.displayNotifications(result.data);
                this.updateNotificationBadge();
                this.updateNotificationSummary();

                // Update last notification ID
                if (result.data.length > 0) {
                    this.lastNotificationId = Math.max(...result.data.map(n => n.id));
                    localStorage.setItem(`lastNotificationId_${this.userId}`, this.lastNotificationId);
                }
            } else {
                // Fallback to mock notifications if database is not available
                console.warn('Database notifications not available, using fallback mode');
                this.displayNotifications(this.getMockNotifications());
                this.updateNotificationBadge();
                this.updateNotificationSummary();
            }
        } catch (error) {
            console.warn('Failed to load existing notifications, using fallback mode:', error);
            // Fallback to mock notifications if database is not available
            this.displayNotifications(this.getMockNotifications());
            this.updateNotificationBadge();
            this.updateNotificationSummary();
        }
    }

    getMockNotifications() {
        const now = new Date();
        return [
            {
                id: 1,
                title: 'Welcome to the Dashboard',
                message: 'Your dashboard is ready to use. You can book appointments, manage your pets, and more.',
                priority: 'normal',
                is_read: 0,
                created_at: now.toISOString()
            },
            {
                id: 2,
                title: 'System Update',
                message: 'The booking system has been updated with new features.',
                priority: 'low',
                is_read: 0,
                created_at: new Date(now.getTime() - 3600000).toISOString() // 1 hour ago
            }
        ];
    }

    displayNotifications(notifications) {
        const notificationList = document.getElementById('notificationList');
        if (!notificationList) return;

        if (notifications.length === 0) {
            notificationList.innerHTML = `
                <div class="notification-empty">
                    <i class="fas fa-bell-slash"></i>
                    <h4>No Notifications</h4>
                    <p>You're all caught up!</p>
                </div>
            `;
            return;
        }

        notificationList.innerHTML = notifications.map(notification => {
            const priorityClass = `priority-${notification.priority || 'normal'}`;
            const itemClass = notification.is_read ? 'notification-item read' : 'notification-item unread';

            return `
                <div class="${itemClass}" data-notification-id="${notification.id}">
                    <div class="notification-content">
                        <div class="notification-title">${notification.title}</div>
                        <div class="notification-message">${notification.message}</div>
                        <div class="notification-meta">
                            <div class="notification-time" data-timestamp="${notification.created_at}">
                                <i class="fas fa-clock"></i>
                                ${this.formatTime(notification.created_at)}
                            </div>
                            <div class="notification-priority ${priorityClass}">
                                ${notification.priority || 'normal'}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    updateNotificationBadge() {
        if (!this.userId) return;

        // Get unread count from localStorage or API
        const unreadCount = this.getUnreadCount();

        const badge = document.getElementById('notificationBadge');
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    getUnreadCount() {
        // This would typically come from an API call or cached data
        // For now, we'll count unread items in the current list
        const notificationList = document.getElementById('notificationList');
        if (notificationList) {
            return notificationList.querySelectorAll('.notification-item.unread').length;
        }
        return 0;
    }

    toggleNotificationModal() {
        const modal = document.getElementById('notificationModal');

        if (modal) {
            const isVisible = modal.classList.contains('show');
            if (isVisible) {
                this.closeNotificationModal();
            } else {
                this.openNotificationModal();
            }
        }
    }

    openNotificationModal() {
        const modal = document.getElementById('notificationModal');

        if (modal) {
            modal.classList.add('show');

            // Load notifications if not already loaded
            const loadingElement = modal.querySelector('.notification-loading');
            if (loadingElement) {
                this.loadExistingNotifications();
            }

            // Update summary
            this.updateNotificationSummary();
        }
    }

    closeNotificationModal() {
        const modal = document.getElementById('notificationModal');

        if (modal) {
            modal.classList.remove('show');
        }
    }

    async markAsRead(notificationId) {
        try {
            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'mark_notification_read',
                    notification_id: notificationId
                })
            });

            const result = await response.json();

            if (result.success) {
                // Update UI
                const item = document.querySelector(`[data-notification-id="${notificationId}"]`);
                if (item) {
                    item.classList.remove('unread');
                    item.classList.add('read');
                }

                this.updateNotificationBadge();
                this.updateNotificationSummary();
            }
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    }

    async markAllAsRead() {
        try {
            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'mark_all_notifications_read'
                })
            });

            const result = await response.json();

            if (result.success) {
                // Update all notification items in the UI
                const unreadItems = document.querySelectorAll('.notification-item.unread');
                unreadItems.forEach(item => {
                    item.classList.remove('unread');
                    item.classList.add('read');
                });

                this.updateNotificationBadge();
                this.updateNotificationSummary();

                // Show success message
                if (window.dashboardInstance) {
                    window.dashboardInstance.showToast('All notifications marked as read', 'success');
                }
            }
        } catch (error) {
            console.error('Failed to mark all notifications as read:', error);
        }
    }

    showNotificationSettings() {
        // This would open a modal with notification preferences
        if (window.dashboardInstance) {
            window.dashboardInstance.showToast('Notification settings coming soon!', 'info');
        }
    }

    showAllNotifications() {
        // This would navigate to a full notifications page
        if (window.dashboardInstance) {
            window.dashboardInstance.showToast('Full notifications page coming soon!', 'info');
        }
    }

    async clearAllNotifications() {
        if (!confirm('Are you sure you want to clear all notifications? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'clear_all_notifications'
                })
            });

            const result = await response.json();

            if (result.success) {
                // Clear all notification items from the UI
                const notificationList = document.getElementById('notificationList');
                if (notificationList) {
                    notificationList.innerHTML = `
                        <div class="notification-empty">
                            <i class="fas fa-bell-slash"></i>
                            <h4>No Notifications</h4>
                            <p>All notifications cleared!</p>
                        </div>
                    `;
                }

                this.updateNotificationBadge();
                this.updateNotificationSummary();

                // Show success message
                if (window.dashboardInstance) {
                    window.dashboardInstance.showToast('All notifications cleared', 'success');
                }
            } else {
                if (window.dashboardInstance) {
                    window.dashboardInstance.showToast(result.message || 'Failed to clear notifications', 'error');
                }
            }
        } catch (error) {
            console.error('Failed to clear all notifications:', error);
            this.showToast('Failed to clear notifications. Please try again.', 'error');
        }
    }

    async clearNotification(notificationId) {
        try {
            const response = await fetch('../api/vet_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'delete_notification',
                    notification_id: notificationId
                })
            });

            const result = await response.json();

            if (result.success) {
                // Remove the notification item from the UI
                const item = document.querySelector(`[data-notification-id="${notificationId}"]`);
                if (item) {
                    item.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    item.style.opacity = '0';
                    item.style.transform = 'translateX(-100%)';
                    setTimeout(() => {
                        item.remove();
                        this.updateNotificationBadge();
                        this.updateNotificationSummary();

                        // Show empty state if no notifications left
                        const notificationList = document.getElementById('notificationList');
                        if (notificationList && notificationList.querySelectorAll('.notification-item').length === 0) {
                            notificationList.innerHTML = `
                                <div class="notification-empty">
                                    <i class="fas fa-bell-slash"></i>
                                    <h4>No Notifications</h4>
                                    <p>You're all caught up!</p>
                                </div>
                            `;
                        }
                    }, 300);
                }

                // Show success message
                if (window.dashboardInstance) {
                    window.dashboardInstance.showToast('Notification cleared', 'success');
                }
            } else {
                if (window.dashboardInstance) {
                    window.dashboardInstance.showToast(result.message || 'Failed to clear notification', 'error');
                }
            }
        } catch (error) {
            console.error('Failed to clear notification:', error);
            this.showToast('Failed to clear notification. Please try again.', 'error');
        }
    }

    updateNotificationSummary() {
        const summaryElement = document.getElementById('notificationSummary');
        if (summaryElement) {
            const unreadCount = this.getUnreadCount();
            const totalCount = document.querySelectorAll('.notification-item').length;

            if (totalCount === 0) {
                summaryElement.textContent = 'No notifications yet';
            } else if (unreadCount === 0) {
                summaryElement.textContent = `All ${totalCount} notifications read`;
            } else {
                summaryElement.textContent = `${unreadCount} unread of ${totalCount} notifications`;
            }
        }
    }

    formatTime(timestamp) {
        try {
            // Handle different timestamp formats
            let date;
            if (typeof timestamp === 'string') {
                // If it's already in ISO format or has timezone info
                date = new Date(timestamp);
            } else if (typeof timestamp === 'number') {
                // If it's a Unix timestamp
                date = new Date(timestamp * 1000);
            } else {
                // Fallback
                date = new Date(timestamp);
            }

            // Check if date is valid
            if (isNaN(date.getTime())) {
                console.warn('Invalid timestamp:', timestamp);
                return 'Unknown time';
            }

            const now = new Date();
            const diffInSeconds = Math.floor((now - date) / 1000);

            // Handle future dates
            if (diffInSeconds < 0) {
                return 'now';
            }

            if (diffInSeconds < 60) {
                return 'Just now';
            } else if (diffInSeconds < 3600) {
                const minutes = Math.floor(diffInSeconds / 60);
                return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
            } else if (diffInSeconds < 86400) {
                const hours = Math.floor(diffInSeconds / 3600);
                return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
            } else if (diffInSeconds < 604800) { // Less than a week
                const days = Math.floor(diffInSeconds / 86400);
                return `${days}d ago`;
            } else {
                // For older notifications, show the actual date and time
                return date.toLocaleString();
            }
        } catch (error) {
            console.error('Error formatting time:', error, 'Timestamp:', timestamp);
            return 'Unknown time';
        }
    }

    startNotificationPolling() {
        // Fallback polling every 30 seconds if SSE fails
        setInterval(() => {
            if (!this.isConnected) {
                this.loadExistingNotifications();
            }
        }, 30000);
    }

    startPollingFallback() {
        console.log('Starting polling fallback mode for notifications');
        this.isConnected = false;

        // Load notifications immediately and then poll every 30 seconds
        this.loadExistingNotifications();
        setInterval(() => {
            this.loadExistingNotifications();
        }, 30000);
    }

    disconnect() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        this.isConnected = false;
    }
}

// Assign the class to window for global access
window.NotificationSystem = NotificationSystem;
}

// Initialize notification system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only create new instance if one doesn't already exist
    if (!window.notificationSystem) {
        window.notificationSystem = new NotificationSystem();
    }
});