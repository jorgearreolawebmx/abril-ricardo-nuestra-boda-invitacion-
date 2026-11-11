/* Galería pública de fotografías de Abril & Ricardo.
 * Solo consulta fotos. La miniatura sirve al lienzo; el original se pide al abrir el visor.
 */
(() => {
  'use strict';
  const endpoint = String(window.AR_PHOTO_UPLOAD_URL || '').trim();
  let sequence = 0;
  const memoryCache = new Map();

  function listPhotos(limit = 40, force = false) {
    const safeLimit = Math.max(1, Math.min(60, Number(limit) || 40));
    const cached = memoryCache.get(safeLimit);
    if (!force && cached && Date.now() - cached.time < 25000) return Promise.resolve(cached.items);
    return new Promise((resolve, reject) => {
      if (!endpoint) return reject(new Error('No está configurada la conexión con Google Drive.'));
      const callbackName = '__arDrivePhotos_' + Date.now() + '_' + (++sequence);
      const script = document.createElement('script');
      const separator = endpoint.includes('?') ? '&' : '?';
      let settled = false;
      const timer = window.setTimeout(() => finish(reject, new Error('Google Drive no respondió a tiempo.')), 18000);

      function cleanup() {
        window.clearTimeout(timer);
        script.onerror = null;
        if (script.parentNode) script.parentNode.removeChild(script);
        try { delete window[callbackName]; } catch (_) { window[callbackName] = undefined; }
      }
      function finish(handler, value) {
        if (settled) return;
        settled = true;
        cleanup();
        handler(value);
      }

      window[callbackName] = data => {
        if (!data || data.success !== true || !Array.isArray(data.items)) {
          finish(reject, new Error(data && data.message ? data.message : 'No se pudieron consultar las fotografías.'));
          return;
        }
        memoryCache.set(safeLimit, { time: Date.now(), items: data.items });
        finish(resolve, data.items);
      };
      script.async = true;
      script.onerror = () => finish(reject, new Error('No se pudo conectar con la galería de Google Drive.'));
      script.src = endpoint + separator + 'action=publicPhotos&limit=' + encodeURIComponent(safeLimit) + '&callback=' + encodeURIComponent(callbackName);
      document.head.appendChild(script);
    });
  }

  function toInfinitePhoto(item) {
    return {
      src: item.thumbnailUrl || item.imageUrl,
      full: item.imageUrl || item.thumbnailUrl,
      alt: 'Fotografía compartida en la boda de Abril y Ricardo',
      scale: 1
    };
  }

  window.ARDriveGallery = { listPhotos, toInfinitePhoto };
})();
