<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContactClick extends Model
{
    protected $fillable = [
        'ad_id',
        'user_id',
        'channel',
        'ip_address',
        'user_agent',
    ];

    public function ad(): BelongsTo
    {
        return $this->belongsTo(Ad::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
