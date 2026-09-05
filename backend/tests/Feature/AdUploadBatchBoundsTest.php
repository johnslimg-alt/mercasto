<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdUploadBatchBoundsTest extends TestCase
{
    use RefreshDatabase;

    public function test_rejected_update_does_not_delete_existing_images_before_total_count_validation(): void
    {
        Storage::fake('public');
        Category::create(['slug' => 'hogar', 'name' => ['es' => 'Hogar'], 'icon' => 'Home']);
        $user = User::factory()->create();
        $currentImages = collect(range(1, 10))->map(fn (int $i) => "ads/existing-{$i}.jpg")->all();
        foreach ($currentImages as $path) {
            Storage::disk('public')->put($path, 'existing-image');
        }

        $ad = Ad::create([
            'user_id' => $user->id,
            'title' => 'Mueble',
            'description' => 'Mueble usado',
            'price' => 1000,
            'location' => 'Veracruz',
            'city' => 'Veracruz',
            'state' => 'Veracruz',
            'category' => 'hogar',
            'subcategory' => 'Muebles',
            'condition' => 'usado',
            'attributes' => ['subcategory' => 'Muebles'],
            'image_url' => json_encode($currentImages),
            'status' => 'active',
        ]);

        $response = $this->actingAs($user, 'sanctum')->post("/api/ads/{$ad->id}", [
            '_method' => 'PUT',
            'title' => 'Mueble',
            'description' => 'Mueble usado',
            'price' => 1000,
            'location' => 'Veracruz',
            'city' => 'Veracruz',
            'state' => 'Veracruz',
            'category' => 'hogar',
            'subcategory' => 'Muebles',
            'condition' => 'usado',
            'attributes' => ['subcategory' => 'Muebles'],
            'existing_images' => array_slice($currentImages, 0, 9),
            'images' => [
                UploadedFile::fake()->image('new-1.jpg', 640, 480),
                UploadedFile::fake()->image('new-2.jpg', 640, 480),
            ],
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('images');
        Storage::disk('public')->assertExists('ads/existing-10.jpg');
    }
}
