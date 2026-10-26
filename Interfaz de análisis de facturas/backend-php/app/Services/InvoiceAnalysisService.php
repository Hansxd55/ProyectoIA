<?php

namespace App\Services;

use App\Models\Invoice;
use App\Services\Ai\AiClient;

class InvoiceAnalysisService
{
    public function __construct(private readonly AiClient $ai) {}

    public function run(Invoice $invoice): void
    {
        $invoice->analyses()->delete();
        $invoice->analyses()->create([
            'agent' => 'extractor',
            'confidence' => $this->extractionConfidence($invoice),
            'result' => [
                'message' => 'Campos principales extraídos y normalizados.',
                'fields' => ['number', 'customer_name', 'issued_at', 'subtotal', 'tax', 'total', 'currency'],
                'missing_fields' => collect(['number', 'customer_name', 'issued_at', 'total'])
                    ->filter(fn (string $field) => blank($invoice->{$field}))->values(),
            ],
        ]);

        $issues = $this->auditIssues($invoice);
        $aiNote = $this->ai->complete(
            'Eres un auditor fiscal. Responde en español con una observación breve y accionable. No inventes datos.',
            'Audita esta factura: '.json_encode($invoice->only(['number', 'subtotal', 'tax', 'total', 'currency', 'issued_at', 'due_at']), JSON_UNESCAPED_UNICODE),
        );

        $invoice->analyses()->create([
            'agent' => 'auditor',
            'confidence' => $issues === [] ? 98 : 82,
            'result' => [
                'message' => $issues === [] ? 'No se detectaron anomalías.' : 'La factura requiere revisión.',
                'issues' => $issues,
                'ai_note' => $aiNote,
            ],
        ]);

        $invoice->update(['status' => $issues === [] ? 'analyzed' : 'review']);
    }

    private function extractionConfidence(Invoice $invoice): int
    {
        $required = ['number', 'customer_name', 'issued_at', 'total'];
        $present = collect($required)->filter(fn (string $field) => filled($invoice->{$field}))->count();
        return (int) round(($present / count($required)) * 100);
    }

    private function auditIssues(Invoice $invoice): array
    {
        $issues = [];
        $expected = round((float) $invoice->subtotal + (float) $invoice->tax, 2);

        if (abs($expected - (float) $invoice->total) > 0.02) {
            $issues[] = ['code' => 'TOTAL_MISMATCH', 'message' => 'El subtotal más impuestos no coincide con el total.'];
        }
        if ($invoice->due_at && $invoice->issued_at && $invoice->due_at->lt($invoice->issued_at)) {
            $issues[] = ['code' => 'INVALID_DUE_DATE', 'message' => 'La fecha de vencimiento es anterior a la emisión.'];
        }
        if ($invoice->total < 0) {
            $issues[] = ['code' => 'NEGATIVE_TOTAL', 'message' => 'El importe total no puede ser negativo.'];
        }

        return $issues;
    }
}
