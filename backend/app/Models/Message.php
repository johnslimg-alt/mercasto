<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Message extends Model {
    protected $fillable = ['sender_id', 'receiver_id', 'ad_id', 'content', 'is_read'];
    protected $casts = ['is_read' => 'boolean'];
    
    public function sender() { return $this->belongsTo(User::class, 'sender_id'); }
    public function receiver() { return $this->belongsTo(User::class, 'receiver_id'); }
    public function ad() { return $this->belongsTo(Ad::class, 'ad_id'); }
}
