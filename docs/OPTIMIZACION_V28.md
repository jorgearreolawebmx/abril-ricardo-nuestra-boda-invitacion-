# Abril & Ricardo — V28

## Cambios
- La cabina fotográfica usa la cámara nativa del dispositivo móvil en teléfonos; en escritorio conserva la cámara integrada.
- Las fotografías de la cabina se preparan a un máximo de 1920 px y JPEG de calidad optimizada.
- Las fotografías del álbum colaborativo se redimensionan a un máximo de 1600 px y JPEG antes de enviarse a Drive.
- La galería infinita usa un perfil móvil reducido (20 fotos recientes, texturas de 320 px, DPR 1, dos cargas simultáneas y menor densidad de tarjetas). En escritorio usa hasta 36 fotografías.
- La galería ya no construye primero un motor de muestra para luego destruirlo inmediatamente cuando llega Drive. Espera la respuesta y solo crea una instancia.
- Apps Script comparte una única caché de metadatos entre la consulta de las tres fotografías de portada y la galería; caduca a los 180 segundos y se limpia al subir una fotografía.
- Las páginas de galería y panel vuelven a `index.html?skipEnvelope=1#inicio`, sin reproducir de nuevo el video del sobre.
- El sobre incluye el control `SALTAR SOBRE · ENTRAR A LA INVITACIÓN`.

## Archivos relevantes
`js/photo-booth.js`, `js/shared-gallery.js`, `js/drive-infinite-gallery.js`, `js/app.js`, `AppsScript/Code.gs`, `index.html`, `galeria-fiesta.html`, `album-recuerdos.html`, `css/styles.css` y `css/shared-gallery.css`.

## Publicación
1. Actualizar `AppsScript/Code.gs` en el mismo proyecto de Apps Script y desplegar una nueva versión en la implementación existente.
2. Subir el contenido del ZIP al repositorio manteniendo sus carpetas en la raíz.
3. Probar en un celular: abrir con salto, tomar foto, cargarla, verificar Drive y consultar la galería pública.
