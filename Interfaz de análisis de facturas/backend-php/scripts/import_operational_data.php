<?php

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$base = $argv[1] ?? (__DIR__ . '/../database/import_data');

function csvRows(string $path): array
{
    if (!is_file($path)) {
        throw new RuntimeException("No existe el archivo: {$path}");
    }

    $fh = fopen($path, 'r');
    if ($fh === false) {
        throw new RuntimeException("No se pudo abrir: {$path}");
    }

    $headers = fgetcsv($fh);
    if ($headers === false) {
        fclose($fh);
        throw new RuntimeException("CSV sin encabezados: {$path}");
    }

    // Remove UTF-8 BOM if present.
    $headers[0] = preg_replace('/^\xEF\xBB\xBF/', '', $headers[0]);

    $rows = [];
    while (($values = fgetcsv($fh)) !== false) {
        if ($values === [null] || count($values) === 0) {
            continue;
        }

        if (count($values) !== count($headers)) {
            fclose($fh);
            throw new RuntimeException(
                "Número de columnas inválido en {$path}: esperado "
                . count($headers) . ", recibido " . count($values)
            );
        }

        $rows[] = array_combine($headers, $values);
    }

    fclose($fh);
    return $rows;
}

function nullable($value)
{
    if ($value === null) return null;

    $value = trim((string)$value);
    return $value === '' ? null : $value;
}

function money($value): float
{
    $value = trim((string)$value);
    $value = str_replace(['$', ',', ' '], '', $value);

    if ($value === '' || !is_numeric($value)) {
        throw new RuntimeException("Valor monetario inválido: {$value}");
    }

    return (float)$value;
}

function boolValue($value): int
{
    if (is_bool($value)) return $value ? 1 : 0;

    $v = strtolower(trim((string)$value));

    if (in_array($v, ['1', 'true', 'si', 'sí', 'yes'], true)) return 1;
    if (in_array($v, ['0', 'false', 'no'], true)) return 0;

    throw new RuntimeException("Valor booleano inválido: {$value}");
}

function isoDate($value): ?string
{
    $value = nullable($value);
    if ($value === null) return null;

    foreach (['Y-m-d', 'd/m/y', 'd/m/Y'] as $format) {
        $dt = DateTime::createFromFormat($format, $value);
        if ($dt && $dt->format($format) === $value) {
            return $dt->format('Y-m-d');
        }
    }

    throw new RuntimeException("Fecha inválida: {$value}");
}

function upsertByKey(string $table, string $keyColumn, array $rows): array
{
    $inserted = 0;
    $updated = 0;

    foreach ($rows as $row) {
        $exists = DB::table($table)->where($keyColumn, $row[$keyColumn])->exists();

        DB::table($table)->updateOrInsert(
            [$keyColumn => $row[$keyColumn]],
            $row
        );

        $exists ? $updated++ : $inserted++;
    }

    return [$inserted, $updated];
}

function printResult(string $name, int $inserted, int $updated = 0, int $skipped = 0): void
{
    echo str_pad($name, 22)
       . " insertados={$inserted}"
       . " actualizados={$updated}"
       . " omitidos={$skipped}"
       . PHP_EOL;
}

echo "===== IMPORTACIÓN RÍO CLARO =====" . PHP_EOL;
echo "Directorio: {$base}" . PHP_EOL;
echo "Base de datos: " . DB::connection()->getDatabaseName() . PHP_EOL . PHP_EOL;

/*
|--------------------------------------------------------------------------
| Productos
|--------------------------------------------------------------------------
*/
$rows = array_map(function ($r) {
    return [
        'SKU' => $r['SKU'],
        'Nombre' => $r['Nombre'],
        'Categoria' => $r['Categoria'],
        'Subcategoria' => $r['Subcategoria'],
        'Presentacion' => $r['Presentacion'],
        'Unidad' => $r['Unidad'],
        'Marca' => $r['Marca'],
        'Costo_MXN' => money($r['Costo_MXN']),
        'Precio_MXN' => money($r['Precio_MXN']),
        'Estado' => $r['Estado'],
        'ProveedorPrincipalID' => $r['ProveedorPrincipalID'],
        'ProveedorAlternoID' => $r['ProveedorAlternoID'],
        'LeadTimeDias' => (int)$r['LeadTimeDias'],
        'ClasificacionDato' => $r['ClasificacionDato'],
        'Synthetic' => boolValue($r['Synthetic']),
    ];
}, csvRows($base . '/Rio_Claro_Productos.csv'));

[$i, $u] = upsertByKey('Productos', 'SKU', $rows);
printResult('Productos', $i, $u);

