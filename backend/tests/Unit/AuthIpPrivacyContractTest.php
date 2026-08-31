<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class AuthIpPrivacyContractTest extends TestCase
{
    public function test_registration_paths_use_scoped_keyed_ip_fingerprints(): void
    {
        $auth = file_get_contents(__DIR__ . '/../../app/Http/Controllers/Api/AuthController.php');

        $this->assertSame(3, substr_count(
            $auth,
            "PrivacyFingerprint::ip(\$request->ip(), 'registration-account', 45)"
        ));
        $this->assertStringContainsString(
            "PrivacyFingerprint::ip(\$rawIp, 'registration-account', 45)",
            $auth
        );
        $this->assertStringContainsString(
            "PrivacyFingerprint::ip(\$request->ip(), 'registration-consent')",
            $auth
        );
        $this->assertStringNotContainsString(
            "substr(hash('sha256', \$request->ip()), 0, 45)",
            $auth
        );
        $this->assertStringNotContainsString(
            "hash('sha256', (string) \$request->ip())",
            $auth
        );
    }

    public function test_registration_abuse_limit_keeps_legacy_read_compatibility_only(): void
    {
        $auth = file_get_contents(__DIR__ . '/../../app/Http/Controllers/Api/AuthController.php');

        $this->assertStringContainsString("PrivacyFingerprint::legacySha256(\$rawIp)", $auth);
        $this->assertStringContainsString("User::whereIn('ip_address', \$ipCandidates)", $auth);
        $this->assertStringContainsString("\$ipCandidates = array_values(array_unique(array_filter([\$ip, \$legacyIp, \$rawIp])))", $auth);
        $this->assertStringNotContainsString("\$user->ip_address = \$legacyIp", $auth);
        $this->assertStringNotContainsString("\$user->ip_address = \$rawIp", $auth);
    }
}
