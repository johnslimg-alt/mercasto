<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AdPlacement extends Model
{
    protected $fillable = [
        'slug',
        'name',
        'description',
        'position',
        'width',
        'height',
        'max_banners',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'width' => 'integer',
        'height' => 'integer',
        'max_banners' => 'integer',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function banners(): HasMany
    {
        return $this->hasMany(AdBanner::class, 'placement_id');
    }

    public function activeBanners(): HasMany
    {
        return $this->banners()
            ->where('is_active', true)
            ->where(function ($query) {
                $query->whereNull('starts_at')->orWhere('starts_at', '<=', now());
            })
            ->where(function ($query) {
                $query->whereNull('ends_at')->orWhere('ends_at', '>=', now());
            })
            ->orderByDesc('priority');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopePosition($query, string $position)
    {
        return $query->where('position', $position);
    }
}
