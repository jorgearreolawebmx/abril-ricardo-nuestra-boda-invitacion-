(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const endpoint = String(window.AR_PHOTO_UPLOAD_URL || '').trim();
  const grid = $('arAlbumGrid');
  const status = $('arAlbumStatus');
  const updated = $('arAlbumUpdated');
  const lightbox = $('arAlbumLightbox');
  const lightboxContent = $('arAlbumLightboxContent');

  if (!grid || !status || !endpoint) {
    if (status) {
      status.textContent = 'No está configurada la conexión con Google Drive.';
      status.classList.add('is-error');
    }
    return;
  }

  let allItems = [];
  let activeFilter = 'all';
  let refreshTimer = null;
  let currentRequest = 0;
  const thumbnailCache = new Map();

  const typeOf = item => item.kind === 'booth' ? 'photo' : item.kind;

  function setStatus(message, isError = false) {
    status.textContent = message || '';
    status.classList.toggle('is-error', !!isError);
  }

  function loadAlbum() {
    const request = ++currentRequest;
    setStatus('Leyendo fotografías, videos y mensajes desde Drive…');
    const callback = 'ARAlbumCallback_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    const script = document.createElement('script');

    window[callback] = data => {
      delete window[callback];
      script.remove();
      if (request !== currentRequest) return;

      if (!data || !data.success || !Array.isArray(data.items)) {
        setStatus((data && data.message) || 'No se pudo leer el álbum de Drive. Intenta actualizar.', true);
        return;
      }

      allItems = data.items;
      updateCounters();
      renderActiveFilter();
      setStatus(allItems.length
        ? allItems.length + ' recuerdos cargados desde Google Drive.'
        : 'Todavía no hay recuerdos compartidos. Cuando alguien suba uno, aparecerá aquí.');
      updated.textContent = 'Última actualización: ' +
        new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    };

    script.onerror = () => {
      delete window[callback];
      script.remove();
      if (request === currentRequest) {
        setStatus('No se pudo conectar con Google Drive. Revisa la implementación de Apps Script.', true);
      }
    };

    script.src = endpoint + '?action=list&callback=' + encodeURIComponent(callback) + '&_=' + Date.now();
    document.body.appendChild(script);
  }

  function updateCounters() {
    const counts = { all: allItems.length, photo: 0, video: 0, message: 0, audio: 0 };
    allItems.forEach(item => {
      const kind = typeOf(item);
      if (Object.prototype.hasOwnProperty.call(counts, kind)) counts[kind] += 1;
    });

    $('arAlbumTotal').textContent = counts.all;
    $('arAlbumPhotos').textContent = counts.photo;
    $('arAlbumVideos').textContent = counts.video;
    $('arAlbumMessages').textContent = counts.message;
    $('arCountAll').textContent = counts.all;
    $('arCountPhotos').textContent = counts.photo;
    $('arCountVideos').textContent = counts.video;
    $('arCountMessages').textContent = counts.message;
    $('arCountAudios').textContent = counts.audio;
  }

  function createEmptyState(title, message) {
    const empty = document.createElement('div');
    empty.className = 'ar-album-empty';
    const icon = document.createElement('span');
    icon.textContent = '♡';
    const heading = document.createElement('h3');
    heading.textContent = title;
    const paragraph = document.createElement('p');
    paragraph.textContent = message;
    empty.append(icon, heading, paragraph);
    return empty;
  }

  function renderActiveFilter() {
    const items = activeFilter === 'all'
      ? allItems
      : allItems.filter(item => typeOf(item) === activeFilter);

    grid.replaceChildren();

    if (!items.length) {
      const labels = {
        all: ['Todavía no hay recuerdos', 'Cuando los invitados compartan fotos, videos o mensajes, aparecerán aquí.'],
        photo: ['Todavía no hay fotografías', 'Las fotos de la fiesta y las fotos con el logotipo aparecerán aquí.'],
        video: ['Todavía no hay videos', 'Los videos compartidos por los invitados aparecerán aquí.'],
        message: ['Todavía no hay mensajes', 'Las felicitaciones y dedicatorias aparecerán aquí.'],
        audio: ['Todavía no hay saludos de voz', 'Los mensajes de voz aparecerán aquí.']
      };
      grid.appendChild(createEmptyState(labels[activeFilter][0], labels[activeFilter][1]));
      return;
    }

    items.forEach(item => grid.appendChild(createCard(item)));
    setupLazyThumbnails();
  }

  function thumbnailFallback(img, item) {
    const fallback = document.createElement('div');
    fallback.className = 'ar-album-fallback';
    const message = document.createElement('span');
    message.textContent = 'No se pudo cargar la miniatura.';
    const link = document.createElement('a');
    link.href = item.viewUrl || '#';
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Abrir fotografía en Google Drive';
    fallback.append(message, link);
    img.replaceWith(fallback);
  }

  function requestThumbnail(item, img) {
    if (thumbnailCache.has(item.id)) {
      img.src = thumbnailCache.get(item.id);
      img.classList.remove('is-loading');
      return;
    }

    const callback = 'ARThumb_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    const script = document.createElement('script');
    let settled = false;
    let timeoutId = null;

    const finish = data => {
      if (settled) return;
      settled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
      delete window[callback];
      script.remove();

      if (data && data.success && data.dataUrl) {
        thumbnailCache.set(item.id, data.dataUrl);
        img.src = data.dataUrl;
        img.classList.remove('is-loading');
      } else {
        thumbnailFallback(img, item);
      }
    };

    window[callback] = finish;
    script.onerror = () => finish(null);
    script.src = endpoint + '?action=thumbnail&id=' + encodeURIComponent(item.id) +
      '&callback=' + encodeURIComponent(callback) + '&_=' + Date.now();
    timeoutId = window.setTimeout(() => finish(null), 20000);
    document.body.appendChild(script);
  }

  function setupLazyThumbnails() {
    const images = Array.from(grid.querySelectorAll('img[data-drive-thumbnail]'));
    if (!images.length) return;

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const img = entry.target;
          observer.unobserve(img);
          requestThumbnail(img._driveItem, img);
        });
      }, { rootMargin: '180px 0px' });

      images.forEach(img => observer.observe(img));
    } else {
      images.forEach(img => requestThumbnail(img._driveItem, img));
    }
  }

  function createAudioPlayer(item) {
    const wrap = document.createElement('div');
    wrap.className = 'ar-audio-card';

    const heading = document.createElement('div');
    heading.className = 'ar-audio-heading';

    const title = document.createElement('span');
    title.className = 'ar-audio-title';
    title.textContent = 'SALUDO DE VOZ';

    const author = document.createElement('strong');
    author.className = 'ar-audio-author';
    author.textContent = 'De: ' + (item.senderName || 'Invitado');

    heading.append(title, author);

    const player = document.createElement('div');
    player.className = 'ar-audio-player';

    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    audio.src = item.audioUrl || item.downloadUrl;
    audio.setAttribute('aria-label', 'Saludo de voz de ' + (item.senderName || 'un invitado'));

    const play = document.createElement('button');
    play.type = 'button';
    play.className = 'ar-audio-play';
    play.textContent = '▶';
    play.setAttribute('aria-label', 'Reproducir saludo');

    const wave = document.createElement('button');
    wave.type = 'button';
    wave.className = 'ar-audio-wave';
    wave.setAttribute('aria-label', 'Avanzar en el saludo de voz');

    const heights = [10,16,23,14,27,18,31,22,13,26,34,17,24,13,29,19,35,23,15,28,18,32,21,12,25,34,18,28,14,23,31,16,26,19];
    heights.forEach(height => {
      const bar = document.createElement('i');
      bar.style.height = height + 'px';
      wave.appendChild(bar);
    });

    const time = document.createElement('span');
    time.className = 'ar-audio-time';
    time.textContent = '0:00 / --:--';

    player.append(play, wave, time);
    wrap.append(heading, player, audio);

    function formatTime(seconds) {
      if (!Number.isFinite(seconds) || seconds < 0) return '--:--';
      const total = Math.floor(seconds);
      return Math.floor(total / 60) + ':' + String(total % 60).padStart(2, '0');
    }

    function updateProgress() {
      const duration = audio.duration || 0;
      const current = audio.currentTime || 0;
      const progress = duration ? (current / duration) * 100 : 0;
      wave.style.setProperty('--audio-progress', progress + '%');
      const bars = Array.from(wave.children);
      const activeCount = Math.round((progress / 100) * bars.length);
      bars.forEach((bar, index) => bar.classList.toggle('is-played', index < activeCount));
      time.textContent = formatTime(current) + ' / ' + formatTime(duration);
    }

    play.addEventListener('click', async () => {
      if (audio.paused) {
        try {
          await audio.play();
          play.textContent = 'Ⅱ';
          play.setAttribute('aria-label', 'Pausar saludo');
        } catch (error) {
          play.textContent = '▶';
          play.setAttribute('aria-label', 'No se pudo reproducir; abrir desde Drive');
          wrap.classList.add('has-audio-error');
        }
      } else {
        audio.pause();
      }
    });

    audio.addEventListener('loadedmetadata', updateProgress);
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('play', () => {
      play.textContent = 'Ⅱ';
      play.setAttribute('aria-label', 'Pausar saludo');
      wrap.classList.remove('has-audio-error');
    });
    audio.addEventListener('pause', () => {
      play.textContent = '▶';
      play.setAttribute('aria-label', 'Reproducir saludo');
    });
    audio.addEventListener('ended', () => {
      play.textContent = '▶';
      audio.currentTime = 0;
      updateProgress();
    });
    audio.addEventListener('error', () => {
      wrap.classList.add('has-audio-error');
      time.textContent = 'Abrir en Drive';
      if (!wrap.querySelector('.ar-audio-fallback')) {
        const fallback = document.createElement('a');
        fallback.className = 'ar-audio-fallback';
        fallback.href = item.viewUrl || item.downloadUrl;
        fallback.target = '_blank';
        fallback.rel = 'noopener';
        fallback.textContent = 'Reproducir saludo en Google Drive';
        wrap.appendChild(fallback);
      }
    });
    wave.addEventListener('click', event => {
      if (!Number.isFinite(audio.duration) || !audio.duration) return;
      const rect = wave.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      audio.currentTime = ratio * audio.duration;
    });

    return wrap;
  }

  function createCard(item) {
    const card = document.createElement('article');
    card.className = 'ar-album-card';

    if (item.publicLinkEnabled === false) {
      const locked = document.createElement('div');
      locked.className = 'ar-album-private';
      const symbol = document.createElement('span');
      symbol.textContent = '🔒';
      const title = document.createElement('strong');
      title.textContent = 'Recuerdo guardado en Drive';
      const copy = document.createElement('span');
      copy.textContent = 'Google no permitió habilitar el acceso para invitados.';
      locked.append(symbol, title, copy);
      card.appendChild(locked);
    } else if (item.kind === 'message') {
      const message = document.createElement('div');
      message.className = 'ar-album-message';
      message.textContent = item.description || 'Un mensaje para Abril y Ricardo.';
      card.appendChild(message);
    } else if (item.kind === 'video') {
      const frame = document.createElement('iframe');
      frame.className = 'ar-album-video';
      frame.src = item.previewUrl;
      frame.title = 'Video de la boda';
      frame.allow = 'autoplay; encrypted-media';
      frame.allowFullscreen = true;
      frame.loading = 'lazy';
      card.appendChild(frame);
    } else if (item.kind === 'audio') {
      card.appendChild(createAudioPlayer(item));
    } else {
      const image = document.createElement('img');
      image.className = 'ar-album-media is-loading';
      image.alt = 'Fotografía compartida por un invitado';
      image.loading = 'lazy';
      image.dataset.driveThumbnail = 'true';
      image._driveItem = item;
      image.addEventListener('click', () => openLightbox(item), { once: true });
      card.appendChild(image);
    }

    const meta = document.createElement('div');
    meta.className = 'ar-album-meta';
    const date = document.createElement('span');
    date.textContent = item.createdAt
      ? new Date(item.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : 'Recuerdo de la boda';
    const download = document.createElement('a');
    download.href = item.downloadUrl || item.viewUrl || '#';
    download.target = '_blank';
    download.rel = 'noopener';
    download.textContent = item.kind === 'message' ? 'Abrir mensaje' : 'Descargar';
    meta.append(date, download);
    card.appendChild(meta);
    return card;
  }

  function openLightbox(item) {
    lightboxContent.replaceChildren();

    const frame = document.createElement('iframe');
    frame.className = 'ar-album-full-view';
    frame.src = item.previewUrl || item.viewUrl;
    frame.title = 'Fotografía en tamaño completo';
    frame.allow = 'autoplay';
    frame.allowFullscreen = true;
    lightboxContent.appendChild(frame);

    const openOriginal = document.createElement('a');
    openOriginal.className = 'ar-album-open-original';
    openOriginal.href = item.viewUrl || item.downloadUrl;
    openOriginal.target = '_blank';
    openOriginal.rel = 'noopener';
    openOriginal.textContent = 'Abrir original en Google Drive';
    lightboxContent.appendChild(openOriginal);

    lightbox.hidden = false;
  }

  document.querySelectorAll('.ar-album-filters button').forEach(button => {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.filter || 'all';
      document.querySelectorAll('.ar-album-filters button').forEach(other => {
        other.classList.toggle('is-active', other === button);
      });
      renderActiveFilter();
    });
  });

  $('arAlbumRefresh').addEventListener('click', loadAlbum);
  $('arAlbumLightboxClose').addEventListener('click', () => {
    lightbox.hidden = true;
    lightboxContent.replaceChildren();
  });
  lightbox.addEventListener('click', event => {
    if (event.target === lightbox) {
      lightbox.hidden = true;
      lightboxContent.replaceChildren();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) loadAlbum();
  });
  window.addEventListener('beforeunload', () => clearInterval(refreshTimer));

  loadAlbum();
  refreshTimer = window.setInterval(loadAlbum, 30000);
})();
