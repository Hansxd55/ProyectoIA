# Río Claro · Centro operativo

Aplicación React con servidor Node y proxy seguro hacia Azure Functions. Incluye:

- Inicio de sesión con usuario y contraseña mediante cookie `HttpOnly`.
- Pantalla inicial con Proceso de facturas, Ayuda a Clientes e Informes CEO.
- Proxy server-side para que `AZURE_FUNCTION_KEY` nunca llegue al navegador ni al build.
- Imagen Docker lista para publicar en una VM, Azure Container Apps, App Service for Containers u otro host con Docker.

## Configuración segura

No agregues la clave de Azure al código, a `VITE_*`, a `Dockerfile` ni a la imagen. Usa un gestor de secretos del proveedor o variables protegidas del servicio de CI/CD.

Variables requeridas:

```text
AZURE_FUNCTION_BASE_URL=https://func-rio-claro-tickets-2026-f3ftgtgwc2c0hqgs.westus-01.azurewebsites.net
AZURE_FUNCTION_KEY=<secreto de Azure Functions>
APP_USERNAME=<usuario de acceso>
APP_PASSWORD_HASH=<SHA-256 hexadecimal de la contraseña>
PORT=3000
```

Genera el hash sin escribir la contraseña en el repositorio:

```bash
printf '%s' 'CambiaEstaContraseña' | shasum -a 256
```

Guarda los valores en el almacén de secretos del host. `.env.example` solo contiene nombres y valores de ejemplo; `.env` y `.env.local` están excluidos por `.gitignore`.

## Ejecución local

```bash
cp .env.example .env
# Edita .env con los secretos y el usuario de despliegue
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

Abre `http://localhost:3000`. El servidor escucha en `0.0.0.0`, requisito para contenedores.

## Docker

En el servidor público, inyecta las variables como secretos y ejecuta:

```bash
docker compose up -d --build
```

Publica el puerto 3000 mediante el firewall o un reverse proxy HTTPS. Docker por sí solo no crea una dirección pública: el contenedor debe ejecutarse en una VM o servicio cloud con IP/DNS y TLS. No expongas directamente el puerto administrativo del host.

## Validación

```bash
pnpm build
pnpm lint
```

El endpoint CEO utiliza `POST /api/ceo/resumen` y envía el encabezado `x-functions-key` únicamente desde `server.mjs`.
El chat CEO usa la ruta protegida `/api/ceo/chat`, que se reenvía al mismo endpoint CEO sin compartir la conversación de soporte (`/api/support/chat`).

El procesamiento de facturas utiliza el backend Laravel configurado en `INVOICE_API_BASE_URL`; sus credenciales se inyectan como secretos y nunca se envían al navegador.

La ayuda a clientes conserva el `session_id` entregado por Azure Functions durante la conversación y permite iniciar un chat nuevo. El módulo CEO presenta el resumen en lenguaje ejecutivo y comparte el mismo tipo de chat para consultas puntuales de ventas, pedidos, tickets, facturas e inventario. Para facturas, el navegador valida que los archivos con extensión PDF contengan una cabecera PDF real antes de enviarlos.

El soporte operativo consulta y registra directamente en la Function App conectada a Azure SQL (`free-sql-db-3465630`), mediante las operaciones de clientes, inventario, pedidos y tickets. La creación de pedidos utiliza la transacción de la Function App para registrar clientes nuevos cuando corresponde, validar existencias y actualizar `ExistenciaFisica` y `Disponible`. Las respuestas de soporte se presentan en lenguaje funcional y no muestran citas, archivos internos ni JSON técnico.
