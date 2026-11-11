(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const endpoint = String(window.AR_PHOTO_UPLOAD_URL || '').trim();
  const composer = $('agComposer');
  const composerTitle = $('agComposerTitle');
  const composerBody = $('agComposerBody');
  const composerStatus = $('agComposerStatus');
  const fileInput = $('agFileInput');
  const cameraModal = $('agCameraModal');
  const cameraVideo = $('agCameraVideo');
  const cameraStatus = $('agCameraStatus');

  let pendingBlob = null;
  let pendingName = '';
  let pendingMime = '';
  let pendingKind = '';
  let pendingSenderName = '';
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

  function makeUploadPanel(blob, name, mime, kind, senderName = '') {
    pendingBlob = blob;
    pendingName = name;
    pendingMime = mime;
    pendingKind = kind;
    pendingSenderName = String(senderName || '').trim();

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

    if (kind === 'audio' && pendingSenderName) {
      const author = document.createElement('p');
      author.className = 'ag-audio-author-preview';
      author.textContent = 'Este saludo lo envía: ' + pendingSenderName;
      wrap.appendChild(author);
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
    const max = isImage ? 12 * 1024 * 1024 : 18 * 1024 * 1024;
    if (file.size > max) {
      alert(isImage ? 'La fotografía debe pesar menos de 12 MB.' : 'El video debe pesar menos de 18 MB.');
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
      status('Este navegador no permite grabar voz aquí. Puedes escribir un mensaje o compartir un video.', true);
      return;
    }

    const wrap = document.createElement('div');
    const nameLabel = document.createElement('label');
    nameLabel.className = 'ag-name-label';
    nameLabel.textContent = '¿Cómo te llamas?';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'ag-name-input';
    nameInput.name = 'senderName';
    nameInput.autocomplete = 'name';
    nameInput.maxLength = 70;
    nameInput.required = true;
    nameInput.placeholder = 'Escribe tu nombre';

    const info = document.createElement('p');
    info.className = 'ag-status';
    info.textContent = 'Primero escribe tu nombre, después graba tu saludo para Abril y Ricardo.';

    const controls = document.createElement('div');
    controls.className = 'ag-audio-controls';

    const start = document.createElement('button');
    start.type = 'button';
    start.textContent = 'INICIAR GRABACIÓN';

    const stop = document.createElement('button');
    stop.type = 'button';
    stop.textContent = 'DETENER';
    stop.disabled = true;

    const playback = document.createElement('audio');
    playback.controls = true;
    playback.className = 'ag-preview';
    playback.hidden = true;

    const send = document.createElement('button');
    send.type = 'button';
    send.className = 'ag-submit';
    send.textContent = 'CONTINUAR';
    send.disabled = true;

    controls.append(start, stop);
    wrap.append(nameLabel, nameInput, info, controls, playback, send);
    openComposer('Graba un saludo', wrap);

    start.addEventListener('click', async () => {
      const senderName = nameInput.value.trim();
      if (senderName.length < 2) {
        status('Escribe tu nombre para que sepamos quién envía el saludo.', true);
        nameInput.focus();
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? { mimeType: 'audio/webm;codecs=opus' }
          : (MediaRecorder.isTypeSupported('audio/mp4') ? { mimeType: 'audio/mp4' } : {});
        recorder = new MediaRecorder(stream, options);
        audioChunks = [];

        recorder.ondataavailable = event => {
          if (event.data && event.data.size) audioChunks.push(event.data);
        };

        recorder.onstop = () => {
          stream.getTracks().forEach(track => track.stop());
          const type = recorder.mimeType || 'audio/webm';
          recordedBlob = new Blob(audioChunks, { type });
          playback.src = URL.createObjectURL(recordedBlob);
          playback.hidden = false;
          send.disabled = false;
          start.disabled = false;
          stop.disabled = true;
          info.textContent = 'Escucha tu saludo. Cuando estés conforme, continúa para compartirlo.';
        };

        recorder.start();
        start.disabled = true;
        stop.disabled = false;
        send.disabled = true;
        info.textContent = 'Grabando tu saludo… cuando termines, pulsa DETENER.';
      } catch (error) {
        status('No se pudo acceder al micrófono. Revisa los permisos del navegador.', true);
      }
    });

    stop.addEventListener('click', () => {
      if (recorder && recorder.state !== 'inactive') recorder.stop();
      stop.disabled = true;
    });

    send.addEventListener('click', () => {
      if (!recordedBlob) return;
      const senderName = nameInput.value.trim();
      if (senderName.length < 2) {
        status('Escribe tu nombre para identificar el saludo.', true);
        nameInput.focus();
        return;
      }
      if (recordedBlob.size > 10 * 1024 * 1024) {
        status('El saludo supera 10 MB. Graba un mensaje más corto para poder reproducirlo dentro del panel privado.', true);
        return;
      }
      const type = recordedBlob.type || 'audio/webm';
      const ext = type.includes('mp4') ? 'm4a' : 'webm';
      makeUploadPanel(recordedBlob, 'Saludo_' + Date.now() + '.' + ext, type, 'audio', senderName);
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
    const uploadLimit = pendingKind === 'audio' ? 10 * 1024 * 1024
      : (pendingKind === 'video' ? 18 * 1024 * 1024 : (pendingKind === 'photo' ? 12 * 1024 * 1024 : 20 * 1024 * 1024));
    if (pendingBlob.size > uploadLimit) {
      status('El archivo supera el límite permitido para este tipo de recuerdo.', true); return;
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
        messageText: messageText,
        senderName: pendingSenderName
      });
      const isPhoto = pendingKind === 'photo';
      if ((isPhoto && result.galleryVisible === false) || (!isPhoto && result.privateStorage === false)) {
        status(isPhoto
          ? 'La fotografía se guardó, pero no se pudo mostrar en la galería pública. Revisa los permisos de Drive.'
          : 'El recuerdo se guardó, pero no se pudo confirmar su almacenamiento privado. Revisa los permisos de Drive.', true);
        button.disabled = false;
        button.textContent = 'REVISAR PERMISOS';
        return;
      }
      status(isPhoto
        ? '¡Gracias! Tu fotografía ya puede aparecer en la galería compartida.'
        : '¡Gracias! Tu recuerdo se guardó en el álbum privado de Abril & Ricardo.');
      button.textContent = 'COMPARTIDO';
      if (isPhoto && window.refreshARDriveInfiniteGallery) await window.refreshARDriveInfiniteGallery();
      if (isPhoto && window.refreshARSharedGalleryHome) window.refreshARSharedGalleryHome();
      await loadGallery();
    } catch (err) {
      status(err.message || 'No se pudo compartir. Intenta nuevamente.', true);
      button.disabled = false;
      button.textContent = pendingKind === 'message' ? 'REINTENTAR ENVÍO' : 'REINTENTAR COMPARTIR';
    }
  }

  function loadGallery() {
    const note = $('agPrivateNoteStatus');
    if (note) {
      note.textContent = 'Tu recuerdo está guardado para que Abril & Ricardo lo vean en su panel privado.';
    }
  }


  $('agComposerClose').addEventListener('click', () => { composer.hidden = true; composerBody.replaceChildren(); pendingBlob = null; });
  loadGallery();
  window.addEventListener('beforeunload', () => stopCamera());
})();
