<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChatControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_sending_a_message_creates_a_conversation_and_delivers_it()
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();

        $response = $this->actingAs($buyer, 'sanctum')->postJson('/api/messages', [
            'receiver_id' => $seller->id,
            'content' => 'Hola, sigue disponible?',
        ]);

        $response->assertStatus(200)->assertJsonFragment(['content' => 'Hola, sigue disponible?']);

        $inbox = $this->actingAs($seller, 'sanctum')->getJson('/api/conversations');
        $inbox->assertStatus(200)->assertJsonFragment(['name' => $buyer->name, 'unread_count' => 1]);
    }

    /**
     * Regression test: sendMessage() used to derive buyer/seller roles from who was
     * sending vs. receiving on each call (instead of from a stable identity for the
     * pair), so every reply without an ad_id created a brand new Conversation row
     * instead of continuing the existing thread.
     */
    public function test_replies_without_an_ad_id_reuse_the_same_conversation()
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();

        $this->actingAs($userA, 'sanctum')->postJson('/api/messages', [
            'receiver_id' => $userB->id,
            'content' => 'Mensaje 1',
        ])->assertStatus(200);

        $this->actingAs($userB, 'sanctum')->postJson('/api/messages', [
            'receiver_id' => $userA->id,
            'content' => 'Mensaje 2',
        ])->assertStatus(200);

        $this->actingAs($userA, 'sanctum')->postJson('/api/messages', [
            'receiver_id' => $userB->id,
            'content' => 'Mensaje 3',
        ])->assertStatus(200);

        $this->assertEquals(1, \App\Models\Conversation::count());

        $inboxA = $this->actingAs($userA, 'sanctum')->getJson('/api/conversations');
        $inboxA->assertStatus(200)->assertJsonCount(1);
    }

    public function test_conversation_can_be_scoped_to_an_ad()
    {
        Category::create(['slug' => 'electronica', 'name' => ['es' => 'Electrónica', 'en' => 'Electronics'], 'icon' => 'Monitor']);
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $ad = Ad::create([
            'user_id' => $seller->id,
            'title' => 'iPhone 14',
            'price' => 12000,
            'description' => 'Como nuevo',
            'category' => 'electronica',
            'condition' => 'usado',
            'status' => 'active',
            'location' => 'CDMX',
        ]);

        $response = $this->actingAs($buyer, 'sanctum')->postJson('/api/messages', [
            'receiver_id' => $seller->id,
            'content' => 'Me interesa tu iPhone',
            'ad_id' => $ad->id,
        ]);

        $response->assertStatus(200)->assertJsonFragment(['ad_id' => $ad->id]);
    }

    public function test_a_user_cannot_read_a_conversation_they_are_not_part_of()
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $outsider = User::factory()->create();

        $this->actingAs($buyer, 'sanctum')->postJson('/api/messages', [
            'receiver_id' => $seller->id,
            'content' => 'Hola',
        ])->assertStatus(200);

        $response = $this->actingAs($outsider, 'sanctum')->getJson("/api/conversations/{$buyer->id}/messages");
        $response->assertStatus(200)->assertJsonCount(0);
    }
}
