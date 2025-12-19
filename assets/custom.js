(function() {
  'use strict';

  class VariantGalleryHandler {
    constructor() {
      this.galleryWrapper = document.querySelector('[data-product-gallery]');
      if (!this.galleryWrapper) return;

      this.imagesData = null;
      this.variantsData = null;
      this.showThumbnails = this.galleryWrapper.dataset.showThumbnails === 'true';
      this.isSingleVariant = this.galleryWrapper.dataset.singleVariant === 'true';
      this.currentSku = '';
      
      try {
        this.imagesData = JSON.parse(this.galleryWrapper.dataset.images);
      } catch (e) {
        return;
      }
      
      try {
        this.variantsData = JSON.parse(this.galleryWrapper.dataset.variants);
      } catch (e) {}

      this.init();
    }

    init() {
      const initialSku = this.galleryWrapper.dataset.currentSku;
      if (initialSku) {
        this.currentSku = initialSku.toLowerCase();
      }
      
      this.setupVariantListeners();
    }

    setupVariantListeners() {
      const skuElement = document.querySelector('[data-product-sku]');
      if (skuElement) {
        this.observeSkuChanges(skuElement);
      }

      const variantSelection = document.querySelector('variant-selection, [data-variant-selection]');
      if (variantSelection) {
        const variantObserver = new MutationObserver(() => {
          setTimeout(() => this.checkForVariantChange(), 150);
        });
        
        variantObserver.observe(variantSelection, {
          attributes: true,
          attributeFilter: ['variant']
        });
      }

      const variantInputs = document.querySelectorAll('input[name^="option"], select[name^="option"]');
      variantInputs.forEach(input => {
        input.addEventListener('change', () => {
          setTimeout(() => this.checkForVariantChange(), 150);
        });
      });

      const productForm = document.querySelector('[data-product-form]');
      if (productForm) {
        productForm.addEventListener('change', () => {
          setTimeout(() => this.checkForVariantChange(), 150);
        });
      }

      let lastUrl = location.href;
      new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
          lastUrl = url;
          this.checkForVariantChange();
        }
      }).observe(document, { subtree: true, childList: true });

      const variantEvents = ['variant:change', 'variantChange', 'variant-change'];
      variantEvents.forEach(eventName => {
        document.addEventListener(eventName, (e) => {
          if (e.detail && e.detail.variant && e.detail.variant.sku) {
            this.updateGallery(e.detail.variant.sku);
          } else {
            setTimeout(() => this.checkForVariantChange(), 100);
          }
        });
      });

      document.addEventListener('click', (e) => {
        const target = e.target;
        if (target.matches('input[type="radio"][name*="option"], input[type="radio"][name*="Option"]') ||
            target.closest('.options-selection__option-value')) {
          setTimeout(() => this.checkForVariantChange(), 200);
        }
      });
    }

    observeSkuChanges(skuElement) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' || mutation.type === 'characterData') {
            const newSku = skuElement.textContent.trim().toLowerCase();
            if (newSku && newSku !== this.currentSku) {
              this.updateGallery(newSku);
            }
          }
        });
      });

      observer.observe(skuElement, {
        characterData: true,
        childList: true,
        subtree: true
      });

      const initialSku = skuElement.textContent.trim().toLowerCase();
      if (initialSku) {
        this.currentSku = initialSku;
      }
    }

    checkForVariantChange() {
      const skuElement = document.querySelector('[data-product-sku]');
      if (skuElement) {
        const newSku = skuElement.textContent.trim().toLowerCase();
        if (newSku && newSku !== this.currentSku) {
          this.updateGallery(newSku);
          return;
        }
      }
      
      const variantSelection = document.querySelector('variant-selection, [data-variant-selection]');
      if (variantSelection) {
        const variantId = variantSelection.getAttribute('variant');
        if (variantId && variantId !== 'not-selected') {
          const variantSku = this.getSkuFromVariantId(variantId);
          if (variantSku && variantSku !== this.currentSku) {
            this.updateGallery(variantSku);
            return;
          }
        }
      }
      
      const urlParams = new URLSearchParams(window.location.search);
      const variantIdFromUrl = urlParams.get('variant');
      if (variantIdFromUrl) {
        const variantSku = this.getSkuFromVariantId(variantIdFromUrl);
        if (variantSku && variantSku !== this.currentSku) {
          this.updateGallery(variantSku);
        }
      }
    }
    
    getSkuFromVariantId(variantId) {
      if (this.variantsData) {
        const variant = this.variantsData.find(v => v.id == variantId);
        if (variant && variant.sku) {
          return variant.sku.toLowerCase();
        }
      }
      
      if (window.meta && window.meta.product && window.meta.product.variants) {
        const variant = window.meta.product.variants.find(v => v.id == variantId);
        if (variant && variant.sku) {
          return variant.sku.toLowerCase();
        }
      }
      
      if (window.theme && window.theme.product && window.theme.product.variants) {
        const variant = window.theme.product.variants.find(v => v.id == variantId);
        if (variant && variant.sku) {
          return variant.sku.toLowerCase();
        }
      }
      
      return null;
    }
    
    getSelectedOptionsFromInputs() {
      const options = {};
      const inputs = document.querySelectorAll('input[name*="option"]:checked, select[name*="option"]');
      
      inputs.forEach(input => {
        const value = input.value || (input.options && input.options[input.selectedIndex] ? input.options[input.selectedIndex].value : null);
        if (value) {
          options[input.name] = value;
        }
      });
      
      return Object.keys(options).length > 0 ? options : null;
    }
    
    getSkuFromOptions(options) {
      return null;
    }

    updateGallery(variantSku) {
      if (!this.imagesData) return;

      // If single variant product, show all images without filtering
      if (this.isSingleVariant) {
        this.rebuildSwiper(this.imagesData);
        return;
      }

      if (!variantSku) return;

      const normalizedSku = variantSku.toLowerCase().trim();
      this.currentSku = normalizedSku;

      const matchingImages = this.imagesData.filter(img => {
        return img.alt_lower && img.alt_lower.includes(normalizedSku);
      });

      if (matchingImages.length === 0) return;

      this.rebuildSwiper(matchingImages);
    }

    rebuildSwiper(images) {
      const currentHeight = this.galleryWrapper.offsetHeight;
      this.galleryWrapper.style.height = `${currentHeight}px`;
      this.galleryWrapper.style.overflow = 'hidden';
      
      this.galleryWrapper.classList.add('updating');
      
      this.preloadImages(images).then(() => {
        setTimeout(() => {
          if (window.productGallerySwiper) {
            if (window.productGallerySwiper.main) {
              window.productGallerySwiper.main.destroy(true, true);
            }
            if (window.productGallerySwiper.thumb) {
              window.productGallerySwiper.thumb.destroy(true, true);
            }
          }

          const mainWrapper = this.galleryWrapper.querySelector('[data-main-swiper-wrapper]');
          if (mainWrapper) {
            mainWrapper.innerHTML = this.generateSlidesHTML(images);
          }

          if (this.showThumbnails) {
            const thumbWrapper = this.galleryWrapper.querySelector('[data-thumb-swiper-wrapper]');
            if (thumbWrapper) {
              thumbWrapper.innerHTML = this.generateSlidesHTML(images);
            }
          }

          this.initializeSwiper(() => {
            this.galleryWrapper.classList.remove('updating');
            
            setTimeout(() => {
              this.galleryWrapper.style.height = '';
              this.galleryWrapper.style.overflow = '';
            }, 200);
          });
          
        }, 200);
      });
    }
    
    preloadImages(images) {
      const imagePromises = images.map(img => {
        return new Promise((resolve) => {
          const image = new Image();
          
          const timeout = setTimeout(() => {
            resolve();
          }, 3000);
          
          image.onload = () => {
            clearTimeout(timeout);
            resolve();
          };
          
          image.onerror = () => {
            clearTimeout(timeout);
            resolve();
          };
          
          image.src = img.url;
        });
      });
      
      return Promise.all(imagePromises);
    }

    generateSlidesHTML(images) {
      return images.map(img => `
        <div class="swiper-slide" data-image-id="${img.id}" data-alt="${img.alt || ''}">
          <img src="${img.url}" alt="${img.alt || ''}" loading="lazy">
        </div>
      `).join('');
    }

    initializeSwiper(onComplete) {
      setTimeout(() => {
        if (!window.productGallerySwiper) {
          window.productGallerySwiper = {};
        }

        if (this.showThumbnails) {
          window.productGallerySwiper.thumb = new Swiper(".mySwiper", {
            spaceBetween: 10,
            slidesPerView: 5,
            freeMode: true,
            watchSlidesProgress: true,
            speed: 300,
          });
        }

        window.productGallerySwiper.main = new Swiper(".mySwiper2", {
          spaceBetween: 10,
          speed: 300,
          navigation: {
            nextEl: ".swiper-button-next",
            prevEl: ".swiper-button-prev",
          },
          thumbs: this.showThumbnails ? {
            swiper: window.productGallerySwiper.thumb,
          } : undefined,
          on: {
            init: function() {
              setTimeout(() => {
                if (onComplete) onComplete();
              }, 100);
            }
          }
        });

      }, 50);
    }
  }

  class ImageZoomHandler {
    constructor() {
      this.currentSlide = null;
      this.zoomLevel = 2;
      this.init();
    }

    init() {
      this.attachEventListeners();
    }

    attachEventListeners() {
      document.addEventListener('mouseenter', (e) => {
        if (!e.target || !e.target.closest) return;
        const slide = e.target.closest('.mySwiper2 .swiper-slide:not(.swiper-slide-duplicate)');
        if (slide && !e.target.closest('.swiper-button-next, .swiper-button-prev')) {
          this.enableZoom(slide);
        }
      }, true);

      document.addEventListener('mouseleave', (e) => {
        if (!e.target || !e.target.closest) return;
        const slide = e.target.closest('.mySwiper2 .swiper-slide');
        if (slide) {
          this.disableZoom(slide);
        }
      }, true);
    }

    enableZoom(slide) {
      this.currentSlide = slide;
      const img = slide.querySelector('img');
      if (!img) return;

      slide.classList.add('zoom-active');

      const moveZoom = (e) => {
        const rect = slide.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        img.style.transformOrigin = `${x}% ${y}%`;
        img.style.transform = `scale(${this.zoomLevel})`;
      };

      slide.addEventListener('mousemove', moveZoom);
      this.currentMoveZoom = moveZoom;
    }

    disableZoom(slide) {
      const img = slide.querySelector('img');
      if (!img) return;

      slide.classList.remove('zoom-active');
      img.style.transform = 'scale(1)';
      img.style.transformOrigin = 'center center';
      
      if (this.currentMoveZoom) {
        slide.removeEventListener('mousemove', this.currentMoveZoom);
      }
    }
  }

  class ProductDescriptionAccordion {
    constructor() {
      this.init();
    }

    init() {
      const descriptionWrapper = document.querySelector('.product__description');
      if (!descriptionWrapper) return;

      // Look for tab structure in the description
      const tabsUl = descriptionWrapper.querySelector('ul.tabs');
      const tabsContentUl = descriptionWrapper.querySelector('ul.tabs-content');
      
      if (!tabsUl || !tabsContentUl) return;

      // Get tab labels
      const tabLabels = Array.from(tabsUl.querySelectorAll('li a')).map(link => ({
        href: link.getAttribute('href'),
        text: link.textContent.trim()
      }));

      // Get tab contents
      const tabContents = Array.from(tabsContentUl.querySelectorAll('li[id^="tab"]')).map(tab => ({
        id: tab.getAttribute('id'),
        content: tab.innerHTML
      }));

      // Create accordion structure
      const accordionHTML = tabLabels.map((label, index) => {
        const tabId = label.href.replace('#', '');
        const content = tabContents.find(t => t.id === tabId);
        if (!content) return '';

        const isFirst = index === 0;
        return `
          <dl class="accordion">
            <dt>
              <a href="#" class="${isFirst ? 'active' : ''}" aria-controls="panel-${tabId}" aria-expanded="${isFirst}">
                <small></small>
                ${label.text}
              </a>
            </dt>
            <dd id="panel-${tabId}" class="${isFirst ? 'active' : ''}" aria-hidden="${!isFirst}">
              ${content.content}
            </dd>
          </dl>
        `;
      }).join('');

      // Replace the tabs with accordion
      descriptionWrapper.innerHTML = accordionHTML;

      // Add event listeners to accordion links
      this.attachAccordionListeners(descriptionWrapper);
    }

    attachAccordionListeners(wrapper) {
      const accordionLinks = wrapper.querySelectorAll('.accordion dt a');
      
      accordionLinks.forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          this.toggleAccordion(link);
        });
      });
    }

    toggleAccordion(link) {
      const dt = link.parentElement;
      const dd = dt.nextElementSibling;
      const isExpanded = link.getAttribute('aria-expanded') === 'true';

      if (isExpanded) {
        link.setAttribute('aria-expanded', 'false');
        link.classList.remove('active');
        dd.setAttribute('aria-hidden', 'true');
        dd.classList.remove('active');
      } else {
        link.setAttribute('aria-expanded', 'true');
        link.classList.add('active');
        dd.setAttribute('aria-hidden', 'false');
        dd.classList.add('active');
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new VariantGalleryHandler();
      new ImageZoomHandler();
      new ProductDescriptionAccordion();
    });
  } else {
    new VariantGalleryHandler();
    new ImageZoomHandler();
    new ProductDescriptionAccordion();
  }

})();
