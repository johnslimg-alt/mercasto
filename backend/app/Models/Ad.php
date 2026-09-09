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

    private const CATEGORY_ATTRIBUTE_STORAGE_ALIASES = [
        'brand' => ['marca'],
        'model' => ['modelo'],
        'kms' => ['km'],
        'fuel' => ['combustible'],
        'property_type' => ['tipo'],
        'rooms' => ['habitaciones'],
        'bathrooms' => ['banos'],
        'area' => ['m2'],
        'contract_type' => ['contrato'],
        'working_hours' => ['tipo_empleo'],
        'salary' => ['salario'],
    ];

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

    public static function categoryAttributeStorageKeys(string $key): array
    {
        return array_values(array_unique([
            $key,
            ...(self::CATEGORY_ATTRIBUTE_STORAGE_ALIASES[$key] ?? []),
        ]));
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

            if ($lookup === []) {
                continue;
            }

            foreach (self::categoryAttributeStorageKeys((string) $definition->key) as $storageKey) {
                if (! array_key_exists($storageKey, $listingAttributes)) {
                    continue;
                }

                $listingAttributes[$storageKey] = self::canonicalizeCategoryAttributeValue(
                    $listingAttributes[$storageKey],
                    $lookup
                );
            }
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

    public function latestDecision(): HasOne
    {
        return $this->hasOne(AdModerationDecision::class)->latestOfMany();
    }

    public function isSellerConfirmationReactivationEligible(): bool
    {
        if ($this->status !== 'archived'
            || $this->ai_moderation_status !== 'approved'
            || $this->is_catalog_filler
            || $this->expires_at !== null) {
            return false;
        }

        $decision = $this->relationLoaded('latestDecision')
            ? $this->getRelation('latestDecision')
            : $this->latestDecision()->first();

        if (! $decision
            || $decision->decision !== 'approved'
            || data_get($decision->metadata, 'activation_mode') !== 'seller_confirmation_required') {
            return false;
        }

        if ($this->republished_at === null) {
            return true;
        }

        return $decision->created_at !== null
            && $decision->created_at->gt($this->republished_at);
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
