# Instalación de la versión V27 — Galería optimizada

Esta versión conserva la misma dirección `/exec`, la propiedad `AR_PANEL_PASSWORD` y la carpeta principal de Drive.

## 1. Actualizar Apps Script

1. Abre el mismo proyecto de Google Apps Script que ya usa la invitación.
2. Abre el archivo `Código.gs` o `Code.gs`.
3. Sustituye todo su contenido por el archivo `Abril_Ricardo_Code_gs_V27.txt` incluido junto al ZIP de entrega.
4. Guarda con `Ctrl + S`.
5. Comprueba que siga existiendo la propiedad de script `AR_PANEL_PASSWORD`. No la borres ni la pegues en el código.
6. En **Implementar → Gestionar implementaciones**, edita la implementación web existente, elige **Nueva versión** y pulsa **Implementar**.
7. Conserva **Ejecutar como: Yo** y **Quién tiene acceso: Cualquier persona**. No crees otra implementación ni cambies la URL `/exec`.

## 2. Actualizar GitHub

1. Extrae `Abril_Ricardo_Invitacion_V27_Optimizada.zip`.
2. En el repositorio existente, actualiza el contenido de la raíz con los archivos extraídos.
3. En la raíz deben permanecer estas tres páginas: `index.html`, `galeria-fiesta.html` y `album-recuerdos.html`.
4. Mantén las carpetas `assets/`, `css/`, `js/`, `AppsScript/`, `docs/` y `pruebas/` con su estructura interna.
5. No subas el ZIP dentro del repositorio. Sube el contenido extraído.

## 3. Qué se optimizó

- La galería pública consulta las 40 fotografías más recientes en lugar de descargar hasta 200.
- Las miniaturas del lienzo se solicitan a 640 px; el original solo se carga al abrir una foto.
- En teléfonos se limita la textura del lienzo a 480 px y la densidad de píxeles a 1.15.
- Se limita la descarga a cuatro imágenes simultáneas y las primeras seis se muestran progresivamente.
- El motor de animación deja de ejecutar fotogramas cuando la cámara queda quieta y vuelve a activarse con la interacción.
- Apps Script conserva la lista pública en caché durante 60 segundos y la invalida cuando se guarda una nueva fotografía.
- La consulta pública verifica permisos de lectura, pero ya no modifica permisos en cada visita.

## 4. Archivos anteriores conservados

Los archivos sueltos que estaban en la raíz del ZIP descargado de GitHub se conservaron en `pruebas/archivos-raiz/`. No se eliminaron; se apartaron para que no se confundan con los archivos activos ni queden dispersos en la raíz. Las páginas activas solo utilizan las carpetas `assets/`, `css/`, `js/` y `AppsScript/`.

## 5. Prueba después de publicar

1. Abre la invitación desde el celular.
2. Entra en **Las fotos de la fiesta** y comprueba que aparezcan las imágenes de muestra o las fotos ya compartidas.
3. Sube una fotografía nueva.
4. Vuelve a la galería y pulsa actualizar. La foto nueva debe aparecer; el original en alta calidad se solicita solo cuando se abre la foto.
5. Comprueba también el panel privado para confirmar que videos, mensajes y audios continúan siendo visibles solo para los novios.

La conexión real con Drive debe validarse después del despliegue y de subir una foto. La comprobación de sintaxis y rutas locales no sustituye esa prueba real.
