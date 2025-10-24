// Client Dashboard JavaScript
class ClientDashboard {
  constructor() {
    this.cart = JSON.parse(localStorage.getItem('clientCart') || '[]');
    this.currentReportData = null;
    this.selectedPetId = null;
    this.isSubmittingBooking = false; // Flag to prevent duplicate submissions
    this.currentEditingAppointmentId = null; // Track appointment being edited
    this.sessionValidated = false; // Track if session has been successfully validated
    this.sessionRetryCount = 0; // Track session retry attempts
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.updateCartCount();
  }

  setupEventListeners() {
    // Setup navigation
    this.setupNavigation();

    // Setup forms
    this.setupProfileForm();
    this.setupProfilePictureForm();

    // Setup cart functionality
    this.setupCartFunctionality();

    // Setup booking functionality
    this.setupBookingForm();
  }

  setupCartFunctionality() {
    // Cart icon click handler
    const cartIcon = document.getElementById('cartIcon');
    if (cartIcon) {
      cartIcon.addEventListener('click', (e) => {
        e.preventDefault();
        this.viewCart();
      });
    }

    // Add to cart buttons (handled by onclick attributes in HTML)
    // Buy now buttons (handled by onclick attributes in HTML)

    // Cart count updates are handled in addToCart and buyNow methods
  }


  setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-section]');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const sectionName = item.getAttribute('data-section');
        this.showSection(sectionName);
      });

      // Add keyboard support
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          item.click();
        }
      });
    });
  }

  showSection(sectionName) {
    // Hide all sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
      section.style.display = 'none';
      section.classList.add('hidden');
    });

    // Remove active class from all nav items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.classList.remove('active');
    });

    // Show selected section
    const targetSection = document.getElementById(sectionName + 'Section');
    if (targetSection) {
      targetSection.style.display = 'block';
      targetSection.classList.remove('hidden');

      // Load section-specific data
      this.loadSectionData(sectionName);
    }

    // Add active class to clicked nav item
    const activeNavItem = document.querySelector(`[data-section="${sectionName}"]`);
    if (activeNavItem) {
      activeNavItem.classList.add('active');
    }

    // Update page title
    this.updatePageTitle(sectionName);
  }

  loadSectionData(sectionName) {
    switch (sectionName) {
      case 'store':
        this.loadStoreSection();
        break;
      case 'appointments':
        this.loadAppointmentsSection();
        break;
      case 'pets':
        this.loadPetsSection();
        break;
      case 'reports':
        console.log('🔄 Loading reports section...');
        this.initializeReportsSection();
        break;
      case 'settings':
        this.loadClientSettingsData();
        break;
      case 'orders':
        this.loadOrders();
        break;
    }
  }

  updatePageTitle(sectionName) {
    const titles = {
      'dashboard': '<i class="fas fa-paw"></i> Welcome to Your Dashboard',
      'appointments': '<i class="fas fa-calendar-alt"></i> My Appointments',
      'pets': '<i class="fas fa-paw"></i> My Pets',
      'store': '<i class="fas fa-store"></i> Store',
      'orders': '<i class="fas fa-shopping-bag"></i> My Orders',
      'reports': '<i class="fas fa-file-pdf"></i> Pet Reports',
      'settings': '<i class="fas fa-cog"></i> Settings'
    };

    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle && titles[sectionName]) {
      pageTitle.innerHTML = titles[sectionName];
    }
  }

  // Session Management
  async checkSession() {
    let retryCount = 0;
    const maxRetries = 3;

    // Check if this is a fresh registration
    const registrationUser = sessionStorage.getItem('registration_user');
    if (registrationUser) {
      try {
        const userData = JSON.parse(registrationUser);
        console.log('🆕 Detected fresh registration, user data:', userData);
        
        // Check if registration is recent (within last 5 minutes)
        if (Date.now() - userData.timestamp < 5 * 60 * 1000) {
          console.log('✅ Recent registration detected, allowing extra time for session establishment...');
          
          // Give additional time for session to establish
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Clear the registration marker after successful handling
          sessionStorage.removeItem('registration_user');
        }
      } catch (e) {
        console.warn('⚠️ Error parsing registration user data:', e);
        sessionStorage.removeItem('registration_user');
      }
    }

    while (retryCount < maxRetries) {
      try {
        console.log(`🔄 Session check attempt ${retryCount + 1}/${maxRetries}`);

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

        if (!result.data) {
          throw new Error('No session data received');
        }

        const userType = result.data.user_type;
        console.log('👤 User type detected:', userType);

        // Redirect based on user type
        if (userType === 'client') {
          console.log('✅ Valid client session detected, staying on client dashboard');

          // Mark session as validated
          this.sessionValidated = true;
          this.sessionRetryCount = 0;

          // Update user interface with session data
          if (result.data.user) {
            const { name, email } = result.data.user;
            const clientNameEl = document.getElementById('clientName');
            const clientEmailEl = document.getElementById('clientEmail');

            if (clientNameEl) clientNameEl.textContent = name || "Client User";
            if (clientEmailEl) clientEmailEl.textContent = email || "No email available";

            // Update profile picture if available
            if (result.data.user.profile_picture) {
              const clientAvatar = document.getElementById('clientAvatar');
              if (clientAvatar) {
                const timestamp = Date.now();
                clientAvatar.src = '../' + result.data.user.profile_picture + '?t=' + timestamp;
              }
            }
          }

          // Load dashboard data after successful session check
          setTimeout(() => {
            this.loadDashboardData();
          }, 100);

          return true; // Session check successful
        } else if (userType === 'staff') {
          console.log('🔄 Redirecting staff user to staff dashboard');
          window.location.href = 'staff.html';
          return true;
        } else if (userType === 'admin') {
          console.log('🔄 Redirecting admin user to admin dashboard');
          window.location.href = 'admin.html';
          return true;
        } else {
          console.warn('⚠️ Unknown user type:', userType);
          throw new Error('Invalid user type');
        }

      } catch (error) {
        retryCount++;
        console.error(`❌ Session check attempt ${retryCount} failed:`, error.message);

        if (retryCount < maxRetries) {
          console.log(`⏳ Retrying in 1 second... (${retryCount}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          console.error('💥 Session check failed after all retries:', error.message);

          // Reset session validation flag
          this.sessionValidated = false;
          this.sessionRetryCount++;

          // Instead of immediately redirecting, show a more user-friendly error
          this.showSessionError();
          return false;
        }
      }
    }
  }

  // Show session error with recovery options
  showSessionError() {
    console.log('🔧 Showing session error with recovery options');

    // Show toast notification about session issue
    this.showToast('Session verification failed. Please refresh the page or login again.', 'error');

    // Create a session recovery modal
    const modal = document.createElement('div');
    modal.className = 'modal session-error-modal';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 500px; background: linear-gradient(135deg, #2E5BAA, #1E3F7A); border-radius: 16px;">
        <div class="modal-header" style="padding: 24px 24px 0 24px; border-bottom: 1px solid rgba(255,255,255,0.1);">
          <h3 style="color: #B3B8FF; margin: 0; font-size: 1.3rem; display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-exclamation-triangle" style="color: #ffd700;"></i>
            Session Error
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
            <ul style="color: rgba(255, 255, 255, 0.8); text-align: left; margin-bottom: 25px; padding-left: 20px;">
              <li>Network connection issues</li>
              <li>Session timeout</li>
              <li>Browser cache problems</li>
              <li>Server maintenance</li>
            </ul>
          </div>

          <div style="display: flex; gap: 12px; justify-content: center;">
            <button onclick="clientDashboard.retrySessionCheck()" class="btn-primary" style="background: linear-gradient(135deg, #28a745, #20c997); color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;">
              <i class="fas fa-redo"></i> Retry Session
            </button>
            <button onclick="window.location.reload()" class="btn-secondary" style="background: rgba(255, 255, 255, 0.1); color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.2); padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;">
              <i class="fas fa-refresh"></i> Refresh Page
            </button>
            <button onclick="clientDashboard.reauthenticateSession()" class="btn-secondary" style="background: rgba(255, 255, 255, 0.1); color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.2); padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;">
              <i class="fas fa-sign-in-alt"></i> Login Again
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.style.display = 'flex';
  }

  // Retry session check method
  async retrySessionCheck() {
    console.log('🔄 Retrying session check...');

    // Close the error modal
    const errorModal = document.querySelector('.modal');
    if (errorModal) {
      errorModal.remove();
    }

    // Show retry toast
    this.showToast('Retrying session validation...', 'info');

    try {
      // Retry session check
      const sessionValid = await this.checkSession();
      if (sessionValid) {
        this.showToast('Session validated successfully!', 'success');
      } else {
        this.showToast('Session validation still failed. Please refresh the page.', 'error');
      }
    } catch (error) {
      console.error('❌ Session retry failed:', error);
      this.showToast('Session retry failed. Please refresh the page.', 'error');
    }
  }

  // Handle graceful session expiration
  handleSessionExpired() {
    console.log('⏰ Handling session expiration...');

    // Reset session flags
    this.sessionValidated = false;

    // Show session expired modal with login option (stay on current page)
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
            <button onclick="clientDashboard.reauthenticateSession()" class="btn-primary" style="background: linear-gradient(135deg, #28a745, #20c997); color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;">
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

  // Re-authenticate session without redirecting
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

        // Resume any ongoing operations (like booking)
        if (this.pendingBookingData) {
          console.log('📋 Resuming pending booking...');
          this.showToast('Resuming your booking...', 'info');
          // Restore booking modal state if needed
          setTimeout(() => {
            this.resumePendingBooking();
          }, 1000);
        }
      } else {
        // If session check still fails, show modal and let user decide
        this.showToast('Please log in again', 'warning');
        // Modal is already shown by showSessionError(), no automatic redirect
      }
    } catch (error) {
      console.error('❌ Re-authentication failed:', error);
      this.showToast('Re-authentication failed. Please try again or login manually.', 'error');
      // Modal is already shown by showSessionError(), no automatic redirect
    }
  }

  // Resume pending booking after successful re-authentication
  resumePendingBooking() {
    if (this.pendingBookingData) {
      console.log('🔄 Resuming booking with data:', this.pendingBookingData);

      // Show booking modal
      this.showBookingModal();

      // Pre-fill the form with saved data
      setTimeout(() => {
        this.prefillBookingForm(this.pendingBookingData);
      }, 500);

      // Clear pending data
      this.pendingBookingData = null;
    }
  }

  // Pre-fill booking form with saved data
  prefillBookingForm(bookingData) {
    console.log('📝 Pre-filling booking form with data:', bookingData);

    const serviceSelect = document.getElementById('clientBookingService');
    const petSelect = document.getElementById('clientBookingPet');
    const dateInput = document.getElementById('clientBookingDate');
    const timeSelect = document.getElementById('clientBookingTime');
    const notesInput = document.getElementById('clientBookingNotes');

    // Pre-fill form fields
    if (serviceSelect && bookingData.service_id) {
      serviceSelect.value = bookingData.service_id;
    }

    if (petSelect && bookingData.pet_id) {
      petSelect.value = bookingData.pet_id;
    }

    if (dateInput && bookingData.appointment_date) {
      dateInput.value = bookingData.appointment_date;
    }

    if (timeSelect && bookingData.appointment_time) {
      timeSelect.value = bookingData.appointment_time;
    }

    if (notesInput && bookingData.notes) {
      notesInput.value = bookingData.notes;
    }

    // If date is set, load available time slots
    if (dateInput && bookingData.appointment_date) {
      setTimeout(() => {
        this.loadAvailableTimeSlots();
      }, 100);
    }

    this.showToast('Booking form restored. Please review and submit.', 'info');
  }

  // Save booking data before session expires
  savePendingBookingData(bookingData) {
    this.pendingBookingData = bookingData;
    console.log('💾 Saved pending booking data:', bookingData);
  }

  // Show session expiry warning
  showSessionExpiryWarning(minutesLeft = 5) {
    // Don't show warning if already shown or if modals are open
    if (document.querySelector('.session-warning') || document.querySelector('.modal')) {
      return;
    }

    console.log(`⚠️ Showing session expiry warning: ${minutesLeft} minutes left`);

    const warning = document.createElement('div');
    warning.className = 'session-warning';
    warning.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: linear-gradient(135deg, #ff9800, #f57c00);
      color: white;
      padding: 15px 20px;
      border-radius: 10px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
      z-index: 1001;
      max-width: 350px;
      animation: slideInRight 0.3s ease-out;
    `;

    warning.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
        <i class="fas fa-clock" style="font-size: 18px;"></i>
        <strong>Session Expiring Soon</strong>
      </div>
      <div style="font-size: 14px; margin-bottom: 15px;">
        Your session will expire in ${minutesLeft} minute(s). Please save your work.
      </div>
      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button onclick="this.parentElement.parentElement.remove()" style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); padding: 6px 12px; border-radius: 5px; font-size: 12px; cursor: pointer;">
          Dismiss
        </button>
        <button onclick="clientDashboard.extendSession(); this.parentElement.parentElement.remove()" style="background: #4caf50; color: white; border: none; padding: 6px 12px; border-radius: 5px; font-size: 12px; cursor: pointer;">
          Extend Session
        </button>
      </div>
    `;

    document.body.appendChild(warning);

    // Auto-remove after 30 seconds if not interacted with
    setTimeout(() => {
      if (document.body.contains(warning)) {
        warning.remove();
      }
    }, 30000);
  }

  // Extend session method
  async extendSession() {
    console.log('🔄 Attempting to extend session...');

    try {
      const response = await fetch('../api/vet_api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_user_info' })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log('✅ Session extended successfully');
          this.showToast('Session extended successfully!', 'success');

          // Update last activity timestamp
          this.lastActivity = Date.now();
          return;
        }
      }

      throw new Error('Failed to extend session');
    } catch (error) {
      console.error('❌ Failed to extend session:', error);
      this.showToast('Failed to extend session. Please login again.', 'error');
      this.handleSessionExpired();
    }
  }

  // Load dashboard data after successful session check
  async loadDashboardData() {
    try {
      console.log('📊 Loading dashboard data...');

      // Load pets count
      const petsResponse = await fetch('../api/vet_api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_pets' })
      });

      if (petsResponse.ok) {
        const petsResult = await petsResponse.json();
        if (petsResult.success && petsResult.data) {
          const petsCountEl = document.getElementById('clientPetsCount');
          if (petsCountEl) petsCountEl.textContent = petsResult.data.length;
        }
      }

      // Load appointments count
      const appointmentsResponse = await fetch('../api/vet_api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_appointments' })
      });

      if (appointmentsResponse.ok) {
        const appointmentsResult = await appointmentsResponse.json();
        if (appointmentsResult.success && appointmentsResult.data) {
          const appointments = appointmentsResult.data;
          const today = new Date().toISOString().split('T')[0];

          const upcomingCount = appointments.filter(apt =>
            apt.appointment_date >= today && apt.status !== 'cancelled'
          ).length;

          const completedCount = appointments.filter(apt =>
            apt.status === 'completed'
          ).length;

          const upcomingEl = document.getElementById('upcomingAppointmentsCount');
          const completedEl = document.getElementById('completedVisitsCount');

          if (upcomingEl) upcomingEl.textContent = upcomingCount;
          if (completedEl) completedEl.textContent = completedCount;
        }
      }

      console.log('✅ Dashboard data loaded successfully');
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
    }
  }

  // Mobile sidebar toggle
  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobileOverlay');
    const toggleBtn = document.getElementById('mobileMenuToggle');

    if (sidebar && overlay) {
      const isOpen = sidebar.classList.contains('mobile-open');

      if (isOpen) {
        sidebar.classList.remove('mobile-open');
        overlay.classList.remove('active');
        if (toggleBtn) {
          toggleBtn.innerHTML = '<i class="fas fa-bars"></i>';
          toggleBtn.setAttribute('aria-expanded', 'false');
        }
      } else {
        sidebar.classList.add('mobile-open');
        overlay.classList.add('active');
        if (toggleBtn) {
          toggleBtn.innerHTML = '<i class="fas fa-times"></i>';
          toggleBtn.setAttribute('aria-expanded', 'true');
        }
      }
    }
  }

  // Logout functionality
  async handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
      try {
        const response = await fetch('../api/vet_api.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'logout' })
        });

        const result = await response.json();

        if (result.success) {
          window.location.href = '../index.html';
        } else {
          alert('Logout failed. Redirecting anyway...');
          window.location.href = '../index.html';
        }
      } catch (error) {
        console.error('Logout error:', error);
        alert('Logout failed. Redirecting anyway...');
        window.location.href = '../index.html';
      }
    }
  }

  // Store functionality
  async loadStoreSection() {
    const productsGrid = document.getElementById('clientProductsGrid');
    if (!productsGrid) return;

    try {
      productsGrid.innerHTML = '<div class="loading"><div class="spinner"></div>Loading products...</div>';

      const response = await fetch('../api/vet_api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_products' })
      });

      const result = await response.json();

      if (result.success && result.data && Array.isArray(result.data)) {
        if (result.data.length === 0) {
          productsGrid.innerHTML = '<div class="loading"><p>No products available at the moment. Please check back later!</p></div>';
        } else {
          this.displayClientProducts(result.data);
        }
      } else {
        const errorMessage = result.message || 'Failed to load products';
        productsGrid.innerHTML = `<div class="loading"><p>Unable to load products: ${errorMessage}</p></div>`;
      }
    } catch (error) {
      console.error('Error loading products:', error);
      productsGrid.innerHTML = '<div class="loading"><p>Error loading products. Please try again later.</p></div>';
    }
  }

  displayClientProducts(products) {
    const productsGrid = document.getElementById('clientProductsGrid');
    if (!productsGrid) return;

    if (products.length === 0) {
      productsGrid.innerHTML = '<div class="loading"><p>No products available at the moment.</p></div>';
      return;
    }

    productsGrid.innerHTML = products.map(product => this.createClientProductCard(product)).join('');
  }

  createClientProductCard(product) {
    let imageHtml = '';
    let placeholderHtml = '<div class="product-image-placeholder"><i class="fas fa-image"></i></div>';

    if (product.image && product.image.trim() !== '' && product.image !== null && product.image !== 'null') {
      const correctPath = '../assets/images/products/' + product.image;
      imageHtml = `<img src="${correctPath}" alt="${product.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" loading="lazy">`;
    }

    const stockClass = product.stock === 0 ? 'stock-out' : product.stock < 10 ? 'stock-low' : 'stock-good';
    const stockText = product.stock === 0 ? 'Out of Stock' : product.stock < 10 ? 'Low Stock' : 'In Stock';

    const addToCartButton = product.stock === 0
      ? `<button class="action-btn add-to-cart" disabled title="Out of Stock">
          <i class="fas fa-shopping-cart"></i> Out of Stock
        </button>`
      : `<button class="action-btn add-to-cart" onclick="clientDashboard.addToCart(${product.id}, '${product.name}', ${product.price})" title="Add to Order">
          <i class="fas fa-shopping-cart"></i> Add to Order
        </button>`;

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
            ${addToCartButton}
            <button class="action-btn buy-now" onclick="clientDashboard.buyNow(${product.id}, '${product.name}', ${product.price})" title="Buy Now">
              <i class="fas fa-shopping-cart"></i> Buy Now
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // Cart functionality
  addToCart(productId, productName, price) {
    const existingItem = this.cart.find(item => item.id === productId);

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      this.cart.push({
        id: productId,
        name: productName,
        price: price,
        quantity: 1
      });
    }

    localStorage.setItem('clientCart', JSON.stringify(this.cart));
    this.updateCartCount();
    this.showToast(`${productName} added to order!`, 'success');
  }

  buyNow(productId, productName, price) {
    const existingItem = this.cart.find(item => item.id === productId);

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      this.cart.push({
        id: productId,
        name: productName,
        price: price,
        quantity: 1
      });
    }

    localStorage.setItem('clientCart', JSON.stringify(this.cart));
    this.updateCartCount();
    this.showToast(`${productName} added to order! Proceeding to checkout...`, 'success');

    setTimeout(() => {
      this.checkout();
    }, 1000);
  }

  updateCartCount() {
    const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCountElements = document.querySelectorAll('#cartCount, .cart-count');

    cartCountElements.forEach(element => {
      element.textContent = totalItems;
    });

    const cartIcon = document.getElementById('cartIcon');
    if (cartIcon) {
      cartIcon.style.display = totalItems > 0 ? 'block' : 'none';
    }
  }

  viewCart() {
    if (this.cart.length === 0) {
      this.showToast('Your cart is empty', 'info');
      return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 600px;">
        <div class="modal-header">
          <h3><i class="fas fa-shopping-cart"></i> Your Cart</h3>
          <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
        </div>
        <div class="modal-body">
          <div class="cart-items">
            ${this.cart.map(item => `
              <div class="cart-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #e1e5e9;">
                <div>
                  <h4 style="margin: 0; font-size: 16px;">${item.name}</h4>
                  <p style="margin: 4px 0; color: #666;">₱${item.price.toFixed(2)} each</p>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <button onclick="clientDashboard.updateCartItemQuantity(${item.id}, ${item.quantity - 1})" style="width: 24px; height: 24px; border: none; background: #f8f9fa; border-radius: 4px; cursor: pointer;">-</button>
                    <span style="min-width: 20px; text-align: center; font-weight: 500; color: #333; font-size: 16px;">${item.quantity}</span>
                    <button onclick="clientDashboard.updateCartItemQuantity(${item.id}, ${item.quantity + 1})" style="width: 24px; height: 24px; border: none; background: #f8f9fa; border-radius: 4px; cursor: pointer;">+</button>
                  </div>
                  <button onclick="clientDashboard.removeFromCart(${item.id})" style="background: #dc3545; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
          <div class="cart-total" style="margin-top: 20px; padding-top: 16px; border-top: 2px solid #e1e5e9; text-align: right;">
            <h3 style="margin: 0; font-size: 18px;">
              Total: ₱${this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}
            </h3>
          </div>
          <div class="cart-actions" style="margin-top: 20px; display: flex; gap: 12px; justify-content: flex-end;">
            <button onclick="this.closest('.modal').remove()" class="btn-secondary">Continue Shopping</button>
            <button onclick="clientDashboard.checkout()" class="btn-primary">
              <i class="fas fa-shopping-bag"></i> Buy Now
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.style.display = 'block';
  }

  updateCartItemQuantity(productId, newQuantity) {
    if (newQuantity <= 0) {
      this.removeFromCart(productId);
      return;
    }

    const item = this.cart.find(item => item.id === productId);
    if (item) {
      item.quantity = newQuantity;
      localStorage.setItem('clientCart', JSON.stringify(this.cart));
      this.updateCartCount();
      this.viewCart();
    }
  }

  removeFromCart(productId) {
    this.cart = this.cart.filter(item => item.id !== productId);
    localStorage.setItem('clientCart', JSON.stringify(this.cart));
    this.updateCartCount();
    this.viewCart();
  }

  checkout() {
    if (this.cart.length === 0) {
      this.showToast('Your cart is empty', 'error');
      return;
    }

    const total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const orderData = {
      items: this.cart,
      total: total
    };

    this.showPaymentModalForCart(orderData);

    const cartModal = document.querySelector('.modal');
    if (cartModal) {
      cartModal.remove();
    }
  }

  showPaymentModalForCart(orderData) {
    this.showToast('Payment system is loading. Please try again in a moment.', 'info');
  }

  // Toast notifications
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

  // Profile management
  setupProfileForm() {
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
      profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.updateProfile(new FormData(profileForm));
      });
    }
  }

  async updateProfile(formData) {
    if (!this.validateProfileForm(formData)) {
      return;
    }

    try {
      const response = await fetch('../api/vet_api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_profile',
          first_name: formData.get('first_name'),
          last_name: formData.get('last_name'),
          email: formData.get('email'),
          phone: formData.get('phone')
        })
      });

      const result = await response.json();

      if (result.success) {
        this.showToast('Profile updated successfully!', 'success');
        await this.loadClientSettingsData();
      } else {
        this.showToast(result.message || 'Failed to update profile', 'error');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      this.showToast('Failed to update profile. Please try again.', 'error');
    }
  }

  validateProfileForm(formData) {
    const firstName = formData.get('first_name');
    const lastName = formData.get('last_name');
    const email = formData.get('email');

    if (!firstName || firstName.trim().length < 2) {
      this.showToast('First name must be at least 2 characters', 'error');
      return false;
    }

    if (!lastName || lastName.trim().length < 2) {
      this.showToast('Last name must be at least 2 characters', 'error');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      this.showToast('Please enter a valid email address', 'error');
      return false;
    }

    return true;
  }

  setupProfilePictureForm() {
    const pictureForm = document.getElementById('pictureForm');
    const fileInput = document.getElementById('profilePictureInput');

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          if (!file.type.startsWith('image/')) {
            this.showToast('Please select a valid image file', 'error');
            return;
          }

          if (file.size > 5 * 1024 * 1024) {
            this.showToast('Image size must be less than 5MB', 'error');
            return;
          }

          this.previewAndUploadProfilePicture(file);
        }
      });
    }

    if (pictureForm) {
      pictureForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.uploadProfilePicture();
      });
    }
  }

  async previewAndUploadProfilePicture(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Data = e.target.result;

      try {
        const response = await fetch('../api/vet_api.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'upload_profile_picture',
            image_data: base64Data,
            image_name: file.name
          })
        });

        const result = await response.json();

        if (result.success) {
          this.showToast('Profile picture updated successfully!', 'success');
          this.updateProfilePictureDisplay(result.image_path);
        } else {
          this.showToast(result.message || 'Failed to upload profile picture', 'error');
        }
      } catch (error) {
        console.error('Error uploading profile picture:', error);
        this.showToast('Error uploading profile picture', 'error');
      }
    };

    reader.onerror = () => {
      this.showToast('Error reading file', 'error');
    };

    reader.readAsDataURL(file);
  }

  updateProfilePictureDisplay(imagePath) {
    const currentProfilePicture = document.getElementById('currentProfilePicture');
    const clientAvatar = document.getElementById('clientAvatar');

    if (currentProfilePicture) {
      currentProfilePicture.src = '../' + imagePath + '?t=' + Date.now();
    }

    if (clientAvatar) {
      const timestamp = Date.now() + Math.random();
      clientAvatar.src = '../' + imagePath + '?t=' + timestamp;
    }
  }

  async loadClientSettingsData() {
    try {
      const response = await fetch('../api/vet_api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_user_info' })
      });

      const result = await response.json();

      if (result.success && result.data && result.data.user) {
        const user = result.data.user;

        const firstNameInput = document.getElementById('firstName');
        const lastNameInput = document.getElementById('lastName');
        const emailInput = document.getElementById('email');
        const phoneInput = document.getElementById('phone');

        if (firstNameInput) firstNameInput.value = user.first_name || '';
        if (lastNameInput) lastNameInput.value = user.last_name || '';
        if (emailInput) emailInput.value = user.email || '';
        if (phoneInput) phoneInput.value = user.phone || '';

        if (user.profile_picture) {
          this.updateProfilePictureDisplay(user.profile_picture);
        }
      }
    } catch (error) {
      console.error('Failed to load client settings data:', error);
    }
  }

  // Placeholder methods for other sections
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
        appointmentsTableBody.innerHTML = result.data.map(appointment => {
          const appointmentDate = new Date(appointment.appointment_date);
          const today = new Date();
          const isPast = appointmentDate < today;
          const canModify = !isPast && appointment.status !== 'cancelled' && appointment.status !== 'completed';

          return `
            <tr>
              <td>${appointment.appointment_date}</td>
              <td>${appointment.appointment_time}</td>
              <td>${appointment.pet_name} (${appointment.species})</td>
              <td>${appointment.service_name}</td>
              <td>
                <span class="status-badge status-${appointment.status}">
                  ${appointment.status}
                </span>
              </td>
              <td>
                ${canModify ?
                  `<div class="appointment-actions">
                    <button class="btn-primary btn-small" onclick="clientDashboard.editAppointment(${appointment.id})" title="Edit Appointment">
                      <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn-secondary btn-small" onclick="clientDashboard.requestCancellation(${appointment.id})" title="Request Cancellation">
                      <i class="fas fa-times"></i> Request Cancellation
                    </button>
                  </div>` :
                  `${appointment.status === 'cancelled' ?
                    `<span class="status-locked" title="Appointment is cancelled and locked">
                      <i class="fas fa-lock"></i> LOCKED
                    </span>` :
                    `<span class="status-text">Cannot modify</span>`
                  }`
                }
              </td>
            </tr>
          `;
        }).join('');
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
      const appointmentsTableBody = document.getElementById('appointmentsTableBody');
      appointmentsTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-state-table">
            <div class="empty-state">
              <i class="fas fa-exclamation-triangle"></i>
              <h3>Error Loading Appointments</h3>
              <p>Failed to load appointments. Please try again.</p>
            </div>
          </td>
        </tr>
      `;
    }
  }

  async loadPetsSection() {
    // Implementation for pets
  }

  async initializeReportsSection() {
    try {
      console.log('📋 Initializing client reports section...');

      // Load user's pets for report selection
      await this.loadClientPetsForReports();

      // Setup event listeners for buttons
      this.setupReportEventListeners();

      // Check if pets are available and show appropriate message
      setTimeout(() => {
        const petSelect = document.getElementById('petSelect');
        if (petSelect) {
          if (petSelect.options.length <= 1) {
            console.log('⚠️ No pets loaded for reports');
            this.showToast('No pets found. Add a pet first to view medical reports.', 'info');
            this.displayEmptyReport();
          } else {
            console.log('✅ Pets loaded for reports, ready for selection');
            this.showToast('Select a pet to view their medical report', 'info');
          }
        }
      }, 1000);

      console.log('✅ Client reports section initialized');
    } catch (error) {
      console.error('❌ Error initializing reports section:', error);
      this.showToast('Error loading reports section', 'error');
      this.displayEmptyReport();
    }
  }

  setupReportEventListeners() {
    // Load pets button
    const loadPetsBtn = document.getElementById('loadPetsBtn');
    if (loadPetsBtn) {
      loadPetsBtn.addEventListener('click', () => {
        this.loadClientPetsForReports();
      });
    }

    // Generate report button
    const generateReportBtn = document.getElementById('generateReportBtn');
    if (generateReportBtn) {
      generateReportBtn.addEventListener('click', () => {
        const petSelect = document.getElementById('petSelect');
        if (!petSelect) {
          this.showToast('Pet selection not available', 'error');
          return;
        }

        const selectedPetId = petSelect.value;
        if (!selectedPetId) {
          this.showToast('Please select a pet first', 'warning');
          return;
        }

        this.generatePetReport(selectedPetId);
      });
    }

    // Test button for debugging
    const testBtn = document.querySelector('button[onclick="testMedicalReportDisplay()"]');
    if (testBtn) {
      testBtn.addEventListener('click', () => {
        this.showToast('Loading sample medical report for testing...', 'info');
        this.displaySampleReport();
      });
    }
  }

  displaySampleReport() {
    const sampleData = {
      pet: {
        name: 'Bogart',
        species: 'Dog',
        breed: 'Puspin',
        gender: 'Male',
        weight: '25',
        color: 'Blue'
      },
      owner: {
        name: 'John Cedrick Unida',
        email: 'unida99@gmail.com',
        phone: '09286077247',
        address: 'Not provided'
      },
      medical_history: [
        {
          created_at: '2025-10-15 09:00:00',
          staff_name: 'Dr. Smith',
          service_name: 'Vaccination',
          diagnosis: 'Routine health check',
          treatment: 'Annual vaccination administered',
          medications: 'DHPP vaccine, Rabies vaccine',
          notes: 'Patient was healthy and cooperative'
        }
      ],
      statistics: {
        total_appointments: 1,
        total_vaccinations: 1,
        total_medical_records: 1,
        last_visit: '2025-10-15'
      }
    };

    this.currentReportData = sampleData;
    this.displayPetReport(sampleData);
    this.showToast('Sample medical report displayed for testing', 'success');
  }

  async autoLoadFirstPetReport() {
    try {
      console.log('🔄 Auto-loading first pet report...');

      // Get the first available pet
      const response = await fetch('../api/vet_api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_pets' })
      });

      const result = await response.json();

      if (result.success && result.data && result.data.length > 0) {
        const firstPet = result.data[0];
        console.log('📋 Auto-loading report for first pet:', firstPet.name);

        // Automatically select the first pet and generate report
        const petSelect = document.getElementById('reportPetSelect');
        if (petSelect) {
          petSelect.value = firstPet.id;

          // Trigger the report generation
          setTimeout(() => {
            this.generateClientReport(firstPet.id, 'medical');
          }, 200);
        }
      } else {
        console.log('⚠️ No pets found for auto-loading report');
        this.showToast('No pets found. Add a pet to view medical reports.', 'info');
      }
    } catch (error) {
      console.error('Error auto-loading first pet report:', error);
    }
  }

  async loadClientPetsForReports() {
    try {
      console.log('🔄 Loading pets for reports dropdown...');
      const response = await fetch('../api/pet_reports_api.php?action=get_pet_list&limit=100');

      const result = await response.json();
      const petSelect = document.getElementById('petSelect');

      console.log('📡 Pet reports API response:', result);

      if (result.success && result.data && result.data.length > 0) {
        console.log('✅ Pets loaded for reports:', result.data.length, 'pets');
        petSelect.innerHTML = '<option value="">Select a pet to view reports...</option>';
        result.data.forEach(pet => {
          const option = document.createElement('option');
          option.value = pet.id;
          option.textContent = `${pet.name} (${pet.species})`;
          petSelect.appendChild(option);
        });

        // Add event listener for pet selection
        petSelect.addEventListener('change', () => {
          const selectedPetId = petSelect.value;
          if (selectedPetId) {
            this.generatePetReport(selectedPetId);
          }
        });

        this.showToast(`Loaded ${result.data.length} pets for reports`, 'success');
      } else {
        console.log('⚠️ No pets found for reports');
        petSelect.innerHTML = '<option value="">No pets registered for reports</option>';
        this.showToast('No pets found. Add a pet first to view medical reports.', 'info');
      }
    } catch (error) {
      console.error('❌ Error loading pets for reports:', error);
      const petSelect = document.getElementById('petSelect');
      if (petSelect) {
        petSelect.innerHTML = '<option value="">Error loading pets</option>';
      }
      this.showToast('Error loading pets for reports', 'error');
    }
  }

  setupReportTypeSelection() {
    const generateReportBtn = document.getElementById('generateReportBtn');

    if (generateReportBtn) {
      generateReportBtn.addEventListener('click', () => {
        const petSelect = document.getElementById('reportPetSelect');
        if (!petSelect) {
          console.error('Report pet select element not found');
          this.showToast('Report form not properly loaded. Please refresh the page.', 'error');
          return;
        }

        const selectedPetId = petSelect.value;

        if (!selectedPetId) {
          this.showToast('Please select a pet first', 'warning');
          return;
        }

        this.generateClientReport(selectedPetId, 'medical');
      });
    } else {
      console.warn('Generate report button not found');
    }
  }

  async loadPetReports(petId) {
    try {
      console.log('🔄 loadPetReports called with petId:', petId);
      this.showToast('Loading pet medical history...', 'info');

      const response = await fetch(`../api/pet_reports_api.php?action=get_pet_report&pet_id=${petId}`);
      const result = await response.json();

      console.log('📡 Pet reports API response:', result);

      if (result.success && result.data) {
        console.log('✅ Pet reports data received, displaying...');
        this.displayClientPetReport(result.data);
      } else {
        console.log('⚠️ No medical records found for this pet');
        this.showToast('No medical records found for this pet', 'info');
        this.displayEmptyReport();
      }
    } catch (error) {
      console.error('❌ Error loading pet reports:', error);
      this.showToast('Error loading medical records', 'error');
      this.displayEmptyReport();
    }
  }

  displayClientPetReport(data) {
    const reportContent = document.getElementById('reportPreview');

    if (!reportContent) return;

    // Generate the medical history HTML for client view
    reportContent.innerHTML = this.generateClientMedicalHistoryHTML(data);

    // Show stats section
    const reportStats = document.getElementById('reportStats');
    if (reportStats) {
      reportStats.style.display = 'block';

      // Update stats
      const totalVisitsEl = document.getElementById('totalVisits');
      const totalVaccinationsEl = document.getElementById('totalVaccinations');
      const lastVisitEl = document.getElementById('lastVisit');

      if (totalVisitsEl) totalVisitsEl.textContent = data.medical_history?.length || 0;
      if (totalVaccinationsEl) totalVaccinationsEl.textContent = this.getClientVaccinationCount(data.medical_history || []);
      if (lastVisitEl) {
        const lastVisit = data.medical_history && data.medical_history.length > 0
          ? new Date(Math.max(...data.medical_history.map(record => new Date(record.created_at)))).toLocaleDateString()
          : 'Never';
        lastVisitEl.textContent = lastVisit;
      }
    }
    
    // Debug function to test medical report data
    async function debugMedicalReport(petId) {
      console.log('=== DEBUGGING MEDICAL REPORT FOR PET ID:', petId, '===');
    
      try {
        const response = await fetch(`../api/pet_reports_api.php?action=get_pet_report&pet_id=${petId}`);
        const result = await response.json();
    
        console.log('API Response Status:', response.status);
        console.log('API Response Data:', result);
    
        if (result.success && result.data) {
          console.log('✅ Report data received successfully');
          console.log('Data structure:', {
            hasPet: !!result.data.pet,
            hasOwner: !!result.data.owner,
            hasMedicalHistory: !!result.data.medical_history,
            medicalHistoryLength: result.data.medical_history?.length || 0,
            hasStatistics: !!result.data.statistics,
            allKeys: Object.keys(result.data)
          });
    
          if (result.data.medical_history) {
            console.log('Medical history sample:', result.data.medical_history[0]);
          }
    
          // Try to display the report
          if (window.clientDashboard) {
            window.clientDashboard.currentReportData = result.data;
            window.clientDashboard.displayClientPetReport(result.data);
          }
        } else {
          console.error('❌ API call failed:', result.message);
        }
      } catch (error) {
        console.error('❌ Debug error:', error);
      }
    
      console.log('=== DEBUG COMPLETE ===');
    }
    
    // Add to window for console access
    window.debugMedicalReport = debugMedicalReport;

    // Define testMedicalReportDisplay function globally
    window.testMedicalReportDisplay = function() {
      console.log('=== TESTING MEDICAL REPORT DISPLAY ===');

      // Test data
      const testData = {
        pet: {
          name: 'Bogart',
          species: 'Dog',
          breed: 'Puspin',
          gender: 'Male',
          weight: '25',
          color: 'Blue'
        },
        owner: {
          name: 'John Cedrick Unida',
          email: 'unida99@gmail.com',
          phone: '09286077247',
          address: 'Not provided'
        },
        medical_history: [
          {
            created_at: '2025-10-15 09:00:00',
            staff_name: 'Dr. Smith',
            service_name: 'Vaccination',
            diagnosis: 'Routine health check',
            treatment: 'Annual vaccination administered',
            medications: 'DHPP vaccine, Rabies vaccine',
            notes: 'Patient was healthy and cooperative'
          }
        ],
        statistics: {
          total_appointments: 1,
          total_vaccinations: 1,
          total_medical_records: 1,
          last_visit: '2025-10-15'
        }
      };

      // Find the report preview element
      const reportPreview = document.getElementById('reportPreview');
      if (reportPreview) {
        console.log('✅ Found report preview element');

        // Generate HTML content
        let html = `
          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 15px 0; color: #333; display: flex; align-items: center; gap: 8px;">
              <i class="fas fa-paw" style="color: #667eea;"></i> Pet Information
            </h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div><strong>Name:</strong> ${testData.pet.name}</div>
              <div><strong>Species:</strong> ${testData.pet.species}</div>
              <div><strong>Breed:</strong> ${testData.pet.breed}</div>
              <div><strong>Gender:</strong> ${testData.pet.gender}</div>
            </div>
          </div>

          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 15px 0; color: #333; display: flex; align-items: center; gap: 8px;">
              <i class="fas fa-stethoscope" style="color: #667eea;"></i> Medical Records
            </h3>
            <div style="margin-bottom: 15px; text-align: center;">
              <span style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 6px 12px; border-radius: 15px; font-size: 12px; font-weight: 600;">
                Total Records: ${testData.medical_history.length}
              </span>
            </div>
        `;

        testData.medical_history.forEach((record, index) => {
          html += `
            <div style="margin: 15px 0; padding: 15px; border: 2px solid #667eea; border-radius: 10px; background: linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%);">
              <div style="margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #e1e5e9;">
                <h5 style="margin: 0 0 5px 0; color: #667eea; font-size: 14px;">
                  Visit #${index + 1} - ${new Date(record.created_at).toLocaleDateString()}
                </h5>
                <div style="font-size: 12px; color: #666;">
                  <strong>Staff:</strong> ${record.staff_name} | <strong>Service:</strong> ${record.service_name}
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr; gap: 8px;">
                <div style="background: #ffffff; padding: 8px; border-radius: 6px; border-left: 3px solid #667eea;">
                  <div style="font-weight: bold; color: #333; margin-bottom: 4px; font-size: 12px;">Diagnosis</div>
                  <div style="color: #555; font-size: 12px;">${record.diagnosis}</div>
                </div>

                <div style="background: #ffffff; padding: 8px; border-radius: 6px; border-left: 3px solid #28a745;">
                  <div style="font-weight: bold; color: #333; margin-bottom: 4px; font-size: 12px;">Treatment</div>
                  <div style="color: #555; font-size: 12px;">${record.treatment}</div>
                </div>

                <div style="background: #ffffff; padding: 8px; border-radius: 6px; border-left: 3px solid #ffc107;">
                  <div style="font-weight: bold; color: #333; margin-bottom: 4px; font-size: 12px;">Medications</div>
                  <div style="color: #555; font-size: 12px;">${record.medications}</div>
                </div>
              </div>
            </div>
          `;
        });

        html += `</div>`;

        // Display the HTML
        reportPreview.innerHTML = html;
        console.log('✅ Medical report displayed with test data');

        return '✅ Medical report test completed successfully';
      } else {
        console.error('❌ Report preview element not found');
        return '❌ Report preview element not found';
      }
    };
    
    // Simple test function to verify medical report display
    window.testMedicalReportDisplay = function() {
      console.log('=== TESTING MEDICAL REPORT DISPLAY ===');
    
      // Test data
      const testData = {
        pet: {
          name: 'Bogart',
          species: 'Dog',
          breed: 'Puspin',
          gender: 'Male',
          weight: '25',
          color: 'Blue'
        },
        owner: {
          name: 'John Cedrick Unida',
          email: 'unida99@gmail.com',
          phone: '09286077247',
          address: 'Not provided'
        },
        medical_history: [
          {
            created_at: '2025-10-15 09:00:00',
            staff_name: 'Dr. Smith',
            service_name: 'Vaccination',
            diagnosis: 'Routine health check',
            treatment: 'Annual vaccination administered',
            medications: 'DHPP vaccine, Rabies vaccine',
            notes: 'Patient was healthy and cooperative'
          }
        ],
        statistics: {
          total_appointments: 1,
          total_vaccinations: 1,
          total_medical_records: 1,
          last_visit: '2025-10-15'
        }
      };
    
      // Find the report preview element
      const reportPreview = document.getElementById('reportPreview');
      if (reportPreview) {
        console.log('✅ Found report preview element');
    
        // Generate HTML content
        let html = `
          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 15px 0; color: #333; display: flex; align-items: center; gap: 8px;">
              <i class="fas fa-paw" style="color: #667eea;"></i> Pet Information
            </h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div><strong>Name:</strong> ${testData.pet.name}</div>
              <div><strong>Species:</strong> ${testData.pet.species}</div>
              <div><strong>Breed:</strong> ${testData.pet.breed}</div>
              <div><strong>Gender:</strong> ${testData.pet.gender}</div>
            </div>
          </div>
    
          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 15px 0; color: #333; display: flex; align-items: center; gap: 8px;">
              <i class="fas fa-stethoscope" style="color: #667eea;"></i> Medical Records
            </h3>
            <div style="margin-bottom: 15px; text-align: center;">
              <span style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 6px 12px; border-radius: 15px; font-size: 12px; font-weight: 600;">
                Total Records: ${testData.medical_history.length}
              </span>
            </div>
        `;
    
        testData.medical_history.forEach((record, index) => {
          html += `
            <div style="margin: 15px 0; padding: 15px; border: 2px solid #667eea; border-radius: 10px; background: linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%);">
              <div style="margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #e1e5e9;">
                <h5 style="margin: 0 0 5px 0; color: #667eea; font-size: 14px;">
                  Visit #${index + 1} - ${new Date(record.created_at).toLocaleDateString()}
                </h5>
                <div style="font-size: 12px; color: #666;">
                  <strong>Staff:</strong> ${record.staff_name} | <strong>Service:</strong> ${record.service_name}
                </div>
              </div>
    
              <div style="display: grid; grid-template-columns: 1fr; gap: 8px;">
                <div style="background: #ffffff; padding: 8px; border-radius: 6px; border-left: 3px solid #667eea;">
                  <div style="font-weight: bold; color: #333; margin-bottom: 4px; font-size: 12px;">Diagnosis</div>
                  <div style="color: #555; font-size: 12px;">${record.diagnosis}</div>
                </div>
    
                <div style="background: #ffffff; padding: 8px; border-radius: 6px; border-left: 3px solid #28a745;">
                  <div style="font-weight: bold; color: #333; margin-bottom: 4px; font-size: 12px;">Treatment</div>
                  <div style="color: #555; font-size: 12px;">${record.treatment}</div>
                </div>
    
                <div style="background: #ffffff; padding: 8px; border-radius: 6px; border-left: 3px solid #ffc107;">
                  <div style="font-weight: bold; color: #333; margin-bottom: 4px; font-size: 12px;">Medications</div>
                  <div style="color: #555; font-size: 12px;">${record.medications}</div>
                </div>
              </div>
            </div>
          `;
        });
    
        html += `</div>`;
    
        // Display the HTML
        reportPreview.innerHTML = html;
        console.log('✅ Medical report displayed with test data');
    
        return '✅ Medical report test completed successfully';
      } else {
        console.error('❌ Report preview element not found');
        return '❌ Report preview element not found';
      }
    };
    
    // Direct test function to force display medical report
    window.forceShowMedicalReport = function(petId = 1) {
      console.log('=== FORCE SHOWING MEDICAL REPORT FOR PET ID:', petId, '===');
    
      // Simulate API response with sample medical data
      const sampleData = {
        pet: {
          id: petId,
          name: 'Bogart',
          species: 'Dog',
          breed: 'Puspin',
          gender: 'Male',
          weight: '25',
          color: 'Blue',
          age: '3 years old'
        },
        owner: {
          name: 'John Cedrick Unida',
          email: 'unida99@gmail.com',
          phone: '09286077247',
          address: 'Not provided'
        },
        medical_history: [
          {
            id: 1,
            appointment_date: '2025-10-15',
            appointment_time: '09:00',
            created_at: '2025-10-15 09:00:00',
            staff_name: 'Dr. Smith',
            service_name: 'Vaccination',
            diagnosis: 'Routine vaccination check',
            treatment: 'Administered annual vaccinations including rabies and DHPP',
            medications: 'Rabies vaccine, DHPP vaccine',
            notes: 'Patient was cooperative and healthy. No adverse reactions observed.',
            follow_up_date: '2026-10-15',
            instructions: 'Continue regular exercise and balanced diet. Return next year for booster shots.'
          }
        ],
        statistics: {
          total_appointments: 1,
          total_vaccinations: 1,
          total_medical_records: 1,
          last_visit: '2025-10-15'
        }
      };
    
      console.log('Sample medical data:', sampleData);
    
      // Force display the report
      const reportPreview = document.getElementById('reportPreview');
      if (reportPreview) {
        console.log('✅ Found report preview element, displaying medical data...');
    
        // Generate the medical history HTML
        let html = '';
    
        // Pet info section
        html += `
          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 15px 0; color: #333; display: flex; align-items: center; gap: 8px;">
              <i class="fas fa-paw" style="color: #667eea;"></i> Pet Information
            </h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div><strong>Name:</strong> ${sampleData.pet.name}</div>
              <div><strong>Species:</strong> ${sampleData.pet.species}</div>
              <div><strong>Breed:</strong> ${sampleData.pet.breed}</div>
              <div><strong>Gender:</strong> ${sampleData.pet.gender}</div>
              <div><strong>Weight:</strong> ${sampleData.pet.weight} kg</div>
              <div><strong>Color:</strong> ${sampleData.pet.color}</div>
            </div>
          </div>
        `;
    
        // Medical records section
        if (sampleData.medical_history && sampleData.medical_history.length > 0) {
          html += `
            <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
              <h3 style="margin: 0 0 15px 0; color: #333; display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-stethoscope" style="color: #667eea;"></i> Medical Records
              </h3>
              <div style="margin-bottom: 15px; text-align: center;">
                <span style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 6px 12px; border-radius: 15px; font-size: 12px; font-weight: 600;">
                  Total Records: ${sampleData.medical_history.length}
                </span>
              </div>
          `;
    
          sampleData.medical_history.forEach((record, index) => {
            html += `
              <div style="margin: 15px 0; padding: 15px; border: 2px solid #667eea; border-radius: 10px; background: linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%);">
                <div style="margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #e1e5e9;">
                  <h5 style="margin: 0 0 5px 0; color: #667eea; font-size: 14px;">
                    Visit #${index + 1} - ${new Date(record.appointment_date).toLocaleDateString()}
                  </h5>
                  <div style="font-size: 12px; color: #666;">
                    <strong>Staff:</strong> ${record.staff_name} | <strong>Service:</strong> ${record.service_name}
                  </div>
                </div>
    
                <div style="display: grid; grid-template-columns: 1fr; gap: 8px;">
                  <div style="background: #ffffff; padding: 8px; border-radius: 6px; border-left: 3px solid #667eea;">
                    <div style="font-weight: bold; color: #333; margin-bottom: 4px; font-size: 12px;">Diagnosis</div>
                    <div style="color: #555; font-size: 12px;">${record.diagnosis}</div>
                  </div>
    
                  <div style="background: #ffffff; padding: 8px; border-radius: 6px; border-left: 3px solid #28a745;">
                    <div style="font-weight: bold; color: #333; margin-bottom: 4px; font-size: 12px;">Treatment</div>
                    <div style="color: #555; font-size: 12px;">${record.treatment}</div>
                  </div>
    
                  <div style="background: #ffffff; padding: 8px; border-radius: 6px; border-left: 3px solid #ffc107;">
                    <div style="font-weight: bold; color: #333; margin-bottom: 4px; font-size: 12px;">Medications</div>
                    <div style="color: #555; font-size: 12px;">${record.medications}</div>
                  </div>
    
                  <div style="background: #fff3cd; padding: 8px; border-radius: 6px; border-left: 3px solid #ffc107;">
                    <div style="font-weight: bold; color: #856404; margin-bottom: 4px; font-size: 12px;">Notes</div>
                    <div style="color: #856404; font-size: 12px;">${record.notes}</div>
                  </div>
                </div>
              </div>
            `;
          });
    
          html += `</div>`;
        } else {
          html += `
            <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
              <h3 style="margin: 0 0 15px 0; color: #333; display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-info-circle" style="color: #667eea;"></i> Medical History
              </h3>
              <div style="text-align: center; padding: 30px; background: rgba(102, 126, 234, 0.05); border-radius: 10px; border: 2px dashed rgba(102, 126, 234, 0.3);">
                <i class="fas fa-calendar-times" style="font-size: 36px; color: rgba(102, 126, 234, 0.3); margin-bottom: 10px;"></i>
                <h4 style="margin: 0 0 8px 0; color: #667eea;">Not Appointed Yet</h4>
                <p style="margin: 0; color: #666; font-size: 14px;">This pet hasn't had any appointments yet.</p>
              </div>
            </div>
          `;
        }
    
        reportPreview.innerHTML = html;
        console.log('✅ Medical report displayed with sample data');
    
        // Show stats section
        const reportStats = document.getElementById('reportStats');
        if (reportStats) {
          reportStats.style.display = 'block';
    
          // Update stats
          const totalVisitsEl = document.getElementById('totalVisits');
          const totalVaccinationsEl = document.getElementById('totalVaccinations');
          const lastVisitEl = document.getElementById('lastVisit');
    
          if (totalVisitsEl) totalVisitsEl.textContent = sampleData.statistics.total_appointments;
          if (totalVaccinationsEl) totalVaccinationsEl.textContent = sampleData.statistics.total_vaccinations;
          if (lastVisitEl) lastVisitEl.textContent = new Date(sampleData.statistics.last_visit).toLocaleDateString();
        }
    
        return '✅ Medical report displayed successfully with sample data';
      } else {
        console.error('❌ Report preview element not found');
        return '❌ Report preview element not found';
      }
    };
    
    // Simple test function to manually display medical report
    window.showMedicalReport = function(petId) {
      console.log('=== MANUAL MEDICAL REPORT TEST ===');
    
      fetch(`../api/pet_reports_api.php?action=get_pet_report&pet_id=${petId || 1}`)
        .then(response => response.json())
        .then(result => {
          console.log('API Response:', result);
    
          if (result.success && result.data) {
            const data = result.data;
            console.log('Data structure check:', {
              hasMedicalHistory: !!data.medical_history,
              medicalHistoryLength: data.medical_history?.length || 0,
              hasAppointments: !!data.appointments,
              appointmentsLength: data.appointments?.length || 0,
              appointmentsWithMedicalData: data.appointments?.filter(apt =>
                apt.diagnosis || apt.treatment || apt.medications || apt.notes
              ).length || 0
            });
    
            // Force display the medical records
            const reportPreview = document.getElementById('reportPreview');
            if (reportPreview) {
              let html = '';
    
              // Pet info section
              html += `
                <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                  <h3 style="margin: 0 0 15px 0; color: #333; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-paw" style="color: #667eea;"></i> Pet Information
                  </h3>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div><strong>Name:</strong> ${data.pet.name}</div>
                    <div><strong>Species:</strong> ${data.pet.species}</div>
                    <div><strong>Breed:</strong> ${data.pet.breed || 'Not specified'}</div>
                    <div><strong>Gender:</strong> ${data.pet.gender || 'Not specified'}</div>
                  </div>
                </div>
              `;
    
              // Medical records section
              const medicalHistory = data.medical_history || [];
              const appointments = data.appointments || [];
              const recordsWithMedicalData = appointments.filter(apt =>
                apt.diagnosis || apt.treatment || apt.medications || apt.notes
              );
    
              console.log('Records to display:', {
                medicalHistory: medicalHistory.length,
                recordsWithMedicalData: recordsWithMedicalData.length
              });
    
              if (medicalHistory.length > 0 || recordsWithMedicalData.length > 0) {
                const recordsToShow = medicalHistory.length > 0 ? medicalHistory : recordsWithMedicalData;
    
                html += `
                  <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                    <h3 style="margin: 0 0 15px 0; color: #333; display: flex; align-items: center; gap: 8px;">
                      <i class="fas fa-stethoscope" style="color: #667eea;"></i> Medical Records
                    </h3>
                    <div style="margin-bottom: 15px; text-align: center;">
                      <span style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 6px 12px; border-radius: 15px; font-size: 12px; font-weight: 600;">
                        Total Records: ${recordsToShow.length}
                      </span>
                    </div>
                `;
    
                recordsToShow.forEach((record, index) => {
                  html += `
                    <div style="margin: 15px 0; padding: 15px; border: 2px solid #667eea; border-radius: 10px; background: linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%);">
                      <div style="margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #e1e5e9;">
                        <h5 style="margin: 0 0 5px 0; color: #667eea; font-size: 14px;">
                          Visit #${index + 1} - ${record.appointment_date ? new Date(record.appointment_date).toLocaleDateString() : (record.created_at ? new Date(record.created_at).toLocaleDateString() : 'Date not recorded')}
                        </h5>
                        <div style="font-size: 12px; color: #666;">
                          <strong>Staff:</strong> ${record.staff_name || record.staff_first_name + ' ' + record.staff_last_name || 'Not recorded'}
                        </div>
                      </div>
    
                      <div style="display: grid; grid-template-columns: 1fr; gap: 8px;">
                        <div style="background: #ffffff; padding: 8px; border-radius: 6px; border-left: 3px solid #667eea;">
                          <div style="font-weight: bold; color: #333; margin-bottom: 4px; font-size: 12px;">Diagnosis</div>
                          <div style="color: #555; font-size: 12px;">${record.diagnosis || record.condition || 'Not specified'}</div>
                        </div>
    
                        <div style="background: #ffffff; padding: 8px; border-radius: 6px; border-left: 3px solid #28a745;">
                          <div style="font-weight: bold; color: #333; margin-bottom: 4px; font-size: 12px;">Treatment</div>
                          <div style="color: #555; font-size: 12px;">${record.treatment || record.procedure || 'Not specified'}</div>
                        </div>
    
                        ${record.medications || record.prescription ? `
                        <div style="background: #ffffff; padding: 8px; border-radius: 6px; border-left: 3px solid #ffc107;">
                          <div style="font-weight: bold; color: #333; margin-bottom: 4px; font-size: 12px;">Medications</div>
                          <div style="color: #555; font-size: 12px;">${record.medications || record.prescription}</div>
                        </div>
                        ` : ''}
    
                        ${record.notes || record.observations ? `
                        <div style="background: #fff3cd; padding: 8px; border-radius: 6px; border-left: 3px solid #ffc107;">
                          <div style="font-weight: bold; color: #856404; margin-bottom: 4px; font-size: 12px;">Notes</div>
                          <div style="color: #856404; font-size: 12px;">${record.notes || record.observations}</div>
                        </div>
                        ` : ''}
                      </div>
                    </div>
                  `;
                });
    
                html += `</div>`;
              } else {
                html += `
                  <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                    <h3 style="margin: 0 0 15px 0; color: #333; display: flex; align-items: center; gap: 8px;">
                      <i class="fas fa-info-circle" style="color: #667eea;"></i> Medical History
                    </h3>
                    <div style="text-align: center; padding: 30px; background: rgba(102, 126, 234, 0.05); border-radius: 10px; border: 2px dashed rgba(102, 126, 234, 0.3);">
                      <i class="fas fa-calendar-times" style="font-size: 36px; color: rgba(102, 126, 234, 0.3); margin-bottom: 10px;"></i>
                      <h4 style="margin: 0 0 8px 0; color: #667eea;">Not Appointed Yet</h4>
                      <p style="margin: 0; color: #666; font-size: 14px;">This pet hasn't had any appointments yet.</p>
                    </div>
                  </div>
                `;
              }
    
              reportPreview.innerHTML = html;
              console.log('✅ Medical report displayed manually');
            } else {
              console.error('❌ Report preview element not found');
            }
          } else {
            console.error('❌ API call failed:', result);
          }
        })
        .catch(error => {
          console.error('❌ Test error:', error);
        });
    };
    
    // Simple test function to check medical report display
    window.testMedicalReport = function(petId) {
      console.log('=== TESTING MEDICAL REPORT DISPLAY ===');
    
      // Simulate the API call
      fetch(`../api/pet_reports_api.php?action=get_pet_report&pet_id=${petId || 1}`)
        .then(response => response.json())
        .then(result => {
          console.log('API Result:', result);
    
          if (result.success && result.data) {
            console.log('Data structure:', {
              hasMedicalHistory: !!result.data.medical_history,
              medicalHistoryLength: result.data.medical_history?.length || 0,
              hasAppointments: !!result.data.appointments,
              appointmentsLength: result.data.appointments?.length || 0
            });
    
            // Try to display the report
            if (window.clientDashboard) {
              window.clientDashboard.currentReportData = result.data;
              window.clientDashboard.displayClientPetReport(result.data);
              console.log('✅ Report displayed via clientDashboard');
            } else {
              console.error('❌ clientDashboard not available');
            }
          } else {
            console.error('❌ API call failed:', result);
          }
        })
        .catch(error => {
          console.error('❌ Test error:', error);
        });
    };
  }

  displayEmptyReport() {
    const reportPreview = document.getElementById('reportPreview');
    const reportStats = document.getElementById('reportStats');

    if (!reportPreview) return;

    reportPreview.innerHTML = `
      <div style="text-align: center; padding: 60px 20px; background: rgba(102, 126, 234, 0.05); border-radius: 15px; border: 2px dashed rgba(102, 126, 234, 0.3);">
        <i class="fas fa-calendar-times" style="font-size: 64px; color: rgba(102, 126, 234, 0.3); margin-bottom: 20px;"></i>
        <h3 style="margin: 0 0 15px 0; color: #667eea;">Not Appointed Yet</h3>
        <p style="margin: 0; color: #666;">This pet hasn't had any appointments yet. Book an appointment to start tracking your pet's medical history.</p>
      </div>
    `;

    // Hide stats section when no data
    if (reportStats) {
      reportStats.style.display = 'none';
    }
  }

  generateClientMedicalHistoryHTML(data) {
    let html = `
      <div class="client-report-section">
        <h4><i class="fas fa-paw"></i> Pet Information</h4>
        <div class="client-info-grid">
          <div class="client-info-row">
            <div class="client-info-label">Name:</div>
            <div class="client-info-value">${data.pet.name}</div>
          </div>
          <div class="client-info-row">
            <div class="client-info-label">Species:</div>
            <div class="client-info-value">${data.pet.species}</div>
          </div>
          <div class="client-info-row">
            <div class="client-info-label">Breed:</div>
            <div class="client-info-value">${data.pet.breed || 'Not specified'}</div>
          </div>
          <div class="client-info-row">
            <div class="client-info-label">Age:</div>
            <div class="client-info-value">${data.pet.age || 'Age not recorded'}</div>
          </div>
        </div>
      </div>
    `;

    // Medical Records Section
    if (data.medical_history && data.medical_history.length > 0) {
      html += `
        <div class="client-report-section">
          <h4><i class="fas fa-stethoscope"></i> Medical History</h4>
          <div style="margin-bottom: 20px; text-align: center;">
            <span style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600;">
              <i class="fas fa-file-medical"></i> Total Visits: ${data.medical_history.length}
            </span>
          </div>
      `;

      data.medical_history.forEach((record, index) => {
        html += `
          <div class="client-medical-record" style="margin: 20px 0; padding: 20px; border: 2px solid #667eea; border-radius: 12px; background: linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%); box-shadow: 0 4px 15px rgba(102, 126, 234, 0.1);">
            <div style="margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e1e5e9;">
              <h5 style="margin: 0 0 8px 0; color: #667eea; font-size: 16px; display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-calendar-alt"></i> Visit on ${new Date(record.created_at).toLocaleDateString()}
              </h5>
              <div style="display: flex; align-items: center; gap: 15px; color: #666; font-size: 14px;">
                <div><i class="fas fa-user-md"></i> <strong>Staff:</strong> ${record.staff_name || 'Not recorded'}</div>
                ${record.appointment_duration ? `<div><i class="fas fa-clock"></i> <strong>Duration:</strong> ${record.appointment_duration} minutes</div>` : ''}
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr; gap: 12px;">
              <div style="background: #ffffff; padding: 12px; border-radius: 8px; border-left: 4px solid #667eea;">
                <div style="font-weight: bold; color: #333; margin-bottom: 6px; font-size: 14px; display: flex; align-items: center; gap: 6px;">
                  <i class="fas fa-stethoscope"></i> Diagnosis
                </div>
                <div style="color: #555; line-height: 1.5; font-size: 14px;">${record.diagnosis ? record.diagnosis.replace(/\n/g, '<br>') : 'Not specified'}</div>
              </div>

              <div style="background: #ffffff; padding: 12px; border-radius: 8px; border-left: 4px solid #28a745;">
                <div style="font-weight: bold; color: #333; margin-bottom: 6px; font-size: 14px; display: flex; align-items: center; gap: 6px;">
                  <i class="fas fa-thermometer-three-quarters"></i> Treatment
                </div>
                <div style="color: #555; line-height: 1.5; font-size: 14px;">${record.treatment ? record.treatment.replace(/\n/g, '<br>') : 'Not specified'}</div>
              </div>

              ${record.medications ? `
              <div style="background: #ffffff; padding: 12px; border-radius: 8px; border-left: 4px solid #ffc107;">
                <div style="font-weight: bold; color: #333; margin-bottom: 6px; font-size: 14px; display: flex; align-items: center; gap: 6px;">
                  <i class="fas fa-pills"></i> Medications
                </div>
                <div style="color: #555; line-height: 1.5; font-size: 14px;">${record.medications.replace(/\n/g, '<br>')}</div>
              </div>
              ` : ''}

              ${record.follow_up_date ? `
              <div style="background: #ffffff; padding: 12px; border-radius: 8px; border-left: 4px solid #dc3545;">
                <div style="font-weight: bold; color: #333; margin-bottom: 6px; font-size: 14px; display: flex; align-items: center; gap: 6px;">
                  <i class="fas fa-calendar-check"></i> Follow-up Date
                </div>
                <div style="color: #555; line-height: 1.5; font-size: 14px;">${new Date(record.follow_up_date).toLocaleDateString()}</div>
              </div>
              ` : ''}

              ${record.notes ? `
              <div style="background: #fff3cd; padding: 12px; border-radius: 8px; border-left: 4px solid #ffc107;">
                <div style="font-weight: bold; color: #856404; margin-bottom: 6px; font-size: 14px; display: flex; align-items: center; gap: 6px;">
                  <i class="fas fa-sticky-note"></i> Clinical Notes
                </div>
                <div style="color: #856404; line-height: 1.5; font-size: 14px;">${record.notes.replace(/\n/g, '<br>')}</div>
              </div>
              ` : ''}

              ${record.instructions ? `
              <div style="background: #d1ecf1; padding: 12px; border-radius: 8px; border-left: 4px solid #17a2b8;">
                <div style="font-weight: bold; color: #0c5460; margin-bottom: 6px; font-size: 14px; display: flex; align-items: center; gap: 6px;">
                  <i class="fas fa-clipboard-list"></i> Care Instructions
                </div>
                <div style="color: #0c5460; line-height: 1.5; font-size: 14px;">${record.instructions.replace(/\n/g, '<br>')}</div>
              </div>
              ` : ''}
            </div>
          </div>
        `;
      });

      html += `</div>`;

      // Add Medical Summary for clients
      html += `
        <div class="client-report-section">
          <h4><i class="fas fa-chart-bar"></i> Health Summary</h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 20px 0;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px; border-radius: 12px; text-align: center;">
              <div style="font-size: 24px; font-weight: 800; margin-bottom: 5px;">${data.medical_history.length}</div>
              <div style="font-size: 11px; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.5px;">Total Visits</div>
            </div>
            <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 15px; border-radius: 12px; text-align: center;">
              <div style="font-size: 24px; font-weight: 800; margin-bottom: 5px;">${this.getClientVaccinationCount(data.medical_history)}</div>
              <div style="font-size: 11px; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.5px;">Vaccinations</div>
            </div>
            <div style="background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%); color: white; padding: 15px; border-radius: 12px; text-align: center;">
              <div style="font-size: 24px; font-weight: 800; margin-bottom: 5px;">${this.getClientSurgeryCount(data.medical_history)}</div>
              <div style="font-size: 11px; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.5px;">Procedures</div>
            </div>
          </div>
        </div>
      `;
    } else {
      html += `
        <div class="client-report-section">
          <h4><i class="fas fa-info-circle"></i> Medical History</h4>
          <div style="text-align: center; padding: 40px; background: rgba(102, 126, 234, 0.05); border-radius: 15px; border: 2px dashed rgba(102, 126, 234, 0.3);">
            <i class="fas fa-calendar-times" style="font-size: 48px; color: rgba(102, 126, 234, 0.3); margin-bottom: 15px;"></i>
            <h3 style="margin: 0 0 10px 0; color: #667eea;">Not Appointed Yet</h3>
            <p style="margin: 0; color: #666;">This pet hasn't had any appointments yet. Book an appointment to start tracking your pet's medical history.</p>
          </div>
        </div>
      `;
    }

    return html;
  }

  getClientVaccinationCount(medicalHistory) {
    return medicalHistory.filter(record =>
      record.treatment && record.treatment.toLowerCase().includes('vaccin')
    ).length;
  }

  getClientSurgeryCount(medicalHistory) {
    return medicalHistory.filter(record =>
      record.treatment && record.treatment.toLowerCase().includes('surgery')
    ).length;
  }

  async generatePetReport(petId) {
    try {
      console.log('🔄 Generating pet report for ID:', petId);
      this.showToast('Generating medical report...', 'info');

      const response = await fetch(`../api/pet_reports_api.php?action=get_pet_report&pet_id=${petId}`);
      const result = await response.json();

      console.log('📡 Pet report API response:', result);

      if (result.success && result.data) {
        console.log('✅ Report data received, displaying...');
        console.log('📊 Report data structure:', {
          hasPet: !!result.data.pet,
          hasOwner: !!result.data.owner,
          hasMedicalHistory: !!result.data.medical_history,
          medicalHistoryLength: result.data.medical_history?.length || 0,
          hasAppointments: !!result.data.appointments,
          appointmentsLength: result.data.appointments?.length || 0,
          hasStatistics: !!result.data.statistics
        });

        // Store current report data for PDF generation
        this.currentReportData = result.data;

        // Display the report
        this.displayPetReport(result.data);

        this.showToast('Medical report generated successfully!', 'success');
      } else {
        console.log('❌ No data available for report:', result.message);
        this.showToast('No medical data available for this pet', 'info');
        this.displayEmptyReport();
      }
    } catch (error) {
      console.error('❌ Error generating pet report:', error);
      this.showToast('Error generating medical report', 'error');
      this.displayEmptyReport();
    }
  }

  displayPetReport(data) {
    const reportPreview = document.getElementById('reportPreview');

    if (!reportPreview) {
      console.error('❌ Report preview element not found');
      return;
    }

    // Generate comprehensive medical report HTML
    const html = this.generateMedicalReportHTML(data);
    reportPreview.innerHTML = html;

    // Show and update stats section
    const reportStats = document.getElementById('reportStats');
    if (reportStats) {
      reportStats.style.display = 'block';

      // Update statistics
      this.updateReportStats(data);
    }
  }

  generateMedicalReportHTML(data) {
    let html = `
      <div class="medical-report-container">
        <!-- Pet Information Section -->
        <div class="report-section pet-info">
          <h3><i class="fas fa-paw"></i> Pet Information</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Name:</span>
              <span class="value">${data.pet.name}</span>
            </div>
            <div class="info-item">
              <span class="label">Species:</span>
              <span class="value">${data.pet.species}</span>
            </div>
            <div class="info-item">
              <span class="label">Breed:</span>
              <span class="value">${data.pet.breed || 'Not specified'}</span>
            </div>
            <div class="info-item">
              <span class="label">Gender:</span>
              <span class="value">${data.pet.gender || 'Not specified'}</span>
            </div>
            ${data.pet.weight ? `<div class="info-item">
              <span class="label">Weight:</span>
              <span class="value">${data.pet.weight} kg</span>
            </div>` : ''}
            ${data.pet.color ? `<div class="info-item">
              <span class="label">Color:</span>
              <span class="value">${data.pet.color}</span>
            </div>` : ''}
          </div>
        </div>

        <!-- Owner Information Section -->
        <div class="report-section owner-info">
          <h3><i class="fas fa-user"></i> Owner Information</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Name:</span>
              <span class="value">${data.owner.name}</span>
            </div>
            <div class="info-item">
              <span class="label">Email:</span>
              <span class="value">${data.owner.email}</span>
            </div>
            ${data.owner.phone ? `<div class="info-item">
              <span class="label">Phone:</span>
              <span class="value">${data.owner.phone}</span>
            </div>` : ''}
            ${data.owner.address ? `<div class="info-item">
              <span class="label">Address:</span>
              <span class="value">${data.owner.address}</span>
            </div>` : ''}
          </div>
        </div>

        <!-- Medical History Section -->
        ${data.medical_history && data.medical_history.length > 0 ? `
        <div class="report-section medical-history">
          <h3><i class="fas fa-stethoscope"></i> Medical History</h3>
          <div class="records-count">
            <span class="badge">Total Records: ${data.medical_history.length}</span>
          </div>

          ${data.medical_history.map((record, index) => `
          <div class="medical-record">
            <div class="record-header">
              <h4>Visit #${index + 1}</h4>
              <div class="record-meta">
                <span><i class="fas fa-calendar"></i> ${new Date(record.created_at).toLocaleDateString()}</span>
                <span><i class="fas fa-user-md"></i> ${record.staff_name || 'Not recorded'}</span>
              </div>
            </div>

            <div class="record-details">
              <div class="detail-item">
                <div class="detail-label">Diagnosis</div>
                <div class="detail-content">${record.diagnosis || 'Not specified'}</div>
              </div>

              <div class="detail-item">
                <div class="detail-label">Treatment</div>
                <div class="detail-content">${record.treatment || 'Not specified'}</div>
              </div>

              ${record.medications ? `
              <div class="detail-item">
                <div class="detail-label">Medications</div>
                <div class="detail-content">${record.medications}</div>
              </div>
              ` : ''}

              ${record.notes ? `
              <div class="detail-item">
                <div class="detail-label">Clinical Notes</div>
                <div class="detail-content">${record.notes}</div>
              </div>
              ` : ''}

              ${record.instructions ? `
              <div class="detail-item">
                <div class="detail-label">Care Instructions</div>
                <div class="detail-content">${record.instructions}</div>
              </div>
              ` : ''}
            </div>
          </div>
          `).join('')}
        </div>
        ` : `
        <div class="report-section no-history">
          <h3><i class="fas fa-info-circle"></i> Medical History</h3>
          <div class="empty-state">
            <i class="fas fa-calendar-times"></i>
            <h4>No Medical Records Yet</h4>
            <p>This pet hasn't had any appointments yet. Book an appointment to start tracking medical history.</p>
          </div>
        </div>
        `}
      </div>
    `;

    return html;
  }

  updateReportStats(data) {
    const totalVisitsEl = document.getElementById('totalVisits');
    const totalVaccinationsEl = document.getElementById('totalVaccinations');
    const lastVisitEl = document.getElementById('lastVisit');

    if (totalVisitsEl) {
      totalVisitsEl.textContent = data.statistics?.total_appointments || '0';
    }

    if (totalVaccinationsEl) {
      const vaccinationCount = data.medical_history ? data.medical_history.filter(record =>
        record.treatment && record.treatment.toLowerCase().includes('vaccin')
      ).length : 0;
      totalVaccinationsEl.textContent = vaccinationCount;
    }

    if (lastVisitEl) {
      const lastVisit = data.statistics?.last_visit || (data.medical_history && data.medical_history.length > 0
        ? new Date(Math.max(...data.medical_history.map(record => new Date(record.created_at)))).toLocaleDateString()
        : 'Never');
      lastVisitEl.textContent = lastVisit;
    }
  }

  async downloadClientMedicalReport(data) {
    try {
      const { jsPDF } = window.jspdf;

      const pdf = new jsPDF('p', 'mm', 'a4');

      // Header
      pdf.setFontSize(20);
      pdf.setTextColor(40, 40, 40);
      pdf.text('Tattoo Veterinary Clinic', 105, 20, { align: 'center' });

      pdf.setFontSize(16);
      pdf.text('Pet Medical Report', 105, 30, { align: 'center' });

      // Clinic info
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text('Clinic Address: Your Clinic Address', 105, 40, { align: 'center' });
      pdf.text('Phone: 0917-519-4639 | Email: info@tattoovet.com', 105, 45, { align: 'center' });
      pdf.text(`Report Generated: ${new Date().toLocaleString()}`, 105, 50, { align: 'center' });

      let yPosition = 65;

      // Pet Information
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
        ['Age:', data.pet.age || 'Age not recorded'],
        ['Gender:', data.pet.gender || 'Not specified'],
        ['Weight:', data.pet.weight ? `${data.pet.weight} kg` : 'Weight not recorded']
      ];

      petInfo.forEach(([label, value]) => {
        pdf.text(`${label} ${value}`, 20, yPosition);
        yPosition += 6;
      });

      // Medical History
      if (data.medical_history && data.medical_history.length > 0) {
        if (yPosition > 200) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFontSize(14);
        pdf.setTextColor(102, 126, 234);
        pdf.text('Medical History', 20, yPosition);
        yPosition += 15;

        pdf.setFontSize(10);
        let recordCount = 0;

        for (const record of data.medical_history) {
          recordCount++;

          if (yPosition > 220) {
            pdf.addPage();
            yPosition = 20;
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

          yPosition += 10;
        }
      }

      // Footer
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Page ${i} of ${pageCount}`, 105, 285, { align: 'center' });
      }

      const filename = `pet_medical_report_${data.pet.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);

      this.showToast('Medical report downloaded successfully!', 'success');
    } catch (error) {
      console.error('Error downloading client medical report:', error);
      this.showToast('Error generating PDF. Please try again.', 'error');
    }
  }

  async loadOrders() {
    // Implementation for orders
  }

  async editAppointment(appointmentId) {
    if (!appointmentId) {
      this.showToast('Invalid appointment ID', 'error');
      return;
    }

    try {
      console.log('Client editing appointment for ID:', appointmentId);

      // Get appointment details first
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
        const appointment = result.data;

        // Show the booking modal with pre-filled data
        this.showBookingModal();

        // Pre-fill the form with existing appointment data
        setTimeout(() => {
          this.prefillEditForm(appointment);
        }, 100);

      } else {
        this.showToast('Failed to load appointment details for editing', 'error');
      }
    } catch (error) {
      console.error('Error loading appointment for editing:', error);
      this.showToast('Error loading appointment details. Please try again.', 'error');
    }
  }

  prefillEditForm(appointment) {
    // Pre-fill the booking form with existing appointment data
    const serviceSelect = document.getElementById('clientBookingService');
    const petSelect = document.getElementById('clientBookingPet');
    const dateInput = document.getElementById('clientBookingDate');
    const timeSelect = document.getElementById('clientBookingTime');
    const notesInput = document.getElementById('clientBookingNotes');

    if (serviceSelect) serviceSelect.value = appointment.service_id || '';
    if (petSelect) petSelect.value = appointment.pet_id || '';
    if (dateInput) dateInput.value = appointment.appointment_date || '';
    if (timeSelect) timeSelect.value = appointment.appointment_time || '';
    if (notesInput) notesInput.value = appointment.notes || '';

    // Store the appointment ID for update instead of create
    this.currentEditingAppointmentId = appointment.id;

    // Update form submission to handle edit mode
    const form = document.getElementById('clientBookingForm');
    if (form) {
      form.setAttribute('data-edit-mode', 'true');
    }

    this.showToast('Appointment details loaded for editing. Make your changes and submit.', 'info');
  }

  async requestCancellation(appointmentId) {
    if (!appointmentId) {
      this.showToast('Invalid appointment ID', 'error');
      return;
    }

    // Confirm cancellation request with user
    if (!confirm('Are you sure you want to request cancellation for this appointment? Staff will review and approve your request.')) {
      return;
    }

    try {
      console.log('Client requesting appointment cancellation for ID:', appointmentId);

      const response = await fetch('../api/vet_api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request_appointment_cancellation',
          appointment_id: appointmentId
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Cancellation request response:', result);

      if (result.success) {
        this.showToast('Cancellation request submitted successfully! Staff will review and confirm.', 'success');

        // Reload appointments to reflect the changes
        await this.loadAppointmentsSection();
      } else {
        this.showToast(result.message || 'Failed to submit cancellation request', 'error');
      }
    } catch (error) {
      console.error('Error requesting appointment cancellation:', error);
      this.showToast('Error submitting cancellation request. Please try again or contact the clinic staff.', 'error');
    }
  }

  // Booking functionality
  showBookingModal() {
    const modal = document.getElementById('clientBookingModal');
    if (modal) {
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      this.initializeBookingModal();
    }
  }

  closeBookingModal() {
    const modal = document.getElementById('clientBookingModal');
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = '';
      // Reset form
      const form = document.getElementById('clientBookingForm');
      if (form) {
        form.reset();
        form.removeAttribute('data-edit-mode');
      }
      // Hide add pet form
      this.hideAddPetForm();
      // Clear edit mode
      this.currentEditingAppointmentId = null;
    }
  }

  async initializeBookingModal() {
    console.log('🔄 Initializing client booking modal...');

    // Load services and pets
    await this.loadClientServices();
    await this.loadClientPets();

    // Set minimum date to today
    const dateInput = document.getElementById('clientBookingDate');
    if (dateInput) {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      dateInput.min = tomorrow.toISOString().split('T')[0];

      // Add event listener for date changes
      dateInput.addEventListener('change', () => this.loadAvailableTimeSlots());
    }

    console.log('✅ Client booking modal initialized');
  }

  async loadClientServices() {
    try {
      console.log('Loading services for client booking...');
      const response = await fetch('../api/vet_api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_services' })
      });

      const result = await response.json();
      const serviceSelect = document.getElementById('clientBookingService');

      console.log('Client booking services API response:', result);

      if (result.success && result.data) {
        console.log('Client booking services data received:', result.data.length, 'services');

        // Filter to show only active services (same as services section)
        const activeServices = result.data.filter(service => service.is_active === 1 || service.is_active === "1");
        console.log('Active services for client booking:', activeServices.length);

        serviceSelect.innerHTML = '<option value="">Select a service</option>';

        activeServices.forEach((service, index) => {
          console.log(`Client booking service ${index + 1}:`, service);

          const option = document.createElement('option');
          option.value = service.id || service.service_id;

          // Show service name and description if available
          const description = service.description ? ` - ${service.description}` : '';
          const serviceName = service.name || service.service_name || 'Unnamed Service';
          const serviceText = `${serviceName}${description}`;

          option.textContent = serviceText;
          option.title = serviceText; // Add tooltip for long service names

          serviceSelect.appendChild(option);
        });

        console.log('Client booking services loaded successfully into dropdown');
      } else {
        console.error('Failed to load client booking services:', result);
        serviceSelect.innerHTML = '<option value="">No active services available</option>';
        this.showToast('Failed to load services. Please refresh and try again.', 'error');
      }
    } catch (error) {
      console.error('Error loading client booking services:', error);
      const serviceSelect = document.getElementById('clientBookingService');
      serviceSelect.innerHTML = '<option value="">Error loading services</option>';
      this.showToast('Connection error while loading services.', 'error');
    }
  }

  async loadClientPets() {
    try {
      const response = await fetch('../api/vet_api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_pets' })
      });

      const result = await response.json();
      const petSelect = document.getElementById('clientBookingPet');

      if (result.success && result.data && result.data.length > 0) {
        petSelect.innerHTML = '<option value="">Select a pet</option>';
        result.data.forEach(pet => {
          const option = document.createElement('option');
          option.value = pet.id;
          option.textContent = `${pet.name} (${pet.species})`;
          petSelect.appendChild(option);
        });
      } else {
        petSelect.innerHTML = '<option value="">No pets registered</option>';
      }
    } catch (error) {
      console.error('Error loading client pets:', error);
      const petSelect = document.getElementById('clientBookingPet');
      petSelect.innerHTML = '<option value="">Error loading pets</option>';
      this.showToast('Failed to load your pets. Please refresh and try again.', 'error');
    }
  }

  async loadAvailableTimeSlots() {
    const dateInput = document.getElementById('clientBookingDate');
    const timeSelect = document.getElementById('clientBookingTime');
    const selectedDate = dateInput.value;

    if (!selectedDate) {
      timeSelect.innerHTML = '<option value="">Select date first</option>';
      return;
    }

    try {
      const response = await fetch('../api/vet_api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_available_times',
          date: selectedDate
        })
      });

      const result = await response.json();

      if (result.success && result.data && result.data.length > 0) {
        timeSelect.innerHTML = '<option value="">Select a time</option>';
        result.data.forEach(time => {
          const option = document.createElement('option');
          option.value = time;
          option.textContent = this.formatTime(time);
          timeSelect.appendChild(option);
        });
      } else {
        timeSelect.innerHTML = '<option value="">No available time slots</option>';
      }
    } catch (error) {
      console.error('Error loading time slots:', error);
      timeSelect.innerHTML = '<option value="">Error loading times</option>';
    }
  }

  formatTime(time) {
    const [hours, minutes] = time.split(':');
    const hour12 = hours % 12 || 12;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${ampm}`;
  }

  async handleBookingSubmission(e) {
    e.preventDefault();

    // Prevent duplicate submissions
    if (this.isSubmittingBooking) {
      console.log('Booking submission already in progress, ignoring duplicate...');
      return;
    }

    this.isSubmittingBooking = true;

    const form = e.target;
    const formData = new FormData(form);
    const isEditMode = form.getAttribute('data-edit-mode') === 'true';

    const bookingData = {
      action: isEditMode ? 'update_appointment' : 'book_appointment',
      service_id: formData.get('service_id'),
      pet_id: formData.get('pet_id'),
      appointment_date: formData.get('appointment_date'),
      appointment_time: formData.get('appointment_time'),
      notes: formData.get('notes') || ''
    };

    // Add appointment ID if in edit mode
    if (isEditMode && this.currentEditingAppointmentId) {
      bookingData.appointment_id = this.currentEditingAppointmentId;
    }

    console.log(`=== CLIENT ${isEditMode ? 'APPOINTMENT UPDATE' : 'BOOKING'} FORM SUBMISSION ===`);
    console.log('Booking data:', bookingData);

    // Check session before submitting booking
    try {
      const sessionValid = await this.checkSession();
      if (!sessionValid) {
        console.log('⚠️ Session expired during booking submission, saving data for later...');
        this.savePendingBookingData(bookingData);
        this.showToast('Session expired. Please log in again to continue booking.', 'warning');
        this.handleSessionExpired();
        return;
      }
    } catch (error) {
      console.error('❌ Session check failed during booking:', error);
      this.savePendingBookingData(bookingData);
      this.showToast('Session check failed. Please log in again to continue booking.', 'warning');
      this.handleSessionExpired();
      return;
    }

    // Validation
    const missingFields = [];
    if (!bookingData.service_id) missingFields.push('Service');
    if (!bookingData.pet_id) missingFields.push('Pet');
    if (!bookingData.appointment_date) missingFields.push('Date');
    if (!bookingData.appointment_time) missingFields.push('Time');

    if (missingFields.length > 0) {
      const errorMsg = `Please fill in all required fields. Missing: ${missingFields.join(', ')}`;
      console.log('Booking validation failed:', errorMsg);
      this.showToast(errorMsg, 'error');
      return;
    }

    // Additional validation for service selection
    const serviceSelect = document.getElementById('clientBookingService');
    const selectedServiceOption = serviceSelect.options[serviceSelect.selectedIndex];
    if (!selectedServiceOption || selectedServiceOption.textContent.includes('undefined') ||
        selectedServiceOption.textContent.includes('No active services available')) {
      this.showToast('Please select a valid service from the dropdown.', 'error');
      return;
    }

    try {
      console.log(`Sending ${isEditMode ? 'update' : 'booking'} data to API:`, bookingData);
      const response = await fetch('../api/vet_api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      });

      const result = await response.json();
      console.log(`${isEditMode ? 'Update' : 'Booking'} API response:`, result);

      if (result.success) {
        const successMessage = isEditMode ? 'Appointment updated successfully!' : 'Appointment booked successfully!';
        this.showToast(successMessage, 'success');
        this.closeBookingModal();
        form.reset();
        form.removeAttribute('data-edit-mode');
        this.currentEditingAppointmentId = null;
        console.log(`${isEditMode ? 'Update' : 'Booking'} form reset and modal closed`);

        // Refresh appointments if we're on the appointments section
        if (document.getElementById('appointmentsSection').style.display === 'block') {
          this.loadAppointmentsSection();
        }
      } else {
        console.error(`${isEditMode ? 'Update' : 'Booking'} failed:`, result);
        if (result.message && result.message.includes('Invalid pet selection')) {
          this.showToast('The selected pet is not valid for your account. Please select a different pet or add a new one.', 'error');
          await this.loadClientPets();
          this.showAddPetForm();
        } else if (result.message && result.message.includes('Invalid service')) {
          this.showToast('The selected service is not valid. Please select a different service.', 'error');
          await this.loadClientServices();
        } else {
          this.showToast(result.message || `Failed to ${isEditMode ? 'update' : 'book'} appointment.`, 'error');
        }
      }
    } catch (error) {
      console.error(`${isEditMode ? 'Update' : 'Booking'} error:`, error);
      this.showToast('Connection error. Please try again.', 'error');
    } finally {
      // Reset the submission flag
      this.isSubmittingBooking = false;
    }
  }

  showAddPetForm() {
    const addPetForm = document.getElementById('clientAddPetForm');

    // Show the form
    addPetForm.style.display = 'block';

    // Add a subtle animation
    addPetForm.style.opacity = '0';
    addPetForm.style.transform = 'translateY(-10px)';
    addPetForm.style.transition = 'all 0.3s ease';

    // Trigger the animation
    setTimeout(() => {
      addPetForm.style.opacity = '1';
      addPetForm.style.transform = 'translateY(0)';
    }, 10);

    // Smooth scroll to the add pet form
    setTimeout(() => {
      addPetForm.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest'
      });

      // Focus on the first input field for better UX
      const firstInput = document.getElementById('clientPetName');
      if (firstInput) {
        firstInput.focus();
      }
    }, 100);
  }

  hideAddPetForm() {
    const addPetForm = document.getElementById('clientAddPetForm');

    // Add hide animation
    addPetForm.style.opacity = '0';
    addPetForm.style.transform = 'translateY(-10px)';

    // Hide the form after animation
    setTimeout(() => {
      addPetForm.style.display = 'none';

      // Clear form fields using correct element IDs
      document.getElementById('clientBookingPetName').value = '';
      document.getElementById('clientBookingPetSpecies').value = '';
      document.getElementById('clientBookingPetBreed').value = '';
      document.getElementById('clientBookingPetBirthdate').value = '';
      document.getElementById('clientBookingPetGender').value = '';
      document.getElementById('clientBookingPetWeight').value = '';
      document.getElementById('clientBookingPetColor').value = '';

      // Reset styles for next show
      addPetForm.style.opacity = '';
      addPetForm.style.transform = '';
      addPetForm.style.transition = '';
    }, 300);
  }

  async addPet() {
    const petData = {
      action: 'add_pet',
      pet_name: document.getElementById('clientBookingPetName').value.trim(),
      species: document.getElementById('clientBookingPetSpecies').value,
      breed: document.getElementById('clientBookingPetBreed').value.trim(),
      birthdate: document.getElementById('clientBookingPetBirthdate').value,
      gender: document.getElementById('clientBookingPetGender').value,
      weight: parseFloat(document.getElementById('clientBookingPetWeight').value) || null,
      color: document.getElementById('clientBookingPetColor').value.trim()
    };

    // Validation
    if (!petData.pet_name || !petData.species || !petData.gender) {
      this.showToast('Please fill in pet name, species, and gender.', 'error');
      return;
    }

    try {
      const response = await fetch('../api/vet_api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(petData)
      });

      const result = await response.json();

      if (result.success) {
        this.showToast('Pet added successfully!', 'success');
        this.hideAddPetForm();
        // Reload pets in the select dropdown
        await this.loadClientPets();
      } else {
        this.showToast(result.message || 'Failed to add pet.', 'error');
      }
    } catch (error) {
      console.error('Add pet error:', error);
      this.showToast('Connection error. Please try again.', 'error');
    }
  }

  async refreshServices() {
    console.log('Manual service refresh requested for client booking');
    await this.loadClientServices();
    this.showToast('Services refreshed!', 'success');
  }

  setupBookingForm() {
    const bookingForm = document.getElementById('clientBookingForm');
    if (bookingForm) {
      bookingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleBookingSubmission(e);
      });
    }
  }
}

