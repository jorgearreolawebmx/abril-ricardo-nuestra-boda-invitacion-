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
    } else if (item.kind === 'video' || item.kind === 'audio') {
      const mediaWrap = document.createElement('div');
      mediaWrap.className = item.kind === 'audio' ? 'ar-album-audio' : '';
      if (item.kind === 'audio') {
        const icon = document.createElement('span');
        icon.textContent = '♫';
        const caption = document.createElement('strong');
        caption.textContent = 'SALUDO DE VOZ';
        mediaWrap.append(icon, caption);
      }
      const frame = document.createElement('iframe');
      frame.className = item.kind === 'video' ? 'ar-album-video' : '';
      frame.src = item.previewUrl;
      frame.title = item.kind === 'video' ? 'Video de la boda' : 'Saludo de voz';
      frame.allow = 'autoplay; encrypted-media';
      frame.allowFullscreen = true;
      frame.loading = 'lazy';
      mediaWrap.appendChild(frame);
      card.appendChild(mediaWrap);
    } else {
      const image = document.createElement('img');
      image.className = 'ar-album-media';
      image.src = item.previewUrl;
      image.alt = 'Fotografía compartida por un invitado';
      image.loading = 'lazy';
      image.addEventListener('click', () => openLightbox(item.previewUrl, item.viewUrl), { once: true });
      image.addEventListener('error', () => {
        const fallback = document.createElement('div');
        fallback.className = 'ar-album-fallback';
        const message = document.createElement('span');
        message.textContent = 'La vista previa no está disponible.';
        const open = document.createElement('a');
        open.href = item.viewUrl || item.downloadUrl;
        open.target = '_blank';
        open.rel = 'noopener';
        open.textContent = 'Abrir fotografía en Google Drive';
        fallback.append(message, open);
        image.replaceWith(fallback);
      }, { once: true });
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

  function openLightbox(imageUrl, fallbackUrl) {
    lightboxContent.replaceChildren();
    const image = document.createElement('img');
    image.src = imageUrl;
    image.alt = 'Fotografía compartida en la boda';
    image.onerror = () => {
      image.remove();
      const link = document.createElement('a');
      link.href = fallbackUrl;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = 'Abrir fotografía en Google Drive';
      link.style.color = '#fff';
      lightboxContent.appendChild(link);
    };
    lightboxContent.appendChild(image);
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
