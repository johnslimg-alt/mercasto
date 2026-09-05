<?php

namespace Tests\Feature;

use App\Jobs\PreScreenKycDocumentWithAI;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class KycAiPrescreenTest extends TestCase
{
    use RefreshDatabase;

    public function test_kyc_upload_queues_local_ai_prescreen_without_auto_approving_identity(): void
    {
        Storage::fake('local');
        Queue::fake();
        config([
            'services.ollama.base_url' => 'http://ollama.test',
            'services.ollama.chat_model' => 'qwen3-vl:4b-instruct',
        ]);
        Http::fake([
            'http://ollama.test/api/chat' => Http::response([
                'model' => 'qwen3-vl:4b-instruct',
                'message' => ['role' => 'assistant', 'content' => json_encode([
                    'verdict' => 'pass',
                    'notes' => 'Documento legible sin alertas técnicas visibles.',
                ])],
            ]),
        ]);

        $user = User::factory()->create(['is_verified' => false, 'kyc_status' => 'unverified']);
        $this->actingAs($user, 'sanctum');
        $response = $this->post('/api/user/kyc', [
            'document' => UploadedFile::fake()->image('identidad.jpg', 900, 600),
        ]);
        $response->assertOk();
        $this->assertArrayNotHasKey('kyc_document_url', $response->json('user'));
        Queue::assertPushed(PreScreenKycDocumentWithAI::class, fn ($job) => $job->userId === $user->id);

        $user->refresh();
        $this->assertSame('pending', $user->kyc_status);
        $this->assertSame('queued', $user->getRawOriginal('kyc_ai_status'));
        $this->assertFalse((bool) $user->is_verified);

        app()->call([new PreScreenKycDocumentWithAI($user->id), 'handle']);
        $user->refresh();
        $this->assertSame('pending', $user->kyc_status);
        $this->assertSame('pass', $user->getRawOriginal('kyc_ai_status'));
        $this->assertFalse((bool) $user->is_verified);
    }

    public function test_admin_identity_queue_exposes_prescreen_notes_without_exposing_document_path(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        User::factory()->create([
            'kyc_status' => 'pending', 'kyc_document_url' => 'kyc_documents/private-id.jpg',
            'kyc_ai_status' => 'manual_review', 'kyc_ai_notes' => 'Imagen recortada.',
            'kyc_ai_checked_at' => now(),
        ]);
        $this->actingAs($admin, 'sanctum');

        $response = $this->getJson('/api/admin/kyc')->assertOk();
        $response->assertJsonPath('data.0.kyc_ai_status', 'manual_review');
        $response->assertJsonPath('data.0.kyc_ai_notes', 'Imagen recortada.');
        $this->assertArrayNotHasKey('kyc_document_url', $response->json('data.0'));
    }
}
