<!doctype html>
<html lang="en">
<body>
    <h2>Mercasto runtime error</h2>
    <p><strong>Issue:</strong> {{ $friendlyId }}</p>
    <p><strong>Project:</strong> {{ $projectName }}</p>
    <p><strong>Type:</strong> {{ $errorType }}</p>
    <p><strong>Reason:</strong> {{ $alertReason }}</p>
    <p><strong>Stored events:</strong> {{ $eventCount }}</p>
    <p><a href="{{ $issueUrl }}">Open local error tracker</a></p>
    <p>No raw event payload or calculated error value is included in this email.</p>
</body>
</html>
