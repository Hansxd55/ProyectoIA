<?php

namespace App\Services;

use App\Models\Invoice;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;

class InvoiceImportService
{
    private const ALIASES = [
        'number' => ['numero', 'número', 'factura', 'invoice', 'invoice_number'],
        'customer_name' => ['cliente', 'customer', 'customer_name', 'razon_social', 'razón_social'],
        'customer_tax_id' => ['nif', 'cif', 'tax_id', 'customer_tax_id'],
        'issued_at' => ['fecha', 'fecha_emision', 'issued_at', 'date'],
        'due_at' => ['vencimiento', 'fecha_vencimiento', 'due_at'],
        'subtotal' => ['subtotal', 'base_imponible', 'base'],
        'tax' => ['iva', 'impuesto', 'tax'],
        'total' => ['total', 'importe_total', 'amount'],
        'currency' => ['moneda', 'currency'],
    ];

    public function __construct(private readonly InvoiceAnalysisService $analysis) {}

    public function import(UploadedFile $file, ?int $userId): array
    {
        $sheet = IOFactory::load($file->getRealPath())->getActiveSheet();
        $rows = $sheet->toArray(null, true, true, false);

        if (count($rows) < 2) {
            throw new \InvalidArgumentException('El archivo no contiene filas de facturas.');
        }

        $headers = array_map(fn ($value) => $this->normalize((string) $value), array_shift($rows));
        $map = $this->mapHeaders($headers);
        foreach (['number', 'customer_name', 'total'] as $required) {
            if (! isset($map[$required])) {
                throw new \InvalidArgumentException("Falta la columna obligatoria: {$required}.");
            }
        }

        $storedPath = $file->store('invoices/source');
        $created = [];
        DB::transaction(function () use ($rows, $map, $storedPath, $userId, &$created): void {
            foreach ($rows as $row) {
                if (collect($row)->filter(fn ($value) => filled($value))->isEmpty()) {
                    continue;
                }
                $data = $this->rowData($row, $map);
                $invoice = Invoice::updateOrCreate(
                    ['number' => $data['number'], 'customer_name' => $data['customer_name']],
                    [...$data, 'user_id' => $userId, 'source_file' => $storedPath, 'status' => 'analyzing', 'raw_data' => $row],
                );
                $this->analysis->run($invoice);
                $created[] = $invoice->fresh('analyses');
            }
        });

        if ($created === []) {
            Storage::delete($storedPath);
            throw new \InvalidArgumentException('No se encontraron facturas válidas.');
        }

        return $created;
    }

    private function mapHeaders(array $headers): array
    {
        $map = [];
        foreach (self::ALIASES as $field => $aliases) {
            foreach ($aliases as $alias) {
                $index = array_search($this->normalize($alias), $headers, true);
                if ($index !== false) {
                    $map[$field] = $index;
                    break;
                }
            }
        }
        return $map;
    }

    private function rowData(array $row, array $map): array
    {
        $value = fn (string $field, mixed $default = null) => isset($map[$field]) ? ($row[$map[$field]] ?? $default) : $default;
        return [
            'number' => trim((string) $value('number')),
            'customer_name' => trim((string) $value('customer_name')),
            'customer_tax_id' => $value('customer_tax_id'),
            'issued_at' => $this->date($value('issued_at')),
            'due_at' => $this->date($value('due_at')),
            'subtotal' => $this->decimal($value('subtotal', 0)),
            'tax' => $this->decimal($value('tax', 0)),
            'total' => $this->decimal($value('total', 0)),
            'currency' => strtoupper(substr((string) $value('currency', 'EUR'), 0, 3)),
        ];
    }

    private function date(mixed $value): ?string
    {
        if (blank($value)) return null;
        try {
            return is_numeric($value)
                ? Carbon::instance(ExcelDate::excelToDateTimeObject($value))->toDateString()
                : Carbon::parse($value)->toDateString();
        } catch (\Throwable) {
            return null;
        }
    }

    private function decimal(mixed $value): float
    {
        if (is_numeric($value)) return (float) $value;
        $clean = preg_replace('/[^\d,.-]/', '', (string) $value);
        if (str_contains($clean, ',') && str_contains($clean, '.')) $clean = str_replace('.', '', $clean);
        return (float) str_replace(',', '.', $clean);
    }

    private function normalize(string $value): string
    {
        return str($value)->lower()->ascii()->replace([' ', '-'], '_')->trim('_')->toString();
    }
}
