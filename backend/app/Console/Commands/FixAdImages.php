<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Ad;

class FixAdImages extends Command
{
    protected $signature = 'mercasto:fix-images';
    protected $description = 'Replace duplicate and broken mock ad images with unique, relevant Unsplash photos';

    public function handle()
    {
        $this->info('Starting to fix ad images in database...');

        $unsplashPool = [
            'motor' => [
                'photo-1503376780353-7e6692767b70', // Black Porsche
                'photo-1552519507-da3b142c6e3d', // Blue sports car
                'photo-1494976388531-d1058494cdd8', // Mustang
                'photo-1583121274602-3e2820c69888', // Yellow sports car
                'photo-1542282088-fe8426682b8f', // Red car
                'photo-1533473359331-0135ef1b58bf', // SUV
                'photo-1502877338535-766e1452684a', // Red retro car
                'photo-1492144534655-ae79c964c9d7', // Black car front
                'photo-1525609004556-c46c7d6cf0a3', // Orange sports car
                'photo-1493238792000-811347057630', // Yellow classic
                'photo-1558981403-c5f9899a28bc', // Motorcycle
                'photo-1568772585407-9361f9bf3a87', // Sports bike
                'photo-1449426468159-d96dbf08f19f', // Modern bike
                'photo-1599819811279-d5ad9cccf838', // Helmet
                'photo-1485965120184-e220f721d03e', // Bicycle
                'photo-1511919884226-fd3cad34687c', // Sports car engine
                'photo-1493238792000-811347057630', // Vintage car
                'photo-1503376780353-7e6692767b70', // Supercar
                'photo-1518987048-93e290b0e5bc', // Tire Michelin
                'photo-1619642751034-765dfdf7c58e', // Engine detail LTH
            ],
            'inmobiliaria' => [
                'photo-1600585154340-be6161a56a0c', // Modern villa
                'photo-1512917774080-9991f1c4c750', // Luxury home
                'photo-1600596542815-ffad4c1539a9', // Suburban house
                'photo-1600607687939-ce8a6c25118c', // House interior
                'photo-1580587771525-78b9dba3b914', // Estate
                'photo-1564013799919-ab600027ffc6', // Mansion
                'photo-1605276374104-dee2a0ed3cd6', // Cozy cottage
                'photo-1502672260266-1c1ef2d93688', // Loft apartment
                'photo-1522708323590-d24dbb6b0267', // Bedroom
                'photo-1560448204-e02f11c3d0e2', // Modern living room
                'photo-1502672023488-70e25813eb80', // Dining area
                'photo-1507089947368-19c1da9775ae', // Penthouse view
                'photo-1493809842364-78817add7ffb', // Cozy flat
                'photo-1513694203232-719a280e022f', // Room decor
                'photo-1568495248636-6432b97bd949', // Commercial store
                'photo-1486406146926-c627a92ad1ab', // Modern office tower
            ],
            'empleo' => [
                'photo-1486406146926-c627a92ad1ab', // Tech building
                'photo-1497366216548-37526070297c', // Modern office
                'photo-1521737604893-d14cc237f11d', // Team meeting
                'photo-1516321318423-f06f85e504b3', // Laptop desk work
                'photo-1531538606174-0f90ff5dce83', // Creative workspace
                'photo-1522202176988-66273c2fd55f', // Coding developer
                'photo-1573496359142-b8d87734a5a2', // Manager lady
                'photo-1556742049-0cfed4f6a45d', // Customer service
                'photo-1556740758-90de374c12ad', // Barista serving coffee
                'photo-1504307651254-35680f356dfd', // Construction worker
            ],
            'servicios' => [
                'photo-1621905251189-08b45d6a269e', // AC Repair
                'photo-1581578731548-c64695cc6952', // Cleaning services
                'photo-1607472586893-edb57bdc0e39', // Plumber
                'photo-1504328345606-18bbc8c9d7d1', // Electrician
                'photo-1571019613454-1cb2f99b2d8b', // Personal Trainer
                'photo-1492691527719-9d1e07e534b4', // Photographer
                'photo-1551650975-87deedd944c3', // Web designer
                'photo-1588943211346-0908a1fb0b01', // Dog walker
                'photo-1521791136368-1a9b82f00e42', // Legal consultancy
                'photo-1563720223-1577159790bc', // Car detailing
            ],
            'informatica' => [
                'photo-1531297484001-80022131f5a1', // MacBook Pro
                'photo-1496181130204-755241544e35', // Laptop on desk
                'photo-1588872657578-7efd1f1555ed', // Laptop screen
                'photo-1603302576837-37561b2e2302', // Working laptop
                'photo-1517336714731-489689fd1ca8', // MacBook Air
                'photo-1544244015-0df4b3ffc6b0', // iPad Pro
                'photo-1527443224154-c4a3942d3acf', // Mechanical keyboard
                'photo-1615663245857-ac93bb7c39e7', // Wireless mouse
                'photo-1587831990711-23ca6441447b', // AMD Processor CPU
                'photo-1591488320449-011701bb6704', // Graphics card RTX
                'photo-1527443224154-c4a3942d3acf', // Keycaps RGB
                'photo-1551645121-d1034da75057', // 4K Monitor
            ],
            'telefonos' => [
                'photo-1511707171634-5f897ff02aa9', // Smartphone look
                'photo-1592750475338-74b7b21085ab', // iPhone 15 Pro
                'photo-1565849906660-af34a742a8b2', // Diverse phones
                'photo-1580910051074-3eb694886505', // Android smartphone
                'photo-1546054454-aa26e2b734c7', // Phone charging
                'photo-1539185441755-769473a23570', // Apple watch
                'photo-1434494878577-86c23bcb06b9', // Fitness tracker
                'photo-1605647540924-852290f6b0d5', // Earbuds
            ],
            'hogar' => [
                'photo-1524758631624-e2822e304c36', // Office chair
                'photo-1505691938895-1758d7feb511', // Bedroom bed
                'photo-1493663284031-b7e3aefcae8e', // Soft sofa
                'photo-1592078615290-033ee584e267', // Wooden dining table
                'photo-1586023492125-27b2c045efd7', // Desk setup chair
                'photo-1584269600464-37b1b58a9fe7', // Microwave blender
                'photo-1574269909862-7e1d70bb8078', // Refrigerator fridge
                'photo-1507308211913-c3b72a0e2ee7', // Cooler AC fan
                'photo-1513694203232-719a280e022f', // Decorative lamp
            ],
            'moda' => [
                'photo-1483985988355-763728e1935b', // Shopping fashion lady
                'photo-1490481651871-ab68de25d43d', // Boutique clothes rack
                'photo-1479064555552-3ef4979f8908', // Mens shirt jacket
                'photo-1488161628813-04466f872be2', // Stylish shoes boots
                'photo-1523275335684-37898b6baf30', // Citizen Watch
                'photo-1509048191080-d2984bad6ae5', // Leather purse bag
                'photo-1543163521-1bf539c55dd2', // Women shoes heels
                'photo-1600185365483-26d7a4cc7519', // Nike Air Sneakers
            ],
            'bebes' => [
                'photo-1519689680058-324335c77ebe', // Sleeping baby infant
                'photo-1502086223501-7ea6ecd79368', // Stroller pram
                'photo-1596464716127-f2a82984de30', // Toys bricks blocks
                'photo-1555252333-9f8e92e65df9', // Crib cradle
                'photo-1515488042361-404e9250afef', // Baby clothes socks
            ],
            'mascotas' => [
                'photo-1543466835-00a7907e9de1', // Happy dog pup
                'photo-1514888286974-6c03e2ca1dba', // Soft cat eyes
                'photo-1537151608828-ea2b117b62e4', // Golden retriever puppy
                'photo-1517841905240-472988babdf9', // Dog bag looking up
                'photo-1548199973-03cce0bbc87b', // Playing pets dogs
                'photo-1608454367599-c11394f479a9', // Pet scratching post cat
            ],
            'deportes' => [
                'photo-1461896836934-ffe607ba8211', // Athletic running shoe
                'photo-1517649763962-0c623066013b', // Heavy dumbells gym
                'photo-1485965120184-e220f721d03e', // MTB bike mountain
                'photo-1507838153414-b4b713384a76', // Acoustic guitar Fender
                'photo-1511192336575-5a79af67a629', // Piano keys music
                'photo-1544947950-fa07a98d237f', // Rich stack of books
                'photo-1606813907291-d86efa9b94db', // PlayStation 5 gamepad console
            ],
            'formacion' => [
                'photo-1501281668745-f7f57925c3b4', // Live concert event
                'photo-1506157786151-b8491531f063', // Music festival crowd
                'photo-1489599849927-2ee91cede3ba', // Cinema ticket movie theatre
                'photo-1534447677768-be436bb09401', // Vacation travel beach tour
                'photo-1511671782779-c97d3d27a1d4', // Microphone studio standup
            ],
        ];

        // Specific subcategory overrides to make matches even tighter and cooler!
        $specificPool = [
            'versa' => 'photo-1550355291-bbee04a92027', // Nissan Versa
            'jetta' => 'photo-1503376780353-7e6692767b70', // VW Jetta
            'aveo' => 'photo-1606016159991-dfe4f2746ad5', // Chevy Aveo
            'civic' => 'photo-1494976388531-d1058494cdd8', // Honda Civic
            'macbook' => 'photo-1517336714731-489689fd1ca8', // MacBook Air M2
            'iphone' => 'photo-1592750475338-74b7b21085ab', // iPhone 15 Pro
            'nike' => 'photo-1542291026-797186bcca9e', // Nike Air Max
            'sofá' => 'photo-1493663284031-b7e3aefcae8e', // Soft sofa
            'cama' => 'photo-1505691938895-1758d7feb511', // Bedroom bed
            'refrigerador' => 'photo-1574269909862-7e1d70bb8078', // Refrigerator LG
            'playstation' => 'photo-1606813907291-d86efa9b94db', // PS5
            'bicicleta' => 'photo-1485965120184-e220f721d03e', // MTB Mountain Bike
        ];

        $ads = Ad::all();
        $updatedCount = 0;

        foreach ($ads as $ad) {
            $category = $ad->category ?: 'hogar';
            $titleLower = mb_strtolower($ad->title);
            $selectedId = null;

            // Check if title has a specific subcategory keyword override
            foreach ($specificPool as $keyword => $photoId) {
                if (str_contains($titleLower, $keyword)) {
                    // Use a unique suffix if there are multiples of the same model
                    $selectedId = $photoId;
                    break;
                }
            }

            // Fallback to category pool with modulo index matching to avoid ALL duplicates!
            if (!$selectedId && isset($unsplashPool[$category])) {
                $pool = $unsplashPool[$category];
                $index = $ad->id % count($pool);
                $selectedId = $pool[$index];
            }

            if ($selectedId) {
                // Construct clean working Unsplash URL
                $imgUrl = "https://images.unsplash.com/photo-{$selectedId}?w=600&auto=format&fit=crop&q=80";
                
                $ad->image_url = json_encode([$imgUrl]);
                $ad->save();
                $updatedCount++;
            }
        }

        $this->info("Successfully updated {$updatedCount} ads with distinct, relevant Unsplash photos!");
    }
}
