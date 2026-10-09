# Nexo API — Laravel + MySQL

Backend completo para la interfaz Nexo. Incluye autenticación con tokens, importación de facturas desde Excel/CSV, análisis mediante dos agentes, generación de PDF, pedidos, devoluciones, tickets y asistente de soporte.

## Requisitos

- PHP 8.2 o superior con `pdo_mysql`, `mbstring`, `xml`, `zip`, `gd` y `fileinfo`
- Composer 2
- MySQL 8
- Alternativamente, Docker y Docker Compose

## Inicio rápido con Docker

```bash
cd backend-php
docker compose up --build
```

La API estará en `http://localhost:8000/api`. El contenedor crea las tablas y carga datos de demostración automáticamente.

Usuario de demostración:

```text
admin@nexo.local
NexoDemo2025!
```

## Instalación local

```bash
cd backend-php
composer install
cp .env.example .env
php artisan key:generate
```

Crea una base `nexo`, configura sus credenciales en `.env` y ejecuta:

```bash
php artisan migrate --seed
php artisan storage:link
php artisan serve
```

Para activar OpenAI, añade en `.env`:

```env
OPENAI_API_KEY=tu_clave
OPENAI_MODEL=gpt-4o-mini
```

El sistema sigue funcionando sin esa clave: los análisis contables y las consultas de pedidos/tickets tienen lógica local.

## Importación de facturas

Se aceptan `.xlsx`, `.xls` y `.csv` de hasta 10 MB. Columnas reconocidas:

| Campo | Encabezados admitidos |
| --- | --- |
| Número | `numero`, `factura`, `invoice_number` |
| Cliente | `cliente`, `customer`, `razon_social` |
| NIF/CIF | `nif`, `cif`, `tax_id` |
| Fecha | `fecha`, `fecha_emision`, `issued_at` |
| Vencimiento | `vencimiento`, `fecha_vencimiento` |
| Subtotal | `subtotal`, `base_imponible` |
| Impuesto | `iva`, `impuesto`, `tax` |
| Total | `total`, `importe_total`, `amount` |
| Moneda | `moneda`, `currency` |

`numero`, `cliente` y `total` son obligatorios. Hay un archivo de ejemplo en `examples/facturas.csv`.

## Flujo de autenticación

```bash
# Iniciar sesión
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@nexo.local","password":"NexoDemo2025!"}'

# Usar el token devuelto
curl http://localhost:8000/api/dashboard \
  -H "Authorization: Bearer TOKEN"
```

## Endpoints principales

| Método | Ruta | Función |
| --- | --- | --- |
| POST | `/api/auth/register` | Registrar usuario |
| POST | `/api/auth/login` | Obtener token |
| GET | `/api/dashboard` | Métricas del panel |
| GET/POST | `/api/invoices` | Listar o crear facturas |
| POST | `/api/invoices/import` | Importar Excel/CSV (`file`) |
| POST | `/api/invoices/{id}/analyze` | Ejecutar ambos agentes |
| POST | `/api/invoices/{id}/pdf` | Generar y descargar PDF |
| GET/POST | `/api/orders` | Gestionar pedidos |
| GET/POST | `/api/returns` | Gestionar devoluciones |
| GET/POST | `/api/tickets` | Gestionar tickets |
| POST | `/api/support/chat` | Consultar al asistente |

Excepto registro, login y chat, las rutas requieren `Authorization: Bearer TOKEN`.

### Importar un archivo

```bash
curl -X POST http://localhost:8000/api/invoices/import \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@examples/facturas.csv"
```

### Consultar al asistente

```bash
curl -X POST http://localhost:8000/api/support/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"¿Dónde está el pedido PED-1001?","customer_email":"ana@example.com"}'
```

Guarda el `session_id` de la respuesta y envíalo en mensajes posteriores para conservar la conversación.

## Pruebas

```bash
composer test
```

Las pruebas usan SQLite en memoria y no modifican la base MySQL.
