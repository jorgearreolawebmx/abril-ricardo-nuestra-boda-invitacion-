# Activar cámara, álbum colaborativo y almacenamiento en Google Drive

La invitación incluye dos herramientas independientes:

1. **Tómate una foto:** captura o selecciona una imagen, agrega únicamente el logotipo blanco de Abril & Ricardo en la parte inferior y permite descargarla. Al guardarla, se almacena en `FOTOS_CON_LOGO`.
2. **Las fotos de la fiesta:** permite subir fotografías, videos, mensajes y saludos de voz. Se almacenan en carpetas separadas y aparecen en la galería compartida.

Ambas utilizan esta carpeta principal de Drive:

https://drive.google.com/drive/folders/1P0JIDSpjX2x55Roy_0xc4y-QL-GHp9f0

## 1. Publicar Apps Script

1. Inicia sesión en la cuenta de Google que tiene permiso de edición sobre la carpeta principal.
2. Abre https://script.google.com/home/start y crea un proyecto nuevo.
3. Sustituye el contenido de `Código.gs` por el contenido completo de `AppsScript/Code.gs`.
4. Guarda el proyecto.
5. Selecciona **Implementar → Nueva implementación**.
6. En tipo, selecciona **Aplicación web**.
7. Configura **Ejecutar como: Yo**.
8. Configura **Quién tiene acceso: Cualquier persona**. Esto permite que los invitados suban archivos sin iniciar sesión.
9. Autoriza el acceso de Apps Script a Google Drive y completa la implementación.
10. Copia la URL de la aplicación web que termina en `/exec`.

## 2. Conectar la invitación

Abre `js/photo-booth-config.js` y reemplaza la línea vacía por la URL que te entregó Google:

```js
window.AR_PHOTO_UPLOAD_URL = 'https://script.google.com/macros/s/ID_DE_TU_IMPLEMENTACION/exec';
```

Guarda el archivo y vuelve a publicar el proyecto completo en GitHub Pages.

## 3. Carpetas que crea automáticamente

Dentro de la carpeta principal, Apps Script crea:

- `FOTOS_CON_LOGO` — fotografías de la cabina individual, con el logotipo.
- `FOTOS_DE_LA_FIESTA` — fotografías originales compartidas por los invitados.
- `VIDEOS_DE_LA_FIESTA` — videos.
- `MENSAJES` — felicitaciones y dedicatorias.
- `SALUDOS_DE_VOZ` — grabaciones de audio.

La cabina individual no mezcla sus fotografías con el álbum colaborativo.

## 4. Visibilidad y descargas

Después de subir cada archivo, el script intenta activar el permiso **Cualquier persona con el enlace — Lector**. Esto permite mostrar y descargar ese archivo desde la galería.

Si la cuenta de Google o una política de Workspace impide el uso compartido público, el archivo podría guardarse pero no ser visible para los invitados. En ese caso hay que revisar la configuración de uso compartido de Google Drive.

## 5. Límites actuales

- Fotos: hasta 12 MB.
- Videos: hasta 20 MB.
- Audios: hasta 12 MB.
- Mensajes: hasta 30 KB.
- La galería consulta nuevos elementos automáticamente cada 20 segundos.

Los límites reducen fallos de carga por el tamaño de las solicitudes de Apps Script. Para videos largos o archivos más pesados se necesitaría una arquitectura de carga por fragmentos.

## 6. Requisitos de cámara

La cámara en vivo requiere HTTPS o localhost y que el invitado autorice el permiso de cámara. Si el navegador no permite abrirla, se ofrece el selector de archivos del teléfono.

## 7. Importante sobre privacidad

El endpoint de subida es público para que los invitados no necesiten iniciar sesión. Los archivos compartidos con enlace pueden ser vistos por cualquier persona que tenga ese enlace. Comparte la invitación y la galería teniendo esto presente.

No publiques el Apps Script antes de revisar que la cuenta propietaria sea la correcta y que la carpeta de destino sea la indicada.


## 8. Panel de consulta para los invitados

La página `album-recuerdos.html` es el panel de solo lectura del álbum compartido. Desde `galeria-fiesta.html`, los invitados entran mediante **VER ÁLBUM DE RECUERDOS**.

El panel consulta la lista de archivos en Drive y los organiza en:
- Todo
- Fotos (incluye las fotos de la cabina con logotipo)
- Videos
- Mensajes
- Audios

El backend intenta corregir automáticamente el permiso de lectura de cada archivo y devuelve una URL de miniatura de Drive. Si la política de Google no permite compartir un archivo por enlace, aparecerá como no disponible en lugar de mostrar una miniatura rota.

Al actualizar `AppsScript/Code.gs`, debes ir a **Implementar → Gestionar implementaciones → Editar → Nueva versión → Implementar**. La URL `/exec` se conserva; no es necesario volver a pegarla en `js/photo-booth-config.js`.
