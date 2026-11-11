(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const endpoint = String(window.AR_PHOTO_UPLOAD_URL || '').trim();
  const loginScreen = $('arPanelLogin');
  const app = $('arAlbumApp');
  const loginForm = $('arPanelLoginForm');
  const loginInput = $('arPanelPassword');
  const loginButton = $('arPanelLoginButton');
  const loginStatus = $('arPanelLoginStatus');
  const grid = $('arAlbumGrid');
  const status = $('arAlbumStatus');
  const updated = $('arAlbumUpdated');
  const lightbox = $('arAlbumLightbox');
  const lightboxContent = $('arAlbumLightboxContent');
  const TOKEN_KEY = 'AR_ALBUM_OWNER_SESSION';

  if (!loginScreen || !app || !loginForm || !grid || !status || !endpoint) return;

  let panelToken = '';
  let allItems = [];
  let activeFilter = 'all';
  let refreshTimer = null;
  let currentRequest = 0;
  const thumbnailCache = new Map();
  const mediaCache = new Map();

  const typeOf = item => item.kind === 'booth' ? 'photo' : item.kind;

  function setStatus(message, isError = false) {
    status.textContent = message || '';
    status.classList.toggle('is-error', !!isError);
  }

  function showLogin(message = '') {
    panelToken = '';
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = null;
    sessionStorage.removeItem(TOKEN_KEY);
    if (lightbox) {
      lightbox.hidden = true;
      lightboxContent.replaceChildren();
    }
    app.hidden = true;
    loginScreen.hidden = false;
    loginStatus.textContent = message;
    loginStatus.classList.toggle('is-error', !!message);
    loginButton.disabled = false;
    loginButton.textContent = 'ENTRAR AL PANEL';
    loginInput.value = '';
  }

  function showDashboard() {
    loginScreen.hidden = true;
    app.hidden = false;
  }

  function jsonpRequest(params, timeoutMs = 25000) {
    return new Promise((resolve, reject) => {
      const callback = 'ARPanel_' + Date.now() + '_' + Math.random().toString(36).slice(2);
      const script = document.createElement('script');
      let settled = false;
      let timer = null;

      const finish = (fn, value) => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        delete window[callback];
        script.remove();
        fn(value);
      };

      window[callback] = data => finish(resolve, data);
      script.onerror = () => finish(reject, new Error('No se pudo conectar con Google Drive.'));
      const query = new URLSearchParams({ ...params, callback, _: String(Date.now()) });
      script.src = endpoint + '?' + query.toString();
      timer = setTimeout(() => finish(reject, new Error('Google Drive tardó demasiado en responder.')), timeoutMs);
      document.body.appendChild(script);
    });
  }

  function sendLogin(password) {
    return new Promise((resolve, reject) => {
      const requestId = 'login_' + Date.now() + '_' + Math.random().toString(36).slice(2);
      const targetName = 'arPanelLogin_' + Date.now();
      const iframe = document.createElement('iframe');
      iframe.name = targetName;
      iframe.hidden = true;
      iframe.title = 'Autenticando acceso privado';
      document.body.appendChild(iframe);

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = endpoint;
      form.target = targetName;
      form.hidden = true;

      [['action','panelLogin'],['password',password],['requestId',requestId]].forEach(([name,value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form.appendChild(input);
      });
      document.body.appendChild(form);

      let settled = false;
      const cleanup = () => {
        window.removeEventListener('message', onMessage);
        form.remove();
        iframe.remove();
      };
      const finish = (fn, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        cleanup();
        fn(value);
      };
      const onMessage = event => {
        const data = event.data;
        if (!data || data.type !== 'AR_PANEL_AUTH_RESULT' || data.requestId !== requestId) return;
        if (data.success && data.token) finish(resolve, data);
        else finish(reject, new Error(data.message || 'No fue posible iniciar sesión.'));
      };
      window.addEventListener('message', onMessage);
      const timer = setTimeout(() => finish(reject, new Error('No llegó respuesta del servicio de autenticación.')), 30000);
      form.submit();
    });
  }

  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    const password = loginInput.value;
    if (!password) {
      loginStatus.textContent = 'Escribe la contraseña para continuar.';
      loginStatus.classList.add('is-error');
      return;
    }

    loginButton.disabled = true;
    loginButton.textContent = 'VERIFICANDO…';
    loginStatus.textContent = '';
    loginStatus.classList.remove('is-error');

    try {
      const result = await sendLogin(password);
      panelToken = result.token;
      sessionStorage.setItem(TOKEN_KEY, panelToken);
      showDashboard();
      await loadAlbum();
      startAutoRefresh();
    } catch (error) {
      loginStatus.textContent = error.message;
      loginStatus.classList.add('is-error');
      loginButton.disabled = false;
      loginButton.textContent = 'INTENTAR DE NUEVO';
      loginInput.select();
    }
  });

  function startAutoRefresh() {
    if (!panelToken) return;
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = window.setInterval(() => {
      if (panelToken && !document.hidden) loadAlbum();
    }, 30000);
  }

  $('arPanelLogout').addEventListener('click', logout);

  function loadAlbum() {
    if (!panelToken) {
      showLogin();
      return;
    }

    const request = ++currentRequest;
    setStatus('Leyendo recuerdos privados desde Google Drive…');

    jsonpRequest({ action: 'list', token: panelToken }).then(data => {
      if (request !== currentRequest) return;

      if (data && data.authRequired) {
        showLogin('La sesión terminó. Vuelve a ingresar la contraseña.');
        return;
      }
      if (!data || !data.success || !Array.isArray(data.items)) {
        setStatus((data && data.message) || 'No se pudo leer el álbum privado.', true);
        return;
      }

      allItems = data.items;
      updateCounters();
      renderActiveFilter();
      setStatus(allItems.length
        ? allItems.length + ' recuerdos cargados desde tu Drive.'
        : 'Todavía no hay recuerdos compartidos.');
      updated.textContent = 'Última actualización: ' +
        new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    }).catch(error => setStatus(error.message, true));
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

  function privateRequest(action, itemId, timeoutMs = 30000) {
    return jsonpRequest({ action, id: itemId, token: panelToken }, timeoutMs).then(data => {
      if (data && data.authRequired) {
        showLogin('La sesión terminó. Vuelve a ingresar la contraseña.');
        throw new Error('La sesión terminó.');
      }
      if (!data || !data.success || !data.dataUrl) {
        throw new Error((data && data.message) || 'No se pudo cargar el archivo desde Drive.');
      }
      return data.dataUrl;
    });
  }

  function requestThumbnail(item, img) {
    if (thumbnailCache.has(item.id)) {
      img.src = thumbnailCache.get(item.id);
      img.classList.remove('is-loading');
      return;
    }

    privateRequest('thumbnail', item.id).then(dataUrl => {
      thumbnailCache.set(item.id, dataUrl);
      img.src = dataUrl;
      img.classList.remove('is-loading');
    }).catch(() => {
      const fallback = document.createElement('div');
      fallback.className = 'ar-album-fallback';
      fallback.textContent = 'No se pudo cargar esta miniatura. Actualiza el panel para intentarlo de nuevo.';
      img.replaceWith(fallback);
    });
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
    audio.preload = 'none';
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

    function fmt(seconds) {
      if (!Number.isFinite(seconds) || seconds < 0) return '--:--';
      const n = Math.floor(seconds);
      return Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0');
    }

    function update() {
      const duration = audio.duration || 0;
      const progress = duration ? (audio.currentTime / duration) * 100 : 0;
      const bars = Array.from(wave.children);
      const active = Math.round(progress / 100 * bars.length);
      bars.forEach((bar, i) => bar.classList.toggle('is-played', i < active));
      time.textContent = fmt(audio.currentTime || 0) + ' / ' + fmt(duration);
    }

    play.addEventListener('click', async () => {
      try {
        if (!audio.src) {
          if (wrap.dataset.loading === 'true') return;
          wrap.dataset.loading = 'true';
          time.textContent = 'Cargando…';
          const dataUrl = await privateRequest('media', item.id, 45000);
          mediaCache.set(item.id, dataUrl);
          audio.src = dataUrl;
          audio.load();
          wrap.dataset.loading = 'false';
        }
        if (audio.paused) {
          await audio.play();
        } else {
          audio.pause();
        }
      } catch (error) {
        wrap.dataset.loading = 'false';
        time.textContent = 'No disponible';
        wrap.classList.add('has-audio-error');
      }
    });

    audio.addEventListener('play', () => {
      play.textContent = 'Ⅱ';
      play.setAttribute('aria-label', 'Pausar saludo');
      wrap.classList.remove('has-audio-error');
    });
    audio.addEventListener('pause', () => {
      play.textContent = '▶';
      play.setAttribute('aria-label', 'Reproducir saludo');
    });
    audio.addEventListener('timeupdate', update);
    audio.addEventListener('loadedmetadata', update);
    audio.addEventListener('ended', () => {
      audio.currentTime = 0;
      update();
    });
    audio.addEventListener('error', () => {
      wrap.classList.add('has-audio-error');
      time.textContent = 'Error de reproducción';
    });
    wave.addEventListener('click', event => {
      if (!Number.isFinite(audio.duration) || !audio.duration) return;
      const rect = wave.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      audio.currentTime = ratio * audio.duration;
    });

    return wrap;
  }

  function blobFromDataUrl(dataUrl) {
    const parts = dataUrl.split(',');
    const mime = (parts[0].match(/data:([^;]+)/) || [,'application/octet-stream'])[1];
    const binary = atob(parts[1]);
    const bytes = new Uint8Array(binary.length);
    for (let i=0; i<binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  function triggerDownload(dataUrl, filename) {
    const blob = blobFromDataUrl(dataUrl);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename || 'recuerdo-abril-ricardo';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }


  function createVideoPlayer(item) {
    const wrap = document.createElement('div');
    wrap.className = 'ar-video-card';
    const video = document.createElement('video');
    video.controls = true;
    video.playsInline = true;
    video.preload = 'none';
    video.poster = '';
    const play = document.createElement('button');
    play.className = 'ar-video-load';
    play.type = 'button';
    play.textContent = 'CARGAR Y REPRODUCIR VIDEO';
    const info = document.createElement('p');
    info.textContent = 'El video se carga desde el álbum privado cuando lo reproduces.';
    play.addEventListener('click', async () => {
      play.disabled = true;
      play.textContent = 'CARGANDO…';
      try {
        const dataUrl = await privateRequest('media', item.id, 60000);
        video.src = dataUrl;
        video.load();
        wrap.classList.add('is-loaded');
        play.remove();
        await video.play();
      } catch (error) {
        play.disabled = false;
        play.textContent = 'INTENTAR DE NUEVO';
        info.textContent = error.message;
      }
    });
    wrap.append(play, info, video);
    return wrap;
  }

  function createCard(item) {
    const card = document.createElement('article');
    card.className = 'ar-album-card';

    if (item.kind === 'message') {
      const message = document.createElement('div');
      message.className = 'ar-album-message';
      message.textContent = item.description || 'Un mensaje para Abril y Ricardo.';
      card.appendChild(message);
    } else if (item.kind === 'video') {
      card.appendChild(createVideoPlayer(item));
    } else if (item.kind === 'audio') {
      card.appendChild(createAudioPlayer(item));
    } else {
      const image = document.createElement('img');
      image.className = 'ar-album-media is-loading';
      image.alt = 'Fotografía compartida por un invitado';
      image.loading = 'lazy';
      image.dataset.driveThumbnail = 'true';
      image._driveItem = item;
      image.addEventListener('click', () => openPhoto(item));
      card.appendChild(image);
    }

    const meta = document.createElement('div');
    meta.className = 'ar-album-meta';
    const date = document.createElement('span');
    date.textContent = item.createdAt
      ? new Date(item.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : 'Recuerdo de la boda';

    if (['photo', 'booth', 'audio', 'video'].includes(item.kind)) {
      const download = document.createElement('button');
      download.type = 'button';
      download.className = 'ar-album-download';
      download.textContent = 'Descargar';
      download.addEventListener('click', async () => {
        download.disabled = true;
        download.textContent = 'Preparando…';
        try {
          const dataUrl = await privateRequest('media', item.id, 60000);
          triggerDownload(dataUrl, item.name || ('Recuerdo_Abril_Ricardo_' + item.kind));
        } catch (error) {
          setStatus(error.message, true);
        } finally {
          download.disabled = false;
          download.textContent = 'Descargar';
        }
      });
      meta.append(date, download);
    } else {
      meta.append(date);
    }
    card.appendChild(meta);
    return card;
  }

  function openPhoto(item) {
    lightboxContent.replaceChildren();
    const loading = document.createElement('p');
    loading.className = 'ar-album-loading-full';
    loading.textContent = 'Abriendo fotografía original…';
    lightboxContent.appendChild(loading);
    lightbox.hidden = false;

    privateRequest('media', item.id, 45000).then(dataUrl => {
      const image = document.createElement('img');
      image.className = 'ar-album-full-image';
      image.src = dataUrl;
      image.alt = 'Fotografía compartida por un invitado';
      const actions = document.createElement('div');
      actions.className = 'ar-album-full-actions';
      const download = document.createElement('button');
      download.type = 'button';
      download.textContent = 'DESCARGAR FOTOGRAFÍA';
      download.addEventListener('click', () => triggerDownload(dataUrl, item.name || 'Foto_Abril_Ricardo.jpg'));
      actions.appendChild(download);
      lightboxContent.replaceChildren(image, actions);
    }).catch(error => {
      const msg = document.createElement('p');
      msg.className = 'ar-album-loading-full';
      msg.textContent = error.message || 'No se pudo abrir la fotografía.';
      lightboxContent.replaceChildren(msg);
    });
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
    if (!document.hidden && panelToken) loadAlbum();
  });

  panelToken = sessionStorage.getItem(TOKEN_KEY) || '';
  if (panelToken) {
    showDashboard();
    loadAlbum();
    startAutoRefresh();
  } else {
    showLogin();
  }
})();
