/**
 * Backend de la invitación Abril & Ricardo.
 * Guarda los archivos en subcarpetas de la carpeta principal de Drive.
 *
 * Publicar como Aplicación web:
 *   Ejecutar como: propietario del script
 *   Acceso: Cualquier persona
 *
 * Las fotografías de la galería se marcan "cualquier persona con el enlace: lector".
 * Videos, mensajes y saludos de voz permanecen privados y requieren sesión de panel.
 */
const AR_ROOT_FOLDER_ID = '1P0JIDSpjX2x55Roy_0xc4y-QL-GHp9f0';
// La contraseña se guarda en Script Properties de Apps Script, nunca en GitHub ni en JavaScript público.
const AR_PANEL_SESSION_SECONDS = 21600; // 6 horas
const AR_MAX_INLINE_AUDIO_BYTES = 10 * 1024 * 1024;
const AR_MAX_INLINE_IMAGE_BYTES = 12 * 1024 * 1024;
const AR_MAX_INLINE_VIDEO_BYTES = 18 * 1024 * 1024;

const AR_FOLDERS = {
  booth: 'FOTOS_CON_LOGO',
  photo: 'FOTOS_DE_LA_FIESTA',
  video: 'VIDEOS_DE_LA_FIESTA',
  message: 'MENSAJES',
  audio: 'SALUDOS_DE_VOZ'
};

const AR_LIMITS = {
  booth: 12 * 1024 * 1024,
  photo: 12 * 1024 * 1024,
  video: 18 * 1024 * 1024,
  audio: 10 * 1024 * 1024,
  message: 30 * 1024
};

const AR_ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp',
  'video/mp4', 'video/quicktime', 'video/webm',
  'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg',
  'text/plain'
];

function doGet(e) {
  const params = (e && e.parameter) ? e.parameter : {};
  const callback = String(params.callback || '');
  const action = String(params.action || '');
  const token = String(params.token || '');

  // Esta ruta pública enumera exclusivamente fotografías destinadas a la galería de invitados.
  // No devuelve videos, mensajes ni saludos de voz.
  if (action === 'publicPhotos') {
    return jsonpResponse_(callback, listPublicGalleryPhotos_(params.limit));
  }

  if (action === 'list' || action === 'thumbnail' || action === 'media' || action === 'checkPanel') {
    if (!isValidPanelToken_(token)) {
      return jsonpResponse_(callback, {
        success: false,
        authRequired: true,
        message: 'Inicia sesión en el panel privado de los novios.'
      });
    }
  }

  if (action === 'list') {
    return jsonpResponse_(callback, listSharedGallery_());
  }

  if (action === 'thumbnail') {
    return jsonpResponse_(callback, getGalleryThumbnail_(String(params.id || '')));
  }

  if (action === 'media') {
    return jsonpResponse_(callback, getGalleryMedia_(String(params.id || '')));
  }

  if (action === 'checkPanel') {
    return jsonpResponse_(callback, { success: true, authenticated: true });
  }

  return HtmlService.createHtmlOutput(
    '<!doctype html><html lang="es"><meta charset="utf-8"><body style="font:16px Arial;padding:24px;color:#514936">' +
    '<h2>Servicio privado de Abril & Ricardo</h2><p>El servicio está activo.</p></body></html>'
  );
}

