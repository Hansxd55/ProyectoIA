# Integración de Azure Document Intelligence

## Objetivo

Este módulo integra Azure Document Intelligence al backend Laravel para automatizar la captura y validación de facturas de proveedores.

El flujo implementado permite recibir archivos PDF o imagen, extraer información mediante el modelo `prebuilt-invoice`, normalizar los campos obtenidos, aplicar reglas de validación, detectar duplicados y almacenar los resultados en MySQL.

## Flujo general

```text
Factura PDF / JPG / PNG
        |
        v
Laravel API
        |
        v
Azure Document Intelligence
        |
        v
Normalización
        |
        v
Validación
        |
        +----------------------+
        |                      |
        v                      v
     VALIDADA              EN_REVISION
     POR_PAGAR             Revisión humana
        |                      |
        +----------+-----------+
                   |
                   v
                  MySQL