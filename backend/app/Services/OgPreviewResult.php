<?php

namespace App\Services;

/**
 * Outcome of a social preview render.
 *
 * Carries the real placement geometry and the payload's real MIME type alongside
 * the bytes, so callers and tests can prove the product is fully visible instead
 * of trusting the render call. `photoRect`/`contentBox` are null for the branded,
 * photo-less card.
 *
 * `mimeType` is not cosmetic: responses carry `X-Content-Type-Options: nosniff`,
 * so serving a PNG or WebP payload as `image/jpeg` would be rejected outright.
 */
final readonly class OgPreviewResult
{
    public function __construct(
        public string $bytes,
        public int $width,
        public int $height,
        public string $variant,
        public string $mimeType = 'image/jpeg',
        public ?string $sourcePath = null,
        public ?int $sourceWidth = null,
        public ?int $sourceHeight = null,
        public ?array $photoRect = null,
        public ?array $contentBox = null,
    ) {
    }

    public static function photo(
        string $bytes,
        string $sourcePath,
        int $sourceWidth,
        int $sourceHeight,
        array $photoRect,
        array $contentBox,
        int $width,
        int $height,
    ): self {
        return new self(
            bytes: $bytes,
            width: $width,
            height: $height,
            variant: 'photo',
            sourcePath: $sourcePath,
            sourceWidth: $sourceWidth,
            sourceHeight: $sourceHeight,
            photoRect: $photoRect,
            contentBox: $contentBox,
        );
    }

    public static function brand(string $bytes, int $width, int $height, string $mimeType = 'image/jpeg'): self
    {
        return new self(
            bytes: $bytes,
            width: $width,
            height: $height,
            variant: 'brand',
            mimeType: $mimeType,
        );
    }

    /**
     * True when the composited photo sits entirely inside its content box, i.e.
     * no part of the listing photo was cropped away.
     */
    public function photoIsFullyVisible(): bool
    {
        if ($this->photoRect === null || $this->contentBox === null) {
            return false;
        }

        return $this->photoRect['x'] >= $this->contentBox['x']
            && $this->photoRect['y'] >= $this->contentBox['y']
            && $this->photoRect['x'] + $this->photoRect['width']
                <= $this->contentBox['x'] + $this->contentBox['width']
            && $this->photoRect['y'] + $this->photoRect['height']
                <= $this->contentBox['y'] + $this->contentBox['height'];
    }

    /**
     * True when the placed photo keeps the source aspect ratio, i.e. it was
     * scaled to fit rather than cropped or stretched. Allows the sub-pixel
     * rounding of integer pixel dimensions.
     */
    public function photoAspectPreserved(float $tolerance = 0.01): bool
    {
        if ($this->photoRect === null || ! $this->sourceWidth || ! $this->sourceHeight) {
            return false;
        }

        $source = $this->sourceWidth / $this->sourceHeight;
        $placed = $this->photoRect['width'] / max(1, $this->photoRect['height']);

        return abs($source - $placed) / $source <= $tolerance;
    }
}
