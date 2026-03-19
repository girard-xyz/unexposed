const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const previewContainer = document.getElementById('preview-container');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const processBtn = document.getElementById('process-btn');
const blurFacesToggle = document.getElementById('blur-faces');
const closeBtn = document.getElementById('close-btn');

const initialActions = document.getElementById('initial-actions');
const confirmActions = document.getElementById('confirm-actions');
const cancelBtn = document.getElementById('cancel-btn');
const confirmBtn = document.getElementById('confirm-btn');
const sandboxIframe = document.getElementById('heic-sandbox');
const loadingOverlay = document.getElementById('loading-overlay');

let currentFile = null;
let currentImage = null;
let originalExifData = null;
let originalExifCount = 0;
let modelsLoaded = false;
let isProcessing = false;

// Zoom and Pan state
let zoom = 1;
let offsetX = 0;
let offsetY = 0;
let isDragging = false;
let startX, startY;

function updateCanvasTransform() {
  canvas.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`;
}

function resetZoom() {
  zoom = 1;
  offsetX = 0;
  offsetY = 0;
  updateCanvasTransform();
}

// Helpers pour l'interface
function updateIndicators(exif) {
  const hasGps = !!(exif && (exif.latitude || exif.longitude || exif.GPSLatitude));
  const hasDevice = !!(exif && (exif.Make || exif.Model || exif.Software));
  const hasDate = !!(exif && (exif.DateTimeOriginal || exif.CreateDate || exif.ModifyDate));

  document.getElementById('ind-gps').style.display = hasGps ? 'flex' : 'none';
  document.getElementById('ind-device').style.display = hasDevice ? 'flex' : 'none';
  document.getElementById('ind-date').style.display = hasDate ? 'flex' : 'none';
}

// Translate HTML on load
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const msg = chrome.i18n.getMessage(el.dataset.i18n);
    if (msg) el.textContent = msg;
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const msg = chrome.i18n.getMessage(el.dataset.i18nTitle);
    if (msg) el.title = msg;
  });
});

// Initialize Face API models
async function loadModels() {
  try {
    await faceapi.nets.tinyFaceDetector.loadFromUri('assets/models');
    modelsLoaded = true;
    console.log("Face API models loaded");
  } catch (error) {
    console.error("Failed to load models", error);
  }
}

// Load models as soon as the overlay opens
loadModels();

// Handle close
closeBtn.addEventListener('click', () => {
  window.parent.postMessage({ type: 'CLOSE_OVERLAY' }, '*');
});

// Setup drag and drop
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');

  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    handleFile(e.dataTransfer.files[0]);
  }
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files.length > 0) {
    handleFile(e.target.files[0]);
  }
});

function handleFile(file) {
  const isHeic = file.name.toLowerCase().endsWith('.heic') || file.type === 'image/heic';
  if (!file.type.startsWith('image/') && !isHeic) {
    alert(chrome.i18n.getMessage('errInvalidImage'));
    return;
  }

  currentFile = file;

  // Extraire et compter les données EXIF immédiatement
  if (typeof exifr !== 'undefined') {
    // On demande spécifiquement les blocs sensibles pour l'affichage d'icônes
    exifr.parse(file, {
      tiff: true, exif: true, gps: true, reviveValues: true
    }).then(exif => {
      originalExifData = exif;
      originalExifCount = exif ? Object.keys(exif).length : 0;
      document.getElementById('exif-count').textContent = originalExifCount;
      document.getElementById('exif-count').style.color = originalExifCount > 0 ? '#e74c3c' : '#27ae60';
      document.getElementById('meta-info').style.display = 'flex';

      // Affichage des icônes d'alerte
      updateIndicators(exif);
    }).catch((err) => {
      console.error("Exifr parse error", err);
      originalExifData = null;
      originalExifCount = 0;
      document.getElementById('exif-count').textContent = "0";
      document.getElementById('exif-count').style.color = '#27ae60';
      document.getElementById('meta-info').style.display = 'flex';
      updateIndicators(null);
    });
  }

  const processImage = (blobOrFile) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        currentImage = img;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        resetZoom();
        dropZone.style.display = 'none';
        previewContainer.style.display = 'flex';
        processBtn.disabled = false;
        processBtn.textContent = chrome.i18n.getMessage('processBtnText');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(blobOrFile);
  };

  // Zoom with mouse wheel
  previewContainer.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(Math.max(1, zoom * delta), 10);

    if (newZoom !== zoom) {
      zoom = newZoom;
      if (zoom === 1) {
        offsetX = 0;
        offsetY = 0;
      }
      updateCanvasTransform();
    }
  }, { passive: false });

  // Pan with mouse drag
  previewContainer.addEventListener('mousedown', (e) => {
    if (zoom > 1) {
      isDragging = true;
      startX = e.clientX - offsetX;
      startY = e.clientY - offsetY;
      previewContainer.style.cursor = 'grabbing';
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (isDragging) {
      offsetX = e.clientX - startX;
      offsetY = e.clientY - startY;
      updateCanvasTransform();
    }
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
    previewContainer.style.cursor = zoom > 1 ? 'grab' : 'default';
  });

  if (isHeic) {
    loadingOverlay.style.display = 'flex';
    processBtn.disabled = true;

    const conversionId = Date.now();

    const onSandboxMessage = (event) => {
      if (event.data.action === 'convert-result' && event.data.id === conversionId) {
        window.removeEventListener('message', onSandboxMessage);
        loadingOverlay.style.display = 'none';

        if (event.data.success) {
          const resultBlob = event.data.result;
          const blobArr = Array.isArray(resultBlob) ? resultBlob : [resultBlob];
          currentFile = new File([blobArr[0]], file.name.replace(/\.heic$/i, '.jpeg'), { type: 'image/jpeg' });
          processImage(blobArr[0]);
        } else {
          console.error(event.data.error);
          processBtn.textContent = chrome.i18n.getMessage('processBtnText');
          alert('Failed to convert HEIC format: ' + event.data.error);
        }
      }
    };

    window.addEventListener('message', onSandboxMessage);

    // The sandbox doesn't have access to chrome.runtime, so we communicate via postMessage
    // We wait for the iframe to load before sending if it's not ready
    const sendToSandbox = () => {
      sandboxIframe.contentWindow.postMessage({
        action: 'convert',
        id: conversionId,
        blob: file,
        toType: 'image/jpeg'
      }, '*');
    };

    sendToSandbox();
  } else {
    processImage(file);
  }
}

processBtn.addEventListener('click', async () => {
  if (!currentImage || isProcessing) return;

  isProcessing = true;
  processBtn.textContent = chrome.i18n.getMessage('processBtnProcessing');
  processBtn.disabled = true;

  // Redraw fresh clean image (without metadata)
  ctx.drawImage(currentImage, 0, 0);

  // Allow UI to update the "Traitement..." text before heavy JS task freezes main thread
  await new Promise(resolve => setTimeout(resolve, 50));

  // Apply Blur if requested
  if (blurFacesToggle.checked) {
    if (!modelsLoaded) {
      alert(chrome.i18n.getMessage('errModelsLoading'));
      isProcessing = false;
      processBtn.textContent = chrome.i18n.getMessage('processBtnText');
      processBtn.disabled = false;
      return;
    }

    // Detect faces
    const detections = await faceapi.detectAllFaces(
      canvas,
      new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.15 })
    );

    if (detections.length > 0) {
      // Blur each face
      detections.forEach(detection => {
        const { x, y, width, height } = detection.box;

        // Expand the box to cover the whole head and hair
        const padW = width * 0.20;
        const padHTop = height * 0.55;
        const padHBot = height * 0.25;

        const bx = Math.max(0, x - padW);
        const by = Math.max(0, y - padHTop);
        const bw = Math.min(canvas.width - bx, width + padW * 2);
        const bh = Math.min(canvas.height - by, height + padHTop + padHBot);

        // Extract the head region
        const faceCanvas = document.createElement('canvas');
        faceCanvas.width = bw;
        faceCanvas.height = bh;
        const fCtx = faceCanvas.getContext('2d');
        fCtx.drawImage(canvas, bx, by, bw, bh, 0, 0, bw, bh);

        // Apply fixed strong blur to the region
        ctx.save();
        ctx.filter = 'blur(20px)';
        ctx.drawImage(faceCanvas, bx, by);
        ctx.restore();
      });
    }
  }

  // Show confirmation buttons instead of sending immediately
  initialActions.style.display = 'none';
  confirmActions.style.display = 'flex';

  // Diagnostic réel des métadonnées APRÈS traitement
  if (typeof exifr !== 'undefined') {
    canvas.toBlob((blob) => {
      // On utilise les mêmes options agressives que la page de test pour être sûr
      exifr.parse(blob, {
        tiff: true, xmp: true, icc: true, jfif: true,
        iim: true, iptc: true, exif: true, gps: true
      }).then(exif => {
        const count = exif ? Object.keys(exif).length : 0;
        document.getElementById('exif-count').textContent = count;
        document.getElementById('exif-count').style.color = count > 0 ? '#f39c12' : '#27ae60';

        // Mise à jour des indicateurs : on les cache s'ils ne sont plus trouvés
        updateIndicators(exif);

        if (count > 0) {
          console.log("Métadonnées résiduelles détectées :", Object.keys(exif));
        }
      }).catch(() => {
        document.getElementById('exif-count').textContent = "0";
        document.getElementById('exif-count').style.color = '#27ae60';
        updateIndicators(null);
      });
    }, 'image/jpeg', 0.9);
  }

  isProcessing = false;
});

cancelBtn.addEventListener('click', () => {
  // Reset preview to clean metadata-less original image
  ctx.drawImage(currentImage, 0, 0);
  resetZoom();

  // Reset UI
  confirmActions.style.display = 'none';
  initialActions.style.display = 'flex';
  document.getElementById('exif-count').textContent = originalExifCount;
  document.getElementById('exif-count').style.color = originalExifCount > 0 ? '#e74c3c' : '#27ae60';
  // On restaure les indicateurs de l'image originale
  updateIndicators(originalExifData);
  processBtn.textContent = chrome.i18n.getMessage('processBtnText');
  processBtn.disabled = false;
});

confirmBtn.addEventListener('click', () => {
  // All processing done, extract image
  // We use toBlob for better performance and reliability
  canvas.toBlob((blob) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      // Send back to content script
      window.parent.postMessage({
        type: 'PROCESS_DONE',
        dataUrl: dataUrl,
        fileName: currentFile.name
      }, '*');
    };
    reader.readAsDataURL(blob);
  }, currentFile.type || 'image/jpeg', 0.9);
});
