ABRIL & RICARDO — INVITACIÓN DIGITAL
=====================================

CÓMO PROBARLA
1. Descomprime el ZIP completo.
2. Abre la carpeta Abril_Ricardo_Invitacion en Visual Studio Code.
3. Abre index.html con Live Server (recomendado).
4. Toca el sello dorado para reproducir el video del sobre.
5. Al finalizar el video, la portada aparece directamente.

ESTRUCTURA
- index.html: invitación y estructura de la galería.
- css/styles.css: diseño general, portada, sobre interior y secciones.
- css/infinite-gallery.css: estilos del motor 3D original.
- js/app.js: apertura, cuenta regresiva, raspadita, RSVP y galería.
- js/infinite-gallery.js: motor original de galería infinita Canvas 2D.
- js/gallery-config.js: fotos provisionales, título y parámetros de la galería.
- assets/: videos, fotografías, logotipo, sobre, 33 fotografías reales optimizadas y la canción elegida.

APERTURA
- El video de sello se reproduce únicamente al tocar el sello.
- Al terminar, la transición pasa directamente a la portada.
- No hay una segunda imagen de sobre durante la transición.
- El sobre abierto aparece dentro de la invitación, con la carta integrada como texto real.

PORTADA
- Fotografía original IMG_0452(2).jpg mostrada completa en su proporción natural; sin bandas desenfocadas añadidas ni recortes laterales artificiales.
- Logotipo PNG caligráfico transparente de Abril y Ricardo.
- Único texto superior: NOS CASAMOS.
- Cuenta regresiva hasta el 5 de agosto de 2027 a las 12:00 h (UTC-6).

GALERÍA INFINITA
- Integración directa del motor del prototipo Galeria_Infinita_Jorge_v2.
- Espacio 3D Canvas con movimiento, inercia, navegación táctil y visor ampliado.
- Al abrir la galería aparece el título “Nuestra galería infinita como nuestro amor”.
- 33 fotografías reales en formato WebP: 13 fotografías de la versión anterior y 20 fotografías adicionales (19 del ZIP de galería más IMG_0452).
- El acceso a la galería es una única fotografía vertical con el ramo; toca la fotografía para abrir la experiencia infinita.
- La galería se destruye al cerrarla para liberar recursos y se puede abrir de nuevo.

