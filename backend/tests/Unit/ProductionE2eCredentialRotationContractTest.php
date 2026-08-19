<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class ProductionE2eCredentialRotationContractTest extends TestCase
{
    public function test_rotation_command_is_production_only_and_never_embeds_the_fixture_password(): void
    {
        $source = file_get_contents(__DIR__.'/../../app/Console/Commands/SecureProductionE2eCredentials.php');

        $this->assertStringContainsString("environment('production')", $source);
        $this->assertStringContainsString("getenv('E2E_SELLER_PASSWORD')", $source);
        $this->assertStringContainsString('strlen($sellerPassword) < 32', $source);
        $this->assertStringContainsString('hash_equals($default, $sellerPassword)', $source);
        $this->assertStringContainsString('Hash::check($default, $admin->password)', $source);
        $this->assertStringContainsString('Str::password(64)', $source);
        $this->assertStringContainsString('$seller->tokens()->delete()', $source);
        $this->assertStringContainsString('$admin->tokens()->delete()', $source);
        $this->assertStringNotContainsString('E2eTestPass99!', $source);
    }

    public function test_deploy_passes_the_seller_secret_ephemerally_and_rechecks_the_live_contract(): void
    {
        $workflow = file_get_contents(__DIR__.'/../../../.github/workflows/deploy-selfhosted.yml');

        $this->assertStringContainsString('E2E_SELLER_PASSWORD: ${{ secrets.E2E_SELLER_PASSWORD }}', $workflow);
        $this->assertStringContainsString('-e E2E_SELLER_PASSWORD="$E2E_SELLER_PASSWORD"', $workflow);
        $this->assertStringContainsString('php artisan mercasto:secure-production-e2e-credentials', $workflow);
        $this->assertStringContainsString('bash scripts/production-e2e-account-security-smoke.sh', $workflow);
        $this->assertStringNotContainsString('E2E_SELLER_PASSWORD=$E2E_SELLER_PASSWORD" >>', $workflow);
    }
}
