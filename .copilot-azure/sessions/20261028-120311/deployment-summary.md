# Deployment summary

- **Status:** succeeded
- **Subscription:** Azure for Students (ID stored in context.json)
- **Resource group:** `rg-enriquealons-ia-2348`
- **Region:** West US (`westus`)
- **Container App:** `rioclaroweb`
- **Environment:** `rioclaroweb-env`
- **Public URL:** https://rioclaroweb.whitemeadow-479b66b4.westus.azurecontainerapps.io
- **Revision:** `rioclaroweb--latest` (Healthy, Provisioned, 100% traffic)
- **Image:** `rioclarowebacr20261028.azurecr.io/rioclaroweb:latest` (OCI, linux/amd64)
- **Ingress:** external HTTP, target port 3000
- **Validation:** GET `/` = 200; protected `/api/ceo/resumen` without cookie = 401.
- **Provisioning:** ARM deployment `rioclaroweb-code-20261102-r4` succeeded.
- **Migrations:** not applicable; no database or migration set was detected.
- **Secrets:** supplied from local `.env` as secure Bicep parameters and Container App secrets; values are not recorded.
- **Redeploy:** Docker local construyó y publicó la imagen porque ACR Tasks no está permitido en esta suscripción de estudiante. El deployment `r4` incluye el fallback del BFF para calcular facturas desde `/api/invoices` cuando el endpoint PHP agregado aún no está disponible.
- **Inventory:** 0 recursos nuevos atribuibles, 0 fallidos y 0 grupos huérfanos.
- **Smoke tests:** `/` = 200, `/health` = 200, revisión `rioclaroweb--latest` saludable/provisionada con 100% de tráfico. Los endpoints protegidos sin sesión devolvieron 401. El endpoint PHP nuevo `/api/invoices/summary` sigue devolviendo 500 en el servicio externo; el BFF no depende exclusivamente de él.

The initial image failed because its legacy Docker layer media type was rejected by the Container Apps runtime. The image was rebuilt with Docker BuildKit as an OCI-compatible `linux/amd64` image and redeployed declaratively.
