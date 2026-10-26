<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReturnRequest extends Model
{
    protected $fillable = ['order_id', 'number', 'reason', 'status', 'resolution'];
    public function order(): BelongsTo { return $this->belongsTo(Order::class); }
}
