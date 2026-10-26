<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Order;
use App\Models\Ticket;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json([
            'invoices' => [
                'total' => Invoice::count(),
                'pending_review' => Invoice::where('status', 'review')->count(),
                'processed_this_month' => Invoice::whereBetween('created_at', [now()->startOfMonth(), now()->endOfMonth()])->count(),
                'recent' => Invoice::with('analyses')->latest()->limit(5)->get(),
            ],
            'orders' => [
                'active' => Order::whereNotIn('status', ['delivered', 'cancelled'])->count(),
                'shipping_today' => Order::whereDate('shipped_at', today())->count(),
            ],
            'tickets' => ['open' => Ticket::where('status', 'open')->count()],
            'agents' => [
                ['name' => 'Analista de facturas', 'status' => 'active', 'type' => 'extractor'],
                ['name' => 'Auditor inteligente', 'status' => 'active', 'type' => 'auditor'],
            ],
        ]);
    }
}
