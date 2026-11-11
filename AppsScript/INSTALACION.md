# Actualizar el backend de la invitación Abril & Ricardo

Este archivo `Code.gs` es el backend que usa la invitación.

1. Abre el proyecto de Google Apps Script asociado a la URL `/exec` configurada en `js/photo-booth-config.js`.
2. Sustituye todo el contenido de `Código.gs` por `AppsScript/Code.gs` de este proyecto.
3. Guarda.
4. En **Configuración del proyecto → Propiedades del script**, configura:
   - Nombre: `AR_PANEL_PASSWORD`
   - Valor: `la contraseña privada acordada con los novios`
5. En **Implementar → Gestionar implementaciones**, edita la aplicación web existente.
6. Selecciona **Nueva versión** y pulsa **Implementar**.
7. Conserva la URL `/exec`; no crees otra implementación si ya estás usando la URL actual.

La aplicación web debe ejecutarse como el propietario del proyecto y tener acceso para cualquier persona, para aceptar las subidas de invitados. Los archivos se guardan en Drive como privados. Las consultas del álbum requieren una sesión privada autenticada.

La URL actual ya está configurada en `js/photo-booth-config.js`:
https://script.google.com/macros/s/AKfycbzPX1DfaoKlE8VN1pMV86qq2LfuuzX3DXZlpkIQ35IuH1FdcQDR5XYUPZnvXxPOrrfgcw/exec

No copies la contraseña en los archivos HTML o JavaScript públicos.
