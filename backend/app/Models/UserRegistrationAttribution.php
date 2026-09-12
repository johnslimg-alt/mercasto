<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Campaign attribution captured at registration time (one row per user).
 *
 * @property int $user_id
 * @property string|null $registration_method
 * @property string|null $attribution_source
 * @property string|null $attribution_medium
 * @property string|null $attribution_campaign
 * @property bool $attribution_paid
 * @property string|null $first_touch_campaign
 * @property \Illuminate\Support\Carbon|null $attribution_captured_at
 */
class UserRegistrationAttribution extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'registration_method',
        'attribution_source',
        'attribution_medium',
        'attribution_campaign',
        'attribution_content',
        'attribution_term',
        'attribution_click_platform',
        'attribution_channel',
        'attribution_referrer_host',
        'attribution_paid',
        'attribution_ai_referral',
        'attribution_landing_path',
        'first_touch_source',
        'first_touch_medium',
        'first_touch_campaign',
        'first_touch_content',
        'first_touch_term',
        'first_touch_landing_path',
        'first_touch_paid',
        'attribution_captured_at',
    ];

    protected function casts(): array
    {
        return [
            'attribution_paid' => 'boolean',
            'attribution_ai_referral' => 'boolean',
            'first_touch_paid' => 'boolean',
            'attribution_captured_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
