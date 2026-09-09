<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->boolean('email_case_legacy_exempt')->default(false);
        });

        $driver = DB::getDriverName();
        if ($driver === 'pgsql') {
            $this->preparePostgres();
            return;
        }

        if ($driver === 'sqlite') {
            $this->prepareSqlite();
        }
    }

    public function down(): void
    {
        $driver = DB::getDriverName();
        if ($driver === 'pgsql') {
            DB::unprepared('DROP TRIGGER IF EXISTS users_email_case_promote_legacy ON users');
            DB::unprepared('DROP TRIGGER IF EXISTS users_email_case_reset_exemption ON users');
            DB::unprepared('DROP FUNCTION IF EXISTS mercasto_promote_legacy_email_identity()');
            DB::unprepared('DROP FUNCTION IF EXISTS mercasto_reset_email_legacy_exemption()');
        } elseif ($driver === 'sqlite') {
            DB::unprepared('DROP TRIGGER IF EXISTS users_email_case_promote_legacy_delete');
            DB::unprepared('DROP TRIGGER IF EXISTS users_email_case_promote_legacy_update');
            DB::unprepared('DROP TRIGGER IF EXISTS users_email_case_reset_exemption');
        }

        DB::statement('DROP INDEX IF EXISTS users_email_case_insensitive_unique');
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('email_case_legacy_exempt'));
    }

    private function preparePostgres(): void
    {
        DB::unprepared(<<<'SQL'
WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY LOWER(BTRIM(email))
               ORDER BY (email = LOWER(email)) DESC, id ASC
           ) AS rn
    FROM users
)
UPDATE users AS u
SET email_case_legacy_exempt = TRUE
FROM ranked AS r
WHERE u.id = r.id AND r.rn > 1;
SQL);

        DB::statement('CREATE UNIQUE INDEX users_email_case_insensitive_unique ON users (LOWER(BTRIM(email))) WHERE email_case_legacy_exempt = FALSE');

        DB::unprepared(<<<'SQL'
CREATE OR REPLACE FUNCTION mercasto_reset_email_legacy_exemption()
RETURNS trigger AS $$
BEGIN
    IF NEW.email IS DISTINCT FROM OLD.email THEN
        NEW.email_case_legacy_exempt := FALSE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_email_case_reset_exemption
BEFORE UPDATE OF email ON users
FOR EACH ROW EXECUTE FUNCTION mercasto_reset_email_legacy_exemption();
SQL);

        DB::unprepared(<<<'SQL'
CREATE OR REPLACE FUNCTION mercasto_promote_legacy_email_identity()
RETURNS trigger AS $$
DECLARE
    old_key text;
BEGIN
    old_key := LOWER(BTRIM(OLD.email));
    IF OLD.email_case_legacy_exempt = FALSE
       AND (TG_OP = 'DELETE' OR old_key IS DISTINCT FROM LOWER(BTRIM(NEW.email))) THEN
        UPDATE users
        SET email_case_legacy_exempt = FALSE
        WHERE id = (
            SELECT id
            FROM users
            WHERE email_case_legacy_exempt = TRUE
              AND LOWER(BTRIM(email)) = old_key
            ORDER BY (email = LOWER(email)) DESC, id ASC
            LIMIT 1
        );
    END IF;
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_email_case_promote_legacy
AFTER DELETE OR UPDATE OF email ON users
FOR EACH ROW EXECUTE FUNCTION mercasto_promote_legacy_email_identity();
SQL);
    }

    private function prepareSqlite(): void
    {
        DB::unprepared(<<<'SQL'
UPDATE users
SET email_case_legacy_exempt = 1
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY LOWER(TRIM(email))
                   ORDER BY (email = LOWER(email)) DESC, id ASC
               ) AS rn
        FROM users
    ) ranked
    WHERE rn > 1
);
SQL);

        DB::statement('CREATE UNIQUE INDEX users_email_case_insensitive_unique ON users (LOWER(TRIM(email))) WHERE email_case_legacy_exempt = 0');

        DB::unprepared(<<<'SQL'
CREATE TRIGGER users_email_case_reset_exemption
AFTER UPDATE OF email ON users
WHEN NEW.email IS NOT OLD.email
BEGIN
    UPDATE users SET email_case_legacy_exempt = 0 WHERE id = NEW.id;
END;

CREATE TRIGGER users_email_case_promote_legacy_delete
AFTER DELETE ON users
WHEN OLD.email_case_legacy_exempt = 0
BEGIN
    UPDATE users
    SET email_case_legacy_exempt = 0
    WHERE id = (
        SELECT id FROM users
        WHERE email_case_legacy_exempt = 1
          AND LOWER(TRIM(email)) = LOWER(TRIM(OLD.email))
        ORDER BY (email = LOWER(email)) DESC, id ASC
        LIMIT 1
    );
END;

CREATE TRIGGER users_email_case_promote_legacy_update
AFTER UPDATE OF email ON users
WHEN OLD.email_case_legacy_exempt = 0
 AND LOWER(TRIM(OLD.email)) <> LOWER(TRIM(NEW.email))
BEGIN
    UPDATE users
    SET email_case_legacy_exempt = 0
    WHERE id = (
        SELECT id FROM users
        WHERE email_case_legacy_exempt = 1
          AND LOWER(TRIM(email)) = LOWER(TRIM(OLD.email))
        ORDER BY (email = LOWER(email)) DESC, id ASC
        LIMIT 1
    );
END;
SQL);
    }
};
