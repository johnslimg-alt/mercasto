<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AccountDeletionPrivateDataTest extends TestCase
{
    use RefreshDatabase;

    public function test_account_deletion_removes_private_identity_files_chats_messages_and_reminders(): void
    {
        Storage::fake('local');
        Storage::fake('s3');
        Storage::fake('public');
        config(['filesystems.default' => 's3']);

        $user = User::factory()->create();
        $other = User::factory()->create();
        $kyc = 'kyc_documents/id.pdf';
        $csf = "business-csf/{$user->id}/csf.pdf";
        $user->forceFill(['kyc_document_url' => $kyc, 'business_csf_url' => $csf])->save();
        Storage::disk('local')->put($kyc, 'local-copy');
        Storage::disk('s3')->put($kyc, 'legacy-copy');
        Storage::disk('local')->put($csf, 'csf');

        $conversation = Conversation::create(['buyer_id' => $user->id, 'seller_id' => $other->id]);
        Message::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $user->id,
            'receiver_id' => $other->id,
            'content' => 'private message',
        ]);
        DB::table('user_notifications')->insert([
            'user_id' => $user->id,
            'title' => 'Reminder',
            'message' => 'Reminder body',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($user, 'sanctum')->deleteJson('/api/user')->assertOk();

        Storage::disk('local')->assertMissing($kyc);
        Storage::disk('s3')->assertMissing($kyc);
        Storage::disk('local')->assertMissing($csf);
        $this->assertDatabaseMissing('messages', ['sender_id' => $user->id]);
        $this->assertDatabaseMissing('conversations', ['buyer_id' => $user->id]);
        $this->assertDatabaseMissing('user_notifications', ['user_id' => $user->id]);
        $this->assertDatabaseMissing('users', ['id' => $user->id]);
    }
}
