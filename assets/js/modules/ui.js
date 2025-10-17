// Enhanced UI Module - Handles all UI interactions and animations
// Scroll-triggered Animation System
class AnimationController {
  constructor() {
    this.observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };
    this.staggerDelay = 100;
    this.init();
  }

  init() {
    this.setupScrollAnimations();
    this.setupIntersectionObserver();
    this.optimizeForDevice();
  }

  setupScrollAnimations() {
    // Add scroll-animate class to elements that should animate on scroll
    const animateElements = document.querySelectorAll('[data-animate]');
    animateElements.forEach((element, index) => {
      element.classList.add('scroll-animate');
      element.style.animationDelay = `${index * this.staggerDelay}ms`;
    });
  }

  setupIntersectionObserver() {
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.triggerAnimation(entry.target);
          }
        });
      }, this.observerOptions);

      // Observe all scroll-animate elements
      document.querySelectorAll('.scroll-animate').forEach(el => {
        this.observer.observe(el);
      });
    }
  }

  triggerAnimation(element) {
    element.classList.add('animate-in');

    // Add stagger effect for multiple elements
    if (element.classList.contains('stagger-item')) {
      const siblings = Array.from(element.parentNode.children)
        .filter(child => child.classList.contains('stagger-item'));
      const index = siblings.indexOf(element);
      element.style.animationDelay = `${index * this.staggerDelay}ms`;
    }

    // Unobserve after animation to improve performance
    if (this.observer) {
      this.observer.unobserve(element);
    }
  }

  optimizeForDevice() {
    // Detect if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.innerWidth <= 768;

    if (prefersReducedMotion) {
      document.body.classList.add('reduce-motion');
    }

    if (isMobile) {
      document.body.classList.add('mobile-optimized');
      this.reduceAnimationComplexity();
    }
  }

  reduceAnimationComplexity() {
    // Reduce animation durations and complexity for better mobile performance
    const style = document.createElement('style');
    style.textContent = `
      .mobile-optimized .animate-fade-in-up,
      .mobile-optimized .animate-fade-in-left,
      .mobile-optimized .animate-fade-in-right,
      .mobile-optimized .animate-scale-in,
      .mobile-optimized .animate-bounce-in {
        animation-duration: 0.6s !important;
      }

      .mobile-optimized .hover-lift:hover,
      .mobile-optimized .hover-glow:hover,
      .mobile-optimized .hover-scale:hover {
        transform: translateY(-2px) scale(1.01) !important;
      }
    `;
    document.head.appendChild(style);
  }

  // Utility method to animate elements programmatically
  animateElement(element, animationClass, delay = 0) {
    setTimeout(() => {
      element.classList.add(animationClass);
    }, delay);
  }

  // Batch animation for multiple elements
  animateBatch(elements, animationClass, staggerDelay = 100) {
    elements.forEach((element, index) => {
      this.animateElement(element, animationClass, index * staggerDelay);
    });
  }
}

// Loading State Manager
class LoadingManager {
  constructor() {
    this.loadingStates = new Map();
  }

  showLoading(element, type = 'spinner') {
    const loadingId = `loading-${Date.now()}-${Math.random()}`;
    element.classList.add('loading');

    let loadingHTML = '';

    switch (type) {
      case 'spinner':
        loadingHTML = '<div class="loading-spinner"></div>';
        break;
      case 'dots':
        loadingHTML = '<div class="loading-dots"><div></div><div></div><div></div><div></div></div>';
        break;
      case 'pulse':
        loadingHTML = '<div class="loading-pulse">Loading...</div>';
        break;
      case 'shimmer':
        element.classList.add('loading-shimmer');
        break;
    }

    if (loadingHTML) {
      element.innerHTML = loadingHTML;
    }

    this.loadingStates.set(element, loadingId);
    return loadingId;
  }

  hideLoading(element) {
    element.classList.remove('loading');
    element.classList.remove('loading-shimmer');

    if (this.loadingStates.has(element)) {
      this.loadingStates.delete(element);
    }
  }

