<?php

namespace App\Services\Ai;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AiClient
{
    public function available(): bool
    {
        return filled(config('services.openai.key'));
    }

    public function complete(string $system, string $prompt): ?string
    {
        if (! $this->available()) {
            return null;
        }

        try {
            $response = Http::withToken(config('services.openai.key'))
                ->timeout(45)
                ->retry(2, 500)
                ->post('https://api.openai.com/v1/chat/completions', [
                    'model' => config('services.openai.model'),
                    'temperature' => 0.2,
                    'messages' => [
                        ['role' => 'system', 'content' => $system],
                        ['role' => 'user', 'content' => $prompt],
                    ],
                ])
                ->throw();

            return data_get($response->json(), 'choices.0.message.content');
        } catch (\Throwable $exception) {
            Log::warning('No se pudo consultar OpenAI; se usará la respuesta local.', ['error' => $exception->getMessage()]);
            return null;
        }
    }
}
