<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

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

            if (! $ad->isDirty('attributes') && ! $ad->isDirty('category')) {
                return;
            }

            $listingAttributes = $ad->getAttribute('attributes');
            if (! is_array($listingAttributes) || $listingAttributes === []) {
                return;
            }

            $ad->setAttribute(
                'attributes',
                self::canonicalizeCategoryAttributeValues($ad->getAttribute('category'), $listingAttributes)
            );
        });
    }

    public static function canonicalizeCategoryAttributeValues(?string $category, array $listingAttributes): array
    {
        $category = trim((string) $category);
        if ($category === '' || ! Schema::hasTable('categories') || ! Schema::hasTable('category_attributes')) {
            return $listingAttributes;
        }

        $definitions = DB::table('category_attributes')
            ->join('categories', 'categories.id', '=', 'category_attributes.category_id')
            ->where('categories.slug', $category)
            ->whereNotNull('category_attributes.options')
            ->get(['category_attributes.key', 'category_attributes.options']);

        foreach ($definitions as $definition) {
            if (! array_key_exists($definition->key, $listingAttributes)) {
                continue;
            }

            $options = is_string($definition->options)
                ? json_decode($definition->options, true)
                : $definition->options;
            if (! is_array($options)) {
                continue;
            }

            $lookup = [];
            foreach ($options as $option) {
                if (! is_array($option) || ! isset($option['value'])) {
                    continue;
                }

                $canonical = trim((string) $option['value']);
                if ($canonical === '') {
                    continue;
                }
                $lookup[mb_strtolower($canonical, 'UTF-8')] = $canonical;

                $labels = is_array($option['label'] ?? null)
                    ? $option['label']
                    : [$option['label'] ?? null];
                foreach ($labels as $label) {
                    if (is_scalar($label)) {
                        $lookup[mb_strtolower(trim((string) $label), 'UTF-8')] = $canonical;
                    }
                }
            }

            $listingAttributes[$definition->key] = self::canonicalizeCategoryAttributeValue(
                $listingAttributes[$definition->key],
                $lookup
            );
        }

        return $listingAttributes;
    }

    private static function canonicalizeCategoryAttributeValue(mixed $value, array $lookup): mixed
    {
        if (is_array($value)) {
            return array_map(
                static fn ($item) => self::canonicalizeCategoryAttributeValue($item, $lookup),
                $value
            );
        }

        if (! is_scalar($value)) {
            return $value;
        }

        $current = trim((string) $value);
        return $lookup[mb_strtolower($current, 'UTF-8')] ?? $value;
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
