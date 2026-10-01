<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bug_attachments', function (Blueprint $table): void {
            $table->string('comment_id', 36)->nullable()->after('bug_id');
            $table->foreign('comment_id')->references('id')->on('bug_comments')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('bug_attachments', function (Blueprint $table): void {
            $table->dropForeign(['comment_id']);
            $table->dropColumn('comment_id');
        });
    }
};
