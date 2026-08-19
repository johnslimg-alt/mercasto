<?php

namespace Tests\Unit;

use App\Services\ListingPolicyMatrixService;
use App\Services\ListingPolicySignalService;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class AIModerationSyntheticPolicyFixturesTest extends TestCase
{
    private function service(): ListingPolicySignalService
    {
        return new ListingPolicySignalService(
            new ListingPolicyMatrixService(require __DIR__ . '/../../config/listing_policy.php'),
            require __DIR__ . '/../../config/listing_policy_terms.php',
        );
    }

    public static function policyCases(): array
    {
        return [
            'allowed bicycle' => [
                'Bicicleta urbana rodada 29',
                'Usada en buen estado con factura.',
                [],
            ],
            'allowed heat gun tool' => [
                'Pistola de calor industrial',
                'Herramienta usada para taller.',
                [],
            ],
            'weapon' => [
                'Pistola seminueva',
                'Entrega local.',
                ['weapons_ammunition_explosives'],
            ],
            'weapon plural' => [
                'Armas de fuego',
                'Lote disponible.',
                ['weapons_ammunition_explosives'],
            ],
            'controlled product' => [
                'Medicamento controlado',
                'Caja sellada disponible.',
                ['controlled_drugs_and_medicines'],
            ],
            'adult exploitative service' => [
                'Servicios sexuales',
                'Contacto directo.',
                ['adult_exploitative_content_services'],
            ],
            'fraud-like offer' => [
                'Fraude de anticipo',
                'Pago por adelantado para liberar el producto.',
                ['spam_fraud_impersonation_offplatform_abuse'],
            ],
        ];
    }

    #[DataProvider('policyCases')]
    public function test_synthetic_policy_fixture(
        string $title,
        string $description,
        array $expectedPolicyIds,
    ): void {
        $assessment = $this->service()->assessListing(compact('title', 'description'));

        sort($expectedPolicyIds);
        $actual = $assessment['policy_ids'];
        sort($actual);
        $this->assertSame($expectedPolicyIds, $actual);
        $this->assertSame($expectedPolicyIds !== [], $assessment['requires_manual_review']);
        $this->assertNull($assessment['authoritative_action']);
    }
}
