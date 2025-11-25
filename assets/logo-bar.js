(function() {
  'use strict';
  
  class LogoBar {
    constructor(container) {
      this.container = container;
      this.items = container.querySelectorAll('.logo-bar__item');
      this.activePopup = null;
      this.init();
    }
    
    init() {
      this.items.forEach(item => {
        const blockId = item.dataset.blockId;
        const popup = item.querySelector(`[data-popup-id="${blockId}"]`);
        
        if (popup) {
          const link = item.querySelector('.logo-bar__link');
          const closeBtn = popup.querySelector('.logo-bar__popup-close');
          const backdrop = popup.querySelector('.logo-bar__popup-backdrop');
          
          // Open popup on item click (but not if clicking the link)
          item.addEventListener('click', (e) => {
            if (!link || !link.contains(e.target)) {
              e.preventDefault();
              this.openPopup(popup);
            }
          });
          
          // Close handlers
          if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closePopup(popup));
          }
          
          if (backdrop) {
            backdrop.addEventListener('click', () => this.closePopup(popup));
          }
        }
      });
      
      // Close on ESC key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.activePopup) {
          this.closePopup(this.activePopup);
        }
      });
    }
    
    openPopup(popup) {
      if (this.activePopup) {
        this.closePopup(this.activePopup);
      }
      
      this.activePopup = popup;
      popup.setAttribute('aria-hidden', 'false');
      popup.classList.add('is-active');
      document.body.style.overflow = 'hidden';
      
      // Pause animations
      this.items.forEach(item => {
        item.style.animationPlayState = 'paused';
      });
    }
    
    closePopup(popup) {
      if (!popup) return;
      
      popup.setAttribute('aria-hidden', 'true');
      popup.classList.remove('is-active');
      document.body.style.overflow = '';
      this.activePopup = null;
      
      // Resume animations
      this.items.forEach(item => {
        item.style.animationPlayState = 'running';
      });
    }
  }
  
  // Initialize all logo bars on the page
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.logo-bar').forEach(container => {
      new LogoBar(container);
    });
  });
})();

