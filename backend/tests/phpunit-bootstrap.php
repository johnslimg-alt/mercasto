<?php

declare(strict_types=1);

$requiredEnvironment = [
    'APP_ENV' => 'testing',
    'DB_CONNECTION' => 'sqlite',
    'DB_DATABASE' => ':memory:',
    'DB_URL' => '',
    'CACHE_STORE' => 'array',
    'QUEUE_CONNECTION' => 'sync',
    'SESSION_DRIVER' => 'array',
];

foreach ($requiredEnvironment as $name => $expected) {
    $actual = getenv($name);
    $actual = $actual === false ? '' : (string) $actual;

    if ($actual !== $expected) {
        throw new RuntimeException(sprintf(
            'Unsafe PHPUnit environment: %s must be %s, got %s.',
            $name,
            var_export($expected, true),
            var_export($actual, true),
        ));
    }
}

$configCache = (string) getenv('APP_CONFIG_CACHE');
$productionConfigCache = dirname(__DIR__) . '/bootstrap/cache/config.php';
$normalizePath = static fn (string $path): string => str_replace('\\', '/', rtrim($path, '/'));

if ($configCache === '') {
    throw new RuntimeException('Unsafe PHPUnit environment: APP_CONFIG_CACHE must use an isolated test path.');
}

if ($normalizePath($configCache) === $normalizePath($productionConfigCache)) {
    throw new RuntimeException('Unsafe PHPUnit environment: production config cache cannot be loaded by tests.');
}

if (is_file($configCache)) {
    throw new RuntimeException('Unsafe PHPUnit environment: isolated test config cache path must not exist.');
}

require dirname(__DIR__) . '/vendor/autoload.php';
