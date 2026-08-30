<?php

declare(strict_types=1);

require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

try {
    Illuminate\Support\Facades\DB::select('select 1');
    exit(0);
} catch (Throwable $exception) {
    exit(1);
}
