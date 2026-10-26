<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class AzureDocumentIntelligenceService
{
    public function analyzeInvoice(UploadedFile $file): array
    {
        $endpoint = rtrim(
            config('services.azure_document_intelligence.endpoint'),
            '/'
        );

        $key = config(
            'services.azure_document_intelligence.key'
        );

        $apiVersion = config(
            'services.azure_document_intelligence.api_version',
            '2024-11-30'
        );

        $model = config(
            'services.azure_document_intelligence.model',
            'prebuilt-invoice'
        );

        if (! $endpoint || ! $key) {
            throw new RuntimeException(
                'Falta configurar Azure Document Intelligence.'
            );
        }

        $analyzeUrl =
            "{$endpoint}/documentintelligence/documentModels/" .
            "{$model}:analyze?api-version={$apiVersion}";

        $response = Http::withHeaders([
            'Ocp-Apim-Subscription-Key' => $key,
            'Content-Type' => 'application/octet-stream',
        ])->withBody(
            file_get_contents($file->getRealPath()),
            'application/octet-stream'
        )->post($analyzeUrl);

        if (! $response->successful()) {
            throw new RuntimeException(
                'Azure rechazó el documento: ' .
                $response->status() . ' - ' .
                $response->body()
            );
        }

        $operationLocation = $response->header(
            'Operation-Location'
        );

        if (! $operationLocation) {
            throw new RuntimeException(
                'Azure no devolvió Operation-Location.'
            );
        }

        for ($attempt = 0; $attempt < 30; $attempt++) {
            sleep(1);

            $resultResponse = Http::withHeaders([
                'Ocp-Apim-Subscription-Key' => $key,
            ])->get($operationLocation);

            if (! $resultResponse->successful()) {
                throw new RuntimeException(
                    'Error consultando resultado de Azure: ' .
                    $resultResponse->status() . ' - ' .
                    $resultResponse->body()
                );
            }

            $result = $resultResponse->json();

            $status = $result['status'] ?? null;

            if ($status === 'succeeded') {
                return $result;
            }

            if ($status === 'failed') {
                throw new RuntimeException(
                    'Azure no pudo analizar la factura.'
                );
            }
        }

        throw new RuntimeException(
            'Tiempo de espera agotado esperando respuesta de Azure.'
        );
    }
}