<?php
$data = json_decode(file_get_contents('php://input'), true);
file_put_contents('/tmp/frontend-errors.log', date('Y-m-d H:i:s') . ' - ' . json_encode($data) . "\n", FILE_APPEND);
header('Content-Type: application/json');
echo json_encode(['ok' => true]);
