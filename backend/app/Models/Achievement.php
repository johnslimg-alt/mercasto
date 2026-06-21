<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Achievement extends Model
{
    protected $fillable = [
        'slug', 'name', 'description', 'icon', 'category',
        'rarity', 'xp_reward', 'requirement_type', 'requirement_value',
        'is_active', 'sort_order'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'xp_reward' => 'integer',
        'requirement_value' => 'integer',
    ];

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_achievements')
            ->withPivot('progress', 'unlocked', 'unlocked_at')
            ->withTimestamps();
    }

    public function getRarityColorAttribute(): string
    {
        return match($this->rarity) {
            'common' => '#94a3b8',
            'rare' => '#3b82f6',
            'epic' => '#a855f7',
            'legendary' => '#f59e0b',
            default => '#94a3b8'
        };
    }

    public function getRarityBgAttribute(): string
    {
        return match($this->rarity) {
            'common' => 'bg-slate-100 border-slate-300',
            'rare' => 'bg-blue-50 border-blue-300',
            'epic' => 'bg-purple-50 border-purple-300',
            'legendary' => 'bg-amber-50 border-amber-300',
            default => 'bg-slate-100 border-slate-300'
        };
    }

    public static function getLevels(): array
    {
        return [
            1 => ['name' => 'Newcomer', 'min_xp' => 0, 'icon' => '🌱'],
            2 => ['name' => 'Explorer', 'min_xp' => 100, 'icon' => '🔍'],
            3 => ['name' => 'Trader', 'min_xp' => 300, 'icon' => '🤝'],
            4 => ['name' => 'Insider', 'min_xp' => 600, 'icon' => '⭐'],
            5 => ['name' => 'Veteran', 'min_xp' => 1200, 'icon' => '🏅'],
            6 => ['name' => 'VIP', 'min_xp' => 2500, 'icon' => '💎'],
            7 => ['name' => 'Ambassador', 'min_xp' => 5000, 'icon' => '👑'],
            8 => ['name' => 'Legend', 'min_xp' => 10000, 'icon' => '🏆'],
        ];
    }

    public static function getLevelForXp(int $xp): array
    {
        $levels = self::getLevels();
        $currentLevel = 1;
        $currentData = $levels[1];

        foreach ($levels as $level => $data) {
            if ($xp >= $data['min_xp']) {
                $currentLevel = $level;
                $currentData = $data;
            }
        }

        $nextLevel = $currentLevel + 1;
        $nextData = $levels[$nextLevel] ?? null;

        return [
            'level' => $currentLevel,
            'name' => $currentData['name'],
            'icon' => $currentData['icon'],
            'current_xp' => $xp,
            'min_xp' => $currentData['min_xp'],
            'next_level' => $nextLevel,
            'next_min_xp' => $nextData['min_xp'] ?? null,
            'next_name' => $nextData['name'] ?? null,
            'progress' => $nextData ? round(($xp - $currentData['min_xp']) / ($nextData['min_xp'] - $currentData['min_xp']) * 100) : 100,
        ];
    }
}
