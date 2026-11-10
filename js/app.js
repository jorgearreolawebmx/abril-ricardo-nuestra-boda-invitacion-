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
  const stickyCountdown = $('#stickyCountdown');
  const inviteMusic = $('#inviteMusic');
  const musicToggle = $('#musicToggle');

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

  function updateMusicControl() {
    if (!inviteMusic || !musicToggle) return;
    const playing = !inviteMusic.paused && !inviteMusic.ended;
    musicToggle.classList.toggle('is-paused', !playing);
    musicToggle.setAttribute('aria-pressed', playing ? 'true' : 'false');
    musicToggle.setAttribute('aria-label', playing ? 'Pausar música' : 'Reproducir música');
    musicToggle.title = playing ? 'Pausar Riptide' : 'Reproducir Riptide';
    const note = musicToggle.querySelector('.music-toggle-note');
    if (note) note.textContent = playing ? '♫' : '♪';
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
  openingVideo.addEventListener('ended', openInvitation);
  openingVideo.addEventListener('error', () => { if (started) openInvitation(); });

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

  // Al bajar de la portada aparece la pequeña barra de cuenta regresiva del ejemplo.
  function updateScrollChrome() {
    if (!opened) return;
    const showBar = window.scrollY > Math.max(120, window.innerHeight * .72);
    stickyCountdown.classList.toggle('is-visible', showBar);
  }
  window.addEventListener('scroll', updateScrollChrome, { passive: true });
  $('#stickyTop').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  // Raspa la película de cada medallón para revelar día, mes y año.
  $$('.scratch-layer').forEach((canvas, index) => {
    const size = 130;
    const ctx = canvas.getContext('2d');
    canvas.width = size;
    canvas.height = size;
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#ded5c2');
    gradient.addColorStop(.5, '#c8b995');
    gradient.addColorStop(1, '#e8dfce');
    ctx.fillStyle = gradient;
    ctx.beginPath(); ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(117,105,78,.58)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(size / 2, size / 2, 54, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(102,102,79,.78)';
    ctx.font = '26px Georgia'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('✿', size / 2, size / 2 - 2);
    ctx.font = '8px Georgia'; ctx.fillText('ABRIL & RICARDO', size / 2, size / 2 + 22);

    let scratching = false;
    let scratched = 0;
    function point(event) {
      const rect = canvas.getBoundingClientRect();
      return { x: (event.clientX - rect.left) * (size / rect.width), y: (event.clientY - rect.top) * (size / rect.height) };
    }
    function erase(event) {
      if (!scratching) return;
      const p = point(event);
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath(); ctx.arc(p.x, p.y, 15, 0, Math.PI * 2); ctx.fill();
      scratched += 1;
      if (scratched > 17) {
        ctx.clearRect(0, 0, size, size);
        canvas.classList.add('is-cleared');
        canvas.style.pointerEvents = 'none';
        const card = canvas.closest('.scratch-card');
        card.classList.add('is-revealed');
      }
    }
    canvas.addEventListener('pointerdown', event => {
      scratching = true;
      canvas.setPointerCapture(event.pointerId);
      erase(event);
    });
    canvas.addEventListener('pointermove', erase);
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(name => canvas.addEventListener(name, () => { scratching = false; }));
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

  // La respuesta seleccionada y el nombre se incluyen en el mensaje de WhatsApp.
  let rsvpAnswer = 'Sí, asistiré';
  const rsvpButtons = $$('.rsvp-option');
  rsvpButtons.forEach(button => button.addEventListener('click', () => {
    rsvpAnswer = button.dataset.rsvp;
    rsvpButtons.forEach(other => other.classList.toggle('is-selected', other === button));
    updateRsvpLink();
  }));
  const guestName = $('#guestName');
  const rsvpLink = $('#rsvpWhatsapp');
  function updateRsvpLink() {
    const name = guestName.value.trim();
    const greeting = name ? `Hola, soy ${name}.` : 'Hola.';
    const message = `${greeting} ${rsvpAnswer}. Quiero responder a la invitación de boda de Abril y Ricardo el 5 de agosto de 2027.`;
    rsvpLink.href = `https://wa.me/529613805924?text=${encodeURIComponent(message)}`;
  }
  guestName.addEventListener('input', updateRsvpLink);
  updateRsvpLink();

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
