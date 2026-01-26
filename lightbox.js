// HubSpot Image Lightbox
// Opens images in ticket conversations in a lightbox overlay

(function() {
  'use strict';

  // ============================================
  // CONFIGURATION
  // ============================================
  
  const LIGHTBOX_CONFIG = {
    enabled: true,
    // Minimum image size to trigger lightbox (skip tiny icons)
    minWidth: 100,
    minHeight: 100,
    // Zoom levels
    zoomLevels: [1, 1.5, 2, 3],
  };

  // ============================================
  // LIGHTBOX HTML/CSS
  // ============================================

  function createLightboxElements() {
    // Check if already created
    if (document.getElementById('hs-lightbox-overlay')) return;

    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'hs-lightbox-overlay';
    overlay.innerHTML = `
      <div class="hs-lightbox-container">
        <img class="hs-lightbox-image" src="" alt="Lightbox image">
        <div class="hs-lightbox-controls">
          <button class="hs-lightbox-btn hs-lightbox-zoom-out" title="Zoom out">−</button>
          <span class="hs-lightbox-zoom-level">100%</span>
          <button class="hs-lightbox-btn hs-lightbox-zoom-in" title="Zoom in">+</button>
          <button class="hs-lightbox-btn hs-lightbox-reset" title="Reset zoom">↺</button>
          <button class="hs-lightbox-btn hs-lightbox-newtab" title="Open in new tab">↗</button>
          <button class="hs-lightbox-btn hs-lightbox-close" title="Close (Esc)">✕</button>
        </div>
        <div class="hs-lightbox-nav">
          <button class="hs-lightbox-btn hs-lightbox-prev" title="Previous image">‹</button>
          <button class="hs-lightbox-btn hs-lightbox-next" title="Next image">›</button>
        </div>
        <div class="hs-lightbox-counter"></div>
      </div>
    `;

    // Add styles
    const styles = document.createElement('style');
    styles.id = 'hs-lightbox-styles';
    styles.textContent = `
      #hs-lightbox-overlay {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        z-index: 999999;
        justify-content: center;
        align-items: center;
        cursor: zoom-out;
      }

      #hs-lightbox-overlay.active {
        display: flex;
      }

      .hs-lightbox-container {
        position: relative;
        max-width: 95vw;
        max-height: 95vh;
        display: flex;
        justify-content: center;
        align-items: center;
      }

      .hs-lightbox-image {
        max-width: 95vw;
        max-height: 90vh;
        object-fit: contain;
        cursor: grab;
        transition: transform 0.2s ease;
        border-radius: 4px;
        box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);
      }

      .hs-lightbox-image.dragging {
        cursor: grabbing;
        transition: none;
      }

      .hs-lightbox-controls {
        position: fixed;
        top: 20px;
        right: 20px;
        display: flex;
        gap: 8px;
        background: rgba(0, 0, 0, 0.7);
        padding: 8px 12px;
        border-radius: 8px;
        z-index: 1000001;
      }

      .hs-lightbox-btn {
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: white;
        width: 36px;
        height: 36px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }

      .hs-lightbox-btn:hover {
        background: rgba(255, 255, 255, 0.25);
      }

      .hs-lightbox-close {
        background: rgba(255, 71, 87, 0.3);
      }

      .hs-lightbox-close:hover {
        background: rgba(255, 71, 87, 0.6);
      }

      .hs-lightbox-zoom-level {
        color: white;
        font-size: 14px;
        min-width: 50px;
        text-align: center;
        line-height: 36px;
      }

      .hs-lightbox-nav {
        position: fixed;
        top: 50%;
        left: 0;
        right: 0;
        transform: translateY(-50%);
        display: flex;
        justify-content: space-between;
        padding: 0 20px;
        pointer-events: none;
        z-index: 1000001;
      }

      .hs-lightbox-nav .hs-lightbox-btn {
        pointer-events: auto;
        width: 50px;
        height: 50px;
        font-size: 28px;
        background: rgba(0, 0, 0, 0.5);
      }

      .hs-lightbox-nav .hs-lightbox-btn:hover {
        background: rgba(0, 0, 0, 0.8);
      }

      .hs-lightbox-nav .hs-lightbox-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }

      .hs-lightbox-counter {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        color: white;
        font-size: 14px;
        background: rgba(0, 0, 0, 0.7);
        padding: 8px 16px;
        border-radius: 20px;
      }

      /* Make images in conversations clickable */
      .hs-clickable-image {
        cursor: zoom-in !important;
        transition: opacity 0.2s, box-shadow 0.2s;
      }

      .hs-clickable-image:hover {
        opacity: 0.9;
        box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.5);
      }
    `;

    document.head.appendChild(styles);
    document.body.appendChild(overlay);

    // Set up event listeners
    setupLightboxEvents();
  }

  // ============================================
  // LIGHTBOX STATE
  // ============================================

  let currentImages = [];
  let currentIndex = 0;
  let currentZoom = 1;
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };
  let imageOffset = { x: 0, y: 0 };

  // ============================================
  // LIGHTBOX FUNCTIONS
  // ============================================

  function openLightbox(imageSrc, allImages = [], startIndex = 0) {
    createLightboxElements();
    
    const overlay = document.getElementById('hs-lightbox-overlay');
    const img = overlay.querySelector('.hs-lightbox-image');
    
    currentImages = allImages.length > 0 ? allImages : [imageSrc];
    currentIndex = startIndex;
    currentZoom = 1;
    imageOffset = { x: 0, y: 0 };
    
    loadCurrentImage();
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    updateNavigation();
    updateZoomDisplay();
    
    console.log('🖼️ Lightbox opened:', imageSrc);
  }

  function closeLightbox() {
    const overlay = document.getElementById('hs-lightbox-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
      resetImagePosition();
    }
  }

  function loadCurrentImage() {
    const overlay = document.getElementById('hs-lightbox-overlay');
    const img = overlay.querySelector('.hs-lightbox-image');
    const counter = overlay.querySelector('.hs-lightbox-counter');
    
    img.src = currentImages[currentIndex];
    resetImagePosition();
    
    if (currentImages.length > 1) {
      counter.textContent = `${currentIndex + 1} / ${currentImages.length}`;
      counter.style.display = 'block';
    } else {
      counter.style.display = 'none';
    }
  }

  function nextImage() {
    if (currentIndex < currentImages.length - 1) {
      currentIndex++;
      loadCurrentImage();
      updateNavigation();
    }
  }

  function prevImage() {
    if (currentIndex > 0) {
      currentIndex--;
      loadCurrentImage();
      updateNavigation();
    }
  }

  function updateNavigation() {
    const overlay = document.getElementById('hs-lightbox-overlay');
    const prevBtn = overlay.querySelector('.hs-lightbox-prev');
    const nextBtn = overlay.querySelector('.hs-lightbox-next');
    
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex === currentImages.length - 1;
    
    // Hide nav if only one image
    const nav = overlay.querySelector('.hs-lightbox-nav');
    nav.style.display = currentImages.length > 1 ? 'flex' : 'none';
  }

  function zoomIn() {
    const levels = LIGHTBOX_CONFIG.zoomLevels;
    const currentLevelIndex = levels.indexOf(currentZoom);
    if (currentLevelIndex < levels.length - 1) {
      currentZoom = levels[currentLevelIndex + 1];
    } else if (currentLevelIndex === -1) {
      // Find next higher level
      currentZoom = levels.find(l => l > currentZoom) || levels[levels.length - 1];
    }
    applyZoom();
  }

  function zoomOut() {
    const levels = LIGHTBOX_CONFIG.zoomLevels;
    const currentLevelIndex = levels.indexOf(currentZoom);
    if (currentLevelIndex > 0) {
      currentZoom = levels[currentLevelIndex - 1];
    } else if (currentLevelIndex === -1) {
      // Find next lower level
      currentZoom = [...levels].reverse().find(l => l < currentZoom) || levels[0];
    }
    applyZoom();
  }

  function resetZoom() {
    currentZoom = 1;
    imageOffset = { x: 0, y: 0 };
    applyZoom();
  }

  function applyZoom() {
    const overlay = document.getElementById('hs-lightbox-overlay');
    const img = overlay.querySelector('.hs-lightbox-image');
    img.style.transform = `scale(${currentZoom}) translate(${imageOffset.x}px, ${imageOffset.y}px)`;
    updateZoomDisplay();
  }

  function updateZoomDisplay() {
    const overlay = document.getElementById('hs-lightbox-overlay');
    const zoomLevel = overlay.querySelector('.hs-lightbox-zoom-level');
    zoomLevel.textContent = `${Math.round(currentZoom * 100)}%`;
  }

  function resetImagePosition() {
    currentZoom = 1;
    imageOffset = { x: 0, y: 0 };
    const overlay = document.getElementById('hs-lightbox-overlay');
    const img = overlay.querySelector('.hs-lightbox-image');
    img.style.transform = '';
    updateZoomDisplay();
  }

  function openInNewTab() {
    window.open(currentImages[currentIndex], '_blank');
  }

  // ============================================
  // EVENT HANDLERS
  // ============================================

  function setupLightboxEvents() {
    const overlay = document.getElementById('hs-lightbox-overlay');
    const img = overlay.querySelector('.hs-lightbox-image');

    // Close on overlay click (not on image)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target.classList.contains('hs-lightbox-container')) {
        closeLightbox();
      }
    });

    // Prevent closing when clicking image
    img.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // Button handlers
    overlay.querySelector('.hs-lightbox-close').addEventListener('click', closeLightbox);
    overlay.querySelector('.hs-lightbox-zoom-in').addEventListener('click', zoomIn);
    overlay.querySelector('.hs-lightbox-zoom-out').addEventListener('click', zoomOut);
    overlay.querySelector('.hs-lightbox-reset').addEventListener('click', resetZoom);
    overlay.querySelector('.hs-lightbox-newtab').addEventListener('click', openInNewTab);
    overlay.querySelector('.hs-lightbox-prev').addEventListener('click', prevImage);
    overlay.querySelector('.hs-lightbox-next').addEventListener('click', nextImage);

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (!overlay.classList.contains('active')) return;
      
      switch (e.key) {
        case 'Escape':
          closeLightbox();
          break;
        case 'ArrowLeft':
          prevImage();
          break;
        case 'ArrowRight':
          nextImage();
          break;
        case '+':
        case '=':
          zoomIn();
          break;
        case '-':
          zoomOut();
          break;
        case '0':
          resetZoom();
          break;
      }
    });

    // Mouse wheel zoom
    overlay.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        zoomIn();
      } else {
        zoomOut();
      }
    });

    // Drag to pan when zoomed
    img.addEventListener('mousedown', (e) => {
      if (currentZoom > 1) {
        isDragging = true;
        dragStart = { x: e.clientX - imageOffset.x, y: e.clientY - imageOffset.y };
        img.classList.add('dragging');
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging && currentZoom > 1) {
        imageOffset = {
          x: (e.clientX - dragStart.x) / currentZoom,
          y: (e.clientY - dragStart.y) / currentZoom
        };
        applyZoom();
      }
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      const img = document.querySelector('.hs-lightbox-image');
      if (img) img.classList.remove('dragging');
    });
  }

  // ============================================
  // IMAGE DETECTION
  // ============================================

  function makeImagesClickable() {
    // Find images in conversation/email threads
    // Target common HubSpot conversation containers
    const selectors = [
      // Email body images
      '[data-test-id="email-body"] img',
      // Thread messages
      '.private-timeline__item img',
      // Conversation panels
      '[class*="ConversationPanel"] img',
      '[class*="MessageBody"] img',
      '[class*="EmailBody"] img',
      // Generic message content
      '[class*="message"] img',
      '[class*="thread"] img',
      // Attachments
      '[class*="attachment"] img',
      // Fallback: any img in main content area that's big enough
      'main img',
      '[role="main"] img'
    ];

    const allImages = document.querySelectorAll(selectors.join(', '));
    const validImages = [];

    allImages.forEach(img => {
      // Skip if already processed
      if (img.dataset.hsLightbox) return;
      
      // Skip small images (icons, avatars)
      if (img.naturalWidth < LIGHTBOX_CONFIG.minWidth || 
          img.naturalHeight < LIGHTBOX_CONFIG.minHeight) {
        // Check display size as fallback (naturalWidth may be 0 if not loaded)
        if (img.offsetWidth < LIGHTBOX_CONFIG.minWidth || 
            img.offsetHeight < LIGHTBOX_CONFIG.minHeight) {
          return;
        }
      }

      // Skip UI elements (buttons, icons, avatars)
      if (img.closest('button') || 
          img.closest('[role="button"]') ||
          img.closest('nav') ||
          img.closest('header') ||
          img.closest('[class*="avatar"]') ||
          img.closest('[class*="Avatar"]') ||
          img.closest('[class*="icon"]') ||
          img.closest('[class*="Icon"]')) {
        return;
      }

      // Skip base64 tiny images (usually icons)
      if (img.src.startsWith('data:') && img.src.length < 1000) {
        return;
      }

      // Mark as processed
      img.dataset.hsLightbox = 'true';
      img.classList.add('hs-clickable-image');
      validImages.push(img);

      // Add click handler
      img.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Collect all clickable images in the same context
        const nearbyImages = Array.from(
          document.querySelectorAll('.hs-clickable-image')
        ).map(i => i.src);
        
        const index = nearbyImages.indexOf(img.src);
        openLightbox(img.src, nearbyImages, index >= 0 ? index : 0);
      });
    });

    if (validImages.length > 0) {
      console.log(`🖼️ Made ${validImages.length} images clickable for lightbox`);
    }
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  function init() {
    // Initial scan
    makeImagesClickable();

    // Watch for new images (dynamic content)
    const observer = new MutationObserver(() => {
      makeImagesClickable();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    console.log('🖼️ HubSpot Image Lightbox loaded');
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