  showSkeleton(element) {
    element.classList.add('skeleton');
  }

  hideSkeleton(element) {
    element.classList.remove('skeleton');
  }
}

// Enhanced Toast System
class ToastManager {
  constructor() {
    this.container = null;
    this.createContainer();
  }

  createContainer() {
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    this.container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
    `;
    document.body.appendChild(this.container);
  }

  show(message, type = 'info', duration = 4000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-icon">
        <i class="fas fa-${this.getIcon(type)}"></i>
      </div>
      <div class="toast-message">${message}</div>
    `;

    this.container.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 100);

    // Auto remove
    setTimeout(() => {
      this.removeToast(toast);
    }, duration);

    return toast;
  }

  getIcon(type) {
    const icons = {
      success: 'check-circle',
      error: 'exclamation-circle',
      warning: 'exclamation-triangle',
      info: 'info-circle'
    };
    return icons[type] || 'info-circle';
  }

  removeToast(toast) {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }

  success(message, duration) { return this.show(message, 'success', duration); }
  error(message, duration) { return this.show(message, 'error', duration); }
  warning(message, duration) { return this.show(message, 'warning', duration); }
  info(message, duration) { return this.show(message, 'info', duration); }
}

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
    },

    // Enhanced Animation Methods
    animateOnScroll(element) {
        if (window.animationController) {
            window.animationController.triggerAnimation(element);
        }
    },

    animateBatch(elements, animationClass, staggerDelay = 100) {
        if (window.animationController) {
            window.animationController.animateBatch(elements, animationClass, staggerDelay);
        }
    },

    // Enhanced Loading Methods
    showAdvancedLoading(element, type = 'spinner') {
        if (window.loadingManager) {
            return window.loadingManager.showLoading(element, type);
        }
    },

    hideAdvancedLoading(element) {
        if (window.loadingManager) {
            window.loadingManager.hideLoading(element);
        }
    },

    showSkeleton(element) {
        if (window.loadingManager) {
            window.loadingManager.showSkeleton(element);
        }
    },

    hideSkeleton(element) {
        if (window.loadingManager) {
            window.loadingManager.hideSkeleton(element);
        }
    },

    // Enhanced Toast Methods
    showSuccessToast(message, duration = 4000) {
        if (window.toastManager) {
            return window.toastManager.success(message, duration);
        }
    },

    showErrorToast(message, duration = 4000) {
        if (window.toastManager) {
            return window.toastManager.error(message, duration);
        }
    },

    showWarningToast(message, duration = 4000) {
        if (window.toastManager) {
            return window.toastManager.warning(message, duration);
        }
    },

    showInfoToast(message, duration = 4000) {
        if (window.toastManager) {
            return window.toastManager.info(message, duration);
        }
    },

    // Utility method to initialize animations on page load
    initAnimations() {
        // Add entrance animations to cards and sections
        const cards = document.querySelectorAll('.pet-card, .dashboard-card, .service-list span');
        cards.forEach((card, index) => {
            card.style.animationDelay = `${index * 100}ms`;
            card.classList.add('animate-fade-in-up');
        });

        // Add stagger animations to grid items
        const gridItems = document.querySelectorAll('.pets-grid .pet-card, .products-grid .product-card');
        gridItems.forEach((item, index) => {
            item.classList.add('stagger-item');
        });

        // Initialize scroll animations for content sections
        const sections = document.querySelectorAll('.services, .contact, .store-section');
        sections.forEach(section => {
            section.classList.add('scroll-animate');
        });
    }
};

// Initialize animations when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize animation controllers
    window.animationController = new AnimationController();
    window.loadingManager = new LoadingManager();
    window.toastManager = new ToastManager();

    // Initialize animations
    UI.initAnimations();

    // Setup performance monitoring
    if (typeof PerformanceMonitor !== 'undefined') {
        window.performanceMonitor = new PerformanceMonitor();
    }
});