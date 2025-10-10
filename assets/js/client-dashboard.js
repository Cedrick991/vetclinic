// Client Dashboard JavaScript
class ClientDashboard {
  constructor() {
    this.cart = JSON.parse(localStorage.getItem('clientCart') || '[]');
    this.currentReportData = null;
    this.selectedPetId = null;
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
    // Implementation for appointments
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