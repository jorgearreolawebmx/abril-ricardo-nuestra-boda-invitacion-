/**
 * Backend de la invitación Abril & Ricardo.
 * Guarda los archivos en subcarpetas de la carpeta principal de Drive.
 *
 * Publicar como Aplicación web:
 *   Ejecutar como: propietario del script
 *   Acceso: Cualquier persona
 *
 * IMPORTANTE: cada archivo compartido se marca "cualquier persona con el enlace: lector"
 * para que los invitados puedan verlo y descargarlo desde la galería.
 */
const AR_ROOT_FOLDER_ID = '1P0JIDSpjX2x55Roy_0xc4y-QL-GHp9f0';

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
  video: 20 * 1024 * 1024,
  audio: 12 * 1024 * 1024,
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
  if (params.action === 'list') {
    const data = listSharedGallery_();
    const callback = String(params.callback || '');
    if (!/^[A-Za-z_$][A-Za-z0-9_$\\.]*$/.test(callback)) {
      return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(callback + '(' + JSON.stringify(data) + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return HtmlService.createHtmlOutput(
    '<!doctype html><html lang="es"><meta charset="utf-8"><body style="font:16px Arial;padding:24px;color:#514936">' +
    '<h2>Álbum de Abril & Ricardo</h2><p>El servicio está activo. Puedes regresar a la invitación.</p></body></html>'
  );
}

function doPost(e) {
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
    if (kind === 'message' && messageText) file.setDescription(messageText);
    else file.setDescription('Compartido en la boda de Abril & Ricardo · 5 de agosto de 2027.');

    const publicLinkEnabled = ensurePublicLink_(file);

    result = {
      type: 'AR_PHOTO_UPLOAD_RESULT',
      requestId: result.requestId,
      success: true,
      message: 'Archivo guardado correctamente.',
      kind: kind,
      fileId: file.getId(),
      fileName: file.getName(),
      fileUrl: file.getUrl(),
      publicLinkEnabled: publicLinkEnabled
    };
    if (!publicLinkEnabled) {
      result.message = 'El archivo se guardó, pero Drive no permitió activar el acceso por enlace. Revisa los permisos de uso compartido.';
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

function ensurePublicLink_(file) {
  try {
    let access = file.getSharingAccess();
    if (access !== DriveApp.Access.ANYONE_WITH_LINK) {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      access = file.getSharingAccess();
    }
    return access === DriveApp.Access.ANYONE_WITH_LINK;
  } catch (error) {
    return false;
  }
}

function listSharedGallery_() {
  const items = [];
  const sharedKinds = ['booth', 'photo', 'video', 'message', 'audio'];

  sharedKinds.forEach(function(kind) {
    const folderName = AR_FOLDERS[kind];
    const folder = getOrCreateFolder_(folderName);
    const files = folder.getFiles();

    while (files.hasNext()) {
      const file = files.next();
      const id = file.getId();
      const mime = file.getMimeType();
      const isPublic = ensurePublicLink_(file);
      const viewUrl = 'https://drive.google.com/file/d/' + id + '/view?usp=sharing';
      const downloadUrl = 'https://drive.google.com/uc?export=download&id=' + id;
      const previewUrl = (kind === 'video' || kind === 'audio')
        ? 'https://drive.google.com/file/d/' + id + '/preview'
        : 'https://drive.google.com/thumbnail?id=' + id + '&sz=w1600';

      items.push({
        id: id,
        kind: kind,
        name: file.getName(),
        mimeType: mime,
        description: file.getDescription() || '',
        createdAt: file.getDateCreated().toISOString(),
        publicLinkEnabled: isPublic,
        previewUrl: previewUrl,
        viewUrl: viewUrl,
        downloadUrl: downloadUrl
      });
    }
  });

  items.sort(function(a, b) {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return { success: true, items: items.slice(0, 200) };
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
