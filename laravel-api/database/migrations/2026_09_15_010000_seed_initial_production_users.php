<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (! app()->environment('production')) {
            return;
        }

        DB::transaction(function (): void {
            $now = now();
            $organizationId = 'org-blockbug-production';

            DB::table('organizations')->updateOrInsert(
                ['id' => $organizationId],
                [
                    'name' => 'BlockBug',
                    'login_email' => 'organization@blockbug.pk',
                    'password_hash' => '$2y$12$IZtd0k/9xGNM93Zxvr2PPe6y9LGPGhsC4UuDoO.PRc0IOczFGVxZW',
                    'status' => 'active',
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            );

            $users = [
                [
                    'id' => 'user-blockbug-admin',
                    'name' => 'BlockBug Admin',
                    'email' => 'admin@blockbug.pk',
                    'password_hash' => '$2y$12$aTaAnAE3o2EL8nkf6a6vIeW3YbgCHIXrpAdgdRulkBgV66KhU7NmS',
                    'role' => 'admin',
                ],
                [
                    'id' => 'user-blockbug-manager',
                    'name' => 'BlockBug Manager',
                    'email' => 'manager@blockbug.pk',
                    'password_hash' => '$2y$12$kBKkTkLg9UMbAxBboo3gaOe1GbCug6wKiaMwltBQKIicJw03wfIV2',
                    'role' => 'manager',
                ],
                [
                    'id' => 'user-blockbug-developer',
                    'name' => 'BlockBug Developer',
                    'email' => 'developer@blockbug.pk',
                    'password_hash' => '$2y$12$X81ceCg7o5OC7M9NT8iQzuy.E8VrEnrm9Xk2eGBb.SuLDEzCNYR2C',
                    'role' => 'developer',
                ],
                [
                    'id' => 'user-blockbug-tester',
                    'name' => 'BlockBug Tester',
                    'email' => 'tester@blockbug.pk',
                    'password_hash' => '$2y$12$AdKfkxiBgK.TDYXIhmLcC.WK/Y6nE5N4Lqejz5pkjmwJiCg6JUzi2',
                    'role' => 'tester',
                ],
            ];

            foreach ($users as $user) {
                DB::table('users')->updateOrInsert(
                    ['org_id' => $organizationId, 'email' => $user['email']],
                    $user + [
                        'org_id' => $organizationId,
                        'status' => 'active',
                        'avatar' => null,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ],
                );
            }
        });
    }

    public function down(): void
    {
        // Initial production accounts are intentionally never deleted by rollback.
    }
};
