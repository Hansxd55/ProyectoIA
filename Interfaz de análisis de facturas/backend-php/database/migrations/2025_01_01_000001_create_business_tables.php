<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('number')->index();
            $table->string('customer_name');
            $table->string('customer_tax_id')->nullable();
            $table->date('issued_at')->nullable();
            $table->date('due_at')->nullable();
            $table->decimal('subtotal', 14, 2)->default(0);
            $table->decimal('tax', 14, 2)->default(0);
            $table->decimal('total', 14, 2)->default(0);
            $table->char('currency', 3)->default('EUR');
            $table->string('status')->default('pending')->index();
            $table->string('source_file')->nullable();
            $table->string('pdf_file')->nullable();
            $table->json('raw_data')->nullable();
            $table->timestamps();
            $table->unique(['number', 'customer_name']);
        });
        Schema::create('ai_analyses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained()->cascadeOnDelete();
            $table->string('agent');
            $table->string('status')->default('completed');
            $table->unsignedTinyInteger('confidence')->default(0);
            $table->json('result');
            $table->timestamps();
        });
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('number')->unique();
            $table->string('customer_name');
            $table->string('customer_email')->index();
            $table->string('status')->default('received')->index();
            $table->decimal('total', 14, 2);
            $table->char('currency', 3)->default('EUR');
            $table->string('tracking_number')->nullable();
            $table->timestamp('shipped_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->json('items')->nullable();
            $table->timestamps();
        });
        Schema::create('return_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->string('number')->unique();
            $table->text('reason');
            $table->string('status')->default('requested')->index();
            $table->text('resolution')->nullable();
            $table->timestamps();
        });
        Schema::create('tickets', function (Blueprint $table) {
            $table->id();
            $table->string('number')->unique();
            $table->string('customer_name');
            $table->string('customer_email')->index();
            $table->string('subject');
            $table->text('description');
            $table->string('priority')->default('normal');
            $table->string('status')->default('open')->index();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
        Schema::create('conversations', function (Blueprint $table) {
            $table->id();
            $table->uuid('session_id')->unique();
            $table->string('customer_email')->nullable()->index();
            $table->string('status')->default('active');
            $table->timestamps();
        });
        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained()->cascadeOnDelete();
            $table->string('role');
            $table->text('content');
            $table->json('metadata')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('messages');
        Schema::dropIfExists('conversations');
        Schema::dropIfExists('tickets');
        Schema::dropIfExists('return_requests');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('ai_analyses');
        Schema::dropIfExists('invoices');
    }
};
