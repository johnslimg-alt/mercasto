<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'phone_number',
        'phone_verified',
        'avatar_url',
        'bio',
        'city',
        'whatsapp',
        'website',
        'social_instagram',
        'last_active_at',
        'role',
        'plan_code',
        'plan_name',
        'monthly_ad_limit',
        'plan_expires_at',
        'plan_activated_at',
        'ip_address',
        'balance',
        'is_verified',
        'google_id',
        'apple_id',
        'telegram_id',
        'twitter_id',
        'referral_code',
        'referred_by',
        'referral_credits',
        'business_name',
        'business_rfc',
        'business_logo_url',
        'business_banner_url',
        'business_website',
        'business_phone',
        'business_whatsapp',
        'business_hours',
        'business_address',
        'business_description',
        'business_profile_enabled',
        'business_rfc_verified_at',
        'kyc_document_url',
        'kyc_status',
        'preferred_role',
        'preferred_categories',
        'onboarding_completed_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'two_factor_confirmed_at',
        'email_verification_token',
        'pending_email',
        'phone_otp',
        'phone_otp_expires_at',
    ];

    protected $appends = [
        'account_verified',
        'account_verification_methods',
        'active_plan',
        'plan_active',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'two_factor_confirmed_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_secret' => 'encrypted',
            'two_factor_recovery_codes' => 'encrypted',
            'notification_preferences' => 'array',
            'is_verified' => 'boolean',
            'phone_verified' => 'boolean',
            'phone_otp_expires_at' => 'datetime',
            'balance' => 'decimal:2',
            'last_active_at' => 'datetime',
            'plan_expires_at' => 'datetime',
            'plan_activated_at' => 'datetime',
            'monthly_ad_limit' => 'integer',
            'business_hours' => 'array',
            'business_profile_enabled' => 'boolean',
            'business_rfc_verified_at' => 'datetime',
            'preferred_categories' => 'array',
            'onboarding_completed_at' => 'datetime',
        ];
    }

    public function ads(): HasMany
    {
        return $this->hasMany(Ad::class);
    }

    public function getAccountVerifiedAttribute(): bool
    {
        return (bool) (
            $this->email_verified_at
            || $this->phone_verified
            || $this->is_verified
            || $this->kyc_status === 'approved'
        );
    }

    public function getAccountVerificationMethodsAttribute(): array
    {
        return array_values(array_filter([
            $this->email_verified_at ? 'email' : null,
            $this->phone_verified ? 'phone' : null,
            $this->is_verified ? 'admin' : null,
            $this->kyc_status === 'approved' ? 'kyc' : null,
        ]));
    }

    public function getPlanActiveAttribute(): bool
    {
        if ($this->role === 'admin') {
            return true;
        }

        return $this->plan_code !== 'package_free'
            && $this->plan_expires_at
            && $this->plan_expires_at->isFuture();
    }

    public function getActivePlanAttribute(): array
    {
        $isActive = $this->plan_active;

        return [
            'code' => $isActive ? $this->plan_code : 'package_free',
            'name' => $isActive ? $this->plan_name : 'Plan Gratis',
            'monthly_ad_limit' => $isActive ? (int) $this->monthly_ad_limit : 3,
            'expires_at' => $isActive ? $this->plan_expires_at?->toISOString() : null,
            'active' => $isActive,
        ];
    }
}
