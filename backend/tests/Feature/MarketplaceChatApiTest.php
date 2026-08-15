<?php

namespace Tests\Feature;

use App\Events\MessageSent;
use App\Jobs\SendHuaweiPushNotification;
use App\Jobs\SendMobilePushNotification;
use App\Jobs\SendWebPushNotification;
use App\Jobs\SendTelegramMessageNotification;
use App\Models\Ad;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class MarketplaceChatApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Event::fake([MessageSent::class]);
        Queue::fake();
    }

    public function test_chat_routes_require_authentication(): void
    {
        $this->getJson('/api/chat/conversations')->assertUnauthorized();
        $this->postJson('/api/chat/messages', [
            'receiver_id' => 1,
            'ad_id' => 1,
            'content' => 'Hola',
        ])->assertUnauthorized();
    }

    public function test_buyer_can_start_a_conversation_with_the_ad_seller(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $ad = $this->createAd($seller);

        $response = $this->actingAs($buyer, 'sanctum')->postJson('/api/chat/messages', [
            'receiver_id' => $seller->id,
            'ad_id' => $ad->id,
            'content' => '¿Sigue disponible?',
        ]);

        $response->assertOk()
            ->assertJsonPath('sender_id', $buyer->id)
            ->assertJsonPath('receiver_id', $seller->id)
            ->assertJsonPath('ad_id', $ad->id)
            ->assertJsonPath('content', '¿Sigue disponible?');

        $conversation = Conversation::query()->sole();
        $this->assertSame($buyer->id, $conversation->buyer_id);
        $this->assertSame($seller->id, $conversation->seller_id);
        $this->assertSame(1, $conversation->seller_unread_count);

        $this->assertDatabaseHas('messages', [
            'conversation_id' => $conversation->id,
            'sender_id' => $buyer->id,
            'receiver_id' => $seller->id,
            'ad_id' => $ad->id,
            'content' => '¿Sigue disponible?',
            'body' => '¿Sigue disponible?',
        ]);
        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $seller->id,
            'title' => $buyer->name,
            'message' => '¿Sigue disponible?',
            'is_read' => false,
            'type' => 'message',
            'link' => "/mensajes?conversation={$conversation->id}",
        ]);

        Event::assertDispatched(MessageSent::class);
        Queue::assertPushed(SendTelegramMessageNotification::class, fn ($job) =>
            $job->recipientId === $seller->id && $job->senderId === $buyer->id
        );
        Queue::assertPushed(SendMobilePushNotification::class, fn ($job) =>
            $job->userId === $seller->id
            && ($job->data['type'] ?? null) === 'message'
            && ($job->data['conversation_id'] ?? null) === $conversation->id
            && ($job->data['listing_id'] ?? null) === $ad->id
        );
        Queue::assertPushed(SendHuaweiPushNotification::class, fn ($job) =>
            $job->userId === $seller->id
            && ($job->data['type'] ?? null) === 'message'
            && ($job->data['conversation_id'] ?? null) === $conversation->id
            && ($job->data['listing_id'] ?? null) === $ad->id
        );
        Queue::assertPushed(SendWebPushNotification::class, fn ($job) =>
            $job->userId === $seller->id
            && ($job->data['type'] ?? null) === 'message'
            && ($job->data['conversation_id'] ?? null) === $conversation->id
            && ($job->data['url'] ?? null) === "/mensajes?conversation={$conversation->id}"
        );
    }

    public function test_unread_message_notifications_coalesce_per_conversation_and_clear_on_read(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $ad = $this->createAd($seller);

        foreach (['Primer mensaje', 'Segundo mensaje'] as $content) {
            $this->actingAs($buyer, 'sanctum')->postJson('/api/chat/messages', [
                'receiver_id' => $seller->id,
                'ad_id' => $ad->id,
                'content' => $content,
            ])->assertOk();
        }

        $conversation = Conversation::query()->sole();
        $this->assertSame(2, $conversation->fresh()->seller_unread_count);
        $this->assertDatabaseCount('user_notifications', 1);
        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $seller->id,
            'message' => 'Segundo mensaje',
            'is_read' => false,
            'type' => 'message',
            'link' => "/mensajes?conversation={$conversation->id}",
        ]);

        $this->actingAs($seller, 'sanctum')
            ->getJson("/api/chat/conversations/{$conversation->id}/messages")
            ->assertOk();

        $this->assertSame(0, $conversation->fresh()->seller_unread_count);
        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $seller->id,
            'type' => 'message',
            'link' => "/mensajes?conversation={$conversation->id}",
            'is_read' => true,
        ]);
    }

    public function test_buyer_cannot_redirect_an_ad_message_to_an_unrelated_user(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $unrelated = User::factory()->create();
        $ad = $this->createAd($seller);

        $this->actingAs($buyer, 'sanctum')->postJson('/api/chat/messages', [
            'receiver_id' => $unrelated->id,
            'ad_id' => $ad->id,
            'content' => 'Mensaje desviado',
        ])->assertUnprocessable();

        $this->assertDatabaseCount('conversations', 0);
        $this->assertDatabaseCount('messages', 0);
        Queue::assertNothingPushed();
    }

    public function test_seller_cannot_start_a_cold_conversation_for_an_ad(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $ad = $this->createAd($seller);

        $this->actingAs($seller, 'sanctum')->postJson('/api/chat/messages', [
            'receiver_id' => $buyer->id,
            'ad_id' => $ad->id,
            'content' => 'Mensaje no solicitado',
        ])->assertForbidden();

        $this->assertDatabaseCount('conversations', 0);
        $this->assertDatabaseCount('messages', 0);
    }

    public function test_seller_can_reply_after_the_buyer_starts_the_conversation(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $ad = $this->createAd($seller);

        $this->actingAs($buyer, 'sanctum')->postJson('/api/chat/messages', [
            'receiver_id' => $seller->id,
            'ad_id' => $ad->id,
            'content' => 'Hola',
        ])->assertOk();

        $conversation = Conversation::query()->sole();

        $this->actingAs($seller, 'sanctum')->postJson('/api/chat/messages', [
            'receiver_id' => $buyer->id,
            'ad_id' => $ad->id,
            'content' => 'Sí, está disponible',
        ])->assertOk()->assertJsonPath('conversation_id', $conversation->id);

        $this->assertDatabaseCount('conversations', 1);
        $this->assertDatabaseCount('messages', 2);
        $this->assertSame(1, $conversation->fresh()->buyer_unread_count);
    }

    public function test_only_participants_can_read_and_reading_resets_their_unread_count(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $outsider = User::factory()->create();
        $ad = $this->createAd($seller);

        $this->actingAs($buyer, 'sanctum')->postJson('/api/chat/messages', [
            'receiver_id' => $seller->id,
            'ad_id' => $ad->id,
            'content' => 'Hola',
        ])->assertOk();
        $conversation = Conversation::query()->sole();

        $this->actingAs($seller, 'sanctum')->postJson('/api/chat/messages', [
            'receiver_id' => $buyer->id,
            'ad_id' => $ad->id,
            'content' => 'Respuesta',
        ])->assertOk();

        $this->actingAs($outsider, 'sanctum')
            ->getJson("/api/chat/conversations/{$conversation->id}/messages")
            ->assertForbidden();

        $response = $this->actingAs($buyer, 'sanctum')
            ->getJson("/api/chat/conversations/{$conversation->id}/messages");

        $response->assertOk()
            ->assertJsonPath('conversation.conversation_id', $conversation->id)
            ->assertJsonCount(2, 'messages');

        $this->assertSame(0, $conversation->fresh()->buyer_unread_count);
        $reply = Message::query()->where('sender_id', $seller->id)->sole();
        $this->assertNotNull($reply->fresh()->read_at);
        $this->assertTrue($reply->fresh()->is_read);
    }

    private function createAd(User $seller): Ad
    {
        return Ad::query()->create([
            'user_id' => $seller->id,
            'title' => 'Bicicleta urbana',
            'description' => 'Lista para rodar.',
            'price' => 3500,
            'location' => 'Guadalajara',
            'category' => 'deportes',
            'status' => 'active',
        ]);
    }
}
