<?php

namespace App\Support;

final class SqlLikePattern
{
    public const ESCAPE_CHARACTER = '!';

    public static function escape(string $value): string
    {
        return strtr($value, [
            self::ESCAPE_CHARACTER => self::ESCAPE_CHARACTER.self::ESCAPE_CHARACTER,
            '%' => self::ESCAPE_CHARACTER.'%',
            '_' => self::ESCAPE_CHARACTER.'_',
        ]);
    }

    public static function contains(string $value): string
    {
        return '%'.self::escape($value).'%';
    }

    public static function suffix(string $value): string
    {
        return '%'.self::escape($value);
    }

    public static function clause(string $expression): string
    {
        return $expression." ESCAPE '".self::ESCAPE_CHARACTER."'";
    }
}
