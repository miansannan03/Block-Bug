<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('bug_attachments')) {
            return;
        }

        $sourceDirectory = public_path('uploads/bugs');
        $targetDirectory = storage_path('app/private/bug-attachments');
        File::ensureDirectoryExists($targetDirectory);

        if (File::isDirectory($sourceDirectory)) {
            foreach (File::files($sourceDirectory) as $file) {
                $target = $targetDirectory.DIRECTORY_SEPARATOR.$file->getFilename();
                if (! File::exists($target)) {
                    File::move($file->getPathname(), $target);
                } else {
                    File::delete($file->getPathname());
                }
            }
        }

        foreach (DB::table('bug_attachments')->get() as $attachment) {
            DB::table('bug_attachments')->where('id', $attachment->id)->update([
                'file_path' => 'bug-attachments/'.$attachment->stored_name,
            ]);
        }
    }

    public function down(): void
    {
        // Files stay private on rollback to avoid reopening unauthenticated access.
    }
};
