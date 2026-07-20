<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Ad extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'title',
        'description',
        'price',
        'old_price',
        'price_dropped_at',
        'location',
        'latitude',
        'longitude',
        'category',
        'subcategory',
        'condition',
        'attributes',
        'image_url',
        'video_url',
        'video_processing_status',
        'status',
        'moderation_submitted_at',
        'ai_moderation_status',
        'ai_moderation_reason',
        'ai_moderation_confidence',
        'ai_moderated_at',
        'generated_cover',
        'promoted',
        'views',
        'expires_at',
        'reminder_sent_at',
        'republished_at',
        'republish_count',
        'boost_type',
        'boost_expires_at',
        'state',
        'city',
    ];

    protected function casts(): array
    {
        return [
            'attributes' => 'array',
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'views' => 'integer',
            'republish_count' => 'integer',
            'expires_at' => 'datetime',
            'reminder_sent_at' => 'datetime',
            'republished_at' => 'datetime',
            'price_dropped_at' => 'datetime',
            'boost_expires_at' => 'datetime',
            'moderation_submitted_at' => 'datetime',
            'ai_moderated_at' => 'datetime',
            'ai_moderation_confidence' => 'decimal:4',
            'generated_cover' => 'boolean',
        ];
    }

    public function setExpiresAtAttribute(mixed $value): void
    {
        if ($value === null || $value === '') {
            $this->attributes['expires_at'] = null;
            return;
        }

        $expiresAt = Carbon::parse($value);
        $maximumFreeExpiry = now()->addDays((int) config('marketplace.ad_lifetime_days', 7));

        $this->attributes['expires_at'] = $expiresAt->greaterThan($maximumFreeExpiry)
            ? $maximumFreeExpiry
            : $expiresAt;
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function moderationDecisions(): HasMany
    {
        return $this->hasMany(AdModerationDecision::class)->latest();
    }

    public function contactClicks(): HasMany
    {
        return $this->hasMany(ContactClick::class);
    }
}