/*
|--------------------------------------------------------------------------
| Clientes
|--------------------------------------------------------------------------
*/
$rows = array_map(function ($r) {
    return [
        'ClienteID' => $r['ClienteID'],
        'RazonSocial' => $r['RazonSocial'],
        'Segmento' => $r['Segmento'],
        'NivelServicio' => $r['NivelServicio'],
        'CondicionesPago' => $r['CondicionesPago'],
        'Correo' => $r['Correo'],
        'SucursalResponsable' => $r['SucursalResponsable'],
        'Estado' => $r['Estado'],
        'Synthetic' => boolValue($r['Synthetic']),
    ];
}, csvRows($base . '/Rio_Claro_Clientes.csv'));

[$i, $u] = upsertByKey('Clientes', 'ClienteID', $rows);
printResult('Clientes', $i, $u);

/*
|--------------------------------------------------------------------------
| Inventario
|--------------------------------------------------------------------------
*/
$rows = array_map(function ($r) {
    return [
        'InventarioID' => $r['InventarioID'],
        'SKU' => $r['SKU'],
        'Producto' => $r['Producto'],
        'Sucursal' => $r['Sucursal'],
        'ExistenciaFisica' => (int)$r['ExistenciaFisica'],
        'Reservado' => (int)$r['Reservado'],
        'Disponible' => (int)$r['Disponible'],
        'Minimo' => (int)$r['Minimo'],
        'Maximo' => (int)$r['Maximo'],
        'EstatusStock' => $r['EstatusStock'],
        'FechaCorte' => isoDate($r['FechaCorte']),
        'SistemaOrigen' => $r['SistemaOrigen'],
        'Synthetic' => boolValue($r['Synthetic']),
    ];
}, csvRows($base . '/Rio_Claro_Inventario.csv'));

[$i, $u] = upsertByKey('Inventario', 'InventarioID', $rows);
printResult('Inventario', $i, $u);

/*
|--------------------------------------------------------------------------
| Pedidos
|--------------------------------------------------------------------------
*/
$rows = array_map(function ($r) {
    return [
        'PedidoID' => $r['PedidoID'],
        'ClienteID' => $r['ClienteID'],
        'FechaPedido' => isoDate($r['FechaPedido']),
        'Estado' => $r['Estado'],
        'Sucursal' => $r['Sucursal'],
        'FechaComprometida' => isoDate($r['FechaComprometida']),
        'TipoFecha' => $r['TipoFecha'],
        'Guia' => nullable($r['Guia']),
        'Incidencia' => nullable($r['Incidencia']),
        'Subtotal_MXN' => money($r['Subtotal_MXN']),
        'IVA_MXN' => money($r['IVA_MXN']),
        'Total_MXN' => money($r['Total_MXN']),
        'Moneda' => $r['Moneda'],
        'SistemaOrigen' => $r['SistemaOrigen'],
        'ClasificacionDato' => $r['ClasificacionDato'],
        'Synthetic' => boolValue($r['Synthetic']),
    ];
}, csvRows($base . '/Rio_Claro_Pedidos.csv'));

[$i, $u] = upsertByKey('Pedidos', 'PedidoID', $rows);
printResult('Pedidos', $i, $u);

/*
|--------------------------------------------------------------------------
| Pedidos_Detalle
|--------------------------------------------------------------------------
*/
$rows = array_map(function ($r) {
    return [
        'LineaID' => $r['LineaID'],
        'PedidoID' => $r['PedidoID'],
        'Linea' => (int)$r['Linea'],
        'SKU' => $r['SKU'],
        'Producto' => $r['Producto'],
        'CantidadPedida' => (int)$r['CantidadPedida'],
        'Unidad' => $r['Unidad'],
        'PrecioUnitario_MXN' => money($r['PrecioUnitario_MXN']),
        'Importe_MXN' => money($r['Importe_MXN']),
        'CantidadSurtida' => (int)$r['CantidadSurtida'],
        'Synthetic' => boolValue($r['Synthetic']),
    ];
}, csvRows($base . '/Rio_Claro_Pedidos_Detalle.csv'));

[$i, $u] = upsertByKey('Pedidos_Detalle', 'LineaID', $rows);
printResult('Pedidos_Detalle', $i, $u);

/*
|--------------------------------------------------------------------------
| Facturas_Demo
|--------------------------------------------------------------------------
| No se aplican FK rígidas a ClienteID/PedidoID porque el dataset contiene
| referencias deliberadamente no resueltas para casos de prueba.
*/
$rows = array_map(function ($r) {
    return [
        'FacturaID' => $r['FacturaID'],
        'ClienteID' => $r['ClienteID'],
        'PedidoID' => nullable($r['PedidoID']),
        'UUID' => $r['UUID'],
        'FechaEmision' => isoDate($r['FechaEmision']),
        'Estado' => $r['Estado'],
        'Subtotal_MXN' => money($r['Subtotal_MXN']),
        'IVA_MXN' => money($r['IVA_MXN']),
        'Total_MXN' => money($r['Total_MXN']),
        'Moneda' => $r['Moneda'],
        'XML_URL_Prueba' => nullable($r['XML_URL_Prueba']),
        'PDF_URL_Prueba' => nullable($r['PDF_URL_Prueba']),
        'EstadoNotaCredito' => nullable($r['EstadoNotaCredito']),
        'SistemaOrigen' => $r['SistemaOrigen'],
        'ClasificacionDato' => $r['ClasificacionDato'],
        'Synthetic' => boolValue($r['Synthetic']),
    ];
}, csvRows($base . '/Rio_Claro_Facturas.csv'));

