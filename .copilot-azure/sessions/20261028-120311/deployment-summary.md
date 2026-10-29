# Deployment summary

- **Status:** succeeded
- **Subscription:** Azure for Students (ID stored in context.json)
- **Resource group:** `rg-enriquealons-ia-2348`
- **Region:** West US (`westus`)
- **Container App:** `rioclaroweb`
- **Environment:** `rioclaroweb-env`
- **Public URL:** https://rioclaroweb.whitemeadow-479b66b4.westus.azurecontainerapps.io
- **Revision:** `rioclaroweb--latest` (Healthy, Provisioned, 100% traffic)
- **Image:** `rioclarowebacr20261028.azurecr.io/rioclaroweb:20261028-1255` (OCI, linux/amd64)
- **Ingress:** external HTTP, target port 3000
- **Validation:** GET `/` = 200; protected `/api/ceo/resumen` without cookie = 401.
- **Provisioning:** ARM deployment `rioclaroweb-app-20261028-r5` succeeded.
- **Migrations:** not applicable; no database or migration set was detected.
- **Secrets:** supplied from local `.env` as secure Bicep parameters and Container App secrets; values are not recorded.

The initial image failed because its legacy Docker layer media type was rejected by the Container Apps runtime. The image was rebuilt with Docker BuildKit as an OCI-compatible `linux/amd64` image and redeployed declaratively.
