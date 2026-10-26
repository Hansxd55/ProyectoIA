# Facturas ficticias de prueba

Esta carpeta contiene documentos sintéticos utilizados para probar la integración con Azure Document Intelligence.

Los documentos no corresponden a proveedores ni operaciones reales.

## Casos incluidos

- Facturas completas utilizadas para verificar extracción y validación.
- Factura sin RFC utilizada para comprobar el flujo `EN_REVISION`.
- Documentos utilizados para comprobar detección de duplicados.

## Uso

Las facturas pueden enviarse al endpoint:

POST /api/invoices/document

para reproducir las pruebas descritas en la documentación de Azure Document Intelligence.

## Nota

Los nombres, RFC, folios, importes y demás datos contenidos en estos documentos son ficticios y fueron creados exclusivamente con fines académicos y de prueba.