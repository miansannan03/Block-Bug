<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organizations', function (Blueprint $table): void {
            if (! Schema::hasColumn('organizations', 'deleted_at')) {
                $table->softDeletes()->index();
            }
            if (! Schema::hasColumn('organizations', 'last_activity_at')) {
                $table->timestamp('last_activity_at')->nullable()->index();
            }
        });

        Schema::create('platform_admins', function (Blueprint $table): void {
            $table->string('id', 36)->primary();
            $table->string('name', 120);
            $table->string('email', 180)->unique();
            $table->string('password_hash');
            $table->enum('status', ['active', 'inactive'])->default('active')->index();
            $table->timestamps();
        });

        Schema::create('access_tokens', function (Blueprint $table): void {
            $table->string('id', 36)->primary();
            $table->enum('actor_type', ['platform_admin', 'user']);
            $table->string('actor_id', 36)->index();
            $table->string('token_hash', 64)->unique();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->index();
            $table->timestamp('revoked_at')->nullable()->index();
            $table->timestamps();
            $table->index(['actor_type', 'actor_id']);
        });

        Schema::create('invitations', function (Blueprint $table): void {
            $table->string('id', 36)->primary();
            $table->enum('type', ['organization', 'user'])->index();
            $table->string('organization_id', 36)->nullable()->index();
            $table->string('email', 180)->index();
            $table->string('role', 40)->default('admin');
            $table->string('token_hash', 64)->unique();
            $table->enum('status', ['pending', 'accepted', 'revoked', 'expired'])->default('pending')->index();
            $table->string('created_by_type', 40);
            $table->string('created_by_id', 36)->index();
            $table->timestamp('expires_at')->index();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();
            $table->index(['organization_id', 'status', 'created_at']);
            $table->foreign('organization_id')->references('id')->on('organizations')->nullOnDelete();
        });

        Schema::create('organization_settings', function (Blueprint $table): void {
            $table->string('organization_id', 36);
            $table->string('setting_key', 100);
            $table->text('setting_value');
            $table->timestamps();
            $table->primary(['organization_id', 'setting_key']);
            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
        });

        Schema::create('organization_integrations', function (Blueprint $table): void {
            $table->string('organization_id', 36);
            $table->string('integration_id', 36);
            $table->enum('status', ['connected', 'available'])->default('available');
            $table->timestamps();
            $table->primary(['organization_id', 'integration_id']);
            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('integration_id')->references('id')->on('integrations')->cascadeOnDelete();
        });

        Schema::create('audit_logs', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->string('organization_id', 36)->nullable()->index();
            $table->string('actor_type', 40)->nullable();
            $table->string('actor_id', 36)->nullable()->index();
            $table->string('actor_role', 40)->nullable();
            $table->string('action', 100)->index();
            $table->string('entity_type', 80)->nullable();
            $table->string('entity_id', 80)->nullable();
            $table->boolean('succeeded')->default(true)->index();
            $table->json('metadata')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('request_id', 64)->nullable()->index();
            $table->timestamp('created_at')->useCurrent()->index();
            $table->foreign('organization_id')->references('id')->on('organizations')->nullOnDelete();
        });

        Schema::create('application_error_logs', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->string('organization_id', 36)->nullable()->index();
            $table->string('user_id', 36)->nullable()->index();
            $table->string('level', 20)->default('error')->index();
            $table->string('error_type', 180);
            $table->text('message');
            $table->string('module', 180)->nullable()->index();
            $table->unsignedSmallInteger('http_status')->nullable()->index();
            $table->string('request_id', 64)->nullable()->index();
            $table->longText('stack_trace')->nullable();
            $table->timestamp('created_at')->useCurrent()->index();
            $table->foreign('organization_id')->references('id')->on('organizations')->nullOnDelete();
        });

        // Preserve existing organization defaults while making every setting tenant-owned.
        $legacySettings = Schema::hasTable('system_settings') ? DB::table('system_settings')->get() : collect();
        foreach (DB::table('organizations')->pluck('id') as $organizationId) {
            foreach ($legacySettings as $setting) {
                DB::table('organization_settings')->updateOrInsert(
                    ['organization_id' => $organizationId, 'setting_key' => $setting->setting_key],
                    ['setting_value' => $setting->setting_value, 'created_at' => now(), 'updated_at' => now()],
                );
            }
            foreach (DB::table('integrations')->get() as $integration) {
                DB::table('organization_integrations')->updateOrInsert(
                    ['organization_id' => $organizationId, 'integration_id' => $integration->id],
                    ['status' => $integration->status, 'created_at' => now(), 'updated_at' => now()],
                );
            }
        }

        $email = env('SUPER_ADMIN_EMAIL');
        $password = env('SUPER_ADMIN_PASSWORD');
        if ($email && $password && ! DB::table('platform_admins')->where('email', Str::lower($email))->exists()) {
            DB::table('platform_admins')->insert([
                'id' => 'sa-'.Str::lower(Str::random(16)),
                'name' => env('SUPER_ADMIN_NAME', 'BlockBug Super Admin'),
                'email' => Str::lower($email),
                'password_hash' => Hash::make($password),
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('application_error_logs');
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('organization_integrations');
        Schema::dropIfExists('organization_settings');
        Schema::dropIfExists('invitations');
        Schema::dropIfExists('access_tokens');
        Schema::dropIfExists('platform_admins');
        Schema::table('organizations', function (Blueprint $table): void {
            if (Schema::hasColumn('organizations', 'last_activity_at')) {
                $table->dropColumn('last_activity_at');
            }
            if (Schema::hasColumn('organizations', 'deleted_at')) {
                $table->dropSoftDeletes();
            }
        });
    }
};
