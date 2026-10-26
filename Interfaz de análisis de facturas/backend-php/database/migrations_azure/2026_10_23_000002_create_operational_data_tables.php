<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('Productos')) {
            Schema::create('Productos', function (Blueprint $table) {
                $table->string('SKU', 20)->primary();
                $table->string('Nombre', 150);
                $table->string('Categoria', 50);
                $table->string('Subcategoria', 50);
                $table->string('Presentacion', 50);
                $table->string('Unidad', 20);
                $table->string('Marca', 50);
                $table->decimal('Costo_MXN', 14, 2);
                $table->decimal('Precio_MXN', 14, 2);
                $table->string('Estado', 30);
                $table->string('ProveedorPrincipalID', 30);
                $table->string('ProveedorAlternoID', 30);
                $table->integer('LeadTimeDias');
                $table->string('ClasificacionDato', 50);
                $table->boolean('Synthetic');
            });
        }

        if (!Schema::hasTable('Clientes')) {
            Schema::create('Clientes', function (Blueprint $table) {
                $table->string('ClienteID', 30)->primary();
                $table->string('RazonSocial', 200);
                $table->string('Segmento', 50);
                $table->string('NivelServicio', 30);
                $table->string('CondicionesPago', 50);
                $table->string('Correo', 200);
                $table->string('SucursalResponsable', 50);
                $table->string('Estado', 30);
                $table->boolean('Synthetic');
            });
        }

        if (!Schema::hasTable('Inventario')) {
            Schema::create('Inventario', function (Blueprint $table) {
                $table->string('InventarioID', 40)->primary();
                $table->string('SKU', 20);
                $table->string('Producto', 150);
                $table->string('Sucursal', 50);
                $table->integer('ExistenciaFisica');
                $table->integer('Reservado');
                $table->integer('Disponible');
                $table->integer('Minimo');
                $table->integer('Maximo');
                $table->string('EstatusStock', 30);
                $table->date('FechaCorte');
                $table->string('SistemaOrigen', 50);
                $table->boolean('Synthetic');

                $table->foreign('SKU')->references('SKU')->on('Productos');
            });
        }

        if (!Schema::hasTable('Pedidos')) {
            Schema::create('Pedidos', function (Blueprint $table) {
                $table->string('PedidoID', 30)->primary();
                $table->string('ClienteID', 30);
                $table->date('FechaPedido');
                $table->string('Estado', 50);
                $table->string('Sucursal', 50);
                $table->date('FechaComprometida');
                $table->string('TipoFecha', 30);
                $table->string('Guia', 80)->nullable();
                $table->string('Incidencia', 500)->nullable();
                $table->decimal('Subtotal_MXN', 14, 2);
                $table->decimal('IVA_MXN', 14, 2);
                $table->decimal('Total_MXN', 14, 2);
                $table->string('Moneda', 10);
                $table->string('SistemaOrigen', 50);
                $table->string('ClasificacionDato', 50);
                $table->boolean('Synthetic');

                $table->foreign('ClienteID')->references('ClienteID')->on('Clientes');
            });
        }

        if (!Schema::hasTable('Pedidos_Detalle')) {
            Schema::create('Pedidos_Detalle', function (Blueprint $table) {
                $table->string('LineaID', 40)->primary();
                $table->string('PedidoID', 30);
                $table->integer('Linea');
                $table->string('SKU', 20);
                $table->string('Producto', 150);
                $table->integer('CantidadPedida');
                $table->string('Unidad', 20);
                $table->decimal('PrecioUnitario_MXN', 14, 2);
                $table->decimal('Importe_MXN', 14, 2);
                $table->integer('CantidadSurtida');
                $table->boolean('Synthetic');

                $table->foreign('PedidoID')->references('PedidoID')->on('Pedidos');
                $table->foreign('SKU')->references('SKU')->on('Productos');
            });
        }

        if (!Schema::hasTable('Facturas_Demo')) {
            Schema::create('Facturas_Demo', function (Blueprint $table) {
                $table->string('FacturaID', 30)->primary();
                $table->string('ClienteID', 30);
                $table->string('PedidoID', 30)->nullable();
                $table->string('UUID', 50);
                $table->date('FechaEmision');
                $table->string('Estado', 50);
                $table->decimal('Subtotal_MXN', 14, 2);
                $table->decimal('IVA_MXN', 14, 2);
                $table->decimal('Total_MXN', 14, 2);
                $table->string('Moneda', 10);
                $table->string('XML_URL_Prueba', 500)->nullable();
                $table->string('PDF_URL_Prueba', 500)->nullable();
                $table->string('EstadoNotaCredito', 100)->nullable();
                $table->string('SistemaOrigen', 50);
                $table->string('ClasificacionDato', 50);
                $table->boolean('Synthetic');
            });
        }

        if (!Schema::hasTable('Mapeo_Pruebas')) {
            Schema::create('Mapeo_Pruebas', function (Blueprint $table) {
                $table->string('TestID', 30)->primary();
                $table->string('CategoriaPrueba', 100);
                $table->string('EntidadID', 50);
                $table->string('HojaFuente', 50);
                $table->string('PrincipalID', 100);
                $table->string('HerramientaEsperada', 100);
                $table->string('ResultadoEsperado', 100);
                $table->boolean('Synthetic');
            });
        }

        if (!Schema::hasTable('Diccionario_Datos')) {
            Schema::create('Diccionario_Datos', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->string('Entidad', 100);
                $table->string('Campo', 100);
                $table->string('TipoLogico', 200);
                $table->string('DescripcionEntidad', 500);
                $table->string('Obligatorio', 20);
                $table->string('SistemaOrigen', 100);
                $table->string('Clasificacion', 100);
                $table->boolean('Synthetic');
                $table->unique(['Entidad', 'Campo']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('Diccionario_Datos');
        Schema::dropIfExists('Mapeo_Pruebas');
        Schema::dropIfExists('Facturas_Demo');
        Schema::dropIfExists('Pedidos_Detalle');
        Schema::dropIfExists('Pedidos');
        Schema::dropIfExists('Inventario');
        Schema::dropIfExists('Clientes');
        Schema::dropIfExists('Productos');
    }
};
