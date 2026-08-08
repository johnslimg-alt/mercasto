<?php

namespace Tests\Feature;

use App\Services\FirebaseCloudMessaging;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class MobilePushServiceConfigTest extends TestCase
{
    public function test_native_push_services_are_exposed_in_services_config(): void
    {
        $services = config('services');

        $this->assertArrayHasKey('firebase', $services);
        $this->assertArrayHasKey('service_account_base64', $services['firebase']);
        $this->assertArrayHasKey('huawei_push', $services);
        $this->assertArrayHasKey('app_id', $services['huawei_push']);
        $this->assertArrayHasKey('app_secret', $services['huawei_push']);
    }

    public function test_fcm_is_a_safe_noop_without_server_credentials(): void
    {
        config(['services.firebase.service_account_base64' => null]);
        Http::fake();

        app(FirebaseCloudMessaging::class)->sendToUser(
            999999,
            'Test title',
            'Test body',
        );

        Http::assertNothingSent();
    }
}
