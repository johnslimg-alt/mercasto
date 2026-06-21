<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InviteWhitelist extends Model
{
    use HasFactory;

    protected $table = 'invite_whitelist';

    protected $fillable = [
        'email',
        'invite_code',
        'used',
        'used_by_user_id',
        'used_at',
        'created_by',
        'notes',
    ];

    protected $casts = [
        'used' => 'boolean',
        'used_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($invite) {
            if (!$invite->invite_code) {
                $invite->invite_code = strtoupper(substr(md5(uniqid() . $invite->email), 0, 10));
            }
        });
    }

    public function markAsUsed($userId)
    {
        $this->update([
            'used' => true,
            'used_by_user_id' => $userId,
            'used_at' => now(),
        ]);
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'used_by_user_id');
    }

    public static function isValidCode($code)
    {
        return static::where('invite_code', $code)
            ->where('used', false)
            ->exists();
    }

    public static function isEmailWhitelisted($email)
    {
        return static::where('email', $email)
            ->where('used', false)
            ->exists();
    }
}
