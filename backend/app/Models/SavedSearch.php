<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SavedSearch extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'filters',
        'alerts_enabled',
        'last_checked_at',
        'new_results_count',
    ];

    protected $casts = [
        'filters' => 'array',
        'alerts_enabled' => 'boolean',
        'last_checked_at' => 'datetime',
        'new_results_count' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeWithAlerts($query)
    {
        return $query->where('alerts_enabled', true);
    }

    public function incrementNewResults(): void
    {
        $this->increment('new_results_count');
    }

    public function resetNewResults(): void
    {
        $this->update(['new_results_count' => 0, 'last_checked_at' => now()]);
    }
}
