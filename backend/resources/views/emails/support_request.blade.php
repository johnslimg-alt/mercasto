<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>{{ $reference }}</title>
</head>
<body>
    <h2>Nuevo caso de soporte {{ $reference }}</h2>
    <p><strong>Cola:</strong> {{ $queueName }}</p>
    <p><strong>Asunto:</strong> {{ $requestSubject }}</p>
    <p><strong>Nombre:</strong> {{ $requesterName }}</p>
    <p><strong>Email:</strong> {{ $requesterEmail }}</p>
    <hr>
    <p style="white-space: pre-wrap">{{ $messageBody }}</p>
</body>
</html>
