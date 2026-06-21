<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WaitlistEmail extends Model
{
    use HasFactory;

    protected $fillable = [
        'email',
        'name',
        'source',
        'invited',
        'invited_at',
        'invited_by',
        'notes',
        'referral_code',
        'position',
    ];

    protected $casts = [
        'invited' => 'boolean',
        'invited_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($waitlist) {
            if (!$waitlist->position) {
                $waitlist->position = static::max('position') + 1;
            }
            if (!$waitlist->referral_code) {
                $waitlist->referral_code = strtoupper(substr(md5(uniqid()), 0, 8));
            }
        });
    }

    public function markAsInvited($invitedBy = null)
    {
        $this->update([
            'invited' => true,
            'invited_at' => now(),
            'invited_by' => $invitedBy,
        ]);

        // Создаем запись в whitelist
        InviteWhitelist::create([
            'email' => $this->email,
            'invite_code' => $this->referral_code,
            'created_by' => $invitedBy,
        ]);
    }
}
