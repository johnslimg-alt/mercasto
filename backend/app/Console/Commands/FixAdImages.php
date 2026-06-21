<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Ad;
use Illuminate\Support\Facades\Cache;

class FixAdImages extends Command
{
    protected $signature = 'mercasto:fix-images';
    protected $description = 'Replace duplicate and broken mock ad images with unique, relevant Unsplash photos';

    public function handle()
    {
        $this->info('Starting image fix: unique, relevant photos per ad...');

        Cache::flush();
        $this->info('Redis cache flushed.');

        $pools = [
            'motor' => [
                'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=600',
                'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=600',
                'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=600'
            ],
            'coches' => [
                'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600',
                'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600',
                'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600',
                'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=600'
            ],
            'inmobiliaria' => [
                'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600',
                'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600',
                'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600',
                'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600'
            ],
            'empleo' => [
                'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600',
                'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600',
                'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600',
                'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600'
            ],
            'servicios' => [
                'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600',
                'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600',
                'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=600',
                'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600'
            ],
            'electronica' => [
                'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=600',
                'https://images.unsplash.com/photo-1496181130204-755241544e35?w=600',
                'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600'
            ],
            'telefonos' => [
                'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600',
                'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600',
                'https://images.unsplash.com/photo-1565849906660-af34a742a8b2?w=600'
            ],
            'hogar' => [
                'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=600',
                'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=600',
                'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600'
            ],
            'moda' => [
                'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600',
                'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600',
                'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600'
            ],
            'bebes' => [
                'https://images.unsplash.com/photo-1519689680058-324335c77ebe?w=600',
                'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=600',
                'https://images.unsplash.com/photo-1515488042361-404e9250afef?w=600'
            ],
            'mascotas' => [
                'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600',
                'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600',
                'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=600'
            ],
            'ocio' => [
                'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600',
                'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=600',
                'https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?w=600'
            ],
            'negocios' => [
                'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600',
                'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600',
                'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600'
            ],
            'infantil' => [
                'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=600',
                'https://images.unsplash.com/photo-1515488042361-404e9250afef?w=600',
                'https://images.unsplash.com/photo-1537655780520-1e392edd816a?w=600'
            ],
            'coleccionismo' => [
                'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600',
                'https://images.unsplash.com/photo-1531594896955-f018e3ff341d?w=600',
                'https://images.unsplash.com/photo-1472457897821-70d3819a0e24?w=600'
            ],
            'formacion' => [
                'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600',
                'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=600',
                'https://images.unsplash.com/photo-1495446815901-a7297e63b58d?w=600'
            ],
            'informatica' => [
                'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=600',
                'https://images.unsplash.com/photo-1547082299-de196ea013d6?w=600',
                'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600'
            ],
        ];

        $ads = Ad::all();
        $updated = 0;

        foreach ($ads as $ad) {
            $category = strtolower((string) $ad->category);
            
            // Map legacy aliases
            if ($category === 'autos') $category = 'coches';
            if ($category === 'tecnologia') $category = 'electronica';
            if ($category === 'telefonia') $category = 'telefonos';
            if ($category === 'deportes') $category = 'ocio';

            $pool = $pools[$category] ?? ['https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=600'];
            $selected = $pool[$ad->id % count($pool)];
            
            // Add unique signature to bypass cache properly
            $imgUrl = $selected . '&sig=' . $ad->id;

            $ad->image_url = json_encode([$imgUrl]);
            $ad->save();
            $updated++;
        }

        $this->info("Done! Updated {$updated} ads with unique relevant photos.");
    }
}

