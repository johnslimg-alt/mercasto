<?php

namespace App\Http\Middleware;

use App\Services\ListingQualityPreflightService;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Symfony\Component\HttpFoundation\Response;

class ValidateBulkListingQuality
{
    private const MISSING_LETTER_ERRORS = [
        'title_missing_letters',
        'description_missing_letters',
    ];

    public function __construct(private ListingQualityPreflightService $preflight)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->isMethod('post')
            || ! $request->is('api/ads/bulk-upload')
            || ! $request->hasFile('file')
            || ! $request->user('sanctum')) {
            return $next($request);
        }

        $file = $request->file('file');
        if ($file === null) {
            return $next($request);
        }

        $path = $file->getRealPath();
        if ($path === false) {
            return $next($request);
        }

        $extension = strtolower($file->getClientOriginalExtension());
        $invalid = match ($extension) {
            'xml' => $this->firstInvalidXmlRow($path),
            'xlsx' => $this->firstInvalidXlsxRow($path),
            'csv', 'txt' => $this->firstInvalidCsvRow($path),
            default => null,
        };

        if ($invalid === null) {
            return $next($request);
        }

        return new JsonResponse([
            'message' => 'Listing quality preflight failed.',
            'quality_preflight' => [
                'passes_hard_validation' => false,
                'errors' => $invalid['errors'],
                'warnings' => [],
            ],
            'bulk_row' => $invalid['row'],
        ], Response::HTTP_UNPROCESSABLE_ENTITY);
    }

    private function firstInvalidXmlRow(string $path): ?array
    {
        $reader = new \XMLReader();
        if (! $reader->open($path, null, LIBXML_NONET | LIBXML_COMPACT)) {
            return null;
        }

        $row = 0;
        try {
            while ($reader->read()) {
                if ($reader->nodeType !== \XMLReader::ELEMENT || $reader->name !== 'ad') {
                    continue;
                }

                $row++;
                $xml = $reader->readOuterXml();
                if ($xml === '') {
                    continue;
                }

                $node = new \SimpleXMLElement($xml, LIBXML_NONET);
                $errors = $this->missingLetterErrors(
                    (string) $node->title,
                    (string) $node->description,
                );
                if ($errors !== []) {
                    return ['row' => $row, 'errors' => $errors];
                }

                $reader->next();
            }
        } finally {
            $reader->close();
        }

        return null;
    }

    private function firstInvalidXlsxRow(string $path): ?array
    {
        $reader = IOFactory::createReader('Xlsx');
        $reader->setReadDataOnly(true);
        $spreadsheet = $reader->load($path);

        try {
            $worksheet = $spreadsheet->getActiveSheet();
            $rowNumber = 0;
            foreach ($worksheet->getRowIterator() as $row) {
                $rowNumber++;
                if ($rowNumber === 1) {
                    continue;
                }

                $cellIterator = $row->getCellIterator();
                $cellIterator->setIterateOnlyExistingCells(false);
                $cells = [];
                foreach ($cellIterator as $cell) {
                    $cells[] = trim((string) $cell->getValue());
                }

                if (count($cells) < 3 || $cells[0] === '') {
                    continue;
                }

                $errors = $this->missingLetterErrors($cells[0], $cells[2]);
                if ($errors !== []) {
                    return ['row' => $rowNumber, 'errors' => $errors];
                }
            }
        } finally {
            $spreadsheet->disconnectWorksheets();
            unset($spreadsheet);
        }

        return null;
    }

    private function firstInvalidCsvRow(string $path): ?array
    {
        $handle = @fopen($path, 'rb');
        if ($handle === false) {
            return null;
        }

        try {
            $rowNumber = 1;
            fgetcsv($handle);
            while (($row = fgetcsv($handle)) !== false) {
                $rowNumber++;
                if (count($row) < 3 || trim((string) $row[0]) === '') {
                    continue;
                }

                $errors = $this->missingLetterErrors((string) $row[0], (string) $row[2]);
                if ($errors !== []) {
                    return ['row' => $rowNumber, 'errors' => $errors];
                }
            }
        } finally {
            fclose($handle);
        }

        return null;
    }

    private function missingLetterErrors(string $title, string $description): array
    {
        $result = $this->preflight->evaluate([
            'title' => $title,
            'description' => $description,
            'price' => 1,
            'category' => 'general',
            'photo_count' => 1,
        ]);

        return array_values(array_intersect($result['errors'], self::MISSING_LETTER_ERRORS));
    }
}
