# Instalación y actualización — Invitación Abril & Ricardo

## Estructura del proyecto

El proyecto está organizado en carpetas canónicas:

- `assets/`: fotografías, fondos, videos, música y logotipos.
- `css/`: hojas de estilos.
- `js/`: scripts de la invitación, cabina y galería colaborativa.
- `AppsScript/`: backend de Google Drive.
- `index.html`: invitación principal.
- `galeria-fiesta.html`: página donde los invitados envían sus recuerdos.
- `album-recuerdos.html`: panel privado de los novios.

Los recursos multimedia se mantienen una sola vez dentro de `assets/`. No copies imágenes a la raíz.

## 1. Publicar los archivos en GitHub Pages

1. Descomprime el ZIP completo.
2. Abre la carpeta del proyecto: la que contiene `index.html`, `assets`, `css` y `js`.
3. Sube el contenido completo de esa carpeta al repositorio que publica la invitación.
4. Este paquete contiene menos de 100 archivos para que puedas cargarlo desde la interfaz web de GitHub en una sola selección, si GitHub lo permite en tu sesión.
5. Conserva las carpetas `assets`, `css`, `js` y `AppsScript` con esos nombres.

No subas solo los archivos sueltos: la invitación utiliza las rutas `assets/...`, `css/...` y `js/...`.

## 2. Conectar Google Apps Script

La configuración del proyecto ya conserva la URL de la aplicación web:

`https://script.google.com/macros/s/AKfycbzPX1DfaoKlE8VN1pMV86qq2LfuuzX3DXZlpkIQ35IuH1FdcQDR5XYUPZnvXxPOrrfgcw/exec`

Está guardada en `js/photo-booth-config.js`. No necesitas volver a pegarla mientras la implementación siga siendo la misma.

Para actualizar el backend:

1. Abre el proyecto de Apps Script que corresponde a esa URL.
2. Sustituye todo el contenido de `Código.gs` por `AppsScript/Code.gs` de este ZIP.
3. Guarda el proyecto.
4. Abre **Configuración del proyecto → Propiedades del script**.
5. Añade o actualiza:
   - Nombre: `AR_PANEL_PASSWORD`
   - Valor: `la contraseña privada acordada con los novios`
6. Abre **Implementar → Gestionar implementaciones**.
7. Edita la implementación web existente con el lápiz.
8. En **Versión**, selecciona **Nueva versión** y pulsa **Implementar**.
9. Mantén la URL `/exec` actual.

Configuración de la aplicación web:
- Ejecutar como: **Yo** (propietario de la carpeta de Drive).
- Quién tiene acceso: **Cualquier persona**, porque los invitados deben poder enviar archivos sin iniciar sesión.

La contraseña no se guarda en HTML, CSS, JavaScript ni en GitHub. Se valida en el servidor con la propiedad privada `AR_PANEL_PASSWORD`.

## 3. Funcionamiento de las dos experiencias

### Tómate una foto
- El invitado abre la cámara o selecciona una foto.
- La fotografía recibe el logotipo blanco de Abril & Ricardo en la parte inferior.
- El archivo descargado contiene únicamente la foto y el logotipo, no el marco floral decorativo.
- Al guardarla en Drive se almacena en `FOTOS_CON_LOGO`.

### Las fotos de la fiesta y la galería infinita
Al entrar a `galeria-fiesta.html`, los invitados ven primero una galería infinita que consulta las fotografías compartidas en Drive. El botón **COMPARTIR UN RECUERDO** lleva al formulario que conserva las opciones de tomar o elegir una foto, subir video, escribir un mensaje y grabar un saludo.

Las fotografías de `FOTOS_DE_LA_FIESTA` y `FOTOS_CON_LOGO` se muestran en la galería pública. La portada de la invitación muestra automáticamente las tres fotos más recientes. Si todavía no se han compartido fotos, se muestran las tres imágenes de muestra incluidas en `assets/`.

Los videos, mensajes y saludos de voz se almacenan en carpetas separadas y permanecen privados:
- `VIDEOS_DE_LA_FIESTA`
- `MENSAJES`
- `SALUDOS_DE_VOZ`

Los invitados no tienen acceso al álbum privado ni al panel de los novios.

## 4. Panel privado de los novios

Al final de la invitación aparece el acceso **PANEL DE LOS NOVIOS**.

Al entrar, pide la contraseña. Después de validarla, el panel consulta Drive y muestra:
- Fotografías con miniaturas ligeras; al tocarlas se abre la foto original dentro del visor del panel.
- Descargas de las fotografías.
- Videos reproducibles dentro del panel.
- Saludos de voz con nombre del remitente y reproductor integrado.
- Mensajes escritos.
- Filtros por tipo de recuerdo.

La sesión del panel dura hasta 6 horas. Las consultas de lista, miniaturas y archivos requieren el token temporal emitido por Apps Script.

## 5. Privacidad de Drive

Privacidad y visibilidad:
- Las fotografías destinadas a la galería pública (`FOTOS_DE_LA_FIESTA` y `FOTOS_CON_LOGO`) se configuran en Drive como **cualquier persona con el enlace: lector** para que la invitación pueda mostrarlas sin pedir inicio de sesión.
- Esto significa que cualquier persona que tenga el enlace de la invitación puede ver esas fotografías.
- Los videos, mensajes y saludos de voz no se publican por enlace; permanecen privados y sus contenidos solo se consultan en el panel después de validar la sesión.
- El listado público de Apps Script devuelve únicamente archivos de imagen. No enumera videos, mensajes ni audios.

La carpeta principal utilizada es:

https://drive.google.com/drive/folders/1P0JIDSpjX2x55Roy_0xc4y-QL-GHp9f0

Apps Script crea automáticamente las subcarpetas descritas arriba.

## 6. Límites actuales

Para que los archivos se puedan mostrar o reproducir dentro del panel:
- Fotos: hasta 12 MB.
- Audios: hasta 10 MB.
- Videos: hasta 18 MB.

Los archivos más grandes pueden fallar en la carga o reproducción integrada. Para manejar videos grandes se necesitaría carga por fragmentos y reproducción mediante un endpoint de streaming.

## 7. Requisitos del navegador

La cámara y el micrófono requieren HTTPS y permiso del invitado. GitHub Pages cumple el requisito HTTPS. Si el navegador no abre la cámara en vivo, la página ofrece seleccionar un archivo desde el teléfono.

## 8. Pruebas después de publicar

1. Abre la invitación publicada y verifica que carguen portada, video, música y galería original.
2. Envía una foto desde `galeria-fiesta.html`.
3. Graba un saludo con nombre.
4. Abre **PANEL DE LOS NOVIOS** e inicia sesión con la contraseña configurada.
5. Comprueba que aparezcan la foto, el audio y el nombre del invitado.
6. Reproduce el audio dentro del panel y descarga una fotografía.

## 9. Actualización V26 — Galería infinita de Drive

En esta versión, el endpoint `action=publicPhotos` es público y devuelve exclusivamente fotografías. Para activarlo, actualiza `AppsScript/Code.gs` y despliega una nueva versión en la misma URL `/exec`. No hace falta cambiar `js/photo-booth-config.js`.
