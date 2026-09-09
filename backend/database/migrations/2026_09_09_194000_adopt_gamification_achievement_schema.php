<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('achievements')) {
            return;
        }

        $legacySchema = Schema::hasColumn('achievements', 'key')
            || Schema::hasColumn('achievements', 'name_es')
            || Schema::hasColumn('achievements', 'requirement');

        if ($legacySchema) {
            $this->adoptLegacySchema();
        }

        foreach (['slug', 'name', 'description', 'icon', 'category', 'rarity', 'xp_reward', 'requirement_type', 'requirement_value', 'is_active', 'sort_order'] as $column) {
            if (! Schema::hasColumn('achievements', $column)) {
                throw new \RuntimeException("Gamification achievement schema is missing required column: {$column}");
            }
        }

        $this->ensureCanonicalAchievements($legacySchema);
    }

    private function adoptLegacySchema(): void
    {
        $renames = [
            'key' => 'slug',
            'name_es' => 'name',
            'description_es' => 'description',
            'requirement' => 'requirement_value',
        ];

        foreach ($renames as $from => $to) {
            if (Schema::hasColumn('achievements', $from) && ! Schema::hasColumn('achievements', $to)) {
                Schema::table('achievements', fn (Blueprint $table) => $table->renameColumn($from, $to));
            }
        }

        Schema::table('achievements', function (Blueprint $table) {
            if (! Schema::hasColumn('achievements', 'is_active')) {
                $table->boolean('is_active')->default(true);
            }
            if (! Schema::hasColumn('achievements', 'sort_order')) {
                $table->integer('sort_order')->default(0);
            }
        });

        $driver = DB::connection()->getDriverName();
        if ($driver === 'pgsql') {
            // Convert the legacy integer rarity column before writing canonical string values.
            // This matters for non-empty legacy PostgreSQL databases; fresh empty databases
            // would otherwise hide the ordering bug.
            DB::statement("ALTER TABLE achievements ALTER COLUMN rarity TYPE varchar(255) USING rarity::varchar");
            DB::statement("ALTER TABLE achievements ALTER COLUMN rarity SET DEFAULT 'common'");
            DB::statement('ALTER TABLE achievements ALTER COLUMN xp_reward SET DEFAULT 100');
            DB::statement('ALTER INDEX IF EXISTS achievements_key_unique RENAME TO achievements_slug_unique');
        }

        DB::table('achievements')->orderBy('id')->get(['id', 'rarity'])->each(function ($row): void {
            $rarity = match ((string) $row->rarity) {
                '1', 'common' => 'common',
                '2', 'rare' => 'rare',
                '3', 'epic' => 'epic',
                default => 'legendary',
            };
            DB::table('achievements')->where('id', $row->id)->update([
                'rarity' => $rarity,
                'sort_order' => $row->id,
            ]);
        });

        $legacyColumns = ['name_en', 'name_pt', 'description_en', 'description_pt', 'is_secret'];
        $toDrop = array_values(array_filter($legacyColumns, fn (string $column): bool => Schema::hasColumn('achievements', $column)));
        if ($toDrop !== []) {
            Schema::table('achievements', fn (Blueprint $table) => $table->dropColumn($toDrop));
        }
    }

    private function ensureCanonicalAchievements(bool $updateExisting): void
    {
        foreach ($this->canonicalAchievements() as $definition) {
            if ($updateExisting) {
                DB::table('achievements')->updateOrInsert(['slug' => $definition['slug']], $definition);
            } else {
                DB::table('achievements')->insertOrIgnore($definition);
            }
        }
    }

    private function canonicalAchievements(): array
    {
        return [
            ['slug' => 'first_blood', 'name' => 'First Blood', 'description' => 'Publica tu primer anuncio', 'icon' => '🎯', 'category' => 'listing', 'rarity' => 'common', 'xp_reward' => 50, 'requirement_type' => 'listings_count', 'requirement_value' => 1, 'is_active' => true, 'sort_order' => 1],
            ['slug' => 'power_seller', 'name' => 'Power Seller', 'description' => 'Publica 10 anuncios', 'icon' => '💪', 'category' => 'listing', 'rarity' => 'rare', 'xp_reward' => 200, 'requirement_type' => 'listings_count', 'requirement_value' => 10, 'is_active' => true, 'sort_order' => 2],
            ['slug' => 'market_master', 'name' => 'Market Master', 'description' => 'Publica 50 anuncios', 'icon' => '👑', 'category' => 'listing', 'rarity' => 'epic', 'xp_reward' => 500, 'requirement_type' => 'listings_count', 'requirement_value' => 50, 'is_active' => true, 'sort_order' => 3],
            ['slug' => 'photographer', 'name' => 'Photographer', 'description' => 'Publica 5 anuncios con fotos', 'icon' => '📸', 'category' => 'listing', 'rarity' => 'common', 'xp_reward' => 100, 'requirement_type' => 'listings_with_photos', 'requirement_value' => 5, 'is_active' => true, 'sort_order' => 4],
            ['slug' => 'inviter', 'name' => 'Inviter', 'description' => 'Invita 3 amigos', 'icon' => '🤝', 'category' => 'referral', 'rarity' => 'common', 'xp_reward' => 150, 'requirement_type' => 'referrals_count', 'requirement_value' => 3, 'is_active' => true, 'sort_order' => 5],
            ['slug' => 'networker', 'name' => 'Networker', 'description' => 'Invita 10 amigos', 'icon' => '🌐', 'category' => 'referral', 'rarity' => 'rare', 'xp_reward' => 300, 'requirement_type' => 'referrals_count', 'requirement_value' => 10, 'is_active' => true, 'sort_order' => 6],
            ['slug' => 'referral_king', 'name' => 'Referral King', 'description' => 'Invita 25 amigos', 'icon' => '🏆', 'category' => 'referral', 'rarity' => 'epic', 'xp_reward' => 750, 'requirement_type' => 'referrals_count', 'requirement_value' => 25, 'is_active' => true, 'sort_order' => 7],
            ['slug' => 'viral_legend', 'name' => 'Viral Legend', 'description' => 'Invita 100 amigos', 'icon' => '🚀', 'category' => 'referral', 'rarity' => 'legendary', 'xp_reward' => 2000, 'requirement_type' => 'referrals_count', 'requirement_value' => 100, 'is_active' => true, 'sort_order' => 8],
            ['slug' => 'streak_3', 'name' => 'Getting Started', 'description' => '3 días seguidos activo', 'icon' => '🔥', 'category' => 'activity', 'rarity' => 'common', 'xp_reward' => 75, 'requirement_type' => 'streak_days', 'requirement_value' => 3, 'is_active' => true, 'sort_order' => 9],
            ['slug' => 'streak_7', 'name' => 'Week Warrior', 'description' => '7 días seguidos activo', 'icon' => '⚡', 'category' => 'activity', 'rarity' => 'rare', 'xp_reward' => 200, 'requirement_type' => 'streak_days', 'requirement_value' => 7, 'is_active' => true, 'sort_order' => 10],
            ['slug' => 'streak_30', 'name' => 'Monthly Master', 'description' => '30 días seguidos activo', 'icon' => '💎', 'category' => 'activity', 'rarity' => 'epic', 'xp_reward' => 500, 'requirement_type' => 'streak_days', 'requirement_value' => 30, 'is_active' => true, 'sort_order' => 11],
            ['slug' => 'streak_100', 'name' => 'Centurion', 'description' => '100 días seguidos activo', 'icon' => '🏛️', 'category' => 'activity', 'rarity' => 'legendary', 'xp_reward' => 1500, 'requirement_type' => 'streak_days', 'requirement_value' => 100, 'is_active' => true, 'sort_order' => 12],
            ['slug' => 'first_review', 'name' => 'First Review', 'description' => 'Recibe tu primera reseña', 'icon' => '⭐', 'category' => 'social', 'rarity' => 'common', 'xp_reward' => 100, 'requirement_type' => 'reviews_count', 'requirement_value' => 1, 'is_active' => true, 'sort_order' => 13],
            ['slug' => 'trusted_seller', 'name' => 'Trusted Seller', 'description' => 'Recibe 5 reseñas de 5 estrellas', 'icon' => '🌟', 'category' => 'social', 'rarity' => 'rare', 'xp_reward' => 300, 'requirement_type' => 'five_star_reviews', 'requirement_value' => 5, 'is_active' => true, 'sort_order' => 14],
            ['slug' => 'early_adopter', 'name' => 'Early Adopter', 'description' => 'Uno de los primeros 100 usuarios', 'icon' => '🎁', 'category' => 'milestone', 'rarity' => 'epic', 'xp_reward' => 500, 'requirement_type' => 'user_position', 'requirement_value' => 100, 'is_active' => true, 'sort_order' => 15],
            ['slug' => 'pioneer', 'name' => 'Pioneer', 'description' => 'Uno de los primeros 1000 usuarios', 'icon' => '🗺️', 'category' => 'milestone', 'rarity' => 'rare', 'xp_reward' => 250, 'requirement_type' => 'user_position', 'requirement_value' => 1000, 'is_active' => true, 'sort_order' => 16],
        ];
    }

    public function down(): void
    {
        // Adoption migration: do not destructively restore the obsolete achievement schema.
    }
};
