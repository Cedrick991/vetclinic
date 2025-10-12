// Client Dashboard JavaScript
class ClientDashboard {
  constructor() {
    this.cart = JSON.parse(localStorage.getItem('clientCart') || '[]');
    this.currentReportData = null;
    this.selectedPetId = null;
    this.isSubmittingBooking = false; // Flag to prevent duplicate submissions
    this.currentEditingAppointmentId = null; // Track appointment being edited
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

    while (retryCount < maxRetries) {
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

        if (!result.data) {
          throw new Error('No session data received');
        }

        const userType = result.data.user_type;

        // Redirect based on user type
        if (userType === 'client') {
          // Stay on client dashboard
          if (result.data.user) {
            const { name, email } = result.data.user;
            document.getElementById('clientName').textContent = name || "Client User";
            document.getElementById('clientEmail').textContent = email || "No email available";

            // Update profile picture if available
            if (result.data.user.profile_picture) {
              const clientAvatar = document.getElementById('clientAvatar');
              if (clientAvatar) {
                const timestamp = Date.now();
                clientAvatar.src = '../' + result.data.user.profile_picture + '?t=' + timestamp;
              }
            }
          }
          return;
        } else if (userType === 'staff') {
          window.location.href = 'staff.html';
          return;
        } else if (userType === 'admin') {
          window.location.href = 'admin.html';
          return;
        } else {
          window.location.href = '../index.html';
          return;
        }

      } catch (error) {
        retryCount++;
        console.error(`Session check attempt ${retryCount} failed:`, error);

        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          console.error('Session check failed after all retries:', error);
          window.location.href = '../index.html';
        }
      }
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
    // Implementation for reports
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
document.addEventListener('DOMContentLoaded', function() {
  window.clientDashboard = new ClientDashboard();

  // Check session
  window.clientDashboard.checkSession();

  // Setup mobile sidebar toggle
  const mobileToggle = document.getElementById('mobileMenuToggle');
  if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
      window.clientDashboard.toggleSidebar();
    });
  }
});