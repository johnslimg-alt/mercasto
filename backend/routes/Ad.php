<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Ad extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'title',
        'description',
        'price',
        'old_price',
        'location',
        'category',
        'image_url',
        'status',
        'expires_at',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}