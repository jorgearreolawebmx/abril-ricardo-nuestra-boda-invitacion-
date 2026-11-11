(() => {
  'use strict';
  const container = document.getElementById('agDriveInfiniteGallery');
  const status = document.getElementById('agDriveGalleryStatus');
  const refreshButton = document.getElementById('agRefreshDriveGallery');
  const shareButton = document.getElementById('agGoToShare');
  const uploadSection = document.getElementById('agUploadSection');
  if (!container || !window.initInfiniteGallery) return;

  const fallbackPhotos = [
    { src: 'assets/galeria-muestra-ceremonia.webp', full: 'assets/galeria-muestra-ceremonia.webp', alt: 'Ceremonia de Abril y Ricardo' },
    { src: 'assets/galeria-muestra-entrada.webp', full: 'assets/galeria-muestra-entrada.webp', alt: 'Entrada de los recién casados' },
    { src: 'assets/galeria-muestra-salida.webp', full: 'assets/galeria-muestra-salida.webp', alt: 'Salida de los recién casados' }
  ];
  const isMobile = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || window.innerWidth <= 700;
  const photoLimit = isMobile ? 16 : 32;
  let instance = null;
  let loading = false;
  let refreshQueued = false;
  let showingFallback = false;
  let renderedSignature = '';

  function setStatus(message) {
    if (status) status.textContent = message;
  }

  function render(photos, isFallback) {
    const signature = photos.map(item => item.src).join('|');
    if (instance && signature === renderedSignature) {
      showingFallback = !!isFallback;
      setStatus(isFallback
        ? 'Estas son fotografías de muestra. Las imágenes que compartan los invitados aparecerán aquí.'
        : photos.length + (photos.length === 1 ? ' fotografía compartida' : ' fotografías compartidas'));
      return;
    }
    if (instance && typeof instance.destroy === 'function') instance.destroy();
    container.replaceChildren();
    container.classList.remove('ag-drive-loading');
    instance = window.initInfiniteGallery(container, {
      seed: 'abril-ricardo-galeria-drive-publica',
      photos: photos,
      background: {
        src: 'assets/galeria-infinita-fondo.webp',
        position: '50% 48%',
        shade: 0.24,
        color: '#211a15'
      },
      texts: {
        title: '',
        hintMouse: 'Arrastra para recorrer. Usa la rueda para acercarte.',
        hintTouch: 'Desliza para recorrer. Pellizca para acercarte.',
        close: 'Cerrar',
        prev: 'Fotografía anterior',
        next: 'Fotografía siguiente',
        error: 'Aún no hay fotografías disponibles. Comparte la primera.',
        region: 'Galería infinita de fotos compartidas de Abril y Ricardo'
      },
      space: {
        chunkSize: isMobile ? 26 : 30,
        start: { x: 15, y: 15, z: 0 },
        grid: isMobile ? [2, 2, 1] : [3, 3, 1],
        minSize: isMobile ? 2.35 : 2.0,
        maxSize: isMobile ? 5.0 : 5.5,
        sizeBias: 1.35,
        near: 2.3,
        nearFade: 7,
        fogStart: isMobile ? 20 : 25,
        fogEnd: isMobile ? 47 : 58
      },
      camera: { inertia: isMobile ? 0.78 : 0.95, smoothing: 10, friction: 3.5, wheelSpeed: 0.18, pinchDepth: 12 },
      viewer: { enabled: true, scrim: 0.88, maxWidth: 0.92, maxHeight: 0.8, duration: 420 },
      intro: !isMobile,
      maxTextureSize: isMobile ? 320 : 480,
      maxDPR: isMobile ? 1 : 1.25,
      loadConcurrency: isMobile ? 2 : 3,
      initialLoadCount: Math.min(isMobile ? 4 : 6, photos.length)
    });
    renderedSignature = signature;
    showingFallback = !!isFallback;
    if (isFallback) {
      setStatus('Estas son fotografías de muestra. Las imágenes que compartan los invitados aparecerán aquí.');
    } else {
      setStatus(photos.length + (photos.length === 1 ? ' fotografía compartida' : ' fotografías compartidas'));
    }
  }

  async function refresh(force = false) {
    if (!window.ARDriveGallery) return;
    if (loading) { refreshQueued = true; return; }
    loading = true;
    if (refreshButton) refreshButton.disabled = true;
    setStatus('Cargando fotografías…');
    try {
      const items = await window.ARDriveGallery.listPhotos(photoLimit, force);
      const photos = items.map(window.ARDriveGallery.toInfinitePhoto).filter(item => item.src && item.full);
      if (photos.length) render(photos, false);
      else if (!instance || !showingFallback) render(fallbackPhotos, true);
      else setStatus('Estas son fotografías de muestra. Las imágenes que compartan los invitados aparecerán aquí.');
    } catch (error) {
      console.warn('[Galería infinita] No fue posible consultar Drive:', error);
      if (!instance) render(fallbackPhotos, true);
      else setStatus('No se pudo actualizar. Conservamos las fotografías que ya estaban cargadas.');
    } finally {
      loading = false;
      if (refreshButton) refreshButton.disabled = false;
      if (refreshQueued) {
        refreshQueued = false;
        window.setTimeout(() => refresh(false), 0);
      }
    }
  }

  if (refreshButton) refreshButton.addEventListener('click', () => refresh(true));
  if (shareButton && uploadSection) shareButton.addEventListener('click', () => uploadSection.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  window.refreshARDriveInfiniteGallery = (force = true) => refresh(force);
  container.classList.add('ag-drive-loading');
  setStatus('Preparando la galería…');
  refresh();
})();
