<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PrivateIdentityStoragePathTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_serialization_hides_private_identity_storage_paths(): void
    {
        $user = User::factory()->create([
            'kyc_document_url' => 'kyc_documents/private-id.pdf',
            'business_csf_url' => 'business-csf/1/private-csf.pdf',
        ]);

        $serialized = $user->fresh()->toArray();

        $this->assertArrayNotHasKey('kyc_document_url', $serialized);
        $this->assertArrayNotHasKey('business_csf_url', $serialized);
    }

    public function test_admin_business_verification_queue_does_not_expose_private_csf_path(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        User::factory()->create([
            'business_rfc_status' => 'ai_flagged',
            'business_csf_url' => 'business-csf/2/private-csf.pdf',
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/business-verifications')
            ->assertOk();

        $this->assertArrayNotHasKey('business_csf_url', $response->json('0'));
    }
}
