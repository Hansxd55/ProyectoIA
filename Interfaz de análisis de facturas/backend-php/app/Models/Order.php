<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    protected $fillable = ['number', 'customer_name', 'customer_email', 'status', 'total', 'currency', 'tracking_number', 'shipped_at', 'delivered_at', 'items'];
    protected function casts(): array { return ['items' => 'array', 'shipped_at' => 'datetime', 'delivered_at' => 'datetime', 'total' => 'decimal:2']; }
    public function returns(): HasMany { return $this->hasMany(ReturnRequest::class); }
}
