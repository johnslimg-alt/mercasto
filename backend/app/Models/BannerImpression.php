<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BannerImpression extends Model
{
    protected $fillable = [
        'banner_id',
        'user_id',
        'ip_address',
        'placement_slug',
        'category_slug',
        'state',
        'clicked',
        'user_agent',
    ];

    protected $casts = [
        'clicked' => 'boolean',
    ];

    public function banner(): BelongsTo
    {
        return $this->belongsTo(AdBanner::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
