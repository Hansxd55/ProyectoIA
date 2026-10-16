<?php

return [

    'openai' => [
        'key' => env('OPENAI_API_KEY'),
        'model' => env('OPENAI_MODEL', 'gpt-4o-mini'),
    ],

    'azure_document_intelligence' => [
        'endpoint' => env('AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT'),
        'key' => env('AZURE_DOCUMENT_INTELLIGENCE_KEY'),
        'api_version' => env(
            'AZURE_DOCUMENT_INTELLIGENCE_API_VERSION',
            '2024-11-30'
        ),
        'model' => env(
            'AZURE_DOCUMENT_INTELLIGENCE_MODEL',
            'prebuilt-invoice'
        ),
    ],

];