<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // The Laragon database may already contain the original BlockBug schema.
        if (Schema::hasTable('organizations')) {
            return;
        }

        Schema::create('organizations', function (Blueprint $table): void {
            $table->string('id', 36)->primary();
            $table->string('name', 160);
            $table->string('login_email', 180)->unique();
            $table->string('password_hash');
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();
        });

        Schema::create('users', function (Blueprint $table): void {
            $table->string('id', 36)->primary();
            $table->string('org_id', 36);
            $table->string('name', 120);
            $table->string('email', 180);
            $table->string('password_hash');
            $table->enum('role', ['admin', 'manager', 'developer', 'tester'])->default('tester');
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->string('avatar')->nullable();
            $table->timestamps();
            $table->unique(['org_id', 'email']);
            $table->foreign('org_id')->references('id')->on('organizations')->cascadeOnDelete();
        });

        Schema::create('projects', function (Blueprint $table): void {
            $table->string('id', 36)->primary();
            $table->string('org_id', 36);
            $table->string('name', 160);
            $table->text('description');
            $table->string('project_key', 20);
            $table->enum('status', ['active', 'archived'])->default('active');
            $table->unsignedInteger('team_size')->default(1);
            $table->timestamps();
            $table->unique(['org_id', 'project_key']);
            $table->foreign('org_id')->references('id')->on('organizations')->cascadeOnDelete();
        });

        Schema::create('sprints', function (Blueprint $table): void {
            $table->string('id', 36)->primary();
            $table->string('org_id', 36);
            $table->string('project_id', 36);
            $table->string('name', 160);
            $table->text('goal')->nullable();
            $table->enum('status', ['planned', 'active', 'completed', 'cancelled'])->default('planned');
            $table->date('start_date');
            $table->date('end_date');
            $table->string('created_by', 180)->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->foreign('org_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('project_id')->references('id')->on('projects')->cascadeOnDelete();
        });

        Schema::create('bugs', function (Blueprint $table): void {
            $table->string('id', 36)->primary();
            $table->string('org_id', 36);
            $table->string('title');
            $table->text('description');
            $table->enum('status', ['open', 'in-progress', 'resolved', 'closed'])->default('open');
            $table->enum('priority', ['low', 'medium', 'high', 'critical'])->default('medium');
            $table->enum('severity', ['minor', 'major', 'critical'])->default('minor');
            $table->string('project_id', 36);
            $table->string('sprint_id', 36)->nullable();
            $table->string('assigned_to', 180)->nullable();
            $table->string('reported_by', 180);
            $table->string('verification_tester_email', 180)->nullable();
            $table->text('steps_to_reproduce')->nullable();
            $table->text('expected_result')->nullable();
            $table->text('actual_result')->nullable();
            $table->string('environment')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();
            $table->foreign('org_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('project_id')->references('id')->on('projects')->cascadeOnDelete();
            $table->foreign('sprint_id')->references('id')->on('sprints')->nullOnDelete();
        });

        Schema::create('activities', function (Blueprint $table): void {
            $table->string('id', 36)->primary();
            $table->string('org_id', 36);
            $table->string('bug_id', 36)->nullable();
            $table->enum('type', ['created', 'status_changed', 'assigned', 'commented', 'verified']);
            $table->string('user_id', 180);
            $table->string('user_name', 120);
            $table->text('message');
            $table->timestamp('created_at')->useCurrent();
            $table->foreign('org_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('bug_id')->references('id')->on('bugs')->nullOnDelete();
        });

        Schema::create('bug_comments', function (Blueprint $table): void {
            $table->string('id', 36)->primary();
            $table->string('bug_id', 36);
            $table->string('parent_comment_id', 36)->nullable();
            $table->string('user_email', 180);
            $table->string('user_name', 120);
            $table->text('comment');
            $table->timestamp('created_at')->useCurrent();
            $table->foreign('bug_id')->references('id')->on('bugs')->cascadeOnDelete();
            $table->foreign('parent_comment_id')->references('id')->on('bug_comments')->cascadeOnDelete();
        });

        Schema::create('bug_attachments', function (Blueprint $table): void {
            $table->string('id', 36)->primary();
            $table->string('bug_id', 36);
            $table->string('original_name');
            $table->string('stored_name');
            $table->string('file_path');
            $table->string('mime_type', 120);
            $table->unsignedInteger('file_size');
            $table->string('uploaded_by', 180);
            $table->timestamp('created_at')->useCurrent();
            $table->foreign('bug_id')->references('id')->on('bugs')->cascadeOnDelete();
        });

        Schema::create('notifications', function (Blueprint $table): void {
            $table->string('id', 36)->primary();
            $table->string('org_id', 36);
            $table->string('user_email', 180)->nullable();
            $table->string('title');
            $table->text('body')->nullable();
            $table->string('type', 40)->default('info');
            $table->string('entity_type', 40)->nullable();
            $table->string('entity_id', 80)->nullable();
            $table->string('target_page', 40)->nullable();
            $table->boolean('is_read')->default(false);
            $table->timestamp('created_at')->useCurrent();
            $table->foreign('org_id')->references('id')->on('organizations')->cascadeOnDelete();
        });

        Schema::create('user_preferences', function (Blueprint $table): void {
            $table->string('id', 36)->primary();
            $table->string('user_id', 36);
            $table->string('preference_key', 80);
            $table->boolean('enabled')->default(true);
            $table->timestamps();
            $table->unique(['user_id', 'preference_key']);
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });

        Schema::create('api_keys', function (Blueprint $table): void {
            $table->string('id', 36)->primary();
            $table->string('user_id', 36);
            $table->string('key_label', 120);
            $table->string('key_prefix', 32);
            $table->string('key_hash');
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });

        Schema::create('integrations', function (Blueprint $table): void {
            $table->string('id', 36)->primary();
            $table->string('name', 120)->unique();
            $table->text('description');
            $table->string('icon', 12);
            $table->enum('status', ['connected', 'available'])->default('available');
            $table->timestamps();
        });

        Schema::create('system_settings', function (Blueprint $table): void {
            $table->string('setting_key', 100)->primary();
            $table->text('setting_value');
            $table->timestamps();
        });

        Schema::create('sprint_bug_history', function (Blueprint $table): void {
            $table->string('id', 36)->primary();
            $table->string('org_id', 36);
            $table->string('bug_id', 36);
            $table->string('from_sprint_id', 36)->nullable();
            $table->string('to_sprint_id', 36)->nullable();
            $table->string('moved_by', 180)->nullable();
            $table->string('reason', 160);
            $table->timestamp('moved_at')->useCurrent();
            $table->foreign('org_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('bug_id')->references('id')->on('bugs')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        // Intentionally non-destructive: BlockBug may be using a pre-existing Laragon database.
    }
};
