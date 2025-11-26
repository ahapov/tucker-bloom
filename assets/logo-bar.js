(function() {
  'use strict';
  
  class LogoBar {
    constructor(container) {
      this.container = container;
      this.items = container.querySelectorAll('.logo-bar__item');
      this.activePopup = null;
      this.scrollPosition = 0;
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

          // Open popup on item click
          item.addEventListener('click', (e) => {
            const isLinkClick = link && link.contains(e.target);
            const isInsidePopup = !!e.target.closest('.logo-bar__popup');
            const isCloseButton = !!e.target.closest('.logo-bar__popup-close');
            const isBackdrop = !!e.target.closest('.logo-bar__popup-backdrop');

            if (isLinkClick || isInsidePopup || isCloseButton || isBackdrop) {
              return;
            }

            if (popup) {
              e.preventDefault();
              this.openPopup(popup);
            }
          });

          // Close handlers
          if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              this.closePopup(popup);
            });
          }

          if (backdrop) {
            backdrop.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              this.closePopup(popup);
            });
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
      
      // Save current scroll position
      this.scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
      
      this.activePopup = popup;
      popup.setAttribute('aria-hidden', 'false');
      popup.classList.add('is-active');
      
      // Lock body scroll and preserve scroll position
      document.body.classList.add('modal-open');
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${this.scrollPosition}px`;
      document.body.style.width = '100%';
      
      // Pause animations
      this.items.forEach(item => {
        item.style.animationPlayState = 'paused';
      });
      
      // Move popup to body to escape any stacking context issues
      if (popup.parentElement !== document.body) {
        document.body.appendChild(popup);
      }
    }
    
    closePopup(popup) {
      if (!popup) return;
      
      popup.setAttribute('aria-hidden', 'true');
      popup.classList.remove('is-active');
      
      // Restore body scroll and scroll position
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      
      // Restore scroll position
      window.scrollTo(0, this.scrollPosition);
      
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