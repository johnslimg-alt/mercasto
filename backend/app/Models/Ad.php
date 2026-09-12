<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class Ad extends Model
{
    use HasFactory;

    /**
     * Canonical moderation status meaning "human/model review finished favourably
     * AND the ad is publicly visible".
     *
     * Hard invariant: an ad whose `ai_moderation_status` is this value MUST have
     * `status = 'active'`. Approval outcomes that must not be published yet are
     * stored as MODERATION_REACTIVATION_PENDING instead, so that the combination
     * "approved but invisible" is not representable by any code path.
     */
    public const MODERATION_APPROVED = 'approved';

    /**
     * Approval that has been granted but must not publish until the seller
     * confirms the listing is still available. This deliberately is NOT
     * MODERATION_APPROVED: it keeps "approved" a synonym for "visible".
     */
    public const MODERATION_REACTIVATION_PENDING = 'reactivation_pending';

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

    /**
     * Resolve the complete persisted attribute set for an approval outcome.
     *
     * This is the single source of truth for what approval means. It structurally
     * cannot return MODERATION_APPROVED together with a hidden status, which is
     * what previously left approved ads stranded in `archived` forever.
     *
     * It deliberately includes the publication lifetime, because activation must
     * never be a status-only change: the shared indexability contract used by the
     * sitemap generator and the SEO shell requires a real, future `expires_at`,
     * so an "active" ad without one would be published yet still invisible to
     * search engines. Every publishing path uses the same `Ad::freshExpiry()`
     * helper as the legitimate seller/admin publish flow.
     *
     * @return array{status: string, ai_moderation_status: string, expires_at: Carbon|null, reminder_sent_at: null}
     */
    public static function approvalOutcome(bool $publishNow): array
    {
        return $publishNow
            ? [
                'status' => 'active',
                'ai_moderation_status' => self::MODERATION_APPROVED,
                'expires_at' => self::freshExpiry(),
                'reminder_sent_at' => null,
            ]
            : [
                'status' => 'archived',
                'ai_moderation_status' => self::MODERATION_REACTIVATION_PENDING,
                'expires_at' => null,
                'reminder_sent_at' => null,
            ];
    }

    /**
     * Ad is approved and therefore expected to be publicly visible.
     */
    public function isApprovedAndVisible(): bool
    {
        return $this->ai_moderation_status === self::MODERATION_APPROVED
            && $this->status === 'active';
    }

    /**
     * Query scope for real ads that claim approval while remaining hidden, i.e.
     * ads the moderation pipeline hid but never republished. This must always
     * return zero rows, and it is exactly the set that reconciliation repairs.
     *
     * Catalog fillers are excluded because they are placeholders that may
     * legitimately sit hidden, and ads that still hold remaining listing time
     * (expires_at not null) are excluded because a seller archived those
     * deliberately. It exists so reconciliation and tests can detect any
     * violation of the visibility invariant.
     */
    public function scopeApprovedButHidden(Builder $query): Builder
    {
        return $query
            ->where('is_catalog_filler', false)
            ->where('ai_moderation_status', self::MODERATION_APPROVED)
            ->where('status', '!=', 'active')
            ->whereNull('expires_at');
    }

    public function scopeSellerConfirmationPending(Builder $query): Builder
    {
        return $query
            ->where('is_catalog_filler', false)
            ->where('status', 'archived')
            ->whereIn('ai_moderation_status', [
                self::MODERATION_REACTIVATION_PENDING,
                self::MODERATION_APPROVED,
            ])
            ->whereNull('expires_at')
            ->whereHas('latestDecision', function (Builder $decisionQuery): void {
                $decisionQuery
                    ->where('decision', 'approved')
                    ->where('metadata->activation_mode', 'seller_confirmation_required')
                    ->where(function (Builder $freshDecision): void {
                        $freshDecision
                            ->whereNull('ads.republished_at')
                            ->orWhereColumn('ad_moderation_decisions.created_at', '>', 'ads.republished_at');
                    });
            });
    }

    public function isSellerConfirmationReactivationEligible(): bool
    {
        // MODERATION_APPROVED is accepted for rows written before the
        // reactivation_pending status existed; reconciliation moves those to
        // `active`, after which this branch is unreachable.
        if ($this->status !== 'archived'
            || ! in_array(
                (string) $this->ai_moderation_status,
                [self::MODERATION_REACTIVATION_PENDING, self::MODERATION_APPROVED],
                true
            )
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
