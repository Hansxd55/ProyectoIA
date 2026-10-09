<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\ReturnRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReturnController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(ReturnRequest::with('order')->latest()->paginate(15));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(['order_number' => ['required', 'exists:orders,number'], 'reason' => ['required', 'string', 'max:2000']]);
        $order = Order::where('number', $data['order_number'])->firstOrFail();
        $return = ReturnRequest::create([
            'order_id' => $order->id,
            'number' => 'DEV-'.now()->format('Ymd').'-'.str()->upper(str()->random(5)),
            'reason' => $data['reason'],
        ]);
        return response()->json($return->load('order'), 201);
    }

    public function update(Request $request, ReturnRequest $returnRequest): JsonResponse
    {
        $data = $request->validate(['status' => ['required', 'in:requested,approved,rejected,received,refunded'], 'resolution' => ['nullable', 'string']]);
        $returnRequest->update($data);
        return response()->json($returnRequest->fresh('order'));
    }
}
