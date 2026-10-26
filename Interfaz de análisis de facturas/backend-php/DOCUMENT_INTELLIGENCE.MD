# IntegraciÃ³n de Azure Document Intelligence

## Objetivo

Este mÃ³dulo integra Azure Document Intelligence al backend Laravel para automatizar la captura y validaciÃ³n de facturas de proveedores.

El flujo implementado permite recibir archivos PDF o imagen, extraer informaciÃ³n mediante el modelo `prebuilt-invoice`, normalizar los campos obtenidos, aplicar reglas de validaciÃ³n, detectar duplicados y almacenar los resultados en MySQL.

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
NormalizaciÃ³n
        |
        v
ValidaciÃ³n
        |
        +----------------------+
        |                      |
        v                      v
     VALIDADA              EN_REVISION
     POR_PAGAR             RevisiÃ³n humana
        |                      |
        +----------+-----------+
                   |
                   v
                  MySQL

---

# Despliegue en Azure y persistencia compartida

## Estado de integraciÃ³n

El mÃ³dulo de procesamiento de facturas se encuentra desplegado y probado en Azure.

La arquitectura implementada es:

```text
Cliente / pruebas HTTP
        |
        v
Azure Container Apps
rio-claro-api
        |
        +----------------------+
        |                      |
        v                      v
Azure Document            Azure SQL Database
Intelligence              free-sql-db-3465630
prebuilt-invoice                 |
                                 +-- dbo.invoices
                                 +-- dbo.ai_analyses
                                 +-- dbo.users
                                 +-- dbo.personal_access_tokens
                                 +-- dbo.migrations
                                 |
                                 +-- dbo.Tickets
                                 +-- dbo.Tickets_Import
                                     (mÃ³dulo de tickets)
```

El backend Laravel comparte la misma Azure SQL Database utilizada por el mÃ³dulo de tickets, pero las tablas de ambos mÃ³dulos permanecen separadas.

Las tablas `dbo.Tickets` y `dbo.Tickets_Import` no son creadas, alteradas ni eliminadas por las migraciones del mÃ³dulo de facturas.

## Recursos utilizados

### Azure Container Apps

AplicaciÃ³n:

```text
rio-claro-api
```

Entorno:

```text
rio-claro-api-env
```

RegiÃ³n:

```text
Central US
```

Endpoint pÃºblico:

```text
https://rio-claro-api.jollyocean-86576115.centralus.azurecontainerapps.io
```

Puerto interno:

```text
8000
```

La comprobaciÃ³n:

```text
GET /up
```

respondiÃ³ correctamente con HTTP `200`.

### Azure Container Registry

Registro:

```text
rioclaroalexisacr.azurecr.io
```

Imagen desplegada durante la validaciÃ³n:

```text
rioclaroalexisacr.azurecr.io/rio-claro-api:v1
```

La imagen incluye:

- PHP 8.3.
- Laravel 12.
- Microsoft ODBC Driver 18 for SQL Server.
- `sqlsrv`.
- `pdo_sqlsrv`.
- `pdo_mysql`, conservado para compatibilidad con el entorno local.

### Managed Identity

El Container App utiliza una identidad administrada asignada por el usuario:

```text
rio-claro-api-mi
```

La identidad se utiliza para:

1. descargar la imagen privada desde Azure Container Registry;
2. autenticarse contra Azure SQL sin almacenar una contraseÃ±a SQL.

El acceso al ACR se proporciona mediante el rol:

```text
AcrPull
```

No deben almacenarse tokens, contraseÃ±as ni claves sensibles directamente en el repositorio.

## Azure SQL Database

Servidor:

```text
tickets.database.windows.net
```

Base de datos:

```text
free-sql-db-3465630
```

Puerto:

```text
1433
```

Laravel utiliza:

```text
DB_CONNECTION=sqlsrv
DB_HOST=tickets.database.windows.net
DB_PORT=1433
DB_DATABASE=free-sql-db-3465630
DB_AUTHENTICATION=ActiveDirectoryMsi
DB_ENCRYPT=yes
DB_TRUST_SERVER_CERTIFICATE=false
```

La aplicaciÃ³n utiliza Microsoft Entra y Managed Identity para autenticaciÃ³n. No se almacena una contraseÃ±a de Azure SQL en Git.

La conexiÃ³n fue validada mediante:

```text
php artisan db:show
```

y Laravel reconociÃ³ correctamente la base de datos SQL Server.

## Migraciones especÃ­ficas de Azure

Para evitar conflictos con las tablas existentes del mÃ³dulo de tickets se creÃ³ un conjunto independiente de migraciones:

```text
database/migrations_azure/
```

La migraciÃ³n utilizada es:

```text
2026_10_22_000001_create_azure_invoice_tables.php
```

Crea exclusivamente:

```text
users
personal_access_tokens
invoices
ai_analyses
```

Laravel crea adicionalmente la tabla:

```text
migrations
```

Las migraciones se ejecutan mediante:

```bash
php artisan migrate --path=database/migrations_azure --force
```

No se debe ejecutar en esta base compartida:

```bash
php artisan migrate
```

sin especificar `--path`, ya que las migraciones histÃ³ricas del entorno local incluyen tablas pertenecientes a otros mÃ³dulos.

