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
        'latitude',
        'longitude',
        'category',
        'condition',
        'attributes',
        'image_url',
        'video_url',
        'video_processing_status',
        'status',
        'promoted',
        'views',
        'expires_at',
        'republished_at',
        'republish_count',
        'boost_type',
        'boost_expires_at',
        'state',
    ];

    protected function casts(): array
    {
        return [
            'attributes' => 'array',
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'views' => 'integer',
            'republish_count' => 'integer',
            'expires_at' => 'datetime',
            'republished_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
