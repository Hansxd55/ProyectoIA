<?php

namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Services\CustomerSupportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SupportController extends Controller
{
    public function chat(Request $request, CustomerSupportService $support): JsonResponse
    {
        $data = $request->validate([
            'message' => ['required', 'string', 'max:2000'],
            'session_id' => ['nullable', 'uuid'],
            'customer_email' => ['nullable', 'email'],
        ]);
        $conversation = Conversation::firstOrCreate(
            ['session_id' => $data['session_id'] ?? (string) Str::uuid()],
            ['customer_email' => $data['customer_email'] ?? null],
        );
        return response()->json($support->reply($conversation, $data['message']));
    }

    public function conversation(Conversation $conversation): JsonResponse
    {
        return response()->json($conversation->load('messages'));
    }
}
