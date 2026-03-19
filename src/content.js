// Content Script to inject button near file inputs
const EXTENSION_PREFIX = 'img-post-processor-ext-';

function createOverlayIframe(inputElement) {
  // Check if overlay already exists
  if (document.getElementById(`${EXTENSION_PREFIX}overlay`)) return;

  const iframe = document.createElement('iframe');
  iframe.id = `${EXTENSION_PREFIX}overlay`;
  iframe.src = chrome.runtime.getURL('src/overlay/overlay.html');
  
  // Style iframe to cover the whole screen and be on top
  Object.assign(iframe.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    border: 'none',
    zIndex: '2147483647', // Max z-index
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'block'
  });

  document.body.appendChild(iframe);

  // Listen for messages from the iframe
  const messageListener = (event) => {
    // Only accept messages from our extension's origin
    if (event.origin !== `chrome-extension://${chrome.runtime.id}`) return;

    if (event.data.type === 'CLOSE_OVERLAY') {
      iframe.remove();
      window.removeEventListener('message', messageListener);
    } else if (event.data.type === 'PROCESS_DONE') {
      // The image has been processed
      // We receive a data URL or Blob. Data URL is easier across iframes.
      const dataUrl = event.data.dataUrl;
      const originalName = event.data.fileName || 'image.jpeg';
      const fileName = 'unexposed_' + originalName.replace(/\.[^/.]+$/, "") + '.jpeg';
      
      // Convert Data URL to File
      fetch(dataUrl)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], fileName, { type: blob.type });
          
          // Create a new DataTransfer to populate the input's files
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          inputElement.files = dataTransfer.files;
          
          // Dispatch a change event so the website's JS picks it up
          inputElement.dispatchEvent(new Event('change', { bubbles: true }));
          
          iframe.remove();
          window.removeEventListener('message', messageListener);
        });
    }
  };

  window.addEventListener('message', messageListener);
}

function processInput(input) {
  if (input.dataset.ippInjected) return;
  input.dataset.ippInjected = 'true';

  // Create the floating button
  const button = document.createElement('div');
  button.className = `${EXTENSION_PREFIX}button`;
  button.title = chrome.i18n.getMessage('btnTitle');
  button.innerHTML = "🥷"; // Or an icon

  // Position it near the input
  // A robust way without breaking layout: wrap input if possible, or use absolute positioning
  // Let's use absolute positioning relative to the body
  document.body.appendChild(button);

  const updatePosition = () => {
    let targetElement = input;
    let rect = targetElement.getBoundingClientRect();
    
    // Si l'input est visuellement caché, on cherche un label associé ou son parent visible
    if (rect.width === 0 && rect.height === 0) {
      if (input.id) {
        const label = document.querySelector(`label[for="${input.id}"]`);
        if (label) targetElement = label;
      }
      
      // Si on n'a toujours rien, on remonte vers le premier parent visible
      rect = targetElement.getBoundingClientRect();
      while (rect.width === 0 && rect.height === 0 && targetElement.parentElement) {
        targetElement = targetElement.parentElement;
        rect = targetElement.getBoundingClientRect();
      }
    }
    
    if (rect.width === 0 && rect.height === 0) {
      // Si vraiment tout est caché, on n'affiche pas le bouton pour éviter des bugs bizarres
      button.style.display = 'none';
      return;
    }
    
    button.style.display = 'flex';
    button.style.top = `${window.scrollY + rect.top + (rect.height / 2) - 12}px`;
    button.style.left = `${window.scrollX + rect.right + 5}px`;
  };

  updatePosition();
  window.addEventListener('resize', updatePosition);
  window.addEventListener('scroll', updatePosition);

  // Re-check position occasionally if DOM changes dynamically
  setInterval(updatePosition, 2000);

  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    createOverlayIframe(input);
  });
}

function observeDOM() {
  const observer = new MutationObserver((mutations) => {
    for (let mutation of mutations) {
      for (let node of mutation.addedNodes) {
        if (node.nodeType === 1) { // Element node
          if (node.tagName === 'INPUT' && node.type === 'file') {
            processInput(node);
          } else {
            const inputs = node.querySelectorAll('input[type="file"]');
            inputs.forEach(processInput);
          }
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

// Initial scan
document.querySelectorAll('input[type="file"]').forEach(processInput);
observeDOM();
