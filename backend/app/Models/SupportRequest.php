<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupportRequest extends Model
{
    use HasFactory;

    public const STATUS_RECEIVED = 'received';
    public const STATUS_IN_REVIEW = 'in_review';
    public const STATUS_WAITING_USER = 'waiting_user';
    public const STATUS_RESOLVED = 'resolved';

    public const STATUSES = [
        self::STATUS_RECEIVED,
        self::STATUS_IN_REVIEW,
        self::STATUS_WAITING_USER,
        self::STATUS_RESOLVED,
    ];

    protected $fillable = [
        'reference',
        'user_id',
        'name',
        'email',
        'subject',
        'message',
        'queue',
        'status',
        'ip_hash',
    ];

    protected $hidden = [
        'ip_hash',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
