<?php

namespace App\Services;

use App\Models\Conversation;
use App\Models\Order;
use App\Models\Ticket;
use App\Services\Ai\AiClient;

class CustomerSupportService
{
    public function __construct(private readonly AiClient $ai) {}

    public function reply(Conversation $conversation, string $message): array
    {
        $conversation->messages()->create(['role' => 'user', 'content' => $message]);
        $order = $this->findOrder($message, $conversation->customer_email);
        $ticket = $this->findTicket($message, $conversation->customer_email);
        $context = array_filter([
            'order' => $order?->only(['number', 'status', 'total', 'currency', 'tracking_number', 'shipped_at', 'delivered_at']),
            'ticket' => $ticket?->only(['number', 'subject', 'priority', 'status']),
        ]);

        $answer = $this->ai->complete(
            'Eres Alma, agente de soporte. Contesta en español, de forma breve y amable. Usa únicamente el contexto JSON. Si falta información, pide el número de pedido o ticket. No reveles datos personales.',
            "Consulta: {$message}\nContexto: ".json_encode($context, JSON_UNESCAPED_UNICODE),
        ) ?? $this->fallback($context);

        $conversation->messages()->create(['role' => 'assistant', 'content' => $answer, 'metadata' => $context]);
        return ['message' => $answer, 'context' => $context, 'session_id' => $conversation->session_id];
    }

    private function findOrder(string $message, ?string $email): ?Order
    {
        preg_match('/(?:PED|ORD)[-#\s]?(\d+)/i', $message, $match);
        return Order::query()
            ->when(isset($match[1]), fn ($q) => $q->where('number', 'like', "%{$match[1]}%"))
            ->when(! isset($match[1]) && $email, fn ($q) => $q->where('customer_email', $email))
            ->latest()->first();
    }

    private function findTicket(string $message, ?string $email): ?Ticket
    {
        preg_match('/(?:TIC|TICKET)[-#\s]?(\d+)/i', $message, $match);
        return Ticket::query()
            ->when(isset($match[1]), fn ($q) => $q->where('number', 'like', "%{$match[1]}%"))
            ->when(! isset($match[1]) && $email, fn ($q) => $q->where('customer_email', $email))
            ->latest()->first();
    }

    private function fallback(array $context): string
    {
        if (isset($context['order'])) {
            $order = $context['order'];
            $tracking = $order['tracking_number'] ? " Su seguimiento es {$order['tracking_number']}." : '';
            return "El pedido {$order['number']} está en estado «{$order['status']}».{$tracking}";
        }
        if (isset($context['ticket'])) {
            $ticket = $context['ticket'];
            return "El ticket {$ticket['number']} está «{$ticket['status']}» con prioridad {$ticket['priority']}.";
        }
        return 'Puedo ayudarte con pedidos, devoluciones y tickets. Indícame el número correspondiente, por ejemplo PED-1001 o TIC-1001.';
    }
}
