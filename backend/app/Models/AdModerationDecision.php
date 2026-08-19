<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdModerationDecision extends Model
{
    protected $fillable = [
        'ad_id',
        'source',
        'decision',
        'reason',
        'confidence',
        'moderator_id',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'confidence' => 'decimal:4',
            'metadata' => 'array',
        ];
    }

    protected function reason(): Attribute
    {
        return Attribute::make(
            get: function ($value, array $attributes) {
                $reason = trim((string) $value);
                $metadata = json_decode((string) ($attributes['metadata'] ?? ''), true);
                $policyIds = is_array($metadata)
                    ? array_values(array_filter((array) data_get($metadata, 'policy_review.policy_ids', [])))
                    : [];

                if ($policyIds === []) {
                    return $reason;
                }

                return trim($reason . ' · Policy: ' . implode(', ', $policyIds));
            },
        );
    }

    public function ad(): BelongsTo
    {
        return $this->belongsTo(Ad::class);
    }

    public function moderator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'moderator_id');
    }
}