SELLOS RASPABLES (FECHA)
- Cada sello (día, mes, año) se raspa arrastrando el dedo o el mouse varias veces; un toque suelto no lo revela.
- El avance se mide con una cuadrícula interna, sin leer píxeles del canvas: funciona igual abriendo index.html
  directamente (file://), con Live Server o en un hosting.
- Con teclado, Enter o Espacio sobre el sello lo revelan.

RECURSOS PRINCIPALES
- Portada: assets/pareja-portada.webp (fotografía original IMG_0452(2).jpg, proporción 2048 × 1888, sin extensión desenfocada)
- Logotipo: assets/logo-abril-ricardo.png
- Video de apertura: assets/animacion-sobre.mp4
- Video ambiental fijo: assets/fondo-botanico.mp4
- Música: assets/riptide-vance-joy.mp3 (inicia al tocar el sello; control de pausa/reanudar disponible)
- Sobre interior: assets/sobre-abierto.webp
- Fondo de la galería infinita: assets/pareja-portada.webp (la misma fotografía original, sin desenfoque añadido)

DATOS
- Abril & Ricardo — 5 de agosto de 2027.
- Ceremonia: 12:00 h, Catedral de San Cristóbal Mártir.
- Recepción: 14:00 h, Salón Uvence.
- Vestimenta: formal de negro.
- WhatsApp: 961 380 5924.

La fecha del 5 de agosto de 2027 cae en jueves.

PUBLICACIÓN
La invitación utiliza rutas relativas y puede publicarse en GitHub Pages o cualquier hosting estático. Mantén las carpetas css, js y assets junto a index.html.


ACTUALIZACIÓN DE FOTOGRAFÍAS Y MÚSICA
- La portada y la fotografía 04 de la galería comparten el mismo original, como se solicitó.
- La galería utiliza 33 fotografías: las 13 anteriores y 20 nuevas.
- El fondo de la galería infinita ahora es la misma fotografía compuesta de la portada.
- La canción Riptide se inicia al tocar el sello. El control de música permite pausar y reanudar.
- El botón decorativo de destello de la portada fue eliminado.


ACTUALIZACIÓN DE GALERÍA (10 NOV 2026)
- El acceso a la galería es ahora una sola fotografía vertical con ramo; tocar cualquier parte de la imagen abre la galería infinita.
- El fondo de la galería infinita usa la misma fotografía compuesta de portada: assets/pareja-portada.webp.
- Se añadieron las 19 fotografías de fotos de galeria.zip y la foto adicional IMG_0452(1).jpg, optimizadas a WebP.
- Se eliminó el botón flotante de WhatsApp; se mantienen los enlaces de confirmación y contacto dentro de la invitación.
- El acceso visual de la galería usa assets/gallery-entry-bouquet.webp, con la fotografía del ramo.
- Se eliminó el icono flotante de WhatsApp; permanecen los enlaces de WhatsApp en Confirmación y Dudas.


CORRECCIÓN DE PORTADA (10 NOV 2026)
- Se sustituyó la imagen vertical compuesta con franjas desenfocadas por el archivo original IMG_0452(2).jpg.
- La fotografía aparece completa, en proporción natural 2048:1888, ocupando la parte superior de la portada.
- El nombre caligráfico, la fecha y la cuenta regresiva quedan en un panel inferior oscuro integrado con un degradado suave.
- La misma fotografía original se utiliza como fondo de la galería infinita y en el cierre visual.


ACTUALIZACIÓN DE GALERÍA (10-11-2026)
- Se eliminó el título superpuesto dentro de la galería infinita.
- Se ajustó el punto inicial de la cámara a x=15, y=15 para centrar mejor la composición inicial.
- Se conserva la interacción 3D, el visor, los gestos y el fondo configurado.


ACTUALIZACION DE DISENO (10-11-2026)
- Se retiro la tarjeta estatica que repetia la fecha despues de los tres sellos.
- La fecha se descubre en tres medallones cubiertos por el sello de cera dorada A&R.
- Los puntos del itinerario ahora muestran el mismo sello de cera.
- El sello se encuentra en assets/sello-cera-ar.webp.


ACTUALIZACIÓN CONSERVANDO LA GALERÍA BASE
- Se conservó sin cambios el motor y la configuración de la galería infinita.
- Se integró raspado por arrastre progresivo en los tres sellos de fecha.
- Se actualizó la carta con el texto “Y entonces, nos encontramos”.
- El protocolo alterna los textos a izquierda y derecha con sellos A&R al centro.
- Se incorporó la ilustración botánica de mesa de regalos.
- Se integró el interruptor de asistencia, nombre obligatorio y envío a WhatsApp.

NUEVA CATEGORÍA: TÓMATE UNA FOTO (10 NOV 2026)
- Después de Confirmación de asistencia se agregó la sección Tómate una foto.
- El botón abre la cámara del teléfono o el selector de imágenes en escritorio.
- Al elegir una foto, se genera una imagen vertical 9:16 con marco doble dorado, el logotipo original de Abril & Ricardo y la fecha 5 de agosto de 2027.
- La vista previa permite volver a tomar la fotografía, eliminarla, descargarla o guardarla en Google Drive.
- El marco se renderiza en el navegador; las fotografías no ocupan almacenamiento de GitHub.
- Para activar la subida, sigue AppsScript/INSTALACION.md y pega la URL publicada en js/photo-booth-config.js.
- Si el servicio todavía no está configurado, el botón de guardado descarga la imagen en el dispositivo y avisa que falta activar Drive; no simula una subida.


ACTUALIZACION v13 - CABINA FOTOGRAFICA FLORAL
- La seccion usa el marco floral de referencia en pantalla.
- Incluye la selfie de muestra enviada para que se entienda el resultado.
- Las fotos elegidas se muestran con el logotipo Abril & Ricardo en blanco.
- El archivo descargado contiene la fotografia y el logotipo blanco.
- El envio a Drive sigue dependiendo de publicar/configurar AppsScript/Code.gs en js/photo-booth-config.js.

CABINA FOTOGRÁFICA — COMPORTAMIENTO CORREGIDO
- Antes de tomar la foto se muestra una fotografía de ejemplo dentro del marco floral decorativo.
- Al seleccionar/tomar una foto, la muestra decorativa se oculta y aparece la foto original completa.
- La foto real no recibe el marco, flores, fondo ni recorte de la invitación.
- El logotipo de Abril & Ricardo se coloca en blanco, pequeño y centrado en la parte inferior.
- DESCARGAR FOTO exporta esa composición (foto original + logotipo).
- El botón de cámara usa el selector/cámara nativa del teléfono (capture=user).
- Para guardar también en Drive, publica AppsScript/Code.gs y configura la URL /exec en js/photo-booth-config.js.


ACTUALIZACIÓN V19 — CABINA Y ÁLBUM COLABORATIVO
- La cabina individual abre cámara en vivo con getUserMedia cuando el navegador lo permite.
- Si no se puede abrir cámara, ofrece el selector de fotografías del dispositivo.
- La fotografía individual se exporta sin marco decorativo, únicamente con el logotipo blanco de Abril & Ricardo en la parte inferior.
- La cabina permite descargar la fotografía y guardarla en Drive.
- Se añadió una sección independiente: “Las fotos de la fiesta”.
- La página galeria-fiesta.html permite tomar una foto, elegir una foto/video, escribir un mensaje y grabar un saludo de voz.
- La galería consulta Drive cada 20 segundos y permite visualizar y descargar los recuerdos compartidos.
- AppsScript/Code.gs crea las subcarpetas FOTOS_CON_LOGO, FOTOS_DE_LA_FIESTA, VIDEOS_DE_LA_FIESTA, MENSAJES y SALUDOS_DE_VOZ.
- El feed colaborativo muestra los recuerdos compartidos, incluidas las fotografías de la cabina con logotipo.
- Para activar la subida y lectura de Drive, seguir AppsScript/INSTALACION.md y configurar la URL /exec en js/photo-booth-config.js.
- Sin URL de Apps Script configurada, la interfaz no simula una subida: informa que falta conectar Drive.
