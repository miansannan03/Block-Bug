<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AuditLogger
{
    public static function write(
        Request $request,
        string $action,
        ?string $entityType = null,
        ?string $entityId = null,
        array $metadata = [],
        bool $succeeded = true,
        ?string $organizationId = null,
        ?object $actor = null,
        ?string $actorType = null,
        ?string $actorRole = null,
    ): void {
        if (! Schema::hasTable('audit_logs')) {
            return;
        }

        $actor ??= $request->attributes->get('blockbug_actor');
        $actorType ??= $request->attributes->get('blockbug_actor_type');
        $organizationId ??= $request->attributes->get('blockbug_organization_id');
        $actorRole ??= $request->attributes->get('blockbug_platform_role')
            ?: $request->attributes->get('blockbug_organization_role');

        unset($metadata['password'], $metadata['password_confirmation'], $metadata['token'], $metadata['authorization']);
        DB::table('audit_logs')->insert([
            'organization_id' => $organizationId,
            'actor_type' => $actorType,
            'actor_id' => $actor->id ?? null,
            'actor_role' => $actorRole,
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'succeeded' => $succeeded,
            'metadata' => $metadata ? json_encode($metadata, JSON_THROW_ON_ERROR) : null,
            'ip_address' => $request->ip(),
            'request_id' => $request->attributes->get('request_id'),
            'created_at' => now(),
        ]);
    }
}
