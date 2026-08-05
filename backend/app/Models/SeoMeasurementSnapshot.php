<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SeoMeasurementSnapshot extends Model
{
    protected $fillable = [
        'period_start',
        'period_end',
        'generated_at',
        'external_complete',
        'report',
    ];

    protected function casts(): array
    {
        return [
            'period_start' => 'date',
            'period_end' => 'date',
            'generated_at' => 'datetime',
            'external_complete' => 'boolean',
            'report' => 'array',
        ];
    }
}
