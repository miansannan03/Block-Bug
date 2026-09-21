<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class CreateSuperAdmin extends Command
{
    protected $signature = 'blockbug:create-super-admin
        {email? : Super Admin email for interactive creation}
        {--name=BlockBug Super Admin : Display name for interactive creation}
        {--credentials-file= : Path to a protected JSON file containing email, password, and optional name}
        {--if-missing : Leave an existing account and password unchanged}';

    protected $description = 'Create or reset a platform-level BlockBug Super Admin';

    public function handle(): int
    {
        $credentialsFile = $this->option('credentials-file');
        if ($credentialsFile) {
            if (! is_file($credentialsFile) || ! is_readable($credentialsFile)) {
                $this->error('The credentials file is unavailable.');

                return self::FAILURE;
            }
            try {
                $credentials = json_decode((string) file_get_contents($credentialsFile), true, 8, JSON_THROW_ON_ERROR);
            } catch (\Throwable) {
                $this->error('The credentials file is invalid.');

                return self::FAILURE;
            }
            $email = Str::lower(trim((string) ($credentials['email'] ?? '')));
            $name = trim((string) ($credentials['name'] ?? 'BlockBug Super Admin'));
            $password = (string) ($credentials['password'] ?? '');
            $confirmation = $password;
        } else {
            $email = Str::lower(trim((string) $this->argument('email')));
            $name = trim((string) $this->option('name'));
            $password = $this->secret('Password (minimum 12 characters)');
            $confirmation = $this->secret('Confirm password');
        }
        if (! filter_var($email, FILTER_VALIDATE_EMAIL) || strlen((string) $password) < 12 || $password !== $confirmation) {
            $this->error('Use a valid email, a password of at least 12 characters, and matching confirmation.');

            return self::FAILURE;
        }
        if ($this->option('if-missing') && DB::table('platform_admins')->where('email', $email)->exists()) {
            $this->info('Super Admin already exists; credentials were left unchanged.');

            return self::SUCCESS;
        }
        DB::table('platform_admins')->updateOrInsert(['email' => $email], [
            'id' => DB::table('platform_admins')->where('email', $email)->value('id') ?: 'sa-'.Str::lower(Str::random(16)),
            'name' => $name,
            'password_hash' => Hash::make($password),
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->info('Super Admin is ready.');

        return self::SUCCESS;
    }
}
