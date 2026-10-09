<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Ticket extends Model
{
    protected $fillable = ['number', 'customer_name', 'customer_email', 'subject', 'description', 'priority', 'status', 'assigned_to'];
}
