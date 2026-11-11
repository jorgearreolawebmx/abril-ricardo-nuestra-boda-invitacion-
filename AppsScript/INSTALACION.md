# Actualización Apps Script V30 — Abril & Ricardo

Esta versión agrega dos rutas públicas para servir miniaturas y originales de fotografías compartidas, y una acción privada para enviar fotografías a la papelera de Google Drive desde el panel.

## Instalar
1. Abre el proyecto actual de Google Apps Script.
2. Abre `Código.gs` y reemplaza su contenido por el de este archivo.
3. Guarda el proyecto.
4. Conserva la propiedad de script `AR_PANEL_PASSWORD` y la carpeta de Drive existente.
5. En **Implementar → Gestionar implementaciones**, edita la implementación web existente, selecciona **Nueva versión** y vuelve a implementar.
6. Conserva la configuración **Ejecutar como: tú** y **Quién tiene acceso: Cualquier persona**.

La URL `/exec` no cambia. No crees una implementación adicional.

## Eliminación de fotografías
El botón del panel usa una sesión autenticada y solo permite eliminar imágenes que estén dentro de las carpetas `FOTOS_CON_LOGO` o `FOTOS_DE_LA_FIESTA` bajo la carpeta raíz configurada. Los archivos se envían a la papelera de Drive (se pueden recuperar desde la papelera); no se borran permanentemente.
