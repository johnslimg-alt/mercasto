#!/usr/bin/env bash
set -euo pipefail
C="backend/app/Http/Controllers/Api/AccountDeletionController.php"
echo "== Account deletion privacy gate =="
grep -qF "Storage::disk('local')->delete(\$privatePath)" "$C"
grep -qF "DB::table('messages')->where('sender_id', \$user->id)->orWhere('receiver_id', \$user->id)->delete()" "$C"
grep -qF "DB::table('conversations')->where('buyer_id', \$user->id)->orWhere('seller_id', \$user->id)->delete()" "$C"
grep -qF "DB::table('search_alerts')->where('user_id', \$user->id)->delete()" "$C"
grep -qF "DB::table('saved_searches')->where('user_id', \$user->id)->delete()" "$C"
grep -qF "DB::table('payments')->where('user_id', \$user->id)->update(['user_id' => null])" "$C"
echo "account deletion privacy gate OK"
