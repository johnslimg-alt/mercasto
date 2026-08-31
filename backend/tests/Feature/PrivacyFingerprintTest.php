<?php

namespace Tests\Feature;

use App\Support\PrivacyFingerprint;
use InvalidArgumentException;
use RuntimeException;
use Tests\TestCase;

class PrivacyFingerprintTest extends TestCase
{
    public function test_ip_fingerprint_is_keyed_deterministic_and_scope_separated(): void
    {
        config(['app.key' => 'base64:' . base64_encode(str_repeat('k', 32))]);

        $first = PrivacyFingerprint::ip('203.0.113.42', 'ad-view');
        $second = PrivacyFingerprint::ip('203.0.113.42', 'ad-view');
        $otherScope = PrivacyFingerprint::ip('203.0.113.42', 'ad-click');

        $this->assertSame($first, $second);
        $this->assertNotSame($first, $otherScope);
        $this->assertMatchesRegularExpression('/^[0-9a-f]{64}$/', $first);
        $this->assertStringNotContainsString('203.0.113.42', $first);
    }

    public function test_ip_fingerprint_can_fit_legacy_45_character_columns(): void
    {
        config(['app.key' => 'base64:' . base64_encode(str_repeat('k', 32))]);

        $fingerprint = PrivacyFingerprint::ip('2001:db8::42', 'contact-click', 45);

        $this->assertMatchesRegularExpression('/^[0-9a-f]{45}$/', $fingerprint);
    }

    public function test_blank_ip_returns_null_and_invalid_configuration_fails_closed(): void
    {
        config(['app.key' => 'base64:' . base64_encode(str_repeat('k', 32))]);
        $this->assertNull(PrivacyFingerprint::ip('  ', 'ad-view'));

        $this->expectException(InvalidArgumentException::class);
        PrivacyFingerprint::ip('203.0.113.42', '');
    }

    public function test_missing_application_key_fails_closed(): void
    {
        config(['app.key' => '']);

        $this->expectException(RuntimeException::class);
        PrivacyFingerprint::ip('203.0.113.42', 'ad-view');
    }

    public function test_legacy_sha_is_available_only_as_match_compatibility(): void
    {
        $legacy = PrivacyFingerprint::legacySha256('203.0.113.42');

        $this->assertSame(hash('sha256', '203.0.113.42'), $legacy);
        $this->assertNull(PrivacyFingerprint::legacySha256(''));
    }
}
