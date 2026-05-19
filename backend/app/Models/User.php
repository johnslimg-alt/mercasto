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
        'ip_address',
        'balance',
        'is_verified',
        'google_id',
        'apple_id',
        'telegram_id',
        'referral_code',
        'referred_by',
        'referral_credits',
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
        ];
    }

    public function ads(): HasMany
    {
        return $this->hasMany(Ad::class);
    }
}
