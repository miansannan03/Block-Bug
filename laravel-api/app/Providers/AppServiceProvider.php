<?php

namespace App\Providers;

use App\Support\SeededBugAuditHistory;
use Illuminate\Console\Events\CommandFinished;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Event::listen(CommandFinished::class, function (CommandFinished $event): void {
            if ($event->command !== 'db:seed' || $event->exitCode !== 0) {
                return;
            }

            // Seeders insert directly into tables and bypass the request audit logger.
            $summary = app(SeededBugAuditHistory::class)->backfill(connection: $event->input->getOption('database'));
            $event->output->writeln('Seeded bug audits: '.$summary['created'].' added; '.$summary['existing'].' already recorded.');
        });
    }
}
