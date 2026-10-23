<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->string('role')->default('agent');
            $table->rememberToken();
            $table->timestamps();
        });

        Schema::create('personal_access_tokens', function (Blueprint $table) {
            $table->id();
            $table->morphs('tokenable');
            $table->string('name');
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable()->index();
            $table->timestamps();
        });

        Schema::create('invoices', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->string('number')->index();

            $table->string('customer_name')->nullable();
            $table->string('customer_tax_id')->nullable();

            $table->string('vendor_name')->nullable();
            $table->string('vendor_tax_id')->nullable();

            $table->date('issued_at')->nullable();
            $table->date('due_at')->nullable();

            $table->decimal('subtotal', 14, 2)->default(0);
            $table->decimal('tax', 14, 2)->default(0);
            $table->decimal('total', 14, 2)->default(0);

            $table->char('currency', 3)->default('MXN');

            $table->string('status')
                ->default('pending')
                ->index();

            $table->string('processing_status')
                ->nullable()
                ->index();

            $table->string('payment_status')
                ->nullable()
                ->index();

            $table->string('source_file')->nullable();
            $table->string('pdf_file')->nullable();

            $table->json('raw_data')->nullable();

            $table->timestamps();

            $table->unique(['number', 'vendor_name']);
        });

        Schema::create('ai_analyses', function (Blueprint $table) {
            $table->id();

            $table->foreignId('invoice_id')
                ->constrained('invoices')
                ->cascadeOnDelete();

            $table->string('agent');
            $table->string('status')->default('completed');
            $table->unsignedTinyInteger('confidence')->default(0);
            $table->json('result');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_analyses');
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('personal_access_tokens');
        Schema::dropIfExists('users');
    }
};