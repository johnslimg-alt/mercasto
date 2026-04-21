<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReviewController extends Controller
{
    public function index($id)
    {
        $average = DB::table('reviews')->where('seller_id', $id)->avg('rating') ?? 0;
        $total = DB::table('reviews')->where('seller_id', $id)->count();

        $reviews = DB::table('reviews')
            ->join('users', 'reviews.reviewer_id', '=', 'users.id')
            ->where('seller_id', $id)
            ->select('reviews.*', 'users.name as reviewer_name', 'users.avatar_url as reviewer_avatar')
            ->orderByDesc('reviews.created_at')
            ->paginate(15);

        return response()->json([
            'reviews' => $reviews->items(),
            'average' => round($average, 1),
            'total' => $total,
            'has_more' => $reviews->hasMorePages()
        ]);
    }

    public function store(Request $request, $id)
    {
        $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000'
        ]);

        $reviewerId = $request->user()->id;

        if ($reviewerId == $id) {
            return response()->json(['message' => 'No puedes dejarte una reseña a ti mismo'], 400);
        }
        
        // Защита от сбоя целостности БД
        if (!\App\Models\User::where('id', $id)->exists()) {
            return response()->json(['message' => 'Vendedor no encontrado'], 404);
        }
        
        // Защита от фейковых отзывов (Review Bombing): разрешаем отзыв, только если было взаимодействие с продавцом
        $hasInteracted = DB::table('ad_clicks')
            ->join('ads', 'ad_clicks.ad_id', '=', 'ads.id')
            ->where('ad_clicks.user_id', $reviewerId)
            ->where('ads.user_id', $id)
            ->exists();
            
        $hasFavorited = DB::table('favorites')->join('ads', 'favorites.ad_id', '=', 'ads.id')->where('favorites.user_id', $reviewerId)->where('ads.user_id', $id)->exists();

        if (!$hasInteracted && !$hasFavorited) {
            return response()->json(['message' => 'Solo puedes dejar una reseña a vendedores con los que has interactuado (favoritos o contacto).'], 403);
        }

        // Защита от Race Condition при двойном клике: используем атомарный upsert на уровне базы данных
        DB::table('reviews')->upsert([
            [
                'reviewer_id' => $reviewerId, 
                'seller_id' => $id, 
                'rating' => $request->rating, 
                'comment' => $request->comment, 
                'created_at' => now(), 
                'updated_at' => now()
            ]
        ], ['reviewer_id', 'seller_id'], ['rating', 'comment', 'updated_at']);

        return response()->json(['message' => 'Reseña guardada exitosamente']);
    }
}