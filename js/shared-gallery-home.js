(() => {
  'use strict';
  const ids = ['sharedLatestPhoto1', 'sharedLatestPhoto2', 'sharedLatestPhoto3'];
  const fallback = [
    'assets/galeria-muestra-ceremonia.webp',
    'assets/galeria-muestra-entrada.webp',
    'assets/galeria-muestra-salida.webp'
  ];
  let loading = false;

  function apply(items) {
    const photos = Array.isArray(items) ? items.slice(0, 3) : [];
    ids.forEach((id, index) => {
      const image = document.getElementById(id);
      if (!image) return;
      const item = photos[index];
      if (item && (item.thumbnailUrl || item.imageUrl)) {
        image.src = item.thumbnailUrl || item.imageUrl;
        image.alt = 'Una de las fotografías más recientes compartidas por los invitados';
      } else if (photos.length === 0) {
        image.src = fallback[index];
      }
    });
  }

  async function refresh(force = false) {
    if (!window.ARDriveGallery || loading) return;
    loading = true;
    try { apply(await window.ARDriveGallery.listPhotos(3, force)); }
    catch (error) { console.warn('[Galería Abril & Ricardo] Se mantienen las fotos de muestra:', error); }
    finally { loading = false; }
  }

  window.refreshARSharedGalleryHome = (force = true) => refresh(force);
  refresh();
  window.addEventListener('focus', () => refresh(false));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refresh();
  });
  window.setInterval(() => {
    if (!document.hidden) refresh();
  }, 90000);
})();
