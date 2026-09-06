#!/usr/bin/env bash
set -euo pipefail
DELETE='backend/app/Http/Controllers/Api/AccountDeletionController.php'
PROFILE='backend/app/Http/Controllers/Api/ProfileController.php'
JOB='backend/app/Jobs/PreScreenKycDocumentWithAI.php'
TEST='backend/tests/Feature/AccountDeletionPrivateDataTest.php'

echo '== Account deletion private-data gate =='
grep -qF "store('kyc_documents', 'local')" "$PROFILE"
grep -qF "Storage::disk('local')->delete(\$user->kyc_document_url)" "$DELETE"
grep -qF "Storage::disk('local')->delete(\$user->business_csf_url)" "$DELETE"
grep -qF "DB::table('messages')->where('sender_id', \$user->id)->orWhere('receiver_id', \$user->id)->delete()" "$DELETE"
grep -qF "DB::table('conversations')->where('buyer_id', \$user->id)->orWhere('seller_id', \$user->id)->delete()" "$DELETE"
grep -qF "DB::table('user_notifications')->where('user_id', \$user->id)->delete()" "$DELETE"
grep -qF 'parseContent($disk->get($user->kyc_document_url))' "$JOB"
test -s "$TEST"
echo 'account deletion private-data gate OK'
