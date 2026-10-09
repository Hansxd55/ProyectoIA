<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiAnalysis extends Model
{
    protected $fillable = ['invoice_id', 'agent', 'status', 'confidence', 'result'];
    protected function casts(): array { return ['result' => 'array']; }
}
