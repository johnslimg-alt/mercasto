<?php

namespace App\GraphQL\Mutations;

use App\Models\Ad;
use Illuminate\Support\Str;
use Intervention\Image\Facades\Image;

class UploadAdImage
{
    /**
     * Выполняется при вызове мутации uploadAdImage
     *
     * @param  null  $_
     * @param  array{}  $args
     */
    public function __invoke($_, array $args)
    {
        $ad = Ad::findOrFail($args['ad_id']);
        
        /** @var \Illuminate\Http\UploadedFile $file */
        $file = $args['image'];
        
        // Генерируем уникальное имя
        $filename = Str::uuid() . '.webp';
        $path = storage_path('app/public/ads/' . $filename);
        
        $directory = dirname($path);
        if (!file_exists($directory)) {
            mkdir($directory, 0755, true);
        }
        
        // Конвертируем в WebP с помощью Intervention Image
        Image::make($file)->orientate()->encode('webp', 85)->save($path);
        
        $relativePath = 'ads/' . $filename;
        
        // Обновляем массив картинок в базе данных
        $currentImages = $ad->image_url ? json_decode($ad->image_url, true) : [];
        if (!is_array($currentImages)) $currentImages = [];
        
        $currentImages[] = $relativePath;
        $ad->image_url = json_encode($currentImages);
        $ad->save();
        
        return $relativePath; // Возвращаем путь к загруженной картинке фронтенду
    }
}