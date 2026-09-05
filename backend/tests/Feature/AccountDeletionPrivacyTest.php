<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AccountDeletionPrivacyTest extends TestCase
{
    use RefreshDatabase;

    public function test_self_delete_removes_private_identity_files_and_user_communications(): void
    {
        Storage::fake('local');
        Storage::disk('local')->put('kyc_documents/private-id.pdf', 'private');
        Storage::disk('local')->put('business-csf/1/private-csf.pdf', 'private');

        $user = User::factory()->create();
        $user->forceFill([
            'kyc_document_url' => 'kyc_documents/private-id.pdf',
            'business_csf_url' => 'business-csf/1/private-csf.pdf',
        ])->save();
        $other = User::factory()->create();

        $conversationId = DB::table('conversations')->insertGetId([
            'ad_id' => null,
            'buyer_id' => $user->id,
            'seller_id' => $other->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('messages')->insert([
            'conversation_id' => $conversationId,
            'sender_id' => $user->id,
            'receiver_id' => $other->id,
            'ad_id' => null,
            'content' => 'private message',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('search_alerts')->insert([
            'user_id' => $user->id,
            'name' => 'private alert',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('saved_searches')->insert([
            'user_id' => $user->id,
            'name' => 'private saved search',
            'filters' => json_encode(['query' => 'car']),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($user, 'sanctum')->deleteJson('/api/user')->assertOk();

        Storage::disk('local')->assertMissing('kyc_documents/private-id.pdf');
        Storage::disk('local')->assertMissing('business-csf/1/private-csf.pdf');
        $this->assertDatabaseMissing('messages', ['sender_id' => $user->id]);
        $this->assertDatabaseMissing('conversations', ['buyer_id' => $user->id]);
        $this->assertDatabaseMissing('search_alerts', ['user_id' => $user->id]);
        $this->assertDatabaseMissing('saved_searches', ['user_id' => $user->id]);
        $this->assertDatabaseMissing('users', ['id' => $user->id]);
    }
}
