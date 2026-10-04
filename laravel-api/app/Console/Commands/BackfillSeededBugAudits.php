<?php

namespace App\Console\Commands;

use App\Support\SeededBugAuditHistory;
use Illuminate\Console\Command;

class BackfillSeededBugAudits extends Command
{
    protected $signature = 'blockbug:backfill-seeded-audits
        {--organization= : Limit the backfill to one organization ID}
        {--database= : Database connection to use}
        {--dry-run : Preview missing events without writing audit logs}';

    protected $description = 'Add missing seeded bug audit history without replacing organizations or existing logs';

    public function handle(SeededBugAuditHistory $history): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $summary = $history->backfill($this->option('organization'), $dryRun, $this->option('database'));
        $this->info(($dryRun ? 'Would add ' : 'Added ').$summary['created'].' seeded bug audit events; '.$summary['existing'].' already exist; '.$summary['skipped'].' unsupported activities skipped.');

        return self::SUCCESS;
    }
}
