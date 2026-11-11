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
  let instance = null;
  let loading = false;
  let refreshQueued = false;

  function setStatus(message) {
    if (status) status.textContent = message;
  }

  function render(photos, isFallback) {
    if (instance && typeof instance.destroy === 'function') instance.destroy();
    container.replaceChildren();
    instance = window.initInfiniteGallery(container, {
      seed: 'abril-ricardo-galeria-drive-publica',
      photos: photos,
      background: {
        src: 'assets/galeria-infinita-fondo.webp',
        position: '50% 48%',
        shade: 0.22,
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
        start: { x: 15, y: 15, z: 0 },
        grid: [3, 3, 2],
        minSize: 2.0,
        maxSize: 5.6,
        sizeBias: 1.42,
        fogStart: 28,
        fogEnd: 72
      },
      camera: { inertia: 1.08, smoothing: 12, friction: 2.8 },
      viewer: { enabled: true, scrim: 0.9, maxWidth: 0.9, maxHeight: 0.82, duration: 560 },
      intro: true,
      maxTextureSize: 1280,
      maxDPR: 1.6
    });
    if (isFallback) {
      setStatus('Estas son fotografías de muestra. Las imágenes que compartan los invitados aparecerán aquí.');
    } else {
      setStatus(photos.length + (photos.length === 1 ? ' fotografía compartida' : ' fotografías compartidas'));
    }
  }

  async function refresh() {
    if (!window.ARDriveGallery) return;
    if (loading) { refreshQueued = true; return; }
    loading = true;
    if (refreshButton) refreshButton.disabled = true;
    setStatus('Actualizando fotografías…');
    try {
      const items = await window.ARDriveGallery.listPhotos(200);
      const photos = items.map(window.ARDriveGallery.toInfinitePhoto).filter(item => item.src && item.full);
      if (photos.length) render(photos, false);
      else render(fallbackPhotos, true);
    } catch (error) {
      console.warn('[Galería infinita] No fue posible consultar Drive:', error);
      if (!instance) render(fallbackPhotos, true);
      else setStatus('No se pudo actualizar. Conservamos las fotografías que ya estaban cargadas.');
    } finally {
      loading = false;
      if (refreshButton) refreshButton.disabled = false;
      if (refreshQueued) {
        refreshQueued = false;
        window.setTimeout(refresh, 0);
      }
    }
  }

  if (refreshButton) refreshButton.addEventListener('click', refresh);
  if (shareButton && uploadSection) shareButton.addEventListener('click', () => uploadSection.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  window.refreshARDriveInfiniteGallery = refresh;
  render(fallbackPhotos, true);
  refresh();
})();
