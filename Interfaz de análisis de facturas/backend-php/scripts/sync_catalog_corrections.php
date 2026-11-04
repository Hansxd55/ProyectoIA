<?php

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$targets = [
    'LIM-0005','LIM-0011','LIM-0017','LIM-0025','LIM-0026',
    'LIM-0033','LIM-0034','LIM-0035','LIM-0041','LIM-0042',
    'LIM-0044','LIM-0050','LIM-0051','LIM-0053','LIM-0059',
    'LIM-0060','LIM-0068','LIM-0069','LIM-0077','LIM-0083',
    'LIM-0089','LIM-0097','LIM-0098',
];

$csv = __DIR__ . '/../database/import_data/Rio_Claro_Productos.csv';

function readCatalog(string $path, array $targets): array
{
    $fh = fopen($path, 'r');

    if ($fh === false) {
        throw new RuntimeException("No se pudo abrir {$path}");
    }

    $headers = fgetcsv($fh);
    $headers[0] = preg_replace('/^\xEF\xBB\xBF/', '', $headers[0]);

    $catalog = [];

    while (($values = fgetcsv($fh)) !== false) {
        if (count($values) !== count($headers)) {
            throw new RuntimeException('CSV con número de columnas inválido.');
        }

        $row = array_combine($headers, $values);

        if (in_array($row['SKU'], $targets, true)) {
            $catalog[$row['SKU']] = [
                'Nombre'       => $row['Nombre'],
                'Presentacion' => $row['Presentacion'],
                'Unidad'       => $row['Unidad'],
            ];
        }
    }

    fclose($fh);

    return $catalog;
}

try {
    $catalog = readCatalog($csv, $targets);

    echo "===== SINCRONIZACION CATALOGO RIO CLARO =====\n";
    echo "Base: " . DB::connection()->getDatabaseName() . "\n";

    if (count($catalog) !== 23) {
        throw new RuntimeException(
            'Se esperaban 23 SKU corregidos en CSV y se encontraron ' . count($catalog)
        );
    }

    // Prevalidación del estado de la BD.
    $productCount = DB::table('Productos')->whereIn('SKU', $targets)->count();
    $inventoryCount = DB::table('Inventario')->whereIn('SKU', $targets)->count();
    $detailCount = DB::table('Pedidos_Detalle')->whereIn('SKU', $targets)->count();

    echo "Prevalidacion:\n";
    echo "  Productos       = {$productCount}\n";
    echo "  Inventario      = {$inventoryCount}\n";
    echo "  Pedidos_Detalle = {$detailCount}\n";

    if ($productCount !== 23) {
        throw new RuntimeException("Productos esperaba 23 filas y encontró {$productCount}");
    }

    if ($inventoryCount !== 115) {
        throw new RuntimeException("Inventario esperaba 115 filas y encontró {$inventoryCount}");
    }

    if ($detailCount !== 21) {
        throw new RuntimeException("Pedidos_Detalle esperaba 21 filas y encontró {$detailCount}");
    }

    DB::beginTransaction();

    foreach ($targets as $sku) {
        $row = $catalog[$sku];

        DB::table('Productos')
            ->where('SKU', $sku)
            ->update([
                'Nombre'       => $row['Nombre'],
                'Presentacion' => $row['Presentacion'],
                'Unidad'       => $row['Unidad'],
            ]);

        DB::table('Inventario')
            ->where('SKU', $sku)
            ->update([
                'Producto' => $row['Nombre'],
            ]);

        DB::table('Pedidos_Detalle')
            ->where('SKU', $sku)
            ->update([
                'Producto' => $row['Nombre'],
                'Unidad'   => $row['Unidad'],
            ]);
    }

    $errorsProducts = 0;
    $errorsInventory = 0;
    $errorsDetails = 0;

    foreach ($targets as $sku) {
        $row = $catalog[$sku];

        $errorsProducts += DB::table('Productos')
            ->where('SKU', $sku)
            ->where(function ($q) use ($row) {
                $q->where('Nombre', '<>', $row['Nombre'])
                  ->orWhere('Presentacion', '<>', $row['Presentacion'])
                  ->orWhere('Unidad', '<>', $row['Unidad']);
            })
            ->count();

        $errorsInventory += DB::table('Inventario')
            ->where('SKU', $sku)
            ->where('Producto', '<>', $row['Nombre'])
            ->count();

        $errorsDetails += DB::table('Pedidos_Detalle')
            ->where('SKU', $sku)
            ->where(function ($q) use ($row) {
                $q->where('Producto', '<>', $row['Nombre'])
                  ->orWhere('Unidad', '<>', $row['Unidad']);
            })
            ->count();
    }

    echo "Verificacion:\n";
    echo "  Discrepancias Productos       = {$errorsProducts}\n";
    echo "  Discrepancias Inventario      = {$errorsInventory}\n";
    echo "  Discrepancias Pedidos_Detalle = {$errorsDetails}\n";

    if ($errorsProducts || $errorsInventory || $errorsDetails) {
        throw new RuntimeException('La verificación posterior detectó discrepancias.');
    }

    DB::commit();

    echo "COMMIT REALIZADO CORRECTAMENTE.\n";
    echo "CATALOGO SINCRONIZADO.\n";

} catch (Throwable $e) {

    if (DB::transactionLevel() > 0) {
        DB::rollBack();
    }

    fwrite(STDERR, "ERROR: " . $e->getMessage() . PHP_EOL);
    fwrite(STDERR, "NO SE CONFIRMARON CAMBIOS EN LA TRANSACCION." . PHP_EOL);

    exit(1);
}