function jsonpResponse_(callback, data) {
  const safeCallback = /^[A-Za-z_$][A-Za-z0-9_$\\.]*$/.test(callback);
  if (!safeCallback) {
    return ContentService.createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(callback + '(' + JSON.stringify(data).replace(/</g, '\\u003c') + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function isValidPanelToken_(token) {
  if (!token || token.length < 20) return false;
  return CacheService.getScriptCache().get('AR_PANEL_' + token) === 'authorized';
}

function createPanelSession_() {
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  CacheService.getScriptCache().put('AR_PANEL_' + token, 'authorized', AR_PANEL_SESSION_SECONDS);
  return token;
}

function setFilePrivate_(file) {
  try {
    if (file.getSharingAccess() !== DriveApp.Access.PRIVATE) {
      file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.VIEW);
    }
    return file.getSharingAccess() === DriveApp.Access.PRIVATE;
  } catch (error) {
    return false;
  }
}

// Solo las fotografías de la galería colaborativa tienen acceso de lectura por enlace.
// Los videos, mensajes y audios permanecen privados y solo se muestran en el panel autenticado.
function setFilePublicForGallery_(file) {
  try {
    if (file.getSharingAccess() !== DriveApp.Access.ANYONE_WITH_LINK) {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }
    return file.getSharingAccess() === DriveApp.Access.ANYONE_WITH_LINK;
  } catch (error) {
    return false;
  }
}

function panelAuthResponse_(result) {
  const safeResult = JSON.stringify(result).replace(/</g, '\\u003c');
  const html = '<!doctype html><html lang="es"><meta charset="utf-8"><body>' +
    '<script>window.top.postMessage(' + safeResult + ', "*");</script>' +
    '<p>Autenticación terminada.</p></body></html>';
  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  const params = (e && e.parameter) ? e.parameter : {};

  if (String(params.action || '') === 'panelLogin') {
    const requestId = String(params.requestId || '');
    const password = String(params.password || '');
    const expectedPassword = PropertiesService.getScriptProperties().getProperty('AR_PANEL_PASSWORD') || '';
    if (!expectedPassword) {
      return panelAuthResponse_({
        type: 'AR_PANEL_AUTH_RESULT',
        requestId: requestId,
        success: false,
        message: 'El panel aún no está configurado. Registra AR_PANEL_PASSWORD en las propiedades del proyecto Apps Script.'
      });
    }
    if (password !== expectedPassword) {
      return panelAuthResponse_({
        type: 'AR_PANEL_AUTH_RESULT',
        requestId: requestId,
        success: false,
        message: 'La contraseña no es correcta.'
      });
    }

    return panelAuthResponse_({
      type: 'AR_PANEL_AUTH_RESULT',
      requestId: requestId,
      success: true,
      token: createPanelSession_(),
      expiresIn: AR_PANEL_SESSION_SECONDS
    });
  }

  let result = {
    type: 'AR_PHOTO_UPLOAD_RESULT',
    success: false,
    message: 'No se pudo guardar el archivo.',
    requestId: (e && e.parameter && e.parameter.requestId) ? String(e.parameter.requestId) : ''
  };

  try {
    const params = (e && e.parameter) ? e.parameter : {};
    let kind = String(params.kind || '').toLowerCase();
    if (params.source === 'AbrilRicardoPhotoBooth' || !kind) kind = 'booth';
    if (!AR_FOLDERS[kind]) throw new Error('Tipo de contenido no reconocido.');

    const mimeType = String(params.mimeType || '').toLowerCase().trim();
    if (AR_ALLOWED_TYPES.indexOf(mimeType) === -1) throw new Error('El formato de archivo no está permitido.');
    if (kind === 'booth' && mimeType !== 'image/jpeg') throw new Error('La cabina debe enviar una fotografía JPG.');
    if (kind === 'photo' && mimeType.indexOf('image/') !== 0) throw new Error('Selecciona una fotografía.');
    if (kind === 'video' && mimeType.indexOf('video/') !== 0) throw new Error('Selecciona un video.');
    if (kind === 'audio' && mimeType.indexOf('audio/') !== 0) throw new Error('Selecciona un audio.');
    if (kind === 'message' && mimeType !== 'text/plain') throw new Error('El mensaje no tiene un formato válido.');

    const base64 = String(params.fileData || params.imageData || '').trim();
    if (!base64) throw new Error('No recibimos ningún archivo.');
    if (!/^[A-Za-z0-9+/]+=*$/.test(base64)) throw new Error('El archivo recibido no tiene un formato válido.');

    const bytes = Utilities.base64Decode(base64);
    if (!bytes || !bytes.length) throw new Error('El archivo está vacío.');
    if (bytes.length > AR_LIMITS[kind]) {
      const mb = Math.round(AR_LIMITS[kind] / (1024 * 1024));
      throw new Error('El archivo supera el límite de ' + mb + ' MB para este tipo de contenido.');
    }

    const folder = getOrCreateFolder_(AR_FOLDERS[kind]);
    const requestedName = sanitizeFileName_(params.fileName || '');
    const extension = extensionFor_(mimeType);
    const fileName = requestedName || ('AR_' + kind + '_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss') + '.' + extension);
    const blob = Utilities.newBlob(bytes, mimeType, fileName);
    const file = folder.createFile(blob);

    const messageText = String(params.messageText || '').trim().slice(0, 1200);
    const senderName = String(params.senderName || '').trim().replace(/[\r\n]/g, ' ').slice(0, 70);

    if (kind === 'message' && messageText) {
      file.setDescription(messageText);
    } else if (kind === 'audio') {
      const audioMeta = {
        senderName: senderName || 'Invitado',
        note: 'Saludo de voz de la boda de Abril & Ricardo.'
      };
      file.setDescription('AR_AUDIO_META:' + JSON.stringify(audioMeta));
    } else {
      file.setDescription('Compartido en la boda de Abril & Ricardo · 5 de agosto de 2027.');
    }

    const isGalleryPhoto = (kind === 'booth' || kind === 'photo') && mimeType.indexOf('image/') === 0;
    const accessConfirmed = isGalleryPhoto ? setFilePublicForGallery_(file) : setFilePrivate_(file);

    result = {
      type: 'AR_PHOTO_UPLOAD_RESULT',
      requestId: result.requestId,
      success: true,
      message: 'Archivo guardado correctamente.',
      kind: kind,
      fileId: file.getId(),
      fileName: file.getName(),
      fileUrl: file.getUrl(),
      privateStorage: isGalleryPhoto ? null : accessConfirmed,
      galleryVisible: isGalleryPhoto ? accessConfirmed : false
    };
    if (isGalleryPhoto && !accessConfirmed) {
      result.message = 'La fotografía se guardó, pero Drive no permitió habilitar su visualización en la galería.';
    } else if (!isGalleryPhoto && !accessConfirmed) {
      result.message = 'El archivo se guardó, pero no fue posible confirmar que quedara privado. Revisa los permisos de Drive.';
    }
  } catch (error) {
    result.message = (error && error.message) ? error.message : 'Ocurrió un error al guardar el archivo.';
  }

  const safeResult = JSON.stringify(result).replace(/</g, '\\u003c');
  const html = '<!doctype html><html lang="es"><meta charset="utf-8"><body>' +
    '<script>window.top.postMessage(' + safeResult + ', "*");</script>' +
    '<p>Proceso terminado.</p></body></html>';

  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getOrCreateFolder_(name) {
  const root = DriveApp.getFolderById(AR_ROOT_FOLDER_ID);
  const folders = root.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : root.createFolder(name);
}


function listSharedGallery_() {
  const items = [];
  const sharedKinds = ['booth', 'photo', 'video', 'message', 'audio'];

  sharedKinds.forEach(function(kind) {
    const folder = getOrCreateFolder_(AR_FOLDERS[kind]);
    const files = folder.getFiles();

    while (files.hasNext()) {
      const file = files.next();
      const id = file.getId();
      const mime = file.getMimeType();
      // Las fotos siguen visibles en la galería pública; los demás recuerdos se mantienen privados.
      const isGalleryPhoto = (kind === 'booth' || kind === 'photo') && mime.indexOf('image/') === 0;
      const accessConfirmed = isGalleryPhoto ? setFilePublicForGallery_(file) : setFilePrivate_(file);

      let description = file.getDescription() || '';
      let senderName = '';
      if (kind === 'audio' && description.indexOf('AR_AUDIO_META:') === 0) {
        try {
          const metadata = JSON.parse(description.substring('AR_AUDIO_META:'.length));
          senderName = String(metadata.senderName || 'Invitado').slice(0, 70);
          description = metadata.note || '';
        } catch (metadataError) {
          senderName = 'Invitado';
          description = 'Saludo de voz de la boda de Abril & Ricardo.';
        }
      }

      items.push({
        id: id,
        kind: kind,
        name: file.getName(),
        mimeType: mime,
        description: description,
        senderName: senderName,
        createdAt: file.getDateCreated().toISOString(),
        privateStorage: isGalleryPhoto ? null : accessConfirmed,
        galleryVisible: isGalleryPhoto ? accessConfirmed : false,
        downloadAvailable: true
      });
    }
  });

  items.sort(function(a, b) {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return { success: true, items: items.slice(0, 200) };
}

function listPublicGalleryPhotos_(requestedLimit) {
  const items = [];
  const publicKinds = ['booth', 'photo'];
  const numericLimit = Number(requestedLimit || 80);
  const limit = Math.max(1, Math.min(200, isFinite(numericLimit) ? Math.floor(numericLimit) : 80));

  publicKinds.forEach(function(kind) {
    const folder = getOrCreateFolder_(AR_FOLDERS[kind]);
    const files = folder.getFiles();
    while (files.hasNext()) {
      const file = files.next();
      const mime = String(file.getMimeType() || '').toLowerCase();
      if (mime.indexOf('image/') !== 0) continue;

      // Si una política de la cuenta impide compartir por enlace, omitimos la foto de la vista pública.
      if (!setFilePublicForGallery_(file)) continue;

      const id = file.getId();
      items.push({
        id: id,
        kind: kind,
        mimeType: mime,
        createdAt: file.getDateCreated().toISOString(),
        thumbnailUrl: 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=w1400',
        imageUrl: 'https://drive.google.com/uc?export=view&id=' + encodeURIComponent(id)
      });
    }
  });

  items.sort(function(a, b) {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return { success: true, items: items.slice(0, limit) };
}

function isWeddingGalleryFile_(file) {
  const root = DriveApp.getFolderById(AR_ROOT_FOLDER_ID);
  const allowedFolderIds = {};
  const folders = root.getFolders();

  while (folders.hasNext()) {
    const folder = folders.next();
    if (Object.keys(AR_FOLDERS).some(function(kind) {
      return AR_FOLDERS[kind] === folder.getName();
    })) {
      allowedFolderIds[folder.getId()] = true;
    }
  }

  const parents = file.getParents();
  while (parents.hasNext()) {
    if (allowedFolderIds[parents.next().getId()]) return true;
  }
  return false;
}

function getGalleryThumbnail_(fileId) {
  try {
    if (!/^[A-Za-z0-9_-]{10,}$/.test(fileId)) throw new Error('Identificador de archivo no válido.');

    const file = DriveApp.getFileById(fileId);
    if (!isWeddingGalleryFile_(file)) throw new Error('El archivo no pertenece al álbum de la boda.');
    if (file.getMimeType().indexOf('image/') !== 0) throw new Error('El archivo no es una fotografía.');

    const thumbnail = file.getThumbnail();
    if (!thumbnail) throw new Error('Google Drive todavía no generó una miniatura para esta fotografía.');

    const contentType = thumbnail.getContentType() || 'image/jpeg';
    return {
      success: true,
      fileId: fileId,
      mimeType: contentType,
      dataUrl: 'data:' + contentType + ';base64,' + Utilities.base64Encode(thumbnail.getBytes())
    };
  } catch (error) {
    return {
      success: false,
      fileId: fileId,
      message: error && error.message ? error.message : 'No se pudo generar la miniatura.'
    };
  }
}

function getGalleryMedia_(fileId) {
  try {
    if (!/^[A-Za-z0-9_-]{10,}$/.test(fileId)) throw new Error('Identificador de archivo no válido.');

    const file = DriveApp.getFileById(fileId);
    if (!isWeddingGalleryFile_(file)) throw new Error('El archivo no pertenece al álbum de la boda.');

    const mime = file.getMimeType();
    const isImage = mime.indexOf('image/') === 0;
    const isAudio = mime.indexOf('audio/') === 0;
    const isVideo = mime.indexOf('video/') === 0;
    if (!isImage && !isAudio && !isVideo) {
      throw new Error('Este tipo de archivo no se puede reproducir en el panel.');
    }

    const blob = file.getBlob();
    const bytes = blob.getBytes();
    const limit = isAudio ? AR_MAX_INLINE_AUDIO_BYTES : (isVideo ? AR_MAX_INLINE_VIDEO_BYTES : AR_MAX_INLINE_IMAGE_BYTES);
    if (bytes.length > limit) {
      throw new Error(isAudio
        ? 'El saludo supera 10 MB y no se puede reproducir integrado.'
        : (isVideo ? 'El video supera 18 MB para reproducción integrada.' : 'La fotografía supera 12 MB para vista ampliada.'));
    }

    return {
      success: true,
      fileId: fileId,
      mimeType: mime,
      fileName: file.getName(),
      dataUrl: 'data:' + mime + ';base64,' + Utilities.base64Encode(bytes)
    };
  } catch (error) {
    return {
      success: false,
      fileId: fileId,
      message: error && error.message ? error.message : 'No se pudo cargar el archivo.'
    };
  }
}

function sanitizeFileName_(name) {
  return String(name || '')
    .replace(/[\\/:*?"<>|\r\n]/g, '_')
    .replace(/\.\./g, '_')
    .slice(0, 100);
}

function extensionFor_(mime) {
  const map = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
    'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm',
    'audio/webm': 'webm', 'audio/mp4': 'm4a', 'audio/mpeg': 'mp3',
    'audio/wav': 'wav', 'audio/ogg': 'ogg', 'text/plain': 'txt'
  };
  return map[mime] || 'bin';
}
