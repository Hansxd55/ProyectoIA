<?php

namespace App\Http\Controllers;

use App\Models\Ticket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TicketController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(Ticket::when($request->status, fn ($q, $status) => $q->where('status', $status))->latest()->paginate(15));
    }

    public function show(Ticket $ticket): JsonResponse { return response()->json($ticket); }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'customer_name' => ['required', 'string', 'max:180'],
            'customer_email' => ['required', 'email'],
            'subject' => ['required', 'string', 'max:200'],
            'description' => ['required', 'string', 'max:5000'],
            'priority' => ['nullable', 'in:low,normal,high,urgent'],
        ]);
        $data['number'] = 'TIC-'.now()->format('Ymd').'-'.str()->upper(str()->random(5));
        return response()->json(Ticket::create($data), 201);
    }

    public function update(Request $request, Ticket $ticket): JsonResponse
    {
        $data = $request->validate([
            'status' => ['sometimes', 'in:open,in_progress,resolved,closed'],
            'priority' => ['sometimes', 'in:low,normal,high,urgent'],
            'assigned_to' => ['nullable', 'exists:users,id'],
        ]);
        $ticket->update($data);
        return response()->json($ticket->fresh());
    }
}
