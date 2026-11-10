(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const canvas = $('photoBoothCanvas');
  const resultCanvas = $('photoBoothResultCanvas');
  const mockup = $('photoBoothMockup');
  const resultWrap = $('photoBoothResultWrap');
  const input = $('photoBoothInput');
  const mainCta = $('photoBoothMainCta');
  const takeButton = $('takePhotoButton');
  const actions = $('photoBoothActions');
  const saveButton = $('savePhotoButton');
  const downloadButton = $('downloadPhotoButton');
  const retakeButton = $('retakePhotoButton');
  const deleteButton = $('deletePhotoButton');
  const status = $('photoBoothStatus');
  const idleStatus = $('photoBoothIdleStatus');

  const cameraModal = $('arPhotoCameraModal');
  const cameraVideo = $('arPhotoCameraVideo');
  const cameraClose = $('arPhotoCameraClose');
  const cameraCapture = $('arPhotoCameraCapture');
  const cameraCaptureButton = $('arPhotoCameraCaptureButton');
  const cameraFileButton = $('arPhotoCameraFileButton');
  const cameraError = $('arPhotoCameraError');

  if (!canvas || !resultCanvas || !mockup || !resultWrap || !input ||
      !mainCta || !takeButton || !status || !idleStatus) return;

  const ctx = canvas.getContext('2d');
  const resultCtx = resultCanvas.getContext('2d');
  const uploadUrl = String(window.AR_PHOTO_UPLOAD_URL || '').trim();
  const MAX_FILE_BYTES = 15 * 1024 * 1024;

  let currentImage = null;
  let logoImage = null;
  let sampleImage = null;
  let frameImage = null;
  let cameraStream = null;
  let uploadInProgress = false;

  function setStatus(message, error = false) {
    status.textContent = message;
    status.classList.toggle('is-error', error);
  }

  function tintLogoWhite(image) {
    const white = document.createElement('canvas');
    white.width = image.naturalWidth || image.width;
    white.height = image.naturalHeight || image.height;
    const wctx = white.getContext('2d', { willReadFrequently: true });
    wctx.drawImage(image, 0, 0);
    const pixels = wctx.getImageData(0, 0, white.width, white.height);
    for (let i = 0; i < pixels.data.length; i += 4) {
      if (pixels.data[i + 3]) {
        pixels.data[i] = 255;
        pixels.data[i + 1] = 255;
        pixels.data[i + 2] = 255;
      }
    }
    wctx.putImageData(pixels, 0, 0);
    return white;
  }

  const logo = new Image();
  logo.onload = () => {
    logoImage = tintLogoWhite(logo);
    if (currentImage) renderResult(currentImage);
  };
  logo.onerror = () => console.error('No se pudo cargar el logotipo de Abril & Ricardo.');
  logo.src = 'assets/logo-abril-ricardo-original.png';

  const sample = new Image();
  sample.onload = () => {
    sampleImage = sample;
    renderMockup();
  };
  sample.onerror = () => renderMockup();
  sample.src = 'assets/photo-booth-sample.webp';

  const frame = new Image();
  frame.onload = () => {
    frameImage = frame;
    renderMockup();
  };
  frame.onerror = () => renderMockup();
  frame.src = 'assets/photo-booth-frame.png';

  function renderMockup() {
    const width = canvas.width = 1293;
    const height = canvas.height = 1217;
    ctx.clearRect(0, 0, width, height);
    if (sampleImage) {
      const ratio = sampleImage.width / sampleImage.height;
      const targetRatio = 978 / 928;
      if (ratio > targetRatio) {
        const scale = Math.max(978 / sampleImage.width, 928 / sampleImage.height);
        const sw = 978 / scale;
        const sh = 928 / scale;
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(158, 126, 978, 928, 88);
        ctx.clip();
        ctx.drawImage(sampleImage, (sampleImage.width - sw) / 2, (sampleImage.height - sh) / 2,
          sw, sh, 158, 126, 978, 928);
        ctx.restore();
      } else {
        const scale = Math.max(978 / sampleImage.width, 928 / sampleImage.height);
        const sw = 978 / scale;
        const sh = 928 / scale;
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(158, 126, 978, 928, 88);
        ctx.clip();
        ctx.drawImage(sampleImage, (sampleImage.width - sw) / 2, (sampleImage.height - sh) / 2,
          sw, sh, 158, 126, 978, 928);
        ctx.restore();
      }
    }
    if (frameImage) ctx.drawImage(frameImage, 0, 0, width, height);
  }

  function renderResult(image) {
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    resultCanvas.width = width;
    resultCanvas.height = height;
    resultCtx.clearRect(0, 0, width, height);
    resultCtx.drawImage(image, 0, 0, width, height);

    // Solo se añade el logotipo blanco; no se aplica el marco floral ni la fecha.
    if (logoImage) {
      const ratio = logoImage.width / logoImage.height;
      const logoWidth = Math.min(width * 0.19, 480);
      const logoHeight = logoWidth / ratio;
      const x = (width - logoWidth) / 2;
      const bottom = Math.max(height * 0.035, logoHeight * 0.16);
      resultCtx.save();
      resultCtx.shadowColor = 'rgba(0,0,0,.28)';
      resultCtx.shadowBlur = Math.max(4, width * 0.003);
      resultCtx.shadowOffsetY = 2;
      resultCtx.drawImage(logoImage, x, height - logoHeight - bottom, logoWidth, logoHeight);
      resultCtx.restore();
    }
  }

  function showPhoto(image) {
    currentImage = image;
    renderResult(image);
    mockup.hidden = true;
    resultWrap.hidden = false;
    actions.hidden = false;
    idleStatus.hidden = true;
    setStatus('Tu fotografía está lista: solo lleva el logotipo de los novios, sin marco ni adornos.');
    saveButton.disabled = false;
    saveButton.textContent = 'GUARDAR EN DRIVE';
  }

  function clearPhoto() {
    currentImage = null;
    input.value = '';
    mockup.hidden = false;
    resultWrap.hidden = true;
    actions.hidden = true;
    idleStatus.hidden = false;
    idleStatus.textContent = 'Aquí aparecerá tu fotografía. Toca el botón para tomarla.';
    renderMockup();
  }

  function stopCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      cameraStream = null;
    }
    if (cameraVideo) cameraVideo.srcObject = null;
  }

  function closeCamera() {
    stopCamera();
    if (cameraModal) {
      cameraModal.hidden = true;
      cameraModal.setAttribute('aria-hidden', 'true');
    }
    document.body.classList.remove('ar-camera-open');
  }

  async function openCamera() {
    if (!cameraModal || !cameraVideo || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      input.click();
      return;
    }
    cameraError.textContent = '';
    cameraModal.hidden = false;
    cameraModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('ar-camera-open');

    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'user' }, width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      cameraVideo.srcObject = cameraStream;
      await cameraVideo.play();
    } catch (error) {
      closeCamera();
      cameraError.textContent = '';
      input.value = '';
      input.click();
      setStatus('No fue posible abrir la cámara directamente. Puedes tomar la foto con la cámara del teléfono o elegirla de tu galería.');
    }
  }

  function fileToImage(file) {
    if (!file || !file.type.startsWith('image/')) {
      setStatus('Selecciona una fotografía válida.', true);
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setStatus('La fotografía supera los 15 MB. Elige una imagen más ligera.', true);
      return;
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      showPhoto(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      setStatus('No se pudo abrir la fotografía. Intenta con otra imagen.', true);
    };
    image.src = url;
  }

  function capturePhoto() {
    if (!cameraStream || !cameraVideo.videoWidth) return;
    const capture = cameraCapture;
    capture.width = cameraVideo.videoWidth;
    capture.height = cameraVideo.videoHeight;
    const cctx = capture.getContext('2d');
    // Reflejar selfie para que se vea natural, como en el visor frontal.
    cctx.save();
    cctx.translate(capture.width, 0);
    cctx.scale(-1, 1);
    cctx.drawImage(cameraVideo, 0, 0, capture.width, capture.height);
    cctx.restore();
    capture.toBlob(blob => {
      if (!blob) {
        cameraError.textContent = 'No se pudo capturar la foto. Intenta nuevamente.';
        return;
      }
      const url = URL.createObjectURL(blob);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        closeCamera();
        showPhoto(image);
      };
      image.src = url;
    }, 'image/jpeg', .94);
  }

  function getPhotoBlob() {
    return new Promise((resolve, reject) => {
      resultCanvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('No se pudo preparar la fotografía.')),
        'image/jpeg', .94);
    });
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function uploadBlob(blob) {
    return new Promise((resolve, reject) => {
      if (!uploadUrl) return reject(new Error('Falta conectar Google Drive: configura la URL de Apps Script.'));
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
      reader.onload = () => {
        const base64 = String(reader.result).split(',')[1];
        const target = 'arPhotoUpload_' + Date.now();
        const iframe = document.createElement('iframe');
        iframe.name = target;
        iframe.hidden = true;
        document.body.appendChild(iframe);
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = uploadUrl;
        form.target = target;
        form.hidden = true;
        const values = {
          action: 'upload',
          kind: 'booth',
          fileData: base64,
          imageData: base64,
          mimeType: 'image/jpeg',
          fileName: 'Abril_Ricardo_Foto_' + Date.now() + '.jpg',
          source: 'AbrilRicardoPhotoBooth'
        };
        Object.entries(values).forEach(([key, value]) => {
          const inputEl = document.createElement('input');
          inputEl.type = 'hidden';
          inputEl.name = key;
          inputEl.value = value;
          form.appendChild(inputEl);
        });
        document.body.appendChild(form);
        let settled = false;
        const finish = (fn, value) => {
          if (settled) return;
          settled = true;
          window.removeEventListener('message', onMessage);
          form.remove();
          iframe.remove();
          fn(value);
        };
        const onMessage = event => {
          if (event.source !== iframe.contentWindow || !event.data || event.data.type !== 'AR_PHOTO_UPLOAD_RESULT') return;
          if (event.data.success) finish(resolve, event.data);
          else finish(reject, new Error(event.data.message || 'No se pudo guardar en Drive.'));
        };
        window.addEventListener('message', onMessage);
        setTimeout(() => finish(reject, new Error('La subida tardó demasiado. Intenta nuevamente.')), 90000);
        form.submit();
      };
      reader.readAsDataURL(blob);
    });
  }

  mainCta.addEventListener('click', openCamera);
  takeButton.addEventListener('click', openCamera);
  cameraClose && cameraClose.addEventListener('click', closeCamera);
  cameraCaptureButton && cameraCaptureButton.addEventListener('click', capturePhoto);
  cameraFileButton && cameraFileButton.addEventListener('click', () => { closeCamera(); input.value = ''; input.click(); });
  cameraModal && cameraModal.addEventListener('click', event => {
    if (event.target === cameraModal) closeCamera();
  });
  input.addEventListener('change', () => fileToImage(input.files && input.files[0]));
  retakeButton && retakeButton.addEventListener('click', openCamera);
  deleteButton && deleteButton.addEventListener('click', clearPhoto);

  downloadButton && downloadButton.addEventListener('click', async () => {
    try {
      downloadBlob(await getPhotoBlob(), 'Abril_Ricardo_Foto_Con_Logotipo.jpg');
      setStatus('Tu fotografía con el logotipo se descargó correctamente.');
    } catch (error) { setStatus(error.message, true); }
  });

  saveButton && saveButton.addEventListener('click', async () => {
    if (!currentImage || uploadInProgress) return;
    uploadInProgress = true;
    saveButton.disabled = true;
    saveButton.textContent = 'GUARDANDO…';
    try {
      const result = await uploadBlob(await getPhotoBlob());
      if (result.publicLinkEnabled === false) {
        setStatus('La foto se guardó en Drive, pero Google no permitió habilitar el enlace para que otros la vean. Revisa los permisos de la carpeta.', true);
        saveButton.textContent = 'GUARDADA · REVISAR PERMISOS';
        saveButton.disabled = false;
      } else {
        setStatus('¡Listo! Tu fotografía se guardó en Google Drive y quedó disponible mediante enlace.');
        saveButton.textContent = 'GUARDADA EN DRIVE';
        saveButton.disabled = true;
      }
    } catch (error) {
      setStatus(error.message + ' También puedes descargar tu fotografía.', true);
      saveButton.disabled = false;
      saveButton.textContent = 'REINTENTAR EN DRIVE';
    } finally {
      uploadInProgress = false;
    }
  });

  cameraModal && document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !cameraModal.hidden) closeCamera();
  });

  mockup.hidden = false;
  resultWrap.hidden = true;
  actions.hidden = true;
  renderMockup();
})();
