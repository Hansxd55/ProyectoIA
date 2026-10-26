<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(Order::with('returns')
            ->when($request->status, fn ($q, $status) => $q->where('status', $status))
            ->latest()->paginate(15));
    }

    public function show(Order $order): JsonResponse { return response()->json($order->load('returns')); }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'number' => ['required', 'string', 'unique:orders'],
            'customer_name' => ['required', 'string', 'max:180'],
            'customer_email' => ['required', 'email'],
            'status' => ['nullable', 'in:received,preparing,shipped,delivered,cancelled'],
            'total' => ['required', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'tracking_number' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
        ]);
        return response()->json(Order::create($data), 201);
    }

    public function update(Request $request, Order $order): JsonResponse
    {
        $data = $request->validate([
            'status' => ['sometimes', 'in:received,preparing,shipped,delivered,cancelled'],
            'tracking_number' => ['nullable', 'string'],
            'shipped_at' => ['nullable', 'date'],
            'delivered_at' => ['nullable', 'date'],
        ]);
        $order->update($data);
        return response()->json($order->fresh());
    }
}
