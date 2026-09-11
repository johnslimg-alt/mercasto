<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class MobilePushReadinessCommandTest extends TestCase
{
    use RefreshDatabase;

    private function withoutPushConfiguration(): void
    {
        config()->set('services.firebase.service_account_base64', null);
        config()->set('services.huawei_push.app_id', null);
        config()->set('services.huawei_push.app_secret', null);
    }

    private function withFcmCredentials(string $privateKey = "-----BEGIN PRIVATE KEY-----\nSUPERSECRETMATERIAL\n-----END PRIVATE KEY-----\n"): void
    {
        config()->set('services.firebase.service_account_base64', base64_encode(json_encode([
            'project_id' => 'mercasto-test',
            'client_email' => 'push@mercasto-test.iam.gserviceaccount.com',
            'private_key' => $privateKey,
        ])));
        config()->set('services.huawei_push.app_id', 'hms-app-id');
        config()->set('services.huawei_push.app_secret', 'HMS-SECRET-MATERIAL');
    }

    private function registerToken(string $provider = 'fcm'): void
    {
        $token = 'device-token-' . $provider;

        DB::table('mobile_push_tokens')->insert([
            'user_id' => User::factory()->create()->id,
            'provider' => $provider,
            'platform' => $provider === 'fcm' ? 'android' : 'huawei',
            'token' => $token,
            'token_hash' => hash('sha256', $token),
            'created_at' => now(),
            'updated_at' => now(),
            'last_seen_at' => now(),
        ]);
    }

    public function test_not_ready_when_credentials_and_tokens_are_missing(): void
    {
        $this->withoutPushConfiguration();

        $this->artisan('mobile:push-readiness')
            ->expectsOutputToContain('MOBILE_PUSH_READINESS=NOT_READY')
            ->expectsOutputToContain('FIREBASE_SERVICE_ACCOUNT_BASE64 is not configured')
            ->expectsOutputToContain('No device tokens are registered')
            ->assertExitCode(1);
    }

    public function test_ready_when_credentials_and_an_fcm_token_exist(): void
    {
        $this->withFcmCredentials();
        $this->registerToken('fcm');

        $this->artisan('mobile:push-readiness')
            ->expectsOutputToContain('MOBILE_PUSH_READINESS=READY')
            ->assertExitCode(0);
    }

    public function test_huawei_only_tokens_are_reported_as_unroutable(): void
    {
        $this->withFcmCredentials();
        $this->registerToken('hms');

        $this->artisan('mobile:push-readiness')
            ->expectsOutputToContain('Registered tokens have no handler')
            ->assertExitCode(1);
    }

    public function test_command_never_prints_credential_material(): void
    {
        $this->withFcmCredentials();
        $this->registerToken('fcm');

        Artisan::call('mobile:push-readiness', ['--json' => true]);
        $output = Artisan::output();

        $this->assertStringNotContainsString('SUPERSECRETMATERIAL', $output);
        $this->assertStringNotContainsString('HMS-SECRET-MATERIAL', $output);
        $this->assertStringContainsString('mercasto-test', $output);
        $this->assertStringContainsString('"ready":true', $output);
    }
}
