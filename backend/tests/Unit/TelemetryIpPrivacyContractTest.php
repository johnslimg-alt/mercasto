<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class TelemetryIpPrivacyContractTest extends TestCase
{
    public function test_internal_telemetry_persists_scoped_fingerprints_not_raw_ips(): void
    {
        $ad = file_get_contents(__DIR__ . '/../../app/Http/Controllers/Api/AdController.php');
        $banner = file_get_contents(__DIR__ . '/../../app/Http/Controllers/Api/AdBannerController.php');
        $email = file_get_contents(__DIR__ . '/../../app/Models/EmailTracking.php');

        $this->assertStringContainsString("PrivacyFingerprint::ip(\$clientIp, 'ad-view')", $ad);
        $this->assertStringContainsString("PrivacyFingerprint::ip(\$clientIp, 'ad-impression')", $ad);
        $this->assertStringContainsString("PrivacyFingerprint::ip(\$clientIp, 'ad-click')", $ad);
        $this->assertStringContainsString("PrivacyFingerprint::ip(\$ip, 'contact-click', 45)", $ad);
        $this->assertStringContainsString("'ip_address' => \$ipFingerprint", $ad);

        $this->assertStringContainsString("PrivacyFingerprint::ip(\$request->ip(), 'banner-impression')", $banner);
        $this->assertStringNotContainsString("'ip_address' => \$request->ip()", $banner);
        $this->assertStringNotContainsString("'ip' => \$request->ip()", $banner);

        $this->assertStringContainsString("PrivacyFingerprint::ip(\$ip, 'email-tracking')", $email);
        $this->assertStringNotContainsString("'ip_address' => \$ip,", $email);
    }

    public function test_legacy_identifiers_are_match_only_and_never_new_persistence_values(): void
    {
        $ad = file_get_contents(__DIR__ . '/../../app/Http/Controllers/Api/AdController.php');

        $this->assertStringContainsString('PrivacyFingerprint::legacySha256($clientIp)', $ad);
        $this->assertStringContainsString("->whereIn('ip_address', \$clientIpCandidates)", $ad);
        $this->assertStringNotContainsString("'ip_address' => PrivacyFingerprint::legacySha256", $ad);
    }
}
