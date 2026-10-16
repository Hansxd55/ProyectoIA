<?php

namespace App\Services;

use RuntimeException;

class InvoiceNormalizerService
{
    public function normalize(array $azureResult, ?string $sourceFile = null): array
    {
        $documents = $azureResult['analyzeResult']['documents'] ?? [];

        if (empty($documents)) {
            throw new RuntimeException(
                'Azure no devolvió documentos analizables.'
            );
        }

        $fields = $documents[0]['fields'] ?? [];

        $vendorNameField = $fields['VendorName'] ?? null;
        $vendorTaxIdField = $fields['VendorTaxId'] ?? null;
        $invoiceIdField = $fields['InvoiceId'] ?? null;
        $invoiceDateField = $fields['InvoiceDate'] ?? null;
        $subtotalField = $fields['SubTotal'] ?? null;
        $taxField = $fields['TotalTax'] ?? null;
        $totalField = $fields['InvoiceTotal'] ?? null;

        $vendorName = $this->getString($vendorNameField);
        $vendorTaxId = $this->getString($vendorTaxIdField);
        $invoiceId = $this->getString($invoiceIdField);
        $invoiceDate = $this->getDate($invoiceDateField);

        [$subtotal, $subtotalCurrency] =
            $this->getCurrency($subtotalField);

        [$tax, $taxCurrency] =
            $this->getCurrency($taxField);

        [$total, $totalCurrency] =
            $this->getCurrency($totalField);

        $currency =
            $totalCurrency
            ?? $subtotalCurrency
            ?? $taxCurrency;

        return [
            'source_file' => $sourceFile,

            'vendor' => [
                'name' => $vendorName,
                'tax_id' => $vendorTaxId,
            ],

            'invoice' => [
                'id' => $invoiceId,
                'date' => $invoiceDate,
                'currency' => $currency,
            ],

            'amounts' => [
                'subtotal' => $subtotal,
                'tax' => $tax,
                'total' => $total,
            ],

            'confidence' => [
                'vendor_name' =>
                    $this->getConfidence($vendorNameField),

                'vendor_tax_id' =>
                    $this->getConfidence($vendorTaxIdField),

                'invoice_id' =>
                    $this->getConfidence($invoiceIdField),

                'invoice_date' =>
                    $this->getConfidence($invoiceDateField),

                'invoice_total' =>
                    $this->getConfidence($totalField),
            ],
        ];
    }

    private function getString(?array $field): ?string
    {
        if (! $field) {
            return null;
        }

        return $field['valueString']
            ?? $field['content']
            ?? null;
    }

    private function getDate(?array $field): ?string
    {
        if (! $field) {
            return null;
        }

        return $field['valueDate']
            ?? $field['content']
            ?? null;
    }

    private function getCurrency(?array $field): array
    {
        if (! $field) {
            return [null, null];
        }

        $value = $field['valueCurrency'] ?? [];

        return [
            $value['amount'] ?? null,
            $value['currencyCode'] ?? null,
        ];
    }

    private function getConfidence(?array $field): ?float
    {
        if (! $field) {
            return null;
        }

        return isset($field['confidence'])
            ? (float) $field['confidence']
            : null;
    }
}