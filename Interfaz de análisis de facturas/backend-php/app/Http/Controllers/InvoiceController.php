<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Services\AzureDocumentIntelligenceService;
use App\Services\InvoiceAnalysisService;
use App\Services\InvoiceImportService;
use App\Services\InvoiceNormalizerService;
use App\Services\InvoicePdfService;
use App\Services\InvoiceValidationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Throwable;

class InvoiceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $invoices = Invoice::with('analyses')
            ->when(
                $request->status,
                fn ($query, $status) => $query->where('status', $status)
            )
            ->when(
                $request->processing_status,
                fn ($query, $processingStatus) =>
                    $query->where('processing_status', $processingStatus)
            )
            ->when(
                $request->payment_status,
                fn ($query, $paymentStatus) =>
                    $query->where('payment_status', $paymentStatus)
            )
            ->when(
                $request->search,
                fn ($query, $search) => $query->where(
                    fn ($q) => $q
                        ->where('number', 'like', "%{$search}%")
                        ->orWhere('customer_name', 'like', "%{$search}%")
                        ->orWhere('vendor_name', 'like', "%{$search}%")
                )
            )
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return response()->json($invoices);
    }

    public function show(Invoice $invoice): JsonResponse
    {
        return response()->json(
            $invoice->load('analyses')
        );
    }

    public function store(
        Request $request,
        InvoiceAnalysisService $analysis
    ): JsonResponse {
        $data = $request->validate([
            'number' => [
                'required',
                'string',
                'max:80'
            ],

            'customer_name' => [
                'required',
                'string',
                'max:180'
            ],

            'customer_tax_id' => [
                'nullable',
                'string',
                'max:30'
            ],

            'issued_at' => [
                'nullable',
                'date'
            ],

            'due_at' => [
                'nullable',
                'date'
            ],

            'subtotal' => [
                'required',
                'numeric'
            ],

            'tax' => [
                'required',
                'numeric'
            ],

            'total' => [
                'required',
                'numeric'
            ],

            'currency' => [
                'nullable',
                'string',
                'size:3'
            ],
        ]);

        $invoice = Invoice::create([
            ...$data,
            'user_id' => $request->user()->id,
            'status' => 'analyzing'
        ]);

        $analysis->run($invoice);

        return response()->json(
            $invoice->fresh('analyses'),
            201
        );
    }

    public function import(
        Request $request,
        InvoiceImportService $importer
    ): JsonResponse {
        $request->validate([
            'file' => [
                'required',
                'file',
                'mimes:xlsx,xls,csv',
                'max:10240'
            ]
        ]);

        try {
            $invoices = $importer->import(
                $request->file('file'),
                $request->user()->id
            );

            return response()->json([
                'message' =>
                    count($invoices).' facturas importadas.',

                'data' => $invoices
            ], 201);

        } catch (\InvalidArgumentException $exception) {

            return response()->json([
                'message' => $exception->getMessage()
            ], 422);
        }
    }

    public function document(
        Request $request,
        AzureDocumentIntelligenceService $azure,
        InvoiceNormalizerService $normalizer,
        InvoiceValidationService $validator
    ): JsonResponse {
        $request->validate([
            'file' => [
                'required',
                'file',
                'mimes:pdf,jpg,jpeg,png',
                'max:10240'
            ]
        ]);

        $file = $request->file('file');

        try {
            $azureResult = $azure->analyzeInvoice($file);

            $normalized = $normalizer->normalize(
                $azureResult,
                $file->getClientOriginalName()
            );

            $validation = $validator->validate(
                $normalized
            );

            $normalized['validation'] = $validation;

            $invoiceNumber =
                $normalized['invoice']['id'] ?? null;

            $vendorName =
                $normalized['vendor']['name'] ?? null;

            if (! $invoiceNumber) {
                return response()->json([
                    'message' =>
                        'No se pudo identificar el folio de la factura.',

                    'data' => $normalized
                ], 422);
            }

            if (! $vendorName) {
                return response()->json([
                    'message' =>
                        'No se pudo identificar el proveedor.',

                    'data' => $normalized
                ], 422);
            }

            $duplicate = Invoice::where(
                'number',
                $invoiceNumber
            )
                ->where(
                    'vendor_name',
                    $vendorName
                )
                ->first();

            if ($duplicate) {
                return response()->json([
                    'message' =>
                        'La factura ya existe en la base de datos.',

                    'duplicate' => true,

                    'invoice' => $duplicate,

                    'data' => $normalized
                ], 409);
            }

            $storedPath = $file->store(
                'invoices/source'
            );

            $invoice = Invoice::create([
                'user_id' => $request->user()->id,

                'number' =>
                    $normalized['invoice']['id'],

                'customer_name' => null,
                'customer_tax_id' => null,

                'vendor_name' =>
                    $normalized['vendor']['name'],

                'vendor_tax_id' =>
                    $normalized['vendor']['tax_id'],

                'issued_at' =>
                    $normalized['invoice']['date'],

                'due_at' => null,

                'subtotal' =>
                    $normalized['amounts']['subtotal'] ?? 0,

                'tax' =>
                    $normalized['amounts']['tax'] ?? 0,

                'total' =>
                    $normalized['amounts']['total'] ?? 0,

                'currency' =>
                    $normalized['invoice']['currency']
                    ?? 'MXN',

                'status' =>
                    $validation['review_required']
                        ? 'review'
                        : 'analyzed',

                'processing_status' =>
                    $validation['processing_status'],

                'payment_status' =>
                    $validation['payment_status'],

                'source_file' => $storedPath,

                'pdf_file' => null,

                'raw_data' => $normalized,
            ]);

            return response()->json([
                'message' =>
                    $validation['review_required']
                        ? 'Factura analizada y enviada a revisión.'
                        : 'Factura analizada y validada correctamente.',

                'review_required' =>
                    $validation['review_required'],

                'processing_status' =>
                    $validation['processing_status'],

                'payment_status' =>
                    $validation['payment_status'],

                'review_reasons' =>
                    $validation['review_reasons'],

                'invoice' => $invoice,

                'data' => $normalized
            ], 201);

        } catch (Throwable $exception) {

            Log::error(
                'Error procesando factura de proveedor',
                [
                    'message' =>
                        $exception->getMessage(),

                    'file' =>
                        $file->getClientOriginalName()
                ]
            );

            return response()->json([
                'message' =>
                    'No fue posible procesar la factura.',

                'error' =>
                    $exception->getMessage()
            ], 500);
        }
    }

    public function review(
        Request $request,
        Invoice $invoice
    ): JsonResponse {
        if ($invoice->processing_status !== 'EN_REVISION') {
            return response()->json([
                'message' =>
                    'La factura no se encuentra en estado EN_REVISION.'
            ], 422);
        }

        $data = $request->validate([
            'number' => [
                'sometimes',
                'required',
                'string',
                'max:80'
            ],

            'vendor_name' => [
                'sometimes',
                'required',
                'string',
                'max:180'
            ],

            'vendor_tax_id' => [
                'sometimes',
                'required',
                'string',
                'min:8',
                'max:30'
            ],

            'issued_at' => [
                'sometimes',
                'required',
                'date'
            ],

            'subtotal' => [
                'sometimes',
                'required',
                'numeric',
                'min:0'
            ],

            'tax' => [
                'sometimes',
                'required',
                'numeric',
                'min:0'
            ],

            'total' => [
                'sometimes',
                'required',
                'numeric',
                'min:0'
            ],

            'currency' => [
                'sometimes',
                'required',
                'string',
                'size:3'
            ],
        ]);

        $invoice->fill($data);

        if (
            ! $invoice->vendor_name ||
            ! $invoice->vendor_tax_id ||
            ! $invoice->number ||
            ! $invoice->issued_at
        ) {
            return response()->json([
                'message' =>
                    'La factura todavía tiene campos obligatorios incompletos.'
            ], 422);
        }

        $expectedTotal = round(
            (float) $invoice->subtotal +
            (float) $invoice->tax,
            2
        );

        $reportedTotal = round(
            (float) $invoice->total,
            2
        );

        if (
            abs($expectedTotal - $reportedTotal) > 0.02
        ) {
            return response()->json([
                'message' =>
                    'El subtotal más impuestos no coincide con el total.'
            ], 422);
        }

        $invoice->processing_status = 'VALIDADA';
        $invoice->payment_status = 'POR_PAGAR';
        $invoice->status = 'analyzed';

        $rawData = $invoice->raw_data ?? [];

        $rawData['human_review'] = [
            'completed' => true,
            'reviewed_at' => now()->toISOString(),
            'reviewed_by_user_id' =>
                $request->user()->id,
            'corrected_fields' =>
                array_keys($data),
        ];

        $invoice->raw_data = $rawData;

        $invoice->save();

        return response()->json([
            'message' =>
                'Factura corregida y validada mediante revisión humana.',

            'processing_status' =>
                $invoice->processing_status,

            'payment_status' =>
                $invoice->payment_status,

            'invoice' =>
                $invoice->fresh()
        ]);
    }

    public function analyze(
        Invoice $invoice,
        InvoiceAnalysisService $analysis
    ): JsonResponse {
        $analysis->run($invoice);

        return response()->json(
            $invoice->fresh('analyses')
        );
    }

    public function generatePdf(
        Invoice $invoice,
        InvoicePdfService $pdf
    ): BinaryFileResponse {
        $path = $pdf->generate($invoice);

        return response()->download(
            Storage::path($path),
            "factura-{$invoice->number}.pdf"
        );
    }

    public function downloadPdf(
        Invoice $invoice
    ): BinaryFileResponse|JsonResponse {
        if (
            ! $invoice->pdf_file ||
            ! Storage::exists($invoice->pdf_file)
        ) {
            return response()->json([
                'message' =>
                    'El PDF todavía no ha sido generado.'
            ], 404);
        }

        return response()->download(
            Storage::path($invoice->pdf_file),
            "factura-{$invoice->number}.pdf"
        );
    }

    public function destroy(
        Invoice $invoice
    ): JsonResponse {
        Storage::delete(
            array_filter([
                $invoice->source_file,
                $invoice->pdf_file
            ])
        );

        $invoice->delete();

        return response()->json([], 204);
    }
}