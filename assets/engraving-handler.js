(function() {
  'use strict';

  class EngravingHandler {
    constructor() {
      this.form = document.querySelector('[data-product-form]');
      this.engravingInput = document.querySelector('[data-engraving-input]');
      this.engravingInputWrapper = document.querySelector('[data-engraving-input-wrapper]');
      this.engravingYes = document.querySelector('[data-engraving-yes]');
      this.engravingNo = document.querySelector('[data-engraving-no]');
      
      if (!this.form || !this.engravingInput || !this.engravingInputWrapper || !this.engravingYes || !this.engravingNo) {
        return;
      }

      this.addToCartButton = this.form.querySelector('[data-product-atc]') || 
                             this.form.querySelector('button[name="add"]') ||
                             this.form.querySelector('.add_to_cart');
      
      if (!this.addToCartButton) {
        return;
      }

      this.variantSelector = document.querySelector('[data-variants]');
      this.variantSelection = document.querySelector('variant-selection');
      this.engravingVariantsMap = {};

      const dataScript = document.querySelector('[data-engraving-variants]');
      if (dataScript) {
        try {
          const data = JSON.parse(dataScript.textContent);
          if (data.variants && Array.isArray(data.variants)) {
            data.variants.forEach((item) => {
              if (item.variantData) {
                const variantId = item.variantData.variantId;
                const engravingId = item.variantData.variantEngravingId;
                if (variantId && engravingId) {
                  this.engravingVariantsMap[variantId] = engravingId;
                }
              }
            });
          }
        } catch (e) {
          this.engravingVariantsMap = {};
        }
      }

      this.setupToggleHandlers();
      this.init();
    }

    setupToggleHandlers() {
      const yesOption = this.engravingYes.closest('.options-selection__option-value');
      const noOption = this.engravingNo.closest('.options-selection__option-value');

      this.engravingYes.addEventListener('change', () => {
        if (this.engravingYes.checked) {
          this.engravingInputWrapper.style.display = 'block';
          yesOption.classList.add('options-selection__option-value--selected');
          noOption.classList.remove('options-selection__option-value--selected');
        }
      });

      this.engravingNo.addEventListener('change', () => {
        if (this.engravingNo.checked) {
          this.engravingInputWrapper.style.display = 'none';
          this.engravingInput.value = '';
          noOption.classList.add('options-selection__option-value--selected');
          yesOption.classList.remove('options-selection__option-value--selected');
        }
      });

      noOption.classList.add('options-selection__option-value--selected');
      yesOption.classList.remove('options-selection__option-value--selected');
    }

    shouldUseCustomHandler() {
      if (!this.engravingYes.checked) return false;
      
      const engravingText = this.engravingInput.value.trim();
      if (!engravingText) return false;
      
      const currentVariantId = this.getCurrentVariantId();
      if (!currentVariantId) return false;
      
      return this.getEngravingServiceVariantId(currentVariantId) !== null;
    }

    init() {
      const isAjaxMode = this.addToCartButton.type === 'button';
      
      if (isAjaxMode) {
        this.addToCartButton.addEventListener('click', (e) => {
          if (this.shouldUseCustomHandler()) {
            e.preventDefault();
            e.stopPropagation();
            this.handleAjaxSubmit(e);
          }
        });
      } else {
        this.form.addEventListener('submit', (e) => {
          if (this.shouldUseCustomHandler()) {
            this.handleFormSubmit(e);
          }
        });
      }
    }

    getCurrentVariantId() {
      if (this.variantSelection) {
        const variantId = this.variantSelection.getAttribute('variant');
        if (variantId && variantId !== 'not-selected') {
          return variantId;
        }
      }

      if (this.variantSelector) {
        const value = this.variantSelector.value;
        if (value && value !== 'not-selected') {
          return value;
        }
      }

      return null;
    }

    getEngravingServiceVariantId(currentVariantId) {
      if (!currentVariantId) return null;
      return this.engravingVariantsMap[currentVariantId] || null;
    }

    getEngravingText() {
      return this.engravingInput.value.trim();
    }

    showLoading() {
      if (this.addToCartButton) {
        this.addToCartButton.disabled = true;
        this.addToCartButton.classList.add('cart-drawer--loading');
      }
    }

    hideLoading() {
      if (this.addToCartButton) {
        this.addToCartButton.disabled = false;
        this.addToCartButton.classList.remove('cart-drawer--loading');
      }
    }

    async handleAjaxSubmit(e) {
      e.preventDefault();
      e.stopPropagation();

      const engravingText = this.getEngravingText();
      const currentVariantId = this.getCurrentVariantId();

      if (!currentVariantId) {
        alert('Please select a variant');
        return;
      }

      this.showLoading();

      try {
        const formData = new FormData(this.form);
        const items = [];
        const mainVariantId = parseInt(currentVariantId, 10);
        const quantity = parseInt(formData.get('quantity') || 1, 10);

        if (isNaN(mainVariantId) || mainVariantId <= 0) {
          throw new Error(`Invalid main variant ID: ${currentVariantId}`);
        }

        const mainItem = {
          id: mainVariantId,
          quantity: quantity
        };

        if (engravingText) {
          mainItem.properties = { 'Engraving': engravingText };
        }

        items.push(mainItem);

        if (engravingText) {
          const engravingServiceVariantId = this.getEngravingServiceVariantId(currentVariantId);
          
          if (engravingServiceVariantId) {
            const serviceVariantId = parseInt(engravingServiceVariantId, 10);
            
            if (isNaN(serviceVariantId) || serviceVariantId <= 0) {
              throw new Error(`Invalid engraving service variant ID: ${engravingServiceVariantId}`);
            }
            
            if (serviceVariantId === mainVariantId) {
              throw new Error(`Configuration error: Engraving service variant ID is the same as the main product variant ID.`);
            }
            
            items.push({
              id: serviceVariantId,
              quantity: 1
            });
          }
        }

        items.forEach((item) => {
          if (typeof item.id !== 'number' || item.id <= 0) {
            throw new Error(`Item has invalid ID: ${item.id}`);
          }
        });

        const cartUrl = window.Shopify.routes.root + 'cart/add.js';
        let result;
        
        const batchResponse = await fetch(cartUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: JSON.stringify({ items: items })
        });

        const batchResponseText = await batchResponse.text();

        if (batchResponse.ok) {
          try {
            result = JSON.parse(batchResponseText);
          } catch (e) {
            throw new Error('Invalid response from cart API');
          }
        } else {
          const results = [];
          const errors = [];
          
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const response = await fetch(cartUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
              },
              body: JSON.stringify(item)
            });

            const responseText = await response.text();

            if (!response.ok) {
              let error;
              try {
                error = JSON.parse(responseText);
              } catch (e) {
                error = { message: responseText };
              }
              
              const errorMessage = error.description || error.message || error.errors || responseText;
              
              if (errorMessage && errorMessage.includes('maximum quantity')) {
                errors.push({ item: i + 1, error: errorMessage });
                
                if (i === 0 && items.length > 1) {
                  continue;
                } else if (i === items.length - 1 && results.length === 0) {
                  throw new Error(errorMessage);
                }
                continue;
              }
              
              throw new Error(errorMessage);
            }

            try {
              results.push(JSON.parse(responseText));
            } catch (e) {
              throw new Error(`Invalid response from cart API for item ${i + 1}`);
            }
          }
          
          if (results.length === 0) {
            const firstError = errors.length > 0 ? errors[0].error : 'Failed to add items to cart';
            throw new Error(firstError);
          }
          
          result = {
            items: results,
            item_count: results.reduce((sum, r) => sum + (r.item_count || 1), 0)
          };
        }
        
        document.dispatchEvent(new CustomEvent('cart:updated', { 
          detail: { items: result.items || result } 
        }));

        if (window.PXUTheme && window.PXUTheme.cartDrawer && window.PXUTheme.cartDrawer.loadDrawer) {
          window.PXUTheme.cartDrawer.loadDrawer(true);
        } else {
          window.location.href = window.Shopify.routes.root + 'cart';
        }

      } catch (error) {
        alert(error.message || 'Failed to add items to cart. Please try again.');
      } finally {
        this.hideLoading();
      }
    }

    async handleFormSubmit(e) {
      const engravingText = this.getEngravingText();
      
      if (!engravingText) {
        return true;
      }

      e.preventDefault();
      e.stopPropagation();

      const currentVariantId = this.getCurrentVariantId();
      const engravingServiceVariantId = this.getEngravingServiceVariantId(currentVariantId);

      if (!engravingServiceVariantId) {
        this.form.submit();
        return;
      }

      this.showLoading();

      try {
        const formData = new FormData(this.form);
        const items = [];
        const mainVariantId = parseInt(currentVariantId, 10);
        const serviceVariantId = parseInt(engravingServiceVariantId, 10);
        const quantity = parseInt(formData.get('quantity') || 1, 10);

        items.push({
          id: mainVariantId,
          quantity: quantity,
          properties: { 'Engraving': engravingText }
        });

        if (!isNaN(serviceVariantId) && serviceVariantId > 0 && serviceVariantId !== mainVariantId) {
          items.push({
            id: serviceVariantId,
            quantity: 1
          });
        }

        const cartUrl = window.Shopify.routes.root + 'cart/add.js';
        let result;
        
        const batchResponse = await fetch(cartUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: JSON.stringify({ items: items })
        });

        const batchResponseText = await batchResponse.text();

        if (batchResponse.ok) {
          try {
            result = JSON.parse(batchResponseText);
          } catch (e) {
            throw new Error('Invalid response from cart API');
          }
        } else {
          const results = [];
          const errors = [];
          
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const response = await fetch(cartUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
              },
              body: JSON.stringify(item)
            });

            const responseText = await response.text();

            if (!response.ok) {
              let error;
              try {
                error = JSON.parse(responseText);
              } catch (e) {
                error = { message: responseText };
              }
              
              const errorMessage = error.description || error.message || error.errors || responseText;
              
              if (errorMessage && errorMessage.includes('maximum quantity')) {
                errors.push({ item: i + 1, error: errorMessage });
                continue;
              }
              
              throw new Error(errorMessage);
            }

            try {
              results.push(JSON.parse(responseText));
            } catch (e) {
              throw new Error(`Invalid response from cart API for item ${i + 1}`);
            }
          }
          
          if (results.length === 0 && errors.length > 0) {
            throw new Error(errors[0].error || 'Failed to add items to cart');
          }
          
          result = {
            items: results,
            item_count: results.reduce((sum, r) => sum + (r.item_count || 1), 0)
          };
        }

        const returnTo = formData.get('return_to');
        
        if (returnTo === 'back') {
          window.location.href = window.location.href;
        } else if (returnTo && returnTo.includes('checkout')) {
          window.location.href = returnTo;
        } else {
          window.location.href = window.Shopify.routes.root + 'cart';
        }

      } catch (error) {
        alert(error.message || 'Failed to add items to cart. Please try again.');
        this.hideLoading();
      }
    }
  }

  function initializeEngravingHandler() {
    const engravingInput = document.querySelector('[data-engraving-input]');
    if (engravingInput) {
      new EngravingHandler();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeEngravingHandler);
  } else {
    initializeEngravingHandler();
  }

  window.EngravingHandler = EngravingHandler;
})();
