<?php

namespace App\Services;

class InvoiceValidationService
{
    private const TOTAL_CONFIDENCE_THRESHOLD = 0.80;
    private const DATE_CONFIDENCE_THRESHOLD = 0.80;
    private const AMOUNT_TOLERANCE = 0.02;

    public function validate(array $invoice): array
    {
        $reasons = [];

        $vendorName =
            $invoice['vendor']['name'] ?? null;

        $vendorTaxId =
            $invoice['vendor']['tax_id'] ?? null;

        $invoiceId =
            $invoice['invoice']['id'] ?? null;

        $invoiceDate =
            $invoice['invoice']['date'] ?? null;

        $subtotal =
            $invoice['amounts']['subtotal'] ?? null;

        $tax =
            $invoice['amounts']['tax'] ?? null;

        $total =
            $invoice['amounts']['total'] ?? null;

        $invoiceDateConfidence =
            $invoice['confidence']['invoice_date'] ?? null;

        $invoiceTotalConfidence =
            $invoice['confidence']['invoice_total'] ?? null;

        /*
        |--------------------------------------------------------------------------
        | Proveedor
        |--------------------------------------------------------------------------
        */

        if (! $vendorName || trim($vendorName) === '') {
            $reasons[] = 'Nombre del proveedor no detectado.';
        }

        /*
        |--------------------------------------------------------------------------
        | RFC / Tax ID
        |--------------------------------------------------------------------------
        |
        | No usamos aquí la confianza semántica de Azure como criterio
        | automático porque las pruebas mostraron valores bajos incluso
        | cuando el texto era correcto.
        |
        */

        if (
            ! $vendorTaxId ||
            strlen(trim($vendorTaxId)) < 8
        ) {
            $reasons[] =
                'RFC / Tax ID ausente o con formato insuficiente.';
        }

        /*
        |--------------------------------------------------------------------------
        | Folio
        |--------------------------------------------------------------------------
        */

        if (
            ! $invoiceId ||
            strlen(trim($invoiceId)) < 4
        ) {
            $reasons[] =
                'Folio de factura ausente o inválido.';
        }

        /*
        |--------------------------------------------------------------------------
        | Fecha
        |--------------------------------------------------------------------------
        */

        if (! $invoiceDate) {
            $reasons[] =
                'Fecha de factura no detectada.';
        } elseif (
            $invoiceDateConfidence !== null &&
            $invoiceDateConfidence < self::DATE_CONFIDENCE_THRESHOLD
        ) {
            $reasons[] =
                'Baja confianza en la fecha de factura.';
        }

        /*
        |--------------------------------------------------------------------------
        | Total
        |--------------------------------------------------------------------------
        */

        if ($total === null) {
            $reasons[] =
                'Total de factura no detectado.';
        } elseif (
            $invoiceTotalConfidence !== null &&
            $invoiceTotalConfidence < self::TOTAL_CONFIDENCE_THRESHOLD
        ) {
            $reasons[] =
                'Baja confianza en el total de la factura.';
        }

        /*
        |--------------------------------------------------------------------------
        | Consistencia aritmética
        |--------------------------------------------------------------------------
        */

        if (
            $subtotal !== null &&
            $tax !== null &&
            $total !== null
        ) {
            $calculatedTotal =
                round((float) $subtotal + (float) $tax, 2);

            $reportedTotal =
                round((float) $total, 2);

            if (
                abs($calculatedTotal - $reportedTotal)
                > self::AMOUNT_TOLERANCE
            ) {
                $reasons[] =
                    'El subtotal más impuestos no coincide con el total.';
            }
        }

        $reviewRequired = ! empty($reasons);

        return [
            'review_required' => $reviewRequired,

            'review_reasons' => $reasons,

            'processing_status' =>
                $reviewRequired
                    ? 'EN_REVISION'
                    : 'VALIDADA',

            'payment_status' =>
                $reviewRequired
                    ? null
                    : 'POR_PAGAR',

            'rules' => [
                'invoice_date_confidence_threshold' =>
                    self::DATE_CONFIDENCE_THRESHOLD,

                'invoice_total_confidence_threshold' =>
                    self::TOTAL_CONFIDENCE_THRESHOLD,

                'amount_tolerance' =>
                    self::AMOUNT_TOLERANCE,
            ],
        ];
    }
}