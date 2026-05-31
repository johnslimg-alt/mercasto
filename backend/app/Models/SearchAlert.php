<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SearchAlert extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'query',
        'category_id',
        'category_slug',
        'min_price',
        'max_price',
        'city',
        'state',
        'filters',
        'is_active',
        'last_notified_at',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'min_price' => 'decimal:2',
        'max_price' => 'decimal:2',
        'filters' => 'array',
        'last_notified_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }
}
