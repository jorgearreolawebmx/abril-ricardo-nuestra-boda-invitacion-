(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const endpoint = String(window.AR_PHOTO_UPLOAD_URL || '').trim();
  const composer = $('agComposer');
  const composerTitle = $('agComposerTitle');
  const composerBody = $('agComposerBody');
  const composerStatus = $('agComposerStatus');
  const fileInput = $('agFileInput');
  const gallery = $('agGallery');
  const cameraModal = $('agCameraModal');
  const cameraVideo = $('agCameraVideo');
  const cameraStatus = $('agCameraStatus');
  const lightbox = $('agLightbox');
  const lightboxContent = $('agLightboxContent');

  let pendingBlob = null;
  let pendingName = '';
  let pendingMime = '';
  let pendingKind = '';
  let cameraStream = null;
  let recorder = null;
  let audioChunks = [];
  let recordedBlob = null;
  let refreshTimer = null;

  function status(message, error = false) {
    composerStatus.textContent = message || '';
    composerStatus.classList.toggle('error', !!error);
  }

  function openComposer(title, content) {
    composerTitle.textContent = title;
    composerBody.replaceChildren(content);
    composer.hidden = false;
    status('');
    composer.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function makeUploadPanel(blob, name, mime, kind) {
    pendingBlob = blob;
    pendingName = name;
    pendingMime = mime;
    pendingKind = kind;

    const wrap = document.createElement('div');
    if (kind === 'photo' || kind === 'video') {
      const url = URL.createObjectURL(blob);
      const preview = kind === 'photo' ? document.createElement('img') : document.createElement('video');
      preview.className = 'ag-preview';
      preview.src = url;
      if (kind === 'video') preview.controls = true;
      preview.onload = preview.onloadedmetadata = () => URL.revokeObjectURL(url);
      wrap.appendChild(preview);
    } else if (kind === 'audio') {
      const audio = document.createElement('audio');
      audio.controls = true;
      audio.className = 'ag-preview';
      audio.src = URL.createObjectURL(blob);
      wrap.appendChild(audio);
    }

    const note = document.createElement('p');
    note.className = 'ag-status';
    note.textContent = 'Revisa tu recuerdo antes de compartirlo con todos.';
    wrap.appendChild(note);

    const send = document.createElement('button');
    send.type = 'button';
    send.className = 'ag-submit';
    send.textContent = 'COMPARTIR EN LA GALERÍA';
    send.addEventListener('click', () => uploadPending(send));
    wrap.appendChild(send);

    openComposer(kind === 'photo' ? 'Tu fotografía' : kind === 'video' ? 'Tu video' : 'Tu saludo de voz', wrap);
  }

  function openFilePicker() {
    fileInput.value = '';
    fileInput.click();
  }

  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      alert('Selecciona una fotografía o un video compatible.');
      return;
    }
    const max = isImage ? 15 * 1024 * 1024 : 20 * 1024 * 1024;
    if (file.size > max) {
      alert(isImage ? 'La fotografía debe pesar menos de 15 MB.' : 'El video debe pesar menos de 20 MB.');
      return;
    }
    makeUploadPanel(file, file.name, file.type, isImage ? 'photo' : 'video');
  });

  function stopCamera() {
    if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
    cameraVideo.srcObject = null;
  }
  function closeCamera() {
    stopCamera();
    cameraModal.hidden = true;
  }

  async function takePhoto() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      openFilePicker();
      return;
    }
    cameraModal.hidden = false;
    cameraStatus.textContent = '';
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'user' }, width: { ideal: 1600 }, height: { ideal: 1200 } }
      });
      cameraVideo.srcObject = cameraStream;
      await cameraVideo.play();
    } catch (err) {
      closeCamera();
      alert('No pudimos abrir la cámara. Puedes elegir una fotografía desde tu celular.');
      openFilePicker();
    }
  }

  $('agTakePhoto').addEventListener('click', takePhoto);
  $('agChooseFile').addEventListener('click', openFilePicker);
  $('agCameraClose').addEventListener('click', closeCamera);
  cameraModal.addEventListener('click', e => { if (e.target === cameraModal) closeCamera(); });

  $('agCaptureButton').addEventListener('click', () => {
    if (!cameraStream || !cameraVideo.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = cameraVideo.videoWidth;
    canvas.height = cameraVideo.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(cameraVideo, 0, 0);
    canvas.toBlob(blob => {
      if (!blob) {
        cameraStatus.textContent = 'No se pudo capturar la fotografía. Intenta nuevamente.';
        return;
      }
      closeCamera();
      makeUploadPanel(blob, 'Recuerdo_Abril_Ricardo_' + Date.now() + '.jpg', 'image/jpeg', 'photo');
    }, 'image/jpeg', .92);
  });

  $('agWriteMessage').addEventListener('click', () => {
    const wrap = document.createElement('div');
    const textarea = document.createElement('textarea');
    textarea.className = 'ag-field';
    textarea.maxLength = 1200;
    textarea.placeholder = 'Escribe aquí tu felicitación para Abril y Ricardo…';
    textarea.setAttribute('aria-label', 'Tu mensaje para los novios');
    const send = document.createElement('button');
    send.type = 'button';
    send.className = 'ag-submit';
    send.textContent = 'ENVIAR MENSAJE';
    send.addEventListener('click', () => {
      const text = textarea.value.trim();
      if (text.length < 2) { status('Escribe un mensaje antes de enviarlo.', true); return; }
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      pendingBlob = blob;
      pendingName = 'Mensaje_' + Date.now() + '.txt';
      pendingMime = 'text/plain';
      pendingKind = 'message';
      uploadPending(send, text);
    });
    wrap.append(textarea, send);
    openComposer('Escribe un mensaje', wrap);
  });

  $('agRecordAudio').addEventListener('click', async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
      alert('Tu navegador no permite grabar audio desde esta página. Puedes compartir un video o escribir un mensaje.');
      return;
    }
    const wrap = document.createElement('div');
    const info = document.createElement('p');
    info.className = 'ag-status';
    info.textContent = 'Pulsa iniciar, graba tu saludo y después podrás escucharlo antes de enviarlo.';
    const controls = document.createElement('div');
    controls.className = 'ag-audio-controls';
    const start = document.createElement('button');
    start.type = 'button'; start.textContent = 'INICIAR';
    const stop = document.createElement('button');
    stop.type = 'button'; stop.textContent = 'DETENER'; stop.disabled = true;
    const playback = document.createElement('audio');
    playback.controls = true; playback.className = 'ag-preview'; playback.hidden = true;
    const send = document.createElement('button');
    send.type = 'button'; send.className = 'ag-submit'; send.textContent = 'COMPARTIR SALUDO'; send.disabled = true;
    controls.append(start, stop);
    wrap.append(info, controls, playback, send);
    openComposer('Graba un saludo', wrap);

    start.addEventListener('click', async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? { mimeType: 'audio/webm;codecs=opus' } : {};
        recorder = new MediaRecorder(stream, options);
        audioChunks = [];
        recorder.ondataavailable = e => { if (e.data && e.data.size) audioChunks.push(e.data); };
        recorder.onstop = () => {
          stream.getTracks().forEach(t => t.stop());
          const type = recorder.mimeType || 'audio/webm';
          recordedBlob = new Blob(audioChunks, { type });
          playback.src = URL.createObjectURL(recordedBlob);
          playback.hidden = false;
          send.disabled = false;
          info.textContent = 'Escucha tu saludo. Si te gusta, compártelo con los novios.';
        };
        recorder.start();
        start.disabled = true; stop.disabled = false;
        info.textContent = 'Grabando… cuando termines, pulsa DETENER.';
      } catch (err) {
        status('No se pudo acceder al micrófono. Revisa los permisos del navegador.', true);
      }
    });
    stop.addEventListener('click', () => {
      if (recorder && recorder.state !== 'inactive') recorder.stop();
      stop.disabled = true;
    });
    send.addEventListener('click', () => {
      if (!recordedBlob) return;
      const type = recordedBlob.type || 'audio/webm';
      const ext = type.includes('mp4') ? 'm4a' : 'webm';
      makeUploadPanel(recordedBlob, 'Saludo_' + Date.now() + '.' + ext, type, 'audio');
    });
  });

  function postToAppsScript(fields) {
    return new Promise((resolve, reject) => {
      if (!endpoint) return reject(new Error('La conexión con Google Drive aún no está configurada.'));
      const requestId = 'gallery_' + Date.now() + '_' + Math.random().toString(36).slice(2);
      const target = 'arGalleryUpload_' + Date.now();
      const iframe = document.createElement('iframe');
      iframe.name = target; iframe.hidden = true; iframe.title = 'Enviando recuerdo a Google Drive';
      document.body.appendChild(iframe);
      const form = document.createElement('form');
      form.method = 'POST'; form.action = endpoint; form.target = target; form.hidden = true;
      Object.entries(fields).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden'; input.name = key; input.value = value;
        form.appendChild(input);
      });
      const requestField = document.createElement('input');
      requestField.type = 'hidden';
      requestField.name = 'requestId';
      requestField.value = requestId;
      form.appendChild(requestField);
      document.body.appendChild(form);
      let settled = false;
      const cleanup = () => { window.removeEventListener('message', onMessage); form.remove(); iframe.remove(); };
      const finish = (fn, value) => { if (settled) return; settled = true; cleanup(); fn(value); };
      const onMessage = event => {
        if (!event.data || event.data.type !== 'AR_PHOTO_UPLOAD_RESULT' || event.data.requestId !== requestId) return;
        if (event.data.success) finish(resolve, event.data);
        else finish(reject, new Error(event.data.message || 'Google Drive no pudo guardar el archivo.'));
      };
      window.addEventListener('message', onMessage);
      setTimeout(() => finish(reject, new Error('La subida tardó demasiado. Comprueba tu conexión.')), 120000);
      form.submit();
    });
  }

  async function uploadPending(button, messageText = '') {
    if (!pendingBlob) return;
    if (pendingBlob.size > 20 * 1024 * 1024) {
      status('El archivo supera el límite de 20 MB.', true); return;
    }
    button.disabled = true; button.textContent = 'ENVIANDO…';
    status('Estamos guardando tu recuerdo en Google Drive…');
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
        reader.onload = () => resolve(String(reader.result).split(',')[1]);
        reader.readAsDataURL(pendingBlob);
      });
      const result = await postToAppsScript({
        action: 'upload',
        kind: pendingKind,
        fileData: base64,
        mimeType: pendingMime.split(';')[0].trim().toLowerCase(),
        fileName: pendingName,
        messageText: messageText
      });
      if (result.publicLinkEnabled === false) {
        status('El archivo se guardó, pero Google no permitió habilitar el enlace público. Revisa los permisos de Drive.', true);
        button.disabled = false;
        button.textContent = 'REVISAR PERMISOS';
        return;
      }
      status('¡Gracias! Tu recuerdo se guardó en el álbum y ya puede verse desde la galería.');
      button.textContent = 'COMPARTIDO';
      await loadGallery();
    } catch (err) {
      status(err.message || 'No se pudo compartir. Intenta nuevamente.', true);
      button.disabled = false;
      button.textContent = pendingKind === 'message' ? 'REINTENTAR ENVÍO' : 'REINTENTAR COMPARTIR';
    }
  }

  function loadGallery() {
    if (!endpoint) {
      $('agLastUpdated').textContent = 'La galería estará disponible cuando se conecte Google Drive.';
      return;
    }
    const callback = 'ARGalleryCallback_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    const script = document.createElement('script');
    window[callback] = data => {
      delete window[callback];
      script.remove();
      if (!data || !data.success) {
        $('agLastUpdated').textContent = 'No se pudo actualizar la galería. Intenta de nuevo.';
        return;
      }
      renderGallery(data.items || []);
      $('agLastUpdated').textContent = 'Actualizada: ' + new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    };
    script.onerror = () => {
      delete window[callback]; script.remove();
      $('agLastUpdated').textContent = 'No se pudo conectar con Google Drive.';
    };
    script.src = endpoint + '?action=list&callback=' + encodeURIComponent(callback) + '&_=' + Date.now();
    document.body.appendChild(script);
  }

  function renderGallery(items) {
    gallery.replaceChildren();
    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'ag-empty';
      const icon = document.createElement('span'); icon.textContent = '♡';
      const p = document.createElement('p'); p.textContent = 'Todavía no hay fotos.';
      const strong = document.createElement('strong'); strong.textContent = 'Sube la primera.';
      empty.append(icon, p, strong); gallery.appendChild(empty); return;
    }
    items.forEach(item => {
      const card = document.createElement('article'); card.className = 'ag-card';
      if (item.kind === 'message') {
        const quote = document.createElement('div'); quote.className = 'ag-card-message';
        quote.textContent = item.description || 'Un mensaje para los novios';
        card.appendChild(quote);
      } else if (item.kind === 'video') {
        const video = document.createElement('iframe');
        video.src = item.previewUrl; video.allow = 'autoplay; encrypted-media'; video.allowFullscreen = true;
        video.title = 'Video compartido por un invitado';
        card.appendChild(video);
      } else if (item.kind === 'audio') {
        const wrap = document.createElement('div'); wrap.className = 'ag-card-message';
        const audio = document.createElement('audio'); audio.controls = true; audio.src = item.downloadUrl;
        wrap.appendChild(audio); card.appendChild(wrap);
      } else {
        if (item.publicLinkEnabled === false) {
          const locked = document.createElement('div');
          locked.className = 'ag-card-message';
          locked.textContent = 'Este recuerdo se guardó en Drive, pero no tiene acceso público habilitado.';
          card.appendChild(locked);
        } else {
          const img = document.createElement('img'); img.className = 'ag-card-media';
          img.loading = 'lazy'; img.src = item.previewUrl; img.alt = 'Fotografía compartida en la boda';
          img.addEventListener('click', () => openLightbox('image', item.previewUrl));
          img.addEventListener('error', () => {
            const fallback = document.createElement('div');
            fallback.className = 'ag-card-message';
            const message = document.createElement('span');
            message.textContent = 'No se pudo mostrar la miniatura.';
            const link = document.createElement('a');
            link.href = item.viewUrl || item.downloadUrl; link.target = '_blank'; link.rel = 'noopener';
            link.textContent = 'Abrir en Google Drive';
            fallback.append(message, link); img.replaceWith(fallback);
          }, { once: true });
          card.appendChild(img);
        }
      }
      const meta = document.createElement('div'); meta.className = 'ag-card-meta';
      const date = document.createElement('span');
      date.textContent = item.createdAt ? new Date(item.createdAt).toLocaleDateString('es-MX') : 'Recuerdo de la boda';
      const download = document.createElement('a'); download.href = item.downloadUrl; download.target = '_blank';
      download.rel = 'noopener'; download.textContent = 'Descargar';
      meta.append(date, download); card.appendChild(meta); gallery.appendChild(card);
    });
  }

  function openLightbox(type, url) {
    lightboxContent.replaceChildren();
    const media = type === 'video' ? document.createElement('video') : document.createElement('img');
    media.src = url; if (type === 'video') media.controls = true;
    lightboxContent.appendChild(media); lightbox.hidden = false;
  }
  $('agLightboxClose').addEventListener('click', () => { lightbox.hidden = true; lightboxContent.replaceChildren(); });
  lightbox.addEventListener('click', e => { if (e.target === lightbox) lightbox.hidden = true; });
  $('agComposerClose').addEventListener('click', () => { composer.hidden = true; composerBody.replaceChildren(); pendingBlob = null; });
  $('agRefresh').addEventListener('click', loadGallery);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) loadGallery(); });

  loadGallery();
  refreshTimer = setInterval(loadGallery, 20000);
  window.addEventListener('beforeunload', () => { clearInterval(refreshTimer); stopCamera(); });
})();
