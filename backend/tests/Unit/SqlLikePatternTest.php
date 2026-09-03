<?php

namespace Tests\Unit;

use App\Support\SqlLikePattern;
use PHPUnit\Framework\TestCase;

class SqlLikePatternTest extends TestCase
{
    public function test_it_escapes_escape_percent_and_underscore_characters(): void
    {
        $this->assertSame('a!!b!%c!_d', SqlLikePattern::escape('a!b%c_d'));
        $this->assertSame('%50!%!_off%', SqlLikePattern::contains('50%_off'));
        $this->assertSame("title ILIKE ? ESCAPE '!'", SqlLikePattern::clause('title ILIKE ?'));
    }
}
