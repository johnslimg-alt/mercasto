<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\GamificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use ReflectionMethod;
use Tests\TestCase;

class GamificationPhotoProgressTest extends TestCase
{
    use RefreshDatabase;

    public function test_photo_progress_counts_only_real_listing_images(): void
    {
        $seller = User::factory()->create();
        $other = User::factory()->create();

        foreach (range(1, 5) as $index) {
            $this->insertAd($seller->id, json_encode(["ads/real-{$index}.webp"]), false);
        }
        $this->insertAd($seller->id, json_encode(['ads/generated.webp']), true);
        $this->insertAd($seller->id, '[]', false);
        $this->insertAd($seller->id, null, false);
        $this->insertAd($other->id, json_encode(['ads/other.webp']), false);

        $this->assertSame(5, $this->progress($seller, 'listings_with_photos'));
        $this->assertSame(1, $this->progress($other, 'listings_with_photos'));
    }

    private function insertAd(int $userId, ?string $imageUrl, bool $generatedCover): void
    {
        DB::table('ads')->insert([
            'user_id' => $userId,
            'title' => 'Gamification photo test',
            'price' => 100,
            'category' => 'motor',
            'image_url' => $imageUrl,
            'generated_cover' => $generatedCover,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function progress(User $user, string $type): int
    {
        $method = new ReflectionMethod(GamificationService::class, 'getProgress');
        return $method->invoke(app(GamificationService::class), $user, $type);
    }
}
