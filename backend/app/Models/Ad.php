<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

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
        'fraud_score',
        'fraud_flags',
        'last_fraud_check_at',
        'is_catalog_filler',
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
            'fraud_score' => 'float',
            'fraud_flags' => 'array',
            'last_fraud_check_at' => 'datetime',
            'republish_count' => 'integer',
            'is_catalog_filler' => 'boolean',
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

    protected static function booted(): void
    {
        static::saving(function (Ad $ad): void {
            if ($ad->is_catalog_filler) {
                $ad->attributes['expires_at'] = null;
                $ad->attributes['reminder_sent_at'] = null;
            }
        });
    }

    public function setExpiresAtAttribute(mixed $value): void
    {
        if ((bool) ($this->attributes['is_catalog_filler'] ?? false)) {
            $this->attributes['expires_at'] = null;
            return;
        }

        if ($value === null || $value === '') {
            $this->attributes['expires_at'] = null;
            return;
        }

        $expiresAt = Carbon::parse($value);
        $maximumFreeExpiry = self::freshExpiry();

        $this->attributes['expires_at'] = $expiresAt->greaterThan($maximumFreeExpiry)
            ? $maximumFreeExpiry
            : $expiresAt;
    }

    public static function lifetimeDays(): int
    {
        return max(1, (int) config('marketplace.ad_lifetime_days', 7));
    }

    public static function freshExpiry(): Carbon
    {
        return now()->addDays(self::lifetimeDays());
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function moderationDecisions(): HasMany
    {
        return $this->hasMany(AdModerationDecision::class)->latest();
    }

    public function latestModerationDecision(): HasOne
    {
        return $this->hasOne(AdModerationDecision::class)
            ->where('source', 'ai')
            ->where('decision', 'manual_review')
            ->latestOfMany();
    }

    public function contactClicks(): HasMany
    {
        return $this->hasMany(ContactClick::class);
    }
}