// Global functions for client dashboard (called from HTML)
function showClientBookingModal() {
  if (window.clientDashboard) {
    window.clientDashboard.showBookingModal();
  }
}

function closeClientBookingModal() {
  if (window.clientDashboard) {
    window.clientDashboard.closeBookingModal();
  }
}

function showClientAddPetForm() {
  if (window.clientDashboard) {
    window.clientDashboard.showAddPetForm();
  }
}

function hideClientAddPetForm() {
  if (window.clientDashboard) {
    window.clientDashboard.hideAddPetForm();
  }
}

function addClientPet() {
  if (window.clientDashboard) {
    window.clientDashboard.addPet();
  }
}

function refreshClientServices() {
  if (window.clientDashboard) {
    window.clientDashboard.refreshServices();
  }
}

// Initialize client dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
  console.log('🚀 Initializing client dashboard...');

  // Create dashboard instance
  window.clientDashboard = new ClientDashboard();

  // Check session with improved error handling
  try {
    const sessionValid = await window.clientDashboard.checkSession();
    if (sessionValid) {
      console.log('✅ Dashboard initialized successfully');
    } else {
      console.warn('⚠️ Session check failed, but dashboard still initialized');
    }
  } catch (error) {
    console.error('❌ Error during dashboard initialization:', error);
    // Still allow dashboard to function even if session check fails
  }

  // Setup mobile sidebar toggle
  const mobileToggle = document.getElementById('mobileMenuToggle');
  if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
      window.clientDashboard.toggleSidebar();
    });
  }

  // Add network connectivity monitoring
  window.addEventListener('online', () => {
    console.log('🌐 Network connection restored');
    window.clientDashboard.showToast('Connection restored', 'success');

    // Retry session check if we were previously disconnected
    if (!window.clientDashboard.sessionValidated) {
      setTimeout(() => {
        window.clientDashboard.checkSession();
      }, 1000);
    }
  });

  window.addEventListener('offline', () => {
    console.log('📴 Network connection lost');
    window.clientDashboard.showToast('Connection lost - some features may not work', 'warning');
  });

  console.log('✅ Client dashboard initialization complete');

  // Set up periodic session validation (every 5 minutes)
  setInterval(() => {
    if (this.sessionValidated && !document.querySelector('.modal')) {
      // Only check if session was previously validated and no modals are open
      this.checkSession().then(success => {
        if (!success) {
          console.log('⚠️ Periodic session check failed');
          this.showSessionError();
        }
      }).catch(error => {
        console.error('❌ Periodic session check error:', error);
        this.showSessionError();
      });
    }
  }, 5 * 60 * 1000); // 5 minutes

  // Handle page visibility changes (user switches tabs/returns)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && this.sessionValidated) {
      // User returned to tab, verify session is still valid
      setTimeout(() => {
        this.checkSession().then(success => {
          if (!success) {
            console.log('⚠️ Session invalid after returning to tab');
            this.showSessionError();
          }
        }).catch(error => {
          console.error('❌ Session check error after visibility change:', error);
          this.showSessionError();
        });
      }, 1000);
    }
  });
});