DespuÃ©s de la migraciÃ³n se verificaron siete tablas:

```text
dbo.ai_analyses
dbo.invoices
dbo.migrations
dbo.personal_access_tokens
dbo.Tickets
dbo.Tickets_Import
dbo.users
```

## Azure Document Intelligence

Recurso:

```text
docintel-rioclaro-alexis
```

Modelo:

```text
prebuilt-invoice
```

API version:

```text
2024-11-30
```

Endpoint:

```text
https://docintel-rioclaro-alexis.cognitiveservices.azure.com/
```

La clave de Document Intelligence se almacena como secreto del Container App.

Nunca debe guardarse en Git, archivos Markdown ni variables pÃºblicas del front-end.

## Variables y secretos

Las variables no sensibles se configuran como variables de entorno de Azure Container Apps.

Los valores sensibles se almacenan como secretos y se referencian mediante `secretref`.

Ejemplos:

```text
APP_KEY -> secretref
AZURE_DOCUMENT_INTELLIGENCE_KEY -> secretref
```

El archivo local `.env` permanece ignorado por Git.

## Flujo validado

### Caso 1: factura vÃ¡lida

Archivo utilizado:

```text
factura_01_PROV-0001.pdf
```

Resultado:

```text
number: PRV-0001-2026001
vendor: Quimicos del Centro 01 S.A. de C.V.
vendor_tax_id: FPR000001X1
total: 3763.27 MXN
processing_status: VALIDADA
payment_status: POR_PAGAR
review_required: false
```

La factura quedÃ³ almacenada en:

```text
dbo.invoices
```

### Caso 2: factura que requiere revisiÃ³n

Archivo utilizado:

```text
factura_test_sin_rfc.pdf
```

Document Intelligence no obtuvo el RFC del proveedor, por lo que el sistema almacenÃ³ inicialmente:

```text
number: PRV-TEST-REVISION-001
vendor_tax_id: NULL
processing_status: EN_REVISION
payment_status: NULL
```

Esto confirma que el backend no inventa informaciÃ³n ausente y deriva los casos inciertos a revisiÃ³n humana.

### Caso 3: revisiÃ³n humana

Se corrigiÃ³ el RFC mediante:

```text
PATCH /api/invoices/{invoice}/review
```

DespuÃ©s de proporcionar:

```text
vendor_tax_id: FPR000003X3
```

la factura pasÃ³ a:

```text
processing_status: VALIDADA
payment_status: POR_PAGAR
```

La correcciÃ³n quedÃ³ persistida en Azure SQL.

### Caso 4: detecciÃ³n de duplicados

La factura `PRV-0001-2026001` fue enviada nuevamente al endpoint:

```text
POST /api/invoices/document
```

El backend respondiÃ³:

```text
duplicate: true
message: La factura ya existe en la base de datos.
```

El nÃºmero total de registros en `dbo.invoices` permaneciÃ³ en:

```text
2
```

por lo que no se creÃ³ una factura duplicada.

## Endpoints utilizados en las pruebas

AutenticaciÃ³n:

```text
POST /api/auth/login
```

Procesamiento de factura:

```text
POST /api/invoices/document
```

RevisiÃ³n humana:

```text
PATCH /api/invoices/{invoice}/review
```

Los endpoints de facturas requieren autenticaciÃ³n mediante Laravel Sanctum.

## Resultado de la validaciÃ³n

El flujo de facturas quedÃ³ validado de extremo a extremo:

```text
PDF
 |
 v
Laravel en Azure Container Apps
 |
 v
Azure Document Intelligence
 |
 v
NormalizaciÃ³n
 |
 v
ValidaciÃ³n
 |-------------------------------|
 |                               |
 v                               v
VALIDADA                     EN_REVISION
 |                               |
 |                         revisiÃ³n humana
 |                               |
 +---------------+---------------+
                 |
                 v
             Azure SQL
```

TambiÃ©n se confirmÃ³ que el mÃ³dulo de facturas puede coexistir con el mÃ³dulo de tickets de atenciÃ³n dentro de la misma Azure SQL Database sin modificar sus tablas.

## Consideraciones de seguridad

- No almacenar claves de Azure en Git.
- No incluir `APP_KEY` en documentaciÃ³n.
- No incluir la clave de Document Intelligence en documentaciÃ³n.
- No utilizar contraseÃ±as SQL cuando se dispone de Managed Identity.
- Mantener `.env` excluido mediante `.gitignore`.
- Mantener autenticaciÃ³n y autorizaciÃ³n en los endpoints protegidos.
- Revisar si el permiso `db_ddladmin` sigue siendo necesario despuÃ©s de completar las migraciones.
- Rotar cualquier secreto que haya sido expuesto accidentalmente.

## Estado final

Al finalizar las pruebas:

```text
Backend Laravel desplegado: OK
Azure Container Registry: OK
Managed Identity: OK
Azure SQL: OK
Azure Document Intelligence: OK
AutenticaciÃ³n Laravel: OK
Factura vÃ¡lida: OK
Factura en revisiÃ³n: OK
RevisiÃ³n humana: OK
DetecciÃ³n de duplicados: OK
```

Commit asociado al soporte de Azure SQL:

```text
1841e23
feat: add Azure SQL deployment support for invoice backend
```
