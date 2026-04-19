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

        $exists = DB::table('reviews')->where('reviewer_id', $reviewerId)->where('seller_id', $id)->exists();
        
        if ($exists) {
            DB::table('reviews')
                ->where('reviewer_id', $reviewerId)
                ->where('seller_id', $id)
                ->update(['rating' => $request->rating, 'comment' => $request->comment, 'updated_at' => now()]);
        } else {
            DB::table('reviews')->insert([
                'reviewer_id' => $reviewerId,
                'seller_id' => $id,
                'rating' => $request->rating,
                'comment' => $request->comment,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return response()->json(['message' => 'Reseña guardada exitosamente']);
    }
}