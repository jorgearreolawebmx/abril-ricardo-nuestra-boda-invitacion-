# Optimización de la galería de invitados — V27

## Cambios de rendimiento
- La página pública consulta como máximo las 40 fotografías más recientes; cada miniatura se entrega a 640 px y el original solo se solicita al abrir el visor.
- En móviles el lienzo procesa texturas de hasta 480 px y limita DPR a 1.15; en escritorio usa hasta 640 px y DPR 1.4.
- El motor carga imágenes con cuatro solicitudes simultáneas y muestra las primeras seis en cuanto están listas, mientras termina de cargar las demás en orden.
- El bucle de animación se duerme cuando la cámara queda quieta y se despierta con gestos, teclado, cambios de tamaño o nuevas imágenes.
- Apps Script guarda en caché por 60 segundos la lista pública y verifica permisos de lectura sin volver a modificarlos en cada visita. Al guardar una nueva foto se invalida la caché.

## Archivos principales
- `js/infinite-gallery.js`
- `js/drive-gallery.js`
- `js/drive-infinite-gallery.js`
- `js/shared-gallery-home.js`
- `AppsScript/Code.gs`

## Estructura
Las tres páginas publicadas permanecen en la raíz: `index.html`, `galeria-fiesta.html` y `album-recuerdos.html`. Los recursos activos siguen en `assets/`, `css/`, `js/` y `AppsScript/`. Los archivos sueltos que venían del ZIP de GitHub se conservaron, sin eliminarlos, en `pruebas/archivos-raiz/` para que no se mezclen con los archivos activos ni queden dispersos en la raíz.

## Nota de despliegue
El cambio de `AppsScript/Code.gs` requiere implementar una nueva versión de la aplicación web existente. Se mantiene la misma URL `/exec` y la propiedad `AR_PANEL_PASSWORD`.
