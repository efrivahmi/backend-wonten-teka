<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(Notification::where('user_id', $request->user()->id)->latest()->paginate(30));
    }

    public function read(Request $request, Notification $notification)
    {
        abort_unless($notification->user_id === $request->user()->id, 403);
        $notification->update(['read_at' => $notification->read_at ?? now()]);
        return response()->json(['data' => $notification]);
    }

    public function readAll(Request $request)
    {
        Notification::where('user_id', $request->user()->id)->unread()->update(['read_at' => now()]);
        return response()->json(['message' => 'Semua notifikasi telah dibaca.']);
    }
}
