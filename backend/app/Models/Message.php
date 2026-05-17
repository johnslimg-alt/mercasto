<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Message extends Model {
    protected $fillable = [
        'conversation_id',
        'sender_id',
        'receiver_id',
        'ad_id',
        'content',
        'body',
        'type',
        'offer_amount',
        'is_read',
        'read_at',
    ];

    protected $casts = [
        'is_read' => 'boolean',
        'read_at' => 'datetime',
        'offer_amount' => 'decimal:2',
    ];
    
    public function sender() { return $this->belongsTo(User::class, 'sender_id'); }
    public function receiver() { return $this->belongsTo(User::class, 'receiver_id'); }
    public function ad() { return $this->belongsTo(Ad::class, 'ad_id'); }
    public function conversation() { return $this->belongsTo(Conversation::class); }

    public function getContentAttribute($value) { return $value ?? ($this->attributes['body'] ?? null); }
    public function getBodyAttribute($value) { return $value ?? ($this->attributes['content'] ?? null); }
}
