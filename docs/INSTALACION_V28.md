# Instalación V28

## Google Apps Script
1. Abre el proyecto de Apps Script existente.
2. Sustituye el contenido de `Código.gs` por `AppsScript/Code.gs` de este ZIP.
3. Guarda. Conserva la propiedad `AR_PANEL_PASSWORD`.
4. En `Implementar > Gestionar implementaciones`, edita la implementación web actual, elige `Nueva versión` y pulsa `Implementar`.
5. Mantén `Ejecutar como: Yo` y `Quién tiene acceso: Cualquier persona`. Conserva la URL `/exec` actual.

## GitHub
Sube el contenido de este ZIP a la raíz del repositorio. No subas la carpeta que contiene todo el proyecto como una carpeta adicional: sube las tres páginas HTML y las carpetas `AppsScript`, `assets`, `css`, `docs`, `js` y `pruebas`.

Los archivos sueltos que estaban en la raíz se conservaron en `pruebas/archivos-raiz/`; no se eliminaron.
