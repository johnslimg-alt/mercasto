<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AdBanner extends Model
{
    protected $fillable = [
        'placement_id',
        'title',
        'image_url',
        'link_url',
        'alt_text',
        'description',
        'priority',
        'is_active',
        'starts_at',
        'ends_at',
        'target_categories',
        'target_states',
        'target_user_types',
        'impressions_count',
        'clicks_count',
        'ctr',
        'created_by',
    ];

    protected $casts = [
        'priority' => 'integer',
        'is_active' => 'boolean',
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'target_categories' => 'array',
        'target_states' => 'array',
        'target_user_types' => 'array',
        'impressions_count' => 'integer',
        'clicks_count' => 'integer',
        'ctr' => 'decimal:2',
    ];

    public function placement(): BelongsTo
    {
        return $this->belongsTo(AdPlacement::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function impressions(): HasMany
    {
        return $this->hasMany(BannerImpression::class, 'banner_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('starts_at')->orWhere('starts_at', '<=', now());
            })
            ->where(function ($q) {
                $q->whereNull('ends_at')->orWhere('ends_at', '>=', now());
            });
    }

    public function scopeForPlacement($query, int $placementId)
    {
        return $query->where('placement_id', $placementId);
    }

    public function scopeForCategory($query, ?string $categorySlug)
    {
        if (!$categorySlug) return $query;
        
        return $query->where(function ($q) use ($categorySlug) {
            $q->whereNull('target_categories')
              ->orWhereRaw('JSON_CONTAINS(target_categories, ?)', ['"' . $categorySlug . '"']);
        });
    }

    public function scopeForState($query, ?string $state)
    {
        if (!$state) return $query;
        
        return $query->where(function ($q) use ($state) {
            $q->whereNull('target_states')
              ->orWhereRaw('JSON_CONTAINS(target_states, ?)', ['"' . $state . '"']);
        });
    }

    public function incrementImpressions(): void
    {
        $this->increment('impressions_count');
        $this->updateCtr();
    }

    public function incrementClicks(): void
    {
        $this->increment('clicks_count');
        $this->updateCtr();
    }

    private function updateCtr(): void
    {
        if ($this->impressions_count > 0) {
            $this->ctr = round(($this->clicks_count / $this->impressions_count) * 100, 2);
            $this->saveQuietly();
        }
    }
}
