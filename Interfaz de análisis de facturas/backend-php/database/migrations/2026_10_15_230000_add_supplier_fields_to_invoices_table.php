<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {

            /*
            |--------------------------------------------------------------------------
            | Compatibilidad con facturas de proveedores
            |--------------------------------------------------------------------------
            */

            $table->string('customer_name')
                ->nullable()
                ->change();

            $table->string('vendor_name')
                ->nullable()
                ->after('customer_tax_id');

            $table->string('vendor_tax_id')
                ->nullable()
                ->after('vendor_name');

            /*
            |--------------------------------------------------------------------------
            | Estados internos de procesamiento y pago
            |--------------------------------------------------------------------------
            */

            $table->string('processing_status')
                ->nullable()
                ->index()
                ->after('status');

            $table->string('payment_status')
                ->nullable()
                ->index()
                ->after('processing_status');
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {

            $table->dropColumn([
                'vendor_name',
                'vendor_tax_id',
                'processing_status',
                'payment_status',
            ]);

            $table->string('customer_name')
                ->nullable(false)
                ->change();
        });
    }
};