<?php

return [
    'model' => env('GEMINI_MODERATION_MODEL', 'gemini-1.5-flash'),
    'approve_confidence' => (float) env('AI_MODERATION_APPROVE_CONFIDENCE', 0.85),
    'reject_confidence' => (float) env('AI_MODERATION_REJECT_CONFIDENCE', 0.90),
];
