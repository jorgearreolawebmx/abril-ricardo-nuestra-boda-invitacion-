ABRIL & RICARDO — VERSIÓN V28

Este ZIP contiene el proyecto completo. Sube su CONTENIDO a la raíz de tu repositorio GitHub; no subas una carpeta contenedora adicional.

CARPETAS ACTIVAS:
- AppsScript/   Código de Google Apps Script activo
- assets/       Imágenes, video, audio y recursos de la invitación
- css/          Hojas de estilo activas
- docs/         Documentación
- js/           JavaScript activo
- pruebas/      Archivos antiguos sueltos de la raíz, conservados para referencia

PÁGINAS EN LA RAÍZ:
- index.html
- galeria-fiesta.html
- album-recuerdos.html

CAMBIOS V28:
- La toma de fotografías en móviles usa la cámara nativa del teléfono para evitar fallos de permisos de cámara web en algunos navegadores integrados.
- La cabina de fotos limita el archivo final a 1920 px y comprime JPEG antes de enviarlo.
- Las fotos subidas desde la galería colaborativa se redimensionan a 1600 px y JPEG antes de enviarse a Drive.
- La galería infinita tiene un perfil de móvil reducido: hasta 16 fotos recientes, miniaturas de 480 px desde Drive, textura 320 px, DPR 1 y dos descargas simultáneas. En escritorio usa hasta 32 fotos.
- Se evita crear una galería de prueba y destruirla apenas llega la respuesta de Drive.
- Apps Script utiliza una caché única de metadatos de las fotos compartidas durante 180 segundos, que se limpia cuando se sube una fotografía.
- Todas las páginas secundarias tienen regreso directo al inicio de la invitación, sin volver a reproducir el sobre.
- La pantalla del sobre tiene el botón SALTAR SOBRE · ENTRAR A LA INVITACIÓN.

IMPORTANTE:
Hay 81 archivos antiguos/pruebas conservados en pruebas/archivos-raiz/. No son archivos activos ni deben reemplazar a los archivos de js/, css/, assets/ o AppsScript/.
