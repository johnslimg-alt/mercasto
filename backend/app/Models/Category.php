<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    protected $fillable = ['slug', 'name', 'icon', 'sort_order'];

    // Автоматическое преобразование JSON колонки name в массив
    protected $casts = [
        'name' => 'array',
    ];
}