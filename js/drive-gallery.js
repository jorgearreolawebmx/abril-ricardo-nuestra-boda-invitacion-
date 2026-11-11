/* Galería pública de fotografías de Abril & Ricardo.
 * Las miniaturas se sirven como data URL desde Apps Script; el original solo se pide al abrir.
 */
(() => {
  'use strict';
  const endpoint = String(window.AR_PHOTO_UPLOAD_URL || '').trim();
  let sequence = 0;
  const memoryCache = new Map();
  const thumbnailCache = new Map();
  const photoCache = new Map();

  function jsonp(action, params = {}, timeoutMs = 18000) {
    return new Promise((resolve, reject) => {
      if (!endpoint) return reject(new Error('No está configurada la conexión con Google Drive.'));
      const callbackName = '__arDrive_' + Date.now() + '_' + (++sequence);
      const script = document.createElement('script');
      const separator = endpoint.includes('?') ? '&' : '?';
      let settled = false;
      const timer = window.setTimeout(() => finish(reject, new Error('Google Drive no respondió a tiempo.')), timeoutMs);
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
        if (!data || data.success !== true) {
          finish(reject, new Error(data && data.message ? data.message : 'No se pudo completar la consulta de Drive.'));
          return;
        }
        finish(resolve, data);
      };
      script.async = true;
      const query = new URLSearchParams({ action, ...params, callback: callbackName, _: String(Date.now()) });
      script.src = endpoint + separator + query.toString();
      script.onerror = () => finish(reject, new Error('No se pudo conectar con la galería de Google Drive.'));
      document.head.appendChild(script);
    });
  }

  function listPhotos(limit = 40, force = false) {
    const safeLimit = Math.max(1, Math.min(60, Number(limit) || 40));
    const cached = memoryCache.get(safeLimit);
    if (!force && cached && Date.now() - cached.time < 25000) return Promise.resolve(cached.items);
    return jsonp('publicPhotos', { limit: String(safeLimit) }).then(data => {
      if (!Array.isArray(data.items)) throw new Error('La respuesta de Drive no contiene fotografías.');
      memoryCache.set(safeLimit, { time: Date.now(), items: data.items });
      return data.items;
    });
  }

  function getPublicThumbnail(id) {
    if (thumbnailCache.has(id)) return thumbnailCache.get(id);
    const request = jsonp('publicThumbnail', { id }, 22000).then(data => {
      if (!data.dataUrl) throw new Error('No se recibió la miniatura.');
      return data.dataUrl;
    });
    thumbnailCache.set(id, request);
    request.catch(() => thumbnailCache.delete(id));
    return request;
  }

  function getPublicPhoto(id) {
    if (photoCache.has(id)) return photoCache.get(id);
    const request = jsonp('publicPhoto', { id }, 45000).then(data => {
      if (!data.dataUrl) throw new Error('No se recibió la fotografía original.');
      return data.dataUrl;
    });
    photoCache.set(id, request);
    request.catch(() => photoCache.delete(id));
    return request;
  }

  async function toInfinitePhoto(item) {
    const thumbnail = await getPublicThumbnail(item.id);
    return {
      src: thumbnail,
      full: thumbnail,
      loadFull: () => getPublicPhoto(item.id),
      alt: 'Fotografía compartida en la boda de Abril y Ricardo',
      scale: 1
    };
  }

  window.ARDriveGallery = { listPhotos, getPublicThumbnail, getPublicPhoto, toInfinitePhoto };
})();
