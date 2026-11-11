/* Galería pública de fotografías de Abril & Ricardo.
 * Apps Script devuelve únicamente fotos de FOTOS_CON_LOGO y FOTOS_DE_LA_FIESTA.
 * Las demás clases de recuerdo no se enumeran aquí.
 */
(() => {
  'use strict';
  const endpoint = String(window.AR_PHOTO_UPLOAD_URL || '').trim();
  let sequence = 0;

  function listPhotos(limit = 80) {
    return new Promise((resolve, reject) => {
      if (!endpoint) return reject(new Error('No está configurada la conexión con Google Drive.'));
      const callbackName = '__arDrivePhotos_' + Date.now() + '_' + (++sequence);
      const script = document.createElement('script');
      const separator = endpoint.includes('?') ? '&' : '?';
      let settled = false;
      const timer = window.setTimeout(() => finish(reject, new Error('Google Drive no respondió a tiempo.')), 30000);

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
        finish(resolve, data.items);
      };
      script.onerror = () => finish(reject, new Error('No se pudo conectar con la galería de Google Drive.'));
      script.src = endpoint + separator + 'action=publicPhotos&limit=' + encodeURIComponent(Math.max(1, Math.min(200, Number(limit) || 80))) + '&callback=' + encodeURIComponent(callbackName);
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
