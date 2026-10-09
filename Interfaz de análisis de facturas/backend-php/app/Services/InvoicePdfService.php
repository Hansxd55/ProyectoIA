<?php

namespace App\Services;

use App\Models\Invoice;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;

class InvoicePdfService
{
    public function generate(Invoice $invoice): string
    {
        $invoice->load('analyses');
        $path = "invoices/pdf/{$invoice->number}.pdf";
        Storage::put($path, Pdf::loadView('pdf.invoice', compact('invoice'))->output());
        $invoice->update(['pdf_file' => $path]);
        return $path;
    }
}
