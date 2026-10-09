<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Invoice extends Model
{
    protected $fillable = ['user_id', 'number', 'customer_name', 'customer_tax_id', 'issued_at', 'due_at', 'subtotal', 'tax', 'total', 'currency', 'status', 'source_file', 'pdf_file', 'raw_data'];
    protected function casts(): array { return ['issued_at' => 'date', 'due_at' => 'date', 'raw_data' => 'array', 'subtotal' => 'decimal:2', 'tax' => 'decimal:2', 'total' => 'decimal:2']; }
    public function analyses(): HasMany { return $this->hasMany(AiAnalysis::class); }
}
