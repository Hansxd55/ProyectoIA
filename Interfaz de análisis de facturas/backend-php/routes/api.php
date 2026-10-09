<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ReturnController;
use App\Http\Controllers\SupportController;
use App\Http\Controllers\TicketController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register'])->middleware('throttle:5,1');
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:10,1');
});

Route::post('support/chat', [SupportController::class, 'chat'])->middleware('throttle:30,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('auth/logout', [AuthController::class, 'logout']);
    Route::get('me', fn (\Illuminate\Http\Request $request) => $request->user());
    Route::get('dashboard', DashboardController::class);

    Route::get('invoices', [InvoiceController::class, 'index']);
    Route::post('invoices', [InvoiceController::class, 'store']);
    Route::post('invoices/import', [InvoiceController::class, 'import']);
    Route::get('invoices/{invoice}', [InvoiceController::class, 'show']);
    Route::post('invoices/{invoice}/analyze', [InvoiceController::class, 'analyze']);
    Route::post('invoices/{invoice}/pdf', [InvoiceController::class, 'generatePdf']);
    Route::get('invoices/{invoice}/pdf', [InvoiceController::class, 'downloadPdf']);
    Route::delete('invoices/{invoice}', [InvoiceController::class, 'destroy']);

    Route::apiResource('orders', OrderController::class)->only(['index', 'show', 'store', 'update']);
    Route::apiResource('tickets', TicketController::class)->only(['index', 'show', 'store', 'update']);
    Route::get('returns', [ReturnController::class, 'index']);
    Route::post('returns', [ReturnController::class, 'store']);
    Route::patch('returns/{returnRequest}', [ReturnController::class, 'update']);
    Route::get('conversations/{conversation}', [SupportController::class, 'conversation']);
});
