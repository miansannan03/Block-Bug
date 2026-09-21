<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class LogApplicationErrors
{
    public function handle(Request $request, Closure $next): Response
    {
        try {
            return $next($request);
        } catch (Throwable $exception) {
            $message = $this->sanitize($exception->getMessage());
            $module = $request->route()?->uri()
                ? $request->method().' /'.$request->route()->uri()
                : $request->method().' /api';
            Log::error('Unhandled API exception', [
                'request_id' => $request->attributes->get('request_id'),
                'route' => $module,
                'error_type' => $exception::class,
                'message' => $message,
            ]);
            try {
                if (Schema::hasTable('application_error_logs')) {
                    $actor = $request->attributes->get('blockbug_actor');
                    DB::table('application_error_logs')->insert([
                        'organization_id' => $request->attributes->get('blockbug_organization_id'),
                        'user_id' => $request->attributes->get('blockbug_actor_type') === 'user' ? ($actor->id ?? null) : null,
                        'level' => 'error',
                        'error_type' => $exception::class,
                        'message' => mb_substr($message, 0, 4000),
                        'module' => mb_substr($module, 0, 180),
                        'http_status' => 500,
                        'request_id' => $request->attributes->get('request_id'),
                        'stack_trace' => app()->isProduction() ? null : mb_substr($this->sanitize($exception->getTraceAsString()), 0, 20000),
                        'created_at' => now(),
                    ]);
                }
            } catch (Throwable) {
                // Database logging must never hide the original failure.
            }

            return response()->json([
                'message' => 'Server error',
                'requestId' => $request->attributes->get('request_id'),
            ], 500);
        }
    }

    private function sanitize(string $value): string
    {
        $value = preg_replace('/Bearer\s+[A-Za-z0-9._-]+/i', 'Bearer [REDACTED]', $value) ?? $value;
        $value = preg_replace('/\b(?:bbt_|bb_live_)[A-Za-z0-9._-]+\b/i', '[REDACTED_TOKEN]', $value) ?? $value;
        $value = preg_replace('/(password(?:_hash)?[\s=:>]+)[^\s,;]+/i', '$1[REDACTED]', $value) ?? $value;

        return $value;
    }
}
