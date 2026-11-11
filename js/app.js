(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const openingScreen = $('#openingScreen');
  const openingVideo = $('#openingVideo');
  const sealHotspot = $('#sealHotspot');
  const openingCaption = $('#openingCaption');
  const ambientVideo = $('#ambientVideo');
  const ambientWash = $('.ambient-wash');
  const invitation = $('#invitation');
 
  const inviteMusic = $('#inviteMusic');
  const musicToggle = $('#musicToggle');
  const closeEnvelopeButton = $('#closeEnvelope');
  const skipEnvelopeButton = $('#skipEnvelopeButton');

  let started = false;
  let opened = false;
  let openingFallback = 0;

  function openInvitation() {
    if (opened) return;
    opened = true;
    window.clearTimeout(openingFallback);

    // Al terminar el video, la invitación aparece directamente: no hay
    // una segunda imagen de sobre ni una capa intermedia.
    ambientVideo.classList.add('is-visible');
    ambientWash.classList.add('is-visible');
    const ambientPlayback = ambientVideo.play();
    if (ambientPlayback && typeof ambientPlayback.catch === 'function') ambientPlayback.catch(() => {});

    invitation.classList.add('is-visible');
    invitation.setAttribute('aria-hidden', 'false');
    document.body.classList.remove('is-locked');
    musicToggle.classList.add('is-visible');
    updateMusicControl();

    window.requestAnimationFrame(() => {
      openingScreen.classList.add('is-exiting');
      window.scrollTo({ top: 0, behavior: 'auto' });
    });
  }

  if (closeEnvelopeButton) {
    closeEnvelopeButton.addEventListener('click', () => {
      // Vuelve a la portada limpia: elimina ?skipEnvelope=1 y cualquier ancla.
      // Así se muestra otra vez el sobre cerrado, incluso si se llegó desde una página interna.
      window.location.replace(window.location.pathname);
    });
  }

  function updateMusicControl() {
    if (!inviteMusic || !musicToggle) return;
    const playing = !inviteMusic.paused && !inviteMusic.ended;
    musicToggle.classList.toggle('is-paused', !playing);
    musicToggle.setAttribute('aria-checked', playing ? 'true' : 'false');
    musicToggle.setAttribute('aria-pressed', playing ? 'true' : 'false');
    musicToggle.setAttribute('aria-label', playing ? 'Pausar música' : 'Reproducir música');
    musicToggle.title = playing ? 'Pausar Riptide' : 'Reproducir Riptide';
  }

  function startInviteMusic() {
    if (!inviteMusic) return;
    inviteMusic.volume = 0.42;
    const attempt = inviteMusic.play();
    if (attempt && typeof attempt.then === 'function') {
      attempt.then(updateMusicControl).catch(() => {
        // Algunos navegadores móviles pueden bloquear el audio; el botón queda disponible.
        updateMusicControl();
      });
    } else {
      updateMusicControl();
    }
  }

  if (musicToggle && inviteMusic) {
    musicToggle.addEventListener('click', () => {
      if (inviteMusic.paused) {
        inviteMusic.play().then(updateMusicControl).catch(updateMusicControl);
      } else {
        inviteMusic.pause();
        updateMusicControl();
      }
    });
    inviteMusic.addEventListener('play', updateMusicControl);
    inviteMusic.addEventListener('pause', updateMusicControl);
  }

  function playEnvelope() {
    if (started || opened) return;
    started = true;
    startInviteMusic();
    openingScreen.classList.add('is-playing');
    openingCaption.setAttribute('aria-hidden', 'true');
    openingVideo.muted = true;
    try { openingVideo.currentTime = 0; } catch (_) {}
    const playback = openingVideo.play();
    if (playback && typeof playback.catch === 'function') playback.catch(openInvitation);
    openingFallback = window.setTimeout(openInvitation, 3900);
  }

  sealHotspot.addEventListener('click', playEnvelope);
  if (skipEnvelopeButton) skipEnvelopeButton.addEventListener('click', () => openInvitation());
  openingVideo.addEventListener('ended', openInvitation);
  openingVideo.addEventListener('error', () => { if (started) openInvitation(); });

  // Los enlaces internos de regreso usan ?skipEnvelope=1 para volver directo
  // al inicio de la invitación, sin reproducir nuevamente el video del sobre.
  const directEntry = new URLSearchParams(window.location.search).get('skipEnvelope') === '1';
  if (directEntry) {
    openInvitation();
    window.setTimeout(() => {
      const targetId = (window.location.hash || '#inicio').slice(1);
      const target = document.getElementById(decodeURIComponent(targetId));
      if (target) target.scrollIntoView({ behavior: 'auto', block: 'start' });
    }, 120);
  }


  // Cuenta regresiva hasta el inicio de la ceremonia: 5 de agosto de 2027, 12:00 h.
  const eventTime = new Date('2027-08-05T12:00:00-06:00').getTime();
  const countNodes = {
    days: $$('[data-count="days"]'),
    hours: $$('[data-count="hours"]'),
    minutes: $$('[data-count="minutes"]'),
    seconds: $$('[data-count="seconds"]')
  };
  const pad2 = value => String(value).padStart(2, '0');
  function updateCountdown() {
    let distance = Math.max(0, eventTime - Date.now());
    const days = Math.floor(distance / 86400000); distance %= 86400000;
    const hours = Math.floor(distance / 3600000); distance %= 3600000;
    const minutes = Math.floor(distance / 60000); distance %= 60000;
    const seconds = Math.floor(distance / 1000);
    const values = { days: String(days).padStart(3, '0'), hours: pad2(hours), minutes: pad2(minutes), seconds: pad2(seconds) };
    Object.entries(values).forEach(([key, value]) => countNodes[key].forEach(node => { node.textContent = value; }));
  }
  updateCountdown();
  window.setInterval(updateCountdown, 1000);

  // Sellos de cera raspables. La fecha se descubre con arrastre real y acumulativo:
  // un toque suelto no revela nada. El avance se mide con una cuadrícula propia
  // (sin leer píxeles del canvas), así funciona igual al abrir el archivo local
  // (file://), en Live Server, en un hosting o dentro de WhatsApp/Instagram.
  const sealTexture = new Image();
  sealTexture.decoding = 'async';
  sealTexture.src = 'assets/sello-cera-ar.webp';

  $$('.scratch-layer').forEach(canvas => {
    const width = 420;
    const height = 458;
    const ctx = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;

    // Cuadrícula de desgaste: cada celda guarda cuánto se ha raspado (0 a 1).
    const COLS = 28;
    const ROWS = 30;
    const cellW = width / COLS;
    const cellH = height / ROWS;
    const wear = new Float32Array(COLS * ROWS);
    const inSeal = new Uint8Array(COLS * ROWS);
    let sealCells = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        // El sello ocupa casi todo el lienzo; se ignoran solo las esquinas vacías.
        const nx = ((c + .5) * cellW - width / 2) / (width * .47);
        const ny = ((r + .5) * cellH - height / 2) / (height * .47);
        if (nx * nx + ny * ny <= 1) { inSeal[r * COLS + c] = 1; sealCells++; }
      }
    }

    const BRUSH = 66;            // grosor principal del raspado (px del lienzo)
    const BRUSH_R = BRUSH / 2;
    const REQUIRED_DISTANCE = 100; // px CSS mínimos arrastrados
    const REQUIRED_WEAR = .36;     // fracción del sello desgastada para revelar

    let ready = false;
    let scratching = false;
    let activePointerId = null;
    let lastPoint = null;
    let distanceCss = 0;
    let completed = false;
    let moveCount = 0;

    function paintSeal() {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, width, height);
      if (sealTexture.complete && sealTexture.naturalWidth > 0) {
        const scale = Math.min(width / sealTexture.naturalWidth, height / sealTexture.naturalHeight);
        const drawWidth = sealTexture.naturalWidth * scale;
        const drawHeight = sealTexture.naturalHeight * scale;
        ctx.drawImage(sealTexture, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
      } else {
        const gradient = ctx.createLinearGradient(30, 20, width - 30, height - 20);
        gradient.addColorStop(0, '#efbd57');
        gradient.addColorStop(.5, '#a85b13');
        gradient.addColorStop(1, '#e4a13a');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(width / 2, height / 2, 194, 211, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,231,174,.75)';
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.fillStyle = '#fff0c5';
        ctx.font = 'bold 78px Georgia';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('A&R', width / 2, height / 2);
      }
      ctx.restore();
      ready = true;
      canvas.style.pointerEvents = 'auto';
      canvas.setAttribute('aria-label', 'Arrastra varias veces sobre el sello para revelar la fecha');
    }

    // Se pinta de inmediato (con respaldo dorado) y se repinta cuando carga la textura,
    // siempre que todavía no se haya empezado a raspar.
    paintSeal();
    if (!(sealTexture.complete && sealTexture.naturalWidth > 0)) {
      const repaint = () => { if (!completed && distanceCss === 0) paintSeal(); };
      sealTexture.addEventListener('load', repaint, { once: true });
      sealTexture.addEventListener('error', repaint, { once: true });
    }

    function getPoint(event) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (event.clientX - rect.left) * (width / rect.width),
        y: (event.clientY - rect.top) * (height / rect.height),
        cssScale: rect.width / width
      };
    }

    function stroke(from, to, lineWidth, alpha, offsetX = 0, offsetY = 0) {
      ctx.globalAlpha = alpha;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(from.x + offsetX, from.y + offsetY);
      ctx.lineTo(to.x + offsetX, to.y + offsetY);
      ctx.stroke();
    }

    // Registra en la cuadrícula las celdas tocadas por el segmento (distancia punto-segmento).
    function markWear(from, to) {
      const minC = Math.max(0, Math.floor((Math.min(from.x, to.x) - BRUSH_R) / cellW));
      const maxC = Math.min(COLS - 1, Math.floor((Math.max(from.x, to.x) + BRUSH_R) / cellW));
      const minR = Math.max(0, Math.floor((Math.min(from.y, to.y) - BRUSH_R) / cellH));
      const maxR = Math.min(ROWS - 1, Math.floor((Math.max(from.y, to.y) + BRUSH_R) / cellH));
      const sx = to.x - from.x;
      const sy = to.y - from.y;
      const len2 = sx * sx + sy * sy || 1;
      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          const cx = (c + .5) * cellW;
          const cy = (r + .5) * cellH;
          let t = ((cx - from.x) * sx + (cy - from.y) * sy) / len2;
          t = Math.max(0, Math.min(1, t));
          const d = Math.hypot(cx - (from.x + sx * t), cy - (from.y + sy * t));
          if (d <= BRUSH_R) {
            const i = r * COLS + c;
            wear[i] = 1 - (1 - wear[i]) * .42; // cada pasada quita ~58 % de la cera, igual que el trazo visible
          }
        }
      }
    }

    function wearRatio() {
      let sum = 0;
      for (let i = 0; i < wear.length; i++) if (inSeal[i]) sum += wear[i];
      return sealCells ? sum / sealCells : 0;
    }

    function eraseSegment(from, to) {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const distance = Math.hypot(dx, dy);
      const cssDistance = distance * from.cssScale;
      if (cssDistance < 1.15) return;
      distanceCss += cssDistance;
      markWear(from, to);

      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = '#000';
      ctx.fillStyle = '#000';

      // Desgaste principal, amplio y semitransparente: necesita varias pasadas.
      stroke(from, to, BRUSH, .58);
      // Roce más concentrado en el centro del dedo.
      stroke(from, to, 28, .36, 1.8, -1.4);

      // Fibras y pequeñas escamas irregulares para que el desgaste no sea un trazo perfecto.
      const steps = Math.max(2, Math.ceil(distance / 17));
      ctx.globalAlpha = .34;
      for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const px = from.x + dx * t;
        const py = from.y + dy * t;
        const wobble = Math.sin((i + distance) * 7.31) * 8;
        const side = Math.cos((i + distance) * 4.17) * 5;
        ctx.beginPath();
        ctx.ellipse(px + wobble, py + side, 3.2 + (i % 3), 1.7 + (i % 2), Math.atan2(dy, dx), 0, Math.PI * 2);
        ctx.fill();
      }
      stroke(from, to, 2.5, .46, -4.5, 4.2);
      stroke(from, to, 1.7, .35, 5.2, -3.3);
      ctx.restore();
    }

    function reveal() {
      if (completed) return;
      completed = true;
      scratching = false;
      canvas.classList.remove('is-scratching');
      canvas.classList.add('is-cleared');
      canvas.style.pointerEvents = 'none';
      canvas.setAttribute('aria-label', 'Fecha revelada');
      const card = canvas.closest('.scratch-card');
      if (card) card.classList.add('is-revealed');
    }

    function checkReveal() {
      if (completed || !ready) return;
      // Requiere arrastre acumulado + desgaste real. No responde a un toque ni a una pasada corta.
      if (distanceCss >= REQUIRED_DISTANCE && wearRatio() >= REQUIRED_WEAR) reveal();
    }

    canvas.addEventListener('pointerdown', event => {
      if (!ready || completed || scratching) return;
      scratching = true;
      activePointerId = event.pointerId;
      lastPoint = getPoint(event);
      canvas.classList.add('is-scratching');
      try { canvas.setPointerCapture(event.pointerId); } catch (_) {}
      event.preventDefault();
    });

    canvas.addEventListener('pointermove', event => {
      if (!scratching || completed || event.pointerId !== activePointerId) return;
      const nextPoint = getPoint(event);
      eraseSegment(lastPoint, nextPoint);
      lastPoint = nextPoint;
      // Se revela en cuanto el desgaste es suficiente, sin esperar a soltar el dedo.
      if ((++moveCount % 6) === 0) checkReveal();
      event.preventDefault();
    });

    function stopScratch(event) {
      if (!scratching || (event && event.pointerId !== activePointerId)) return;
      scratching = false;
      activePointerId = null;
      lastPoint = null;
      canvas.classList.remove('is-scratching');
      checkReveal();
    }
    canvas.addEventListener('pointerup', stopScratch);
    canvas.addEventListener('pointercancel', stopScratch);
    canvas.addEventListener('lostpointercapture', stopScratch);
    canvas.addEventListener('contextmenu', event => event.preventDefault());

    // Accesibilidad: con teclado, Enter o Espacio revelan el sello.
    canvas.setAttribute('tabindex', '0');
    canvas.setAttribute('role', 'button');
    canvas.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        reveal();
      }
    });
  });

  // Galería 3D infinita integrada desde el prototipo original.
  // La instancia se crea al abrir y se destruye al cerrar para no consumir
  // recursos mientras el invitado continúa recorriendo la invitación.
  const galleryShell = $('#infiniteGalleryShell');
  const galleryEngine = $('#infiniteGalleryEngine');
  const openGalleryButton = $('#openInfiniteGallery');
  const closeGalleryButton = $('#closeInfiniteGallery');
  let galleryInstance = null;
  let galleryScrollPosition = 0;

  const galleryConfig = window.ABRIL_RICARDO_GALLERY_CONFIG;

  function openInfiniteGallery() {
    if (!galleryShell || !window.initInfiniteGallery) return;
    galleryScrollPosition = window.scrollY;
    galleryShell.classList.add('is-open');
    galleryShell.setAttribute('aria-hidden', 'false');
    document.body.classList.add('gallery-open');
    document.documentElement.classList.add('gallery-open');

    if (!galleryInstance) {
      try {
        galleryInstance = window.initInfiniteGallery(galleryEngine, galleryConfig);
      } catch (error) {
        console.error('No se pudo iniciar la galería infinita:', error);
        galleryEngine.innerHTML = '<p class="gallery-load-error">No fue posible cargar la galería. Cierra y vuelve a intentarlo.</p>';
      }
    } else if (galleryInstance.resize) {
      galleryInstance.resize();
    }
    closeGalleryButton.focus({ preventScroll: true });
  }

  function closeInfiniteGallery() {
    if (!galleryShell || !galleryShell.classList.contains('is-open')) return;
    galleryShell.classList.remove('is-open');
    galleryShell.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('gallery-open');
    document.documentElement.classList.remove('gallery-open');
    if (galleryInstance && galleryInstance.destroy) {
      galleryInstance.destroy();
      galleryInstance = null;
    }
    window.scrollTo({ top: galleryScrollPosition, behavior: 'auto' });
    openGalleryButton.focus({ preventScroll: true });
  }

  openGalleryButton.addEventListener('click', openInfiniteGallery);
  closeGalleryButton.addEventListener('click', closeInfiniteGallery);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && galleryShell.classList.contains('is-open')) {
      // Si el visor ampliado está abierto, el motor consume primero Escape
      // para cerrar esa foto. El siguiente Escape cierra toda la galería.
      const viewerOpen = galleryInstance && galleryInstance.debug && galleryInstance.debug.state().viewerOpen;
      if (!viewerOpen) closeInfiniteGallery();
    }
  });

  // Confirmación de asistencia: interruptor visual + nombre obligatorio + envío a WhatsApp.
  const attendanceSwitch = $('#attendanceSwitch');
  const attendanceHelper = $('#attendanceHelper');
  const attendanceMessage = $('#attendanceMessage');
  const attendanceForm = $('#attendanceForm');
  const attendanceName = $('#attendanceName');
  const labelNo = $('.attendance-label-no');
  const labelYes = $('.attendance-label-yes');
  let willAttend = true;

  function updateAttendance() {
    if (!attendanceSwitch || !attendanceMessage) return;
    const answer = willAttend ? 'Sí, asistiré' : 'No podré asistir';
    const message = willAttend
      ? 'Qué alegría. Los esperamos.'
      : 'Gracias por avisarnos.';

    attendanceSwitch.classList.toggle('is-no', !willAttend);
    attendanceSwitch.setAttribute('aria-checked', willAttend ? 'true' : 'false');
    attendanceSwitch.setAttribute('aria-label', `Cambiar respuesta: actualmente ${answer.toLowerCase()}`);
    if (labelNo) labelNo.classList.toggle('is-active', !willAttend);
    if (labelYes) labelYes.classList.toggle('is-active', willAttend);

    attendanceMessage.classList.remove('is-changing');
    void attendanceMessage.offsetWidth;
    attendanceMessage.textContent = message;
    attendanceMessage.classList.add('is-changing');
    if (attendanceHelper) attendanceHelper.textContent = 'Puedes cambiar tu respuesta';
  }

  if (attendanceSwitch) {
    // El control es un botón real; el arte interno nunca intercepta los toques.
    attendanceSwitch.addEventListener('click', event => {
      event.preventDefault();
      willAttend = !willAttend;
      updateAttendance();
    });
    updateAttendance();
  }

  if (attendanceForm && attendanceName) {
    attendanceForm.addEventListener('submit', event => {
      event.preventDefault();
      const guestName = attendanceName.value.trim();
      if (!guestName) {
        attendanceName.setCustomValidity('Escribe tu nombre para enviar la respuesta.');
        attendanceName.reportValidity();
        attendanceName.focus();
        return;
      }
      attendanceName.setCustomValidity('');
      if (guestName.length < 2) {
        attendanceName.setCustomValidity('Escribe tu nombre completo.');
        attendanceName.reportValidity();
        attendanceName.focus();
        return;
      }

      const response = willAttend ? 'Sí, asistiré' : 'No podré asistir';
      const whatsappMessage = [
        'Hola, soy ' + guestName + '.',
        ' ' + response + ' a la boda de Abril y Ricardo el 5 de agosto de 2027.'
      ].join('');
      const whatsappURL = `https://wa.me/529613805924?text=${encodeURIComponent(whatsappMessage)}`;

      // Abrir la pestaña de forma síncrona dentro del gesto del usuario evita bloqueos de popup.
      const whatsappWindow = window.open(whatsappURL, '_blank');
      if (whatsappWindow) whatsappWindow.opener = null;
      if (!whatsappWindow) {
        // Algunos navegadores impiden nuevas pestañas; navegar en la misma ventana es el respaldo.
        window.location.href = whatsappURL;
      }
    });

    attendanceName.addEventListener('input', () => attendanceName.setCustomValidity(''));
  }

  // Aparición ligera de los módulos al entrar en pantalla.
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .08 });
    $$('.section-inner').forEach(section => observer.observe(section));
  }
})();