[$i, $u] = upsertByKey('Facturas_Demo', 'FacturaID', $rows);
printResult('Facturas_Demo', $i, $u);

/*
|--------------------------------------------------------------------------
| Mapeo_Pruebas
|--------------------------------------------------------------------------
*/
$rows = array_map(function ($r) {
    return [
        'TestID' => $r['TestID'],
        'CategoriaPrueba' => $r['CategoriaPrueba'],
        'EntidadID' => $r['EntidadID'],
        'HojaFuente' => $r['HojaFuente'],
        'PrincipalID' => $r['PrincipalID'],
        'HerramientaEsperada' => $r['HerramientaEsperada'],
        'ResultadoEsperado' => $r['ResultadoEsperado'],
        'Synthetic' => boolValue($r['Synthetic']),
    ];
}, csvRows($base . '/Rio_Claro_Mapeo_Pruebas.csv'));

[$i, $u] = upsertByKey('Mapeo_Pruebas', 'TestID', $rows);
printResult('Mapeo_Pruebas', $i, $u);

/*
|--------------------------------------------------------------------------
| Diccionario_Datos
|--------------------------------------------------------------------------
*/
$inserted = 0;
$updated = 0;
foreach (csvRows($base . '/Rio_Claro_Diccionario_Datos.csv') as $r) {
    $where = [
        'Entidad' => $r['Entidad'],
        'Campo' => $r['Campo'],
    ];

    $data = [
        'TipoLogico' => $r['TipoLogico'],
        'DescripcionEntidad' => $r['DescripcionEntidad'],
        'Obligatorio' => $r['Obligatorio'],
        'SistemaOrigen' => $r['SistemaOrigen'],
        'Clasificacion' => $r['Clasificacion'],
        'Synthetic' => boolValue($r['Synthetic']),
    ];

    $exists = DB::table('Diccionario_Datos')->where($where)->exists();
    DB::table('Diccionario_Datos')->updateOrInsert($where, $data);
    $exists ? $updated++ : $inserted++;
}
printResult('Diccionario_Datos', $inserted, $updated);

/*
|--------------------------------------------------------------------------
| Tickets
|--------------------------------------------------------------------------
| TicketNumber es IDENTITY; no se incluye en INSERT.
| Regla conservadora: un TicketID existente se omite y NO se modifica.
*/
$inserted = 0;
$skipped = 0;

foreach (csvRows($base . '/Rio_Claro_Tickets.csv') as $r) {
    if (DB::table('Tickets')->where('TicketID', $r['TicketID'])->exists()) {
        $skipped++;
        continue;
    }

    DB::table('Tickets')->insert([
        'TicketID' => $r['TicketID'],
        'ClienteID' => $r['ClienteID'],
        'RelacionadoID' => nullable($r['RelacionadoID']),
        'Tipo' => $r['Tipo'],
        'Categoria' => $r['Categoria'],
        'Prioridad' => $r['Prioridad'],
        'Estado' => $r['Estado'],
        'Responsable' => $r['Responsable'],
        'FechaCreacion' => isoDate($r['FechaCreacion']),
        'FechaObjetivo' => isoDate($r['FechaObjetivo']),
        'SLA_Horas' => (int)$r['SLA_Horas'],
        'Descripcion' => $r['Descripcion'],
        'ProximaAccion' => $r['ProximaAccion'],
        'BloqueoRetencion' => boolValue($r['BloqueoRetencion']),
        'ClasificacionDato' => $r['ClasificacionDato'],
        'Synthetic' => boolValue($r['Synthetic']),
    ]);

    $inserted++;
}

printResult('Tickets', $inserted, 0, $skipped);

echo PHP_EOL . "===== CONTEOS FINALES =====" . PHP_EOL;

$tables = [
    'Productos',
    'Clientes',
    'Inventario',
    'Pedidos',
    'Pedidos_Detalle',
    'Facturas_Demo',
    'Mapeo_Pruebas',
    'Diccionario_Datos',
    'Tickets',
];

foreach ($tables as $table) {
    echo str_pad($table, 22)
       . DB::table($table)->count()
       . PHP_EOL;
}

echo PHP_EOL . "Importación terminada correctamente." . PHP_EOL;
