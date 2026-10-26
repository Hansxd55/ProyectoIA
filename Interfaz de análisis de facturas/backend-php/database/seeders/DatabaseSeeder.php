<?php

namespace Database\Seeders;

use App\Models\Invoice;
use App\Models\Order;
use App\Models\Ticket;
use App\Models\User;
use App\Services\InvoiceAnalysisService;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::updateOrCreate(
            ['email' => 'admin@nexo.local'],
            ['name' => 'Laura Méndez', 'password' => 'NexoDemo2025!', 'role' => 'admin'],
        );

        $invoice = Invoice::updateOrCreate(
            ['number' => 'FAC-2025-0892', 'customer_name' => 'Distribuciones Mena'],
            ['user_id' => $user->id, 'customer_tax_id' => 'B12345678', 'issued_at' => now()->subDay(), 'due_at' => now()->addDays(29), 'subtotal' => 3537.19, 'tax' => 742.81, 'total' => 4280, 'currency' => 'EUR'],
        );
        app(InvoiceAnalysisService::class)->run($invoice);

        Order::updateOrCreate(
            ['number' => 'PED-1001'],
            ['customer_name' => 'Ana Torres', 'customer_email' => 'ana@example.com', 'status' => 'shipped', 'total' => 189.90, 'currency' => 'EUR', 'tracking_number' => 'NX123456789ES', 'shipped_at' => now(), 'items' => [['sku' => 'NX-01', 'name' => 'Producto demo', 'quantity' => 2, 'price' => 94.95]]],
        );

        Ticket::updateOrCreate(
            ['number' => 'TIC-1001'],
            ['customer_name' => 'Ana Torres', 'customer_email' => 'ana@example.com', 'subject' => 'Consulta sobre entrega', 'description' => 'Necesito confirmar la fecha de entrega.', 'priority' => 'normal', 'status' => 'open'],
        );
    }
}
