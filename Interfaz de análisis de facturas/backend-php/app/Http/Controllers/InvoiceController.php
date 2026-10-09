<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Services\InvoiceAnalysisService;
use App\Services\InvoiceImportService;
use App\Services\InvoicePdfService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class InvoiceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $invoices = Invoice::with('analyses')
            ->when($request->status, fn ($query, $status) => $query->where('status', $status))
            ->when($request->search, fn ($query, $search) => $query->where(fn ($q) => $q
                ->where('number', 'like', "%{$search}%")
                ->orWhere('customer_name', 'like', "%{$search}%")))
            ->latest()->paginate($request->integer('per_page', 15));
        return response()->json($invoices);
    }

    public function show(Invoice $invoice): JsonResponse
    {
        return response()->json($invoice->load('analyses'));
    }

    public function store(Request $request, InvoiceAnalysisService $analysis): JsonResponse
    {
        $data = $request->validate([
            'number' => ['required', 'string', 'max:80'],
            'customer_name' => ['required', 'string', 'max:180'],
            'customer_tax_id' => ['nullable', 'string', 'max:30'],
            'issued_at' => ['nullable', 'date'],
            'due_at' => ['nullable', 'date'],
            'subtotal' => ['required', 'numeric'],
            'tax' => ['required', 'numeric'],
            'total' => ['required', 'numeric'],
            'currency' => ['nullable', 'string', 'size:3'],
        ]);
        $invoice = Invoice::create([...$data, 'user_id' => $request->user()->id, 'status' => 'analyzing']);
        $analysis->run($invoice);
        return response()->json($invoice->fresh('analyses'), 201);
    }

    public function import(Request $request, InvoiceImportService $importer): JsonResponse
    {
        $request->validate(['file' => ['required', 'file', 'mimes:xlsx,xls,csv', 'max:10240']]);
        try {
            $invoices = $importer->import($request->file('file'), $request->user()->id);
            return response()->json(['message' => count($invoices).' facturas importadas.', 'data' => $invoices], 201);
        } catch (\InvalidArgumentException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }

    public function analyze(Invoice $invoice, InvoiceAnalysisService $analysis): JsonResponse
    {
        $analysis->run($invoice);
        return response()->json($invoice->fresh('analyses'));
    }

    public function generatePdf(Invoice $invoice, InvoicePdfService $pdf): BinaryFileResponse
    {
        $path = $pdf->generate($invoice);
        return response()->download(Storage::path($path), "factura-{$invoice->number}.pdf");
    }

    public function downloadPdf(Invoice $invoice): BinaryFileResponse|JsonResponse
    {
        if (! $invoice->pdf_file || ! Storage::exists($invoice->pdf_file)) {
            return response()->json(['message' => 'El PDF todavía no ha sido generado.'], 404);
        }
        return response()->download(Storage::path($invoice->pdf_file), "factura-{$invoice->number}.pdf");
    }

    public function destroy(Invoice $invoice): JsonResponse
    {
        Storage::delete(array_filter([$invoice->source_file, $invoice->pdf_file]));
        $invoice->delete();
        return response()->json([], 204);
    }
}
