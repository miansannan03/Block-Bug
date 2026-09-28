<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DemoOrganizationInvitationsSeeder extends Seeder
{
    public function run(): void
    {
        $platformAdminId = DB::table('platform_admins')
            ->where('status', 'active')
            ->orderBy('created_at')
            ->value('id') ?? 'sa-local-owner';

        $invitations = [
            [
                'id' => 'inv-seed-apxzone-org',
                'organization_id' => 'org-apxzone',
                'email' => 'saadullah.pk3@apxzone.com',
                'created_at' => '2026-08-23 10:10:00',
                'accepted_at' => '2026-08-23 10:12:00',
                'expires_at' => '2026-08-30 10:10:00',
            ],
            [
                'id' => 'inv-seed-system-links-org',
                'organization_id' => 'org-system-links',
                'email' => 'haris.khan84@systemlinks.com',
                'created_at' => '2026-08-28 09:16:00',
                'accepted_at' => '2026-08-28 09:18:00',
                'expires_at' => '2026-09-04 09:16:00',
            ],
            [
                'id' => 'inv-seed-softbreeze-org',
                'organization_id' => 'org-softbreeze',
                'email' => 'farhanali.pk88@softbreeze.com',
                'created_at' => '2026-08-28 14:40:00',
                'accepted_at' => '2026-08-28 14:42:00',
                'expires_at' => '2026-09-04 14:40:00',
            ],
            [
                'id' => 'inv-seed-orbitors-org',
                'organization_id' => 'org-orbitors',
                'email' => 'hamza.afridi76@orbitors.com',
                'created_at' => '2026-09-01 10:04:00',
                'accepted_at' => '2026-09-01 10:06:00',
                'expires_at' => '2026-09-08 10:04:00',
            ],
            [
                'id' => 'inv-seed-jashabhsoft-org',
                'organization_id' => 'org-jashabhsoft',
                'email' => 'usman.tariq90@jashabhsoft.com',
                'created_at' => '2026-09-05 11:21:00',
                'accepted_at' => '2026-09-05 11:23:00',
                'expires_at' => '2026-09-12 11:21:00',
            ],
        ];

        DB::transaction(function () use ($invitations, $platformAdminId): void {
            foreach ($invitations as $invitation) {
                if (! DB::table('organizations')->where('id', $invitation['organization_id'])->exists()) {
                    continue;
                }

                DB::table('invitations')->updateOrInsert(
                    ['id' => $invitation['id']],
                    [
                        'type' => 'organization',
                        'organization_id' => $invitation['organization_id'],
                        'email' => $invitation['email'],
                        'role' => 'admin',
                        'token_hash' => hash('sha256', 'blockbug-demo-'.$invitation['id']),
                        'status' => 'accepted',
                        'created_by_type' => 'platform_admin',
                        'created_by_id' => $platformAdminId,
                        'expires_at' => $invitation['expires_at'],
                        'accepted_at' => $invitation['accepted_at'],
                        'revoked_at' => null,
                        'created_at' => $invitation['created_at'],
                        'updated_at' => $invitation['accepted_at'],
                    ],
                );

                DB::table('audit_logs')
                    ->where('entity_type', 'invitation')
                    ->where('entity_id', $invitation['id'])
                    ->whereIn('action', [
                        'SUPER_ADMIN_CREATED_ORGANIZATION_INVITE',
                        'ORGANIZATION_INVITE_ACCEPTED',
                    ])
                    ->delete();

                $metadata = json_encode([
                    'email' => $invitation['email'],
                    'role' => 'admin',
                ], JSON_THROW_ON_ERROR);

                DB::table('audit_logs')->insert([
                    [
                        'organization_id' => null,
                        'actor_type' => 'platform_admin',
                        'actor_id' => $platformAdminId,
                        'actor_role' => 'SUPER_ADMIN',
                        'action' => 'SUPER_ADMIN_CREATED_ORGANIZATION_INVITE',
                        'entity_type' => 'invitation',
                        'entity_id' => $invitation['id'],
                        'succeeded' => true,
                        'metadata' => $metadata,
                        'ip_address' => '127.0.0.1',
                        'request_id' => null,
                        'created_at' => $invitation['created_at'],
                    ],
                    [
                        'organization_id' => $invitation['organization_id'],
                        'actor_type' => null,
                        'actor_id' => null,
                        'actor_role' => null,
                        'action' => 'ORGANIZATION_INVITE_ACCEPTED',
                        'entity_type' => 'invitation',
                        'entity_id' => $invitation['id'],
                        'succeeded' => true,
                        'metadata' => $metadata,
                        'ip_address' => '127.0.0.1',
                        'request_id' => null,
                        'created_at' => $invitation['accepted_at'],
                    ],
                ]);
            }
        });
    }
}